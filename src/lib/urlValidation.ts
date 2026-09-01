/**
 * Client-side mirror of the on-chain `_require_safe_url` / `_require_public_host` checks in
 * ReputationAttestor.py. This is a UX convenience only -- it lets the form reject an obviously
 * unsafe URL before the user pays gas for a transaction the contract will revert anyway. The
 * contract remains the sole source of truth; nothing here is a security boundary by itself.
 */

const NON_PUBLIC_HOST_EXACT = new Set(["localhost", "0.0.0.0", "0", "::", "::1", "[::1]", "[::]"]);

const NON_PUBLIC_HOST_SUFFIXES = [
  ".local",
  ".localhost",
  ".localdomain",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".arpa",
];

const REDIRECTOR_HOSTS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "rebrand.ly",
  "cutt.ly",
  "shorturl.at",
  "rb.gy",
  "tiny.cc",
  "s.id",
  "lnkd.in",
]);

function parseIpv4Literal(host: string): [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets: number[] = [];
  for (const p of parts) {
    if (p === "") return null;
    let v: number;
    if (/^0x/i.test(p)) {
      v = parseInt(p, 16);
    } else if (p.length > 1 && p[0] === "0" && /^\d+$/.test(p)) {
      v = parseInt(p, 8);
    } else if (/^\d+$/.test(p)) {
      v = parseInt(p, 10);
    } else {
      return null;
    }
    if (Number.isNaN(v) || v < 0 || v > 255) return null;
    octets.push(v);
  }
  return octets as [number, number, number, number];
}

function decimalToIpv4(digits: string): [number, number, number, number] | null {
  if (!/^\d+$/.test(digits)) return null;
  const v = parseInt(digits, 10);
  if (Number.isNaN(v) || v < 0 || v > 0xffffffff) return null;
  return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
}

function isNonPublicIpv4([a, b, c]: [number, number, number, number]): boolean {
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isNonPublicIpv6(core: string): boolean {
  const c = core.toLowerCase();
  if (["::1", "::", "0:0:0:0:0:0:0:1", "0:0:0:0:0:0:0:0"].includes(c)) return true;
  if (c.startsWith("fc") || c.startsWith("fd")) return true;
  if (c.startsWith("fe8") || c.startsWith("fe9") || c.startsWith("fea") || c.startsWith("feb")) return true;
  if (c.includes("::ffff:")) {
    const mapped = c.split("::ffff:").pop() ?? "";
    const ipv4 = parseIpv4Literal(mapped);
    if (ipv4) return isNonPublicIpv4(ipv4);
  }
  return false;
}

function requirePublicHost(host: string): string | null {
  const h = host.replace(/^\.+|\.+$/g, "").toLowerCase();
  const core = h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;

  if (NON_PUBLIC_HOST_EXACT.has(h) || NON_PUBLIC_HOST_EXACT.has(core)) {
    return "host is not a public address";
  }
  for (const suffix of NON_PUBLIC_HOST_SUFFIXES) {
    const bare = suffix.slice(1);
    if (h === bare || h.endsWith(suffix)) return "host is not a public address";
  }
  const bareH = h.startsWith("www.") ? h.slice(4) : h;
  if (REDIRECTOR_HOSTS.has(h) || REDIRECTOR_HOSTS.has(bareH)) {
    return "may not use a URL-shortener/redirector host";
  }
  const ipv4 = parseIpv4Literal(core);
  if (ipv4 && isNonPublicIpv4(ipv4)) return "host resolves to a non-public address";
  if (core.includes(":") && isNonPublicIpv6(core)) return "host resolves to a non-public address";
  if (/^\d+$/.test(core)) {
    const decimalIpv4 = decimalToIpv4(core);
    if (decimalIpv4 && isNonPublicIpv4(decimalIpv4)) return "host resolves to a non-public address";
  }
  return null;
}

/**
 * Validates a URL the same way the contract's `_require_safe_url` does: scheme, length,
 * embedded credentials, control characters, and a public (non-local/private/redirector) host.
 * Returns `null` when the URL passes, or a short human-readable reason when it doesn't.
 */
export function validateSafeUrl(url: string, label: string): string | null {
  if (url.length < 10 || url.length > 300) return `${label} must be 10-300 characters`;
  const lowered = url.toLowerCase();
  if (!lowered.startsWith("https://") && !lowered.startsWith("http://")) {
    return `${label} must start with http:// or https://`;
  }
  if (url.includes("@")) return `${label} may not contain embedded credentials`;
  for (const ch of url) {
    if (/\s/.test(ch) || ch.charCodeAt(0) < 0x21 || ch.charCodeAt(0) === 0x7f) {
      return `${label} may not contain whitespace or control characters`;
    }
  }
  const schemeEnd = url.indexOf("://") + 3;
  const rest = url.slice(schemeEnd);
  if (rest === "" || rest[0] === "/" || rest[0] === ".") return `${label} must include a host`;
  const hostPort = rest.split("/")[0].split("?")[0].split("#")[0];
  let host: string;
  if (hostPort.startsWith("[")) {
    const end = hostPort.indexOf("]");
    host = end !== -1 ? hostPort.slice(0, end + 1) : hostPort;
  } else {
    host = hostPort.split(":")[0];
  }
  if (host === "") return `${label} must include a host`;
  const hostError = requirePublicHost(host);
  if (hostError) return `${label} ${hostError}`;
  return null;
}

/**
 * Same as `validateSafeUrl` plus an allowed-domain check, mirroring `_require_domain_url`.
 */
export function validateDomainUrl(url: string, allowedDomains: string[], label: string): string | null {
  const base = validateSafeUrl(url, label);
  if (base) return base;
  const lowered = url.toLowerCase();
  const schemeEnd = lowered.indexOf("://") + 3;
  const hostAndRest = lowered.slice(schemeEnd);
  let host = hostAndRest.split("/")[0];
  if (host.startsWith("www.")) host = host.slice(4);
  if (!allowedDomains.includes(host)) {
    return `${label} must be hosted on one of ${allowedDomains.join(", ")}`;
  }
  return null;
}
