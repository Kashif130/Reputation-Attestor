"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RegistryTable from "@/components/RegistryTable";
import AddressInput from "@/components/AddressInput";
import Alert from "@/components/Alert";
import { isContractConfigured } from "@/lib/chain";
import { isValidAddress } from "@/lib/format";

export default function RegistryPage() {
  const router = useRouter();
  const [lookup, setLookup] = useState("");

  if (!isContractConfigured()) {
    return <Alert kind="warning">Contract address not configured.</Alert>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Registry</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every subject that has registered evidence, ranked by composite score. This is the same
          read any consuming protocol performs — nothing here is gated.
        </p>
      </div>

      <div className="flex gap-2">
        <AddressInput
          value={lookup}
          onChange={setLookup}
          placeholder="Jump to a specific address…"
          onSubmit={() => isValidAddress(lookup) && router.push(`/profile/${lookup.trim()}`)}
        />
        <button
          className="btn-secondary shrink-0"
          disabled={!isValidAddress(lookup)}
          onClick={() => router.push(`/profile/${lookup.trim()}`)}
        >
          Go
        </button>
      </div>

      <RegistryTable />
    </div>
  );
}
