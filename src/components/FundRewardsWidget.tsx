"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { fundRewards, ContractError } from "@/lib/contract";
import { genToWei } from "@/lib/format";
import Alert from "./Alert";
import Spinner from "./Spinner";

export default function FundRewardsWidget({
  rewardPoolWei,
  onFunded,
}: {
  rewardPoolWei: string;
  onFunded: () => void;
}) {
  const { address, connect, getWriteClient } = useWallet();
  const [amount, setAmount] = useState("0.001");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    if (!address) {
      await connect();
      return;
    }
    setError(null);
    const wei = genToWei(amount);
    if (wei <= 0n) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSubmitting(true);
    try {
      const client = await getWriteClient();
      await fundRewards(client, wei);
      onFunded();
    } catch (err) {
      setError(err instanceof ContractError ? err.message : "Funding failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Keeper reward pool</p>
        <p className="text-lg font-semibold text-slate-100">{rewardPoolWei} wei</p>
        <p className="mt-1 text-xs text-slate-500">
          Community-fundable. Whoever triggers a verification round is paid 0.0005 GEN from this
          pool when it holds enough — a bonus for keepers, never required for verification to
          work.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          className="input font-mono"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.001"
        />
        <button className="btn-secondary shrink-0" onClick={handleFund} disabled={submitting}>
          {submitting && <Spinner />}
          Fund (GEN)
        </button>
      </div>
      {error && <Alert kind="error">{error}</Alert>}
    </div>
  );
}
