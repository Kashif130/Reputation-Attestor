"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-xl font-semibold text-slate-100">Something went wrong</h1>
      <p className="max-w-md text-sm text-slate-400">{error.message}</p>
      <button className="btn-secondary mt-2" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
