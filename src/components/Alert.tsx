interface AlertProps {
  kind?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
}

const STYLES: Record<string, string> = {
  error: "border-red-900/60 bg-red-950/40 text-red-300",
  success: "border-signal-600/40 bg-signal-500/10 text-signal-300",
  info: "border-ink-600 bg-ink-800/60 text-slate-300",
  warning: "border-amber-700/40 bg-amber-500/10 text-amber-300",
};

export default function Alert({ kind = "info", children }: AlertProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${STYLES[kind]}`} role="status">
      {children}
    </div>
  );
}
