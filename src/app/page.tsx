"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AddressInput from "@/components/AddressInput";
import Alert from "@/components/Alert";
import { getRewardPool, ContractError } from "@/lib/contract";
import { isContractConfigured } from "@/lib/chain";
import { isValidAddress } from "@/lib/format";
import { useWallet } from "@/lib/wallet";

export default function HomePage() {
  const router = useRouter();
  const { address, connect } = useWallet();
  const [lookup, setLookup] = useState("");
  const [rewardPool, setRewardPool] = useState<string | null>(null);

  useEffect(() => {
    if (!isContractConfigured()) return;
    getRewardPool()
      .then(setRewardPool)
      .catch(() => setRewardPool(null));
  }, []);

  function goToProfile() {
    if (isValidAddress(lookup)) router.push(`/profile/${lookup.trim()}`);
  }

  return (
    <div className="space-y-16">
      {!isContractConfigured() && (
        <Alert kind="warning">
          <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> is not set. Copy{" "}
          <code className="font-mono">.env.example</code> to{" "}
          <code className="font-mono">.env.local</code> and add your deployed ReputationAttestor
          address before this app can read or write anything on-chain.
        </Alert>
      )}

      <section className="grid gap-10 pt-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="pill mb-4 bg-signal-500/10 text-signal-400">GenLayer Intelligent Contract</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-50 sm:text-5xl">
            One reputation score, <span className="text-signal-400">read by every protocol</span>{" "}
            that needs one.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">
            Register your GitHub, X, and hackathon evidence once. GenLayer&apos;s LLM-consensus
            validators independently verify each source and write a composite, always-fresh score
            — readable permissionlessly by any lending protocol, DAO, or grant program, without
            them running their own evidence pipeline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {address ? (
              <Link href="/dashboard" className="btn-primary">
                Go to my profile
              </Link>
            ) : (
              <button className="btn-primary" onClick={connect}>
                Connect wallet to register
              </button>
            )}
            <Link href="/registry" className="btn-secondary">
              Browse the registry
            </Link>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h3 className="text-sm font-semibold text-slate-200">Look up any address</h3>
          <AddressInput value={lookup} onChange={setLookup} onSubmit={goToProfile} placeholder="0x… subject address" />
          <button className="btn-secondary w-full" onClick={goToProfile} disabled={!isValidAddress(lookup)}>
            View reputation →
          </button>
          {rewardPool !== null && (
            <p className="border-t border-ink-800 pt-4 text-xs text-slate-500">
              Keeper reward pool balance:{" "}
              <span className="font-mono text-slate-300">{rewardPool} wei</span> — anyone can top
              it up to incentivize keepers to keep scores fresh.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-lg font-semibold text-slate-100">How it works</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <Step
            n={1}
            title="Register (self-only)"
            body="You register your own GitHub, X/Twitter, and hackathon-results links. Only you can claim these are your own identity evidence."
          />
          <Step
            n={2}
            title="Verify (permissionless)"
            body="Anyone — you, a keeper bot, a protocol wanting a fresh read — triggers a bounded consensus round. A per-component cooldown of 12h prevents spam."
          />
          <Step
            n={3}
            title="Read (forever, by anyone)"
            body="get_reputation(address) is a free, permissionless view. A failed round on one source never wipes out a previously-verified component."
          />
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-3">
        <ScoreExplainer label="GitHub" max={400} note="repo count, followers, account activity" />
        <ScoreExplainer label="X / Twitter" max={300} note="follower/engagement signals when fetchable" />
        <ScoreExplainer label="Hackathons" max={300} note="wins, placements, submission count" />
      </section>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="card p-5">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-500/15 text-xs font-bold text-signal-400">
        {n}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function ScoreExplainer({ label, max, note }: { label: string; max: number; note: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{label}</h3>
        <span className="font-mono text-xs text-slate-500">max {max}</span>
      </div>
      <p className="mt-1.5 text-xs text-slate-500">{note}</p>
    </div>
  );
}
