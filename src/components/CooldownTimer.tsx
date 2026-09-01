"use client";

import { useEffect, useState } from "react";
import { cooldownRemainingSeconds, formatDuration } from "@/lib/format";

export default function CooldownTimer({
  lastAttemptIso,
  onReady,
}: {
  lastAttemptIso: string;
  onReady?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => cooldownRemainingSeconds(lastAttemptIso));

  useEffect(() => {
    setRemaining(cooldownRemainingSeconds(lastAttemptIso));
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = cooldownRemainingSeconds(lastAttemptIso);
        if (prev > 0 && next === 0) onReady?.();
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lastAttemptIso, onReady]);

  if (remaining <= 0) {
    return <span className="pill bg-signal-500/10 text-signal-400">Cooldown elapsed — ready to verify</span>;
  }

  return (
    <span className="pill bg-amber-500/10 text-amber-400 font-mono">
      Next verify in {formatDuration(remaining)}
    </span>
  );
}
