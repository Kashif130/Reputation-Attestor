import { activeChain, CONTRACT_ADDRESS } from "@/lib/chain";
import { shortenAddress } from "@/lib/format";

export default function Footer() {
  return (
    <footer className="border-t border-ink-800 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          ReputationAttestor · a permissionless read primitive on{" "}
          <span className="text-slate-300">{activeChain?.name ?? "GenLayer"}</span>
        </p>
        <p className="font-mono">
          Contract:{" "}
          {CONTRACT_ADDRESS ? shortenAddress(CONTRACT_ADDRESS, 6) : "not configured"}
        </p>
      </div>
    </footer>
  );
}
