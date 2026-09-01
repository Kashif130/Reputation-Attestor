"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { registerProfile, ContractError } from "@/lib/contract";
import { validateDomainUrl, validateSafeUrl } from "@/lib/urlValidation";
import Alert from "./Alert";
import Spinner from "./Spinner";

export default function RegisterForm({ onRegistered }: { onRegistered: () => void }) {
  const { address, getWriteClient } = useWallet();
  const [githubUrl, setGithubUrl] = useState("https://github.com/");
  const [twitterUrl, setTwitterUrl] = useState("https://x.com/");
  const [hackathonUrl, setHackathonUrl] = useState("https://");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError(null);

    const gh = githubUrl.trim();
    const tw = twitterUrl.trim();
    const hk = hackathonUrl.trim();
    const validationError =
      validateDomainUrl(gh, ["github.com"], "GitHub URL") ??
      validateDomainUrl(tw, ["twitter.com", "x.com"], "X / Twitter URL") ??
      validateSafeUrl(hk, "Hackathon URL");
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const client = await getWriteClient();
      await registerProfile(client, gh, tw, hk);
      onRegistered();
    } catch (err) {
      const message = err instanceof ContractError ? err.message : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Register your evidence</h3>
        <p className="mt-1 text-sm text-slate-400">
          One-time, self-only. These links define what gets scored — a fresh score requires
          triggering a verification round afterwards, so saving links alone never changes your
          number.
        </p>
      </div>

      {address && (
        <Alert kind="info">
          Before verifying, add your wallet address —{" "}
          <span className="font-mono text-xs">{address}</span> — somewhere on each page below
          (GitHub bio, X bio or a pinned post, your hackathon submission page). Verification only
          scores a source once it can find your own wallet address on it — this is what stops
          someone else&apos;s account from ever being claimed and scored by your wallet.
        </Alert>
      )}

      <div>
        <label className="label" htmlFor="github">GitHub profile URL</label>
        <input
          id="github"
          className="input font-mono"
          placeholder="https://github.com/yourhandle"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">Must be hosted on github.com.</p>
      </div>

      <div>
        <label className="label" htmlFor="twitter">X / Twitter profile URL</label>
        <input
          id="twitter"
          className="input font-mono"
          placeholder="https://x.com/yourhandle"
          value={twitterUrl}
          onChange={(e) => setTwitterUrl(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">Must be hosted on twitter.com or x.com.</p>
      </div>

      <div>
        <label className="label" htmlFor="hackathon">Hackathon results URL</label>
        <input
          id="hackathon"
          className="input font-mono"
          placeholder="https://devpost.com/your-project"
          value={hackathonUrl}
          onChange={(e) => setHackathonUrl(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Any host is fine (Devpost, Dorahacks, a hackathon site, a GitHub repo) — just a valid,
          safe http(s) URL.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <button type="submit" className="btn-primary w-full" disabled={submitting || !address}>
        {submitting && <Spinner />}
        {submitting ? "Registering on-chain…" : "Register profile"}
      </button>
    </form>
  );
}
