const GENERATED_KEY = "reputation-attestor.generated-wallet.v1";
const ACK_KEY = "reputation-attestor.generated-wallet-ack.v1";

export function readGeneratedKey(): `0x${string}` | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(GENERATED_KEY) as `0x${string}` | null;
}

export function writeGeneratedKey(key: `0x${string}`) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(GENERATED_KEY, key);
}

export function clearGeneratedKey() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(GENERATED_KEY);
}

export function hasAcknowledgedGeneratedWallet(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(ACK_KEY) === "yes";
}

export function acknowledgeGeneratedWallet() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ACK_KEY, "yes");
}
