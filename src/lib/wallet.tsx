"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createAccount, generatePrivateKey } from "genlayer-js";
import { activeChain, getGeneratedWalletClient, getWalletClient } from "./chain";
import {
  acknowledgeGeneratedWallet,
  hasAcknowledgedGeneratedWallet,
  readGeneratedKey,
  writeGeneratedKey,
} from "./storage";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export type WalletMode = "none" | "generated" | "injected";

interface WalletState {
  mode: WalletMode;
  address: string | null;
  chainId: string | null;
  connecting: boolean;
  hasProvider: boolean;
  isOnExpectedChain: boolean;
  warningAccepted: boolean;
  /** Opens/starts the injected-wallet flow. Kept as `connect` for backward compatibility
   *  with the plain "Connect Wallet" buttons scattered across the app. */
  connect: () => Promise<void>;
  connectInjected: () => Promise<void>;
  activateGeneratedWallet: () => void;
  importGeneratedWallet: (privateKey: `0x${string}`) => void;
  exportPrivateKey: () => `0x${string}` | null;
  disconnect: () => void;
  switchToGenLayerChain: () => Promise<void>;
  /** Returns a signing client for the currently active mode -- injected (extension-signed)
   *  or generated (locally-signed with the stored key). Throws if no wallet is active. */
  getWriteClient: () => Promise<ReturnType<typeof getWalletClient>>;
  error: string | null;
}

const WalletContext = createContext<WalletState | null>(null);

function toHexChainId(id: number): string {
  return `0x${id.toString(16)}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<WalletMode>("none");
  const [injectedAddress, setInjectedAddress] = useState<string | null>(null);
  const [generatedAddress, setGeneratedAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);
  const [warningAccepted, setWarningAccepted] = useState(false);

  useEffect(() => {
    setHasProvider(typeof window !== "undefined" && Boolean(window.ethereum));
  }, []);

  // Restore a previously-generated browser wallet, if one exists, without prompting.
  useEffect(() => {
    queueMicrotask(() => {
      const stored = readGeneratedKey();
      setWarningAccepted(hasAcknowledgedGeneratedWallet());
      if (stored) {
        const account = createAccount(stored);
        setPrivateKey(stored);
        setGeneratedAddress(account.address);
        setMode("generated");
      }
    });
  }, []);

  useEffect(() => {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      const next = accounts && accounts.length > 0 ? accounts[0] ?? null : null;
      setInjectedAddress(next);
      if (next) setMode("injected");
    };
    const handleChainChanged = (...args: unknown[]) => {
      setChainId(args[0] as string);
    };

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);

    // Restore session silently if already authorized, without prompting -- but never
    // override an already-active generated wallet on load.
    eth.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      if (list && list.length > 0) {
        setInjectedAddress(list[0] ?? null);
        setMode((current) => (current === "generated" ? current : "injected"));
      }
    }).catch(() => {});
    eth.request({ method: "eth_chainId" }).then((id) => setChainId(id as string)).catch(() => {});

    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connectInjected = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setError("No injected wallet found. Install MetaMask (or another EIP-1193 wallet) to continue.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setInjectedAddress(accounts[0] ?? null);
      setMode("injected");
      const id = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection was rejected.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const activateGeneratedWallet = useCallback(() => {
    let key = readGeneratedKey();
    if (!key) {
      key = generatePrivateKey();
      writeGeneratedKey(key);
    }
    acknowledgeGeneratedWallet();
    const account = createAccount(key);
    setPrivateKey(key);
    setGeneratedAddress(account.address);
    setWarningAccepted(true);
    setMode("generated");
    setError(null);
  }, []);

  const importGeneratedWallet = useCallback((key: `0x${string}`) => {
    try {
      const account = createAccount(key);
      writeGeneratedKey(key);
      acknowledgeGeneratedWallet();
      setPrivateKey(key);
      setGeneratedAddress(account.address);
      setWarningAccepted(true);
      setMode("generated");
      setError(null);
    } catch {
      setError("That doesn't look like a valid private key.");
    }
  }, []);

  const exportPrivateKey = useCallback(() => privateKey, [privateKey]);

  const disconnect = useCallback(() => {
    setMode("none");
    setInjectedAddress(null);
    // The generated key stays saved in localStorage -- disconnecting only switches the
    // active mode to read-only, it never deletes the non-custodial key.
  }, []);

  const switchToGenLayerChain = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    const hexId = toHexChainId(activeChain.id);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (switchErr) {
      // 4902 = chain not added to the wallet yet -- add it, then switch.
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902) {
        const rpcUrl =
          activeChain.rpcUrls?.default?.http?.[0] ?? process.env.NEXT_PUBLIC_GENLAYER_RPC_URL ?? "";
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexId,
              chainName: activeChain.name ?? "GenLayer",
              nativeCurrency: activeChain.nativeCurrency ?? {
                name: "GEN",
                symbol: "GEN",
                decimals: 18,
              },
              rpcUrls: rpcUrl ? [rpcUrl] : [],
              blockExplorerUrls: activeChain.blockExplorers?.default?.url
                ? [activeChain.blockExplorers.default.url]
                : [],
            },
          ],
        });
      } else {
        setError(switchErr instanceof Error ? switchErr.message : "Could not switch network.");
      }
    }
  }, []);

  const getWriteClient = useCallback(async () => {
    if (mode === "injected" && injectedAddress) return getWalletClient(injectedAddress);
    if (mode === "generated" && privateKey) return getGeneratedWalletClient(privateKey);
    throw new Error("Connect a wallet or create a browser wallet before sending a transaction.");
  }, [injectedAddress, mode, privateKey]);

  const address = mode === "generated" ? generatedAddress : mode === "injected" ? injectedAddress : null;

  // The locally-signed generated wallet always targets `activeChain` directly, so there is
  // no separate network to be "wrong" on -- only the injected wallet can drift.
  const isOnExpectedChain = useMemo(() => {
    if (mode === "generated") return true;
    if (!chainId) return false;
    return parseInt(chainId, 16) === activeChain.id;
  }, [chainId, mode]);

  const value: WalletState = {
    mode,
    address,
    chainId,
    connecting,
    hasProvider,
    isOnExpectedChain,
    warningAccepted,
    connect: connectInjected,
    connectInjected,
    activateGeneratedWallet,
    importGeneratedWallet,
    exportPrivateKey,
    disconnect,
    switchToGenLayerChain,
    getWriteClient,
    error,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
