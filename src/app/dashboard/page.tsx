"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { getReputation, getProfileLinks, getRewardPool, isRegistered, ContractError } from "@/lib/contract";
import { isContractConfigured } from "@/lib/chain";
import type { Reputation, ProfileLinks } from "@/types/reputation";
import RegisterForm from "@/components/RegisterForm";
import EvidenceForm from "@/components/EvidenceForm";
import ReputationCard from "@/components/ReputationCard";
import VerifyPanel from "@/components/VerifyPanel";
import FundRewardsWidget from "@/components/FundRewardsWidget";
import Alert from "@/components/Alert";
import Spinner from "@/components/Spinner";

export default function DashboardPage() {
  const { address, connect, connecting } = useWallet();
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [links, setLinks] = useState<ProfileLinks | null>(null);
  const [rewardPool, setRewardPool] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const registeredResult = await isRegistered(address);
      setRegistered(registeredResult);
      if (registeredResult) {
        const [rep, profileLinks, pool] = await Promise.all([
          getReputation(address),
          getProfileLinks(address),
          getRewardPool(),
        ]);
        setReputation(rep);
        setLinks(profileLinks);
        setRewardPool(pool);
      }
    } catch (err) {
      setError(err instanceof ContractError ? err.message : "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) refresh();
  }, [address, refresh]);

  if (!isContractConfigured()) {
    return (
      <Alert kind="warning">
        Contract address not configured — set <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in{" "}
        <code className="font-mono">.env.local</code> first.
      </Alert>
    );
  }

  if (!address) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-100">Connect your wallet</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your profile is tied to your address. Connect to register or view your evidence and
          score.
        </p>
        <button className="btn-primary mt-6 w-full" onClick={connect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      </div>
    );
  }

  if (loading && registered === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Spinner /> Loading your profile…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">My Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your evidence links and keep your on-chain reputation fresh.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {registered === false && <RegisterForm onRegistered={refresh} />}

      {registered && reputation && links && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ReputationCard reputation={reputation} />
            <VerifyPanel
              subject={address}
              lastAttemptIso={reputation.last_verification_attempt_at}
              attempts={reputation.verification_attempts}
              onVerified={refresh}
            />
          </div>
          <div className="space-y-6">
            <EvidenceForm links={links} onUpdated={refresh} />
            <FundRewardsWidget rewardPoolWei={rewardPool} onFunded={refresh} />
          </div>
        </div>
      )}
    </div>
  );
}
