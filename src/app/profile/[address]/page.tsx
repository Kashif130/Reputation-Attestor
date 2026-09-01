"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getReputation, getProfileLinks, isRegistered, ContractError } from "@/lib/contract";
import { isContractConfigured } from "@/lib/chain";
import { isValidAddress, formatTimestamp } from "@/lib/format";
import type { Reputation, ProfileLinks } from "@/types/reputation";
import ReputationCard from "@/components/ReputationCard";
import VerifyPanel from "@/components/VerifyPanel";
import Alert from "@/components/Alert";
import Spinner from "@/components/Spinner";

export default function PublicProfilePage() {
  const params = useParams<{ address: string }>();
  const subject = decodeURIComponent(params.address);

  const [state, setState] = useState<"loading" | "not-registered" | "loaded" | "error">("loading");
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [links, setLinks] = useState<ProfileLinks | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const registered = await isRegistered(subject);
      if (!registered) {
        setState("not-registered");
        return;
      }
      const [rep, profileLinks] = await Promise.all([getReputation(subject), getProfileLinks(subject)]);
      setReputation(rep);
      setLinks(profileLinks);
      setState("loaded");
    } catch (err) {
      setError(err instanceof ContractError ? err.message : "Could not load this profile.");
      setState("error");
    }
  }, [subject]);

  useEffect(() => {
    if (isContractConfigured() && isValidAddress(subject)) load();
  }, [subject, load]);

  if (!isContractConfigured()) {
    return <Alert kind="warning">Contract address not configured.</Alert>;
  }

  if (!isValidAddress(subject)) {
    return <Alert kind="error">&quot;{subject}&quot; is not a valid address.</Alert>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Reputation lookup</h1>
        <Link href="/registry" className="text-sm text-signal-400 hover:underline">
          ← Back to registry
        </Link>
      </div>

      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Spinner /> Loading…
        </div>
      )}

      {state === "not-registered" && (
        <Alert kind="info">This address has not registered a ReputationAttestor profile yet.</Alert>
      )}

      {state === "error" && <Alert kind="error">{error}</Alert>}

      {state === "loaded" && reputation && links && (
        <div className="space-y-6">
          <ReputationCard reputation={reputation} />

          <div className="card p-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-200">Registered evidence</h3>
            <dl className="space-y-2 text-sm">
              <LinkRow label="GitHub" url={links.github_url} />
              <LinkRow label="X / Twitter" url={links.twitter_url} />
              <LinkRow label="Hackathon" url={links.hackathon_url} />
            </dl>
            <p className="mt-4 text-xs text-slate-600">
              Registered {formatTimestamp(links.registered_at)}
            </p>
          </div>

          <VerifyPanel
            subject={subject}
            lastAttemptIso={reputation.last_verification_attempt_at}
            attempts={reputation.verification_attempts}
            onVerified={load}
          />
        </div>
      )}
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-800/70 pb-2 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-mono text-xs text-slate-300">
        <a href={url} target="_blank" rel="noreferrer" className="hover:text-signal-400 hover:underline">
          {url}
        </a>
      </dd>
    </div>
  );
}
