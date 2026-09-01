# Frontend Decision Record

## The product

A Next.js dApp that gives every `ReputationAttestor` contract method a UI path, split across five
routes by *who is allowed to act*, not by feature: an overview anyone can browse, a personal
dashboard gated by "is this wallet's own profile", a public read-only lookup anyone can hit for
any address, a registry list, and an admin panel whose gating lives entirely on-chain.

## Why reads use a separate, wallet-less client from writes

The contract's whole point, restated in its own README, is that reputation is "readable
permissionlessly by any other protocol" — a lending protocol reading a borrower's score should
never need a signing key of its own just to call a `view` method. Mirroring that in the frontend
means `getReadClient()` (no `account`) is used for every `get_*`/`list_*`/`is_registered` call,
and `/registry` and `/profile/[address]` work fully with no wallet connected at all. A
`getWalletClient(address)` is constructed only at the moment a write is actually submitted, and
only from the currently-connected address. Building one client per action rather than one global
client also means switching wallets mid-session never leaves a write silently bound to a stale
signer.

## Why `verify_reputation` is exposed on two different pages, not one

`verify_reputation` is explicitly permissionless in the contract — the design rationale in the
contract's own `DECISION.md` is that a consuming protocol should be able to pay to refresh
*someone else's* score right before making a decision about them, not just wait on the subject's
own initiative. A frontend that only let you verify your own profile from `/dashboard` would
quietly reintroduce a self-only assumption the contract deliberately rejected. Putting the same
`VerifyPanel` component on `/profile/[address]` as well means a lender-style user landing on a
borrower's public page can trigger a fresh round themselves, exactly as the contract intends.

## Why `/admin` never tries to pre-check who the admin is

The contract stores `admin: Address` but exposes no `get_admin` view — deliberately or not, that
information simply isn't readable from outside. Two options existed: hide the admin panel behind
a guess (e.g. "the first address to ever call a write"), or be honest that the frontend cannot
know and let the contract's own `Only the admin may...` revert be the source of truth. Guessing
risks confidently telling a legitimate admin they're not authorized (or worse, implying a random
non-admin might be). The panel is shown to any connected wallet, with a visible note explaining
why, and the real authorization check happens exactly once, on-chain, when the transaction is
submitted — the UI's job is to surface that rejection clearly, not to duplicate access control it
cannot actually verify.

## Why the registry sorts client-side instead of asking the contract to

`list_profiles(offset, limit)` returns entries in registration order (the order of
`profile_owners`, an append-only `DynArray`), not score order — adding a sorted read path would
mean either the contract holding a second sorted index (extra storage and write-path complexity
for every registration) or an off-chain indexer neither this contract nor this submission's scope
includes. Since a page of profiles is small (10 entries), sorting that page by score client-side
after the fetch gives a useful "best profiles first" view without asking the contract to do
anything it wasn't designed to do. This is a page-local sort, not a global one — it does not claim
to show the top 10 profiles overall, only the top of whichever page you're on, and the UI's
pagination controls are labeled accordingly (Previous/Next, not "sorted by rank").

## Why contract errors are classified by prefix instead of shown raw

Every `UserError` the contract raises is prefixed with `[EXPECTED]`, `[TRANSIENT]`, or
`[LLM_ERROR]` — a taxonomy the contract author clearly built on purpose (the same three prefixes
recur across every `raise` in `ReputationAttestor.py`). Throwing that prefix away and showing a
generic "transaction failed" would discard information the contract is already handing the
frontend for free: `[EXPECTED]` means the user did something the contract will always reject (bad
URL domain, cooldown not elapsed, not registered) and the UI should just show the message as-is;
`[TRANSIENT]` means retrying might work (contract clock unavailable); `[LLM_ERROR]` means the
consensus round itself came back malformed. `src/lib/contract.ts` strips the prefix for display
but keeps it as a typed `kind` on `ContractError`, so a future version of this frontend could
auto-retry `TRANSIENT` failures without a rewrite.

## Why amounts are handled as raw wei strings, not a decimal/BigNumber library

`fund_rewards` is the only place this frontend sends a native-token value, and `get_reward_pool`
returns its balance as a plain wei string (mirroring the contract's own `str(self.reward_pool)`).
Pulling in a decimal-math library for one input field and one display string was judged to be more
dependency surface than the problem needs; `genToWei`/`weiToGen` in `src/lib/format.ts` do the
same fixed-18-decimal string arithmetic with native `BigInt`, which is exact for this use case
(no rounding-sensitive division, only multiplication/padding by powers of ten).

## Honest limitations this frontend inherits or adds

- **Twitter/X scores will often show `NONE`/low**, exactly as the contract's own README documents
  — the frontend does not editorialize this away or hide low Twitter scores; `ReputationCard`
  shows the `UNVERIFIED`/`VERIFIED` status and summary text as-is, including when a component has
  never been scored (`No evidence scored yet.`).
- **No `get_admin` view means `/admin` cannot gate itself in advance** (see above) — a known,
  documented gap rather than a simulated one.
- **No indexer**: the registry re-reads `list_profiles` from the contract on every page turn.
  Correct, but means paging through a very large registry is one RPC round-trip per page rather
  than instant client-side pagination over a cached full list.
- **Self-sovereign evidence and sybil resistance are exactly as limited as the contract itself
  documents** — this frontend does not attempt to add sybil resistance (e.g. one-wallet-per-human
  gating) that the contract doesn't have; doing so client-side would be trivially bypassable and
  would misrepresent what the on-chain data actually guarantees.
