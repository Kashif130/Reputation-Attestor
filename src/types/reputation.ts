/**
 * These mirror the dict shapes returned by ReputationAttestor's @gl.public.view methods
 * (see contract/contracts/ReputationAttestor.py). Kept in one place so every component
 * agrees on field names with the contract, not with each other's guesses.
 */

export type VerificationStatus = "VERIFIED" | "UNBOUND" | "UNVERIFIED";

export interface Reputation {
  owner: string;
  blacklisted: boolean;
  blacklist_reason: string;

  total_score: number;
  total_score_max: number;

  github_score: number;
  github_status: VerificationStatus;
  github_last_verified_at: string;
  github_summary: string;

  twitter_score: number;
  twitter_status: VerificationStatus;
  twitter_last_verified_at: string;
  twitter_summary: string;

  hackathon_score: number;
  hackathon_status: VerificationStatus;
  hackathon_last_verified_at: string;
  hackathon_summary: string;

  verification_attempts: number;
  last_verification_attempt_at: string;
}

export interface ProfileLinks {
  github_url: string;
  twitter_url: string;
  hackathon_url: string;
  registered_at: string;
}

export interface RegistryEntry {
  owner: string;
  total_score: number;
}

export const SCORE_MAX = {
  github: 400,
  twitter: 300,
  hackathon: 300,
  total: 1000,
} as const;

export const VERIFICATION_COOLDOWN_SECONDS = 12 * 60 * 60;
