import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="text-3xl font-bold text-slate-100">404</h1>
      <p className="text-sm text-slate-400">This page doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary mt-2">
        Back home
      </Link>
    </div>
  );
}
