import { VERIFICATION_COOLDOWN_SECONDS } from "@/types/reputation";

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function formatTimestamp(iso: string): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const units: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [label, secs] of units) {
    const value = Math.floor(Math.abs(diffSec) / secs);
    if (value >= 1) return diffSec >= 0 ? `${value} ${label}${value > 1 ? "s" : ""} ago` : `in ${value} ${label}${value > 1 ? "s" : ""}`;
  }
  return "just now";
}

/** Seconds remaining before verify_reputation's 12h cooldown clears, or 0 if elapsed. */
export function cooldownRemainingSeconds(lastAttemptIso: string): number {
  if (!lastAttemptIso) return 0;
  const last = new Date(lastAttemptIso).getTime();
  if (Number.isNaN(last)) return 0;
  const elapsed = (Date.now() - last) / 1000;
  const remaining = VERIFICATION_COOLDOWN_SECONDS - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "ready now";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function weiToGen(wei: string | bigint, decimals = 4): string {
  try {
    const value = typeof wei === "bigint" ? wei : BigInt(wei);
    const whole = value / 10n ** 18n;
    const frac = value % 10n ** 18n;
    const fracStr = frac.toString().padStart(18, "0").slice(0, decimals);
    return `${whole.toString()}.${fracStr}`;
  } catch {
    return "0";
  }
}

export function genToWei(gen: string): bigint {
  const trimmed = gen.trim();
  if (!trimmed) return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded || "0");
}
