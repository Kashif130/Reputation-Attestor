"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { blacklistProfile, unblacklistProfile, ContractError } from "@/lib/contract";
import AddressInput from "./AddressInput";
import Alert from "./Alert";
import Spinner from "./Spinner";

export default function AdminPanel() {
  const { address, connect, getWriteClient } = useWallet();
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState<"blacklist" | "unblacklist" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(action: "blacklist" | "unblacklist") {
    if (!address) {
      await connect();
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(action);
    try {
      const client = await getWriteClient();
      if (action === "blacklist") {
        if (reason.trim().length < 3) {
          setError("Reason must be at least 3 characters.");
          setSubmitting(null);
          return;
        }
        await blacklistProfile(client, subject.trim(), reason.trim());
        setSuccess(`Blacklisted ${subject.trim()}.`);
      } else {
        await unblacklistProfile(client, subject.trim());
        setSuccess(`Reinstated ${subject.trim()}.`);
      }
    } catch (err) {
      setError(
        err instanceof ContractError
          ? err.message
          : "Action failed. If you are not the contract admin, this will always be rejected on-chain."
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="card space-y-5 p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100">Emergency blacklist lever</h3>
        <p className="mt-1 text-sm text-slate-400">
          Admin-only, enforced by the contract itself — this UI does not (and cannot, since the
          contract exposes no <code className="font-mono text-slate-300">get_admin</code> view)
          pre-check whether your connected wallet is the admin. Non-admin calls simply revert.
          Blacklisting never edits a score or deletes evidence; it only zeroes the composite score
          as read by <code className="font-mono text-slate-300">get_reputation</code>.
        </p>
      </div>

      <div>
        <label className="label">Subject address</label>
        <AddressInput value={subject} onChange={setSubject} placeholder="0x… subject to blacklist/reinstate" />
      </div>

      <div>
        <label className="label" htmlFor="reason">Blacklist reason (3–300 chars)</label>
        <textarea
          id="reason"
          className="input min-h-[80px] resize-y"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. confirmed sybil registration across 40+ addresses"
        />
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="btn-danger flex-1"
          onClick={() => run("blacklist")}
          disabled={submitting !== null || subject.length === 0}
        >
          {submitting === "blacklist" && <Spinner />}
          Blacklist profile
        </button>
        <button
          className="btn-secondary flex-1"
          onClick={() => run("unblacklist")}
          disabled={submitting !== null || subject.length === 0}
        >
          {submitting === "unblacklist" && <Spinner />}
          Reinstate profile
        </button>
      </div>
    </div>
  );
}
