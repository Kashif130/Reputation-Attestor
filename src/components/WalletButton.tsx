"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { shortenAddress } from "@/lib/format";

export default function WalletButton() {
  const wallet = useWallet();
  const {
    mode,
    address,
    connecting,
    hasProvider,
    isOnExpectedChain,
    switchToGenLayerChain,
    connectInjected,
    activateGeneratedWallet,
    importGeneratedWallet,
    exportPrivateKey,
    disconnect,
  } = wallet;

  const [open, setOpen] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleConnectInjected() {
    setMessage(null);
    await connectInjected();
    setMessage("Injected wallet connected.");
  }

  function handleUseGenerated() {
    activateGeneratedWallet();
    setMessage("Browser wallet ready.");
  }

  function handleCopyKey() {
    const key = exportPrivateKey();
    if (!key) {
      setMessage("No browser wallet key is active yet.");
      return;
    }
    navigator.clipboard.writeText(key);
    setMessage("Private key copied. This is non-custodial: store it yourself.");
  }

  function handleDisconnect() {
    disconnect();
    setMessage("Disconnected. Your browser wallet key stays saved locally.");
  }

  if (mode !== "none" && !isOnExpectedChain) {
    return (
      <button className="btn-secondary border-amber-500/50 text-amber-400" onClick={switchToGenLayerChain}>
        Wrong network — switch
      </button>
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="btn-primary flex items-center gap-2 px-3 py-2 text-sm"
        onClick={() => setOpen((value) => !value)}
      >
        {mode === "none" ? (connecting ? "Connecting…" : "Connect Wallet") : shortenAddress(address ?? "")}
      </button>

      {open ? (
        <div className="card absolute right-0 z-20 mt-3 w-80 p-4 shadow-2xl shadow-black/40">
          <span className="label">Active identity</span>
          <div className="mt-1 break-all font-mono text-sm text-slate-200">
            {address ?? "Not connected"}
          </div>
          {mode !== "none" && (
            <p className="mt-1 text-xs text-slate-500">
              {mode === "injected" ? "Injected wallet" : "Browser wallet (non-custodial)"}
            </p>
          )}

          <div className="mt-4 grid gap-2">
            <button className="btn-secondary justify-center px-3 py-2 text-sm" onClick={handleUseGenerated}>
              Use browser wallet
            </button>
            <button
              className="btn-secondary justify-center px-3 py-2 text-sm"
              onClick={handleConnectInjected}
              disabled={connecting}
            >
              {connecting ? "Connecting…" : hasProvider ? "Use injected wallet" : "Install a wallet extension"}
            </button>
            <button className="btn-secondary justify-center px-3 py-2 text-sm" onClick={handleCopyKey}>
              Export browser key
            </button>
            {mode !== "none" ? (
              <button className="btn-secondary justify-center px-3 py-2 text-sm" onClick={handleDisconnect}>
                Disconnect
              </button>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-500/10 p-3 text-xs text-amber-300">
            The browser wallet is a locally generated key, non-custodial, and stored only in this
            browser&apos;s localStorage. Export and back it up before relying on it — losing it means
            losing access to anything tied to it.
          </div>

          <label className="mt-4 block" htmlFor="import-key">
            <span className="label">Import browser key</span>
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="import-key"
              className="input flex-1"
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
              placeholder="0x…"
            />
            <button
              className="btn-secondary px-3"
              onClick={() => {
                if (!importValue.trim()) return;
                importGeneratedWallet(importValue.trim() as `0x${string}`);
                setImportValue("");
                setMessage("Imported.");
              }}
            >
              Import
            </button>
          </div>

          {message ? (
            <p className="mt-3 text-xs text-slate-500" aria-live="polite">
              {message}
            </p>
          ) : null}
          {wallet.error ? <p className="mt-2 text-xs text-red-400">{wallet.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
