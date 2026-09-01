"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listProfiles, ContractError } from "@/lib/contract";
import type { RegistryEntry } from "@/types/reputation";
import { shortenAddress } from "@/lib/format";
import Alert from "./Alert";
import Spinner from "./Spinner";

const PAGE_SIZE = 10;

export default function RegistryTable() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (pageIndex: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProfiles(pageIndex * PAGE_SIZE, PAGE_SIZE);
      setEntries(result);
      setHasMore(result.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof ContractError ? err.message : "Could not load the registry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const sorted = [...entries].sort((a, b) => b.total_score - a.total_score);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-200">Registered profiles</h3>
        {loading && <Spinner className="h-4 w-4 text-slate-500" />}
      </div>

      {error && (
        <div className="p-5">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {!error && !loading && sorted.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-500">No profiles on this page.</p>
      )}

      {!error && sorted.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="px-5 py-2 font-medium">Address</th>
              <th className="px-5 py-2 font-medium">Score</th>
              <th className="px-5 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.owner} className="border-t border-ink-800/70 hover:bg-ink-800/30">
                <td className="px-5 py-3 font-mono text-slate-300">{shortenAddress(entry.owner, 6)}</td>
                <td className="px-5 py-3">
                  <span className="font-semibold text-signal-400">{entry.total_score}</span>
                  <span className="text-slate-500"> / 1000</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/profile/${entry.owner}`} className="text-xs font-medium text-signal-400 hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="flex items-center justify-between border-t border-ink-800 px-5 py-3">
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0 || loading}
        >
          ← Previous
        </button>
        <span className="text-xs text-slate-500">Page {page + 1}</span>
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore || loading}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
