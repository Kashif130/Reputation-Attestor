"use client";

import { useWallet } from "@/lib/wallet";
import { isContractConfigured } from "@/lib/chain";
import AdminPanel from "@/components/AdminPanel";
import Alert from "@/components/Alert";

export default function AdminPage() {
  const { address, connect, connecting } = useWallet();

  if (!isContractConfigured()) {
    return <Alert kind="warning">Contract address not configured.</Alert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          The contract&apos;s single-admin blacklist lever — an emergency circuit breaker for
          clear abuse, deliberately unable to edit a score directly.
        </p>
      </div>

      {!address ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-400">Connect the wallet that deployed the contract to use this panel.</p>
          <button className="btn-primary mt-4" onClick={connect} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      ) : (
        <AdminPanel />
      )}
    </div>
  );
}
