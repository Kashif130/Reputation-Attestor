"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { updateEvidence, ContractError } from "@/lib/contract";
import { validateDomainUrl, validateSafeUrl } from "@/lib/urlValidation";
import type { ProfileLinks } from "@/types/reputation";
import Alert from "./Alert";
import Spinner from "./Spinner";

export default function EvidenceForm({
  links,
  onUpdated,
}: {
  links: ProfileLinks;
  onUpdated: () => void;
}) {
  const { address, getWriteClient } = useWallet();
  const [githubUrl, setGithubUrl] = useState(links.github_url);
  const [twitterUrl, setTwitterUrl] = useState(links.twitter_url);
  const [hackathonUrl, setHackathonUrl] = useState(links.hackathon_url);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty =
    githubUrl !== links.github_url || twitterUrl !== links.twitter_url || hackathonUrl !== links.hackathon_url;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setError(null);
    setSuccess(false);

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
      await updateEvidence(client, gh, tw, hk);
      setSuccess(true);
      onUpdated();
    } catch (err) {
      const message = err instanceof ContractError ? err.message : "Update failed. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <h3 className="text-base font-semibold text-slate-100">Evidence links</h3>
        <p className="mt-1 text-xs text-slate-500">
          Changing a link resets that component&apos;s score back to unverified immediately — links
          you leave unchanged keep their current score. Re-verify afterwards to get a fresh number.
        </p>
      </div>

      {address && (
        <Alert kind="info">
          Add your wallet address —{" "}
          <span className="font-mono text-xs">{address}</span> — somewhere on each page before
          verifying, so we can confirm you actually control it.
        </Alert>
      )}

      <div>
        <label className="label" htmlFor="ev-github">GitHub URL</label>
        <input
          id="ev-github"
          className="input font-mono"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="ev-twitter">X / Twitter URL</label>
        <input
          id="ev-twitter"
          className="input font-mono"
          value={twitterUrl}
          onChange={(e) => setTwitterUrl(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="ev-hackathon">Hackathon URL</label>
        <input
          id="ev-hackathon"
          className="input font-mono"
          value={hackathonUrl}
          onChange={(e) => setHackathonUrl(e.target.value)}
          required
        />
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && !dirty && <Alert kind="success">Evidence links updated.</Alert>}

      <button type="submit" className="btn-secondary w-full" disabled={submitting || !dirty}>
        {submitting && <Spinner />}
        {submitting ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
