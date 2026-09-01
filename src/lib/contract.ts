import { getReadClient, getWalletClient, CONTRACT_ADDRESS } from "./chain";
import type { Reputation, ProfileLinks, RegistryEntry } from "@/types/reputation";
import type { CalldataEncodable } from "genlayer-js/types";
import { TransactionStatus } from "genlayer-js/types";

/** A signing client for either wallet mode -- get one via `useWallet().getWriteClient()`. */
export type WriteClient = Awaited<ReturnType<typeof getWalletClient>>;

/**
 * The three error prefixes ReputationAttestor.py raises with. Surfacing which bucket an
 * error falls into lets the UI tell "you did something the contract rejects" (EXPECTED)
 * apart from "the network/clock hiccuped, just retry" (TRANSIENT) apart from "the LLM
 * consensus round itself failed to return usable JSON" (LLM_ERROR).
 */
export type ContractErrorKind = "EXPECTED" | "TRANSIENT" | "LLM_ERROR" | "UNKNOWN";

export class ContractError extends Error {
  kind: ContractErrorKind;
  constructor(message: string, kind: ContractErrorKind) {
    super(message);
    this.kind = kind;
    this.name = "ContractError";
  }
}

function classifyAndRethrow(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  let kind: ContractErrorKind = "UNKNOWN";
  if (message.includes("[EXPECTED]")) kind = "EXPECTED";
  else if (message.includes("[TRANSIENT]")) kind = "TRANSIENT";
  else if (message.includes("[LLM_ERROR]")) kind = "LLM_ERROR";
  const cleaned = message
    .replace("[EXPECTED]", "")
    .replace("[TRANSIENT]", "")
    .replace("[LLM_ERROR]", "")
    .trim();
  throw new ContractError(cleaned || message, kind);
}

function requireAddress(): string {
  if (!CONTRACT_ADDRESS) {
    throw new ContractError(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Add the deployed ReputationAttestor address to .env.local.",
      "EXPECTED"
    );
  }
  return CONTRACT_ADDRESS;
}

// ---------------------------------------------------------------------------
// Views -- read-only, no wallet required
// ---------------------------------------------------------------------------

export async function getReputation(subject: string): Promise<Reputation> {
  try {
    const client = getReadClient();
    const result = await client.readContract({
      address: requireAddress() as `0x${string}`,
      functionName: "get_reputation",
      args: [subject],
    });
    return result as unknown as Reputation;
  } catch (err) {
    classifyAndRethrow(err);
  }
}

export async function getProfileLinks(subject: string): Promise<ProfileLinks> {
  try {
    const client = getReadClient();
    const result = await client.readContract({
      address: requireAddress() as `0x${string}`,
      functionName: "get_profile_links",
      args: [subject],
    });
    return result as unknown as ProfileLinks;
  } catch (err) {
    classifyAndRethrow(err);
  }
}

export async function isRegistered(subject: string): Promise<boolean> {
  try {
    const client = getReadClient();
    const result = await client.readContract({
      address: requireAddress() as `0x${string}`,
      functionName: "is_registered",
      args: [subject],
    });
    return Boolean(result);
  } catch (err) {
    classifyAndRethrow(err);
  }
}

export async function listProfiles(offset: number, limit: number): Promise<RegistryEntry[]> {
  try {
    const client = getReadClient();
    const result = await client.readContract({
      address: requireAddress() as `0x${string}`,
      functionName: "list_profiles",
      args: [offset, limit],
    });
    return result as unknown as RegistryEntry[];
  } catch (err) {
    classifyAndRethrow(err);
  }
}

export async function getRewardPool(): Promise<string> {
  try {
    const client = getReadClient();
    const result = await client.readContract({
      address: requireAddress() as `0x${string}`,
      functionName: "get_reward_pool",
      args: [],
    });
    return String(result);
  } catch (err) {
    classifyAndRethrow(err);
  }
}

// ---------------------------------------------------------------------------
// Writes -- require a signing client from `useWallet().getWriteClient()` (works for
// both injected and generated/browser wallets); each waits for FINALIZED receipt so
// the UI can safely re-fetch views right after.
// ---------------------------------------------------------------------------

async function sendWrite(
  client: WriteClient,
  functionName: string,
  args: CalldataEncodable[],
  value?: bigint
) {
  try {
    const txHash = await client.writeContract({
      address: requireAddress() as `0x${string}`,
      functionName,
      args,
      value: value ?? 0n,
    });
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.FINALIZED,
    });
    return receipt;
  } catch (err) {
    classifyAndRethrow(err);
  }
}

export async function registerProfile(
  client: WriteClient,
  githubUrl: string,
  twitterUrl: string,
  hackathonUrl: string
) {
  return sendWrite(client, "register_profile", [githubUrl, twitterUrl, hackathonUrl]);
}

export async function updateEvidence(
  client: WriteClient,
  githubUrl: string,
  twitterUrl: string,
  hackathonUrl: string
) {
  return sendWrite(client, "update_evidence", [githubUrl, twitterUrl, hackathonUrl]);
}

export async function verifyReputation(client: WriteClient, subject: string) {
  return sendWrite(client, "verify_reputation", [subject]);
}

export async function fundRewards(client: WriteClient, amountWei: bigint) {
  return sendWrite(client, "fund_rewards", [], amountWei);
}

export async function blacklistProfile(client: WriteClient, subject: string, reason: string) {
  return sendWrite(client, "blacklist_profile", [subject, reason]);
}

export async function unblacklistProfile(client: WriteClient, subject: string) {
  return sendWrite(client, "unblacklist_profile", [subject]);
}
