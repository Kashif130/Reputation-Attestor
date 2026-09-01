interface ScoreBarProps {
  label: string;
  score: number;
  max: number;
  status?: "VERIFIED" | "UNBOUND" | "UNVERIFIED";
  accent?: "signal" | "amber" | "slate";
}

const ACCENTS = {
  signal: "bg-signal-500",
  amber: "bg-amber-500",
  slate: "bg-slate-500",
};

export default function ScoreBar({ label, score, max, status, accent = "signal" }: ScoreBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((score / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-200">{label}</span>
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={`pill ${
                status === "VERIFIED"
                  ? "bg-signal-500/10 text-signal-400"
                  : status === "UNBOUND"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-slate-500/10 text-slate-400"
              }`}
            >
              {status === "VERIFIED" ? "✓ Verified" : status === "UNBOUND" ? "Ownership unproven" : "Unverified"}
            </span>
          )}
          <span className="font-mono text-xs text-slate-400">
            {score}/{max}
          </span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800">
        <div
          className={`h-full rounded-full ${ACCENTS[accent]} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
