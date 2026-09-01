import type { Reputation } from "@/types/reputation";
import { SCORE_MAX } from "@/types/reputation";
import ScoreBar from "./ScoreBar";
import { formatTimestamp, relativeTime, shortenAddress } from "@/lib/format";

export default function ReputationCard({ reputation }: { reputation: Reputation }) {
  const r = reputation;
  const totalPct = r.total_score_max > 0 ? Math.round((r.total_score / r.total_score_max) * 100) : 0;

  return (
    <div className="card p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Subject</p>
          <p className="font-mono text-sm text-slate-200">{shortenAddress(r.owner, 6)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Composite score</p>
          <p className="text-3xl font-bold text-signal-400">
            {r.total_score}
            <span className="text-base font-medium text-slate-500"> / {r.total_score_max}</span>
          </p>
        </div>
      </div>

      {r.blacklisted && (
        <div className="mb-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <p className="font-semibold">⚠ This profile is blacklisted.</p>
          <p className="mt-0.5 text-red-400/90">
            {r.blacklist_reason || "No reason provided."} Score reads as 0 to all consumers while
            blacklisted; underlying evidence is preserved for potential reinstatement.
          </p>
        </div>
      )}

      <div className="mb-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-signal-600 via-signal-400 to-amber-400 transition-all duration-700"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      <div className="space-y-5">
        <ScoreBar
          label="GitHub"
          score={r.github_score}
          max={SCORE_MAX.github}
          status={r.github_status}
        />
        <ScoreBar
          label="X / Twitter"
          score={r.twitter_score}
          max={SCORE_MAX.twitter}
          status={r.twitter_status}
          accent="amber"
        />
        <ScoreBar
          label="Hackathons"
          score={r.hackathon_score}
          max={SCORE_MAX.hackathon}
          status={r.hackathon_status}
          accent="slate"
        />
      </div>

      <div className="mt-6 grid gap-3 border-t border-ink-800 pt-5 sm:grid-cols-3">
        <SummaryBlock title="GitHub summary" text={r.github_summary} timestamp={r.github_last_verified_at} />
        <SummaryBlock title="X / Twitter summary" text={r.twitter_summary} timestamp={r.twitter_last_verified_at} />
        <SummaryBlock title="Hackathon summary" text={r.hackathon_summary} timestamp={r.hackathon_last_verified_at} />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 pt-4 text-xs text-slate-500">
        <span>
          {r.verification_attempts} verification attempt{r.verification_attempts === 1 ? "" : "s"}
        </span>
        <span title={formatTimestamp(r.last_verification_attempt_at)}>
          Last attempted {relativeTime(r.last_verification_attempt_at)}
        </span>
      </div>
    </div>
  );
}

function SummaryBlock({ title, text, timestamp }: { title: string; text: string; timestamp: string }) {
  return (
    <div className="rounded-lg bg-ink-800/40 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="text-xs leading-relaxed text-slate-300">
        {text || <span className="text-slate-600">No evidence scored yet.</span>}
      </p>
      {timestamp && (
        <p className="mt-1.5 text-[10px] text-slate-600" title={formatTimestamp(timestamp)}>
          verified {relativeTime(timestamp)}
        </p>
      )}
    </div>
  );
}
