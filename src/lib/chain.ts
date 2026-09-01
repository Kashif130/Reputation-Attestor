import { createAccount, createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov } from "genlayer-js/chains";
import type { GenLayerChain } from "genlayer-js/types";

/**
 * Which GenLayer network this frontend targets. Set via NEXT_PUBLIC_GENLAYER_CHAIN
 * in .env.local (see .env.example) -- "localnet" | "studionet" | "testnetAsimov".
 * Defaults to studionet, matching the contract repo's gltest.config.yaml default.
 */
const CHAIN_NAME = (process.env.NEXT_PUBLIC_GENLAYER_CHAIN || "studionet") as
  | "localnet"
  | "studionet"
  | "testnetAsimov";

const CHAINS: Record<string, GenLayerChain> = {
  localnet,
  studionet,
  testnetAsimov,
};

export const activeChain: GenLayerChain = CHAINS[CHAIN_NAME] ?? studionet;

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();

const RPC_OVERRIDE = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL?.trim();

/**
 * A read-only client -- no signing account attached. Safe to use for every `view`
 * method on the contract (get_reputation, list_profiles, get_profile_links, ...)
 * whether or not a wallet is connected.
 */
export function getReadClient() {
  return createClient({
    chain: activeChain,
    ...(RPC_OVERRIDE ? { endpoint: RPC_OVERRIDE } : {}),
  });
}

/**
 * A client bound to a connected injected-wallet address. GenLayer-JS accepts a bare
 * address string as the `account` and defers actual signing to the injected wallet
 * (MetaMask / any EIP-1193 provider), the same pattern viem uses for browser wallets.
 */
export function getWalletClient(address: string) {
  return createClient({
    chain: activeChain,
    account: address as `0x${string}`,
    provider: typeof window !== "undefined" ? window.ethereum : undefined,
    ...(RPC_OVERRIDE ? { endpoint: RPC_OVERRIDE } : {}),
  });
}

/**
 * A client signed locally by a browser-generated private key -- no extension needed.
 * This is the non-custodial "browser wallet" fallback: the key never leaves this
 * browser's localStorage, and GenLayer-JS signs transactions with it directly instead
 * of deferring to an injected provider.
 */
export function getGeneratedWalletClient(privateKey: `0x${string}`) {
  const account = createAccount(privateKey);
  return createClient({
    chain: activeChain,
    account,
    ...(RPC_OVERRIDE ? { endpoint: RPC_OVERRIDE } : {}),
  });
}

export function isContractConfigured(): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS);
}
