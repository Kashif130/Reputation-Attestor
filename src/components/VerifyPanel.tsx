"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { verifyReputation, ContractError } from "@/lib/contract";
import CooldownTimer from "./CooldownTimer";
import Alert from "./Alert";
import Spinner from "./Spinner";

export default function VerifyPanel({
  subject,
  lastAttemptIso,
  attempts,
  onVerified,
}: {
  subject: string;
  lastAttemptIso: string;
  attempts: number;
  onVerified: () => void;
}) {
  const { address, connect, getWriteClient } = useWallet();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(attempts === 0);

  async function handleVerify() {
    if (!address) {
      await connect();
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const client = await getWriteClient();
      await verifyReputation(client, subject);
      onVerified();
    } catch (err) {
      const message =
        err instanceof ContractError
          ? err.message
          : "Verification round failed. This can happen if evidence sources were unreachable this round — try again.";
      setError(message);
    } finally {
      setRunning(false);
    }
  }

  const disabled = running || (attempts > 0 && !ready);

  return (
    <div className="card space-y-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Trigger verification</h3>
          <p className="mt-1 text-xs text-slate-500">
            Permissionless — anyone can run this for any subject, gated by a 12h cooldown per
            profile. Runs a single bounded LLM-consensus round over all three evidence sources.
          </p>
        </div>
        {attempts > 0 && <CooldownTimer lastAttemptIso={lastAttemptIso} onReady={() => setReady(true)} />}
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      <button className="btn-primary" onClick={handleVerify} disabled={disabled}>
        {running && <Spinner />}
        {running ? "Running consensus round…" : "Verify reputation now"}
      </button>

      <p className="text-[11px] text-slate-600">
        A component&apos;s score only updates if its evidence page was fetchable this round and
        contains the subject&apos;s own wallet address as proof of ownership — a transient fetch
        failure, or evidence no one has proven they control, never wipes out the others.
      </p>
    </div>
  );
}
