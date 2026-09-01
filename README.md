# ReputationAttestor — Frontend

A Next.js 14 (App Router) + TypeScript + Tailwind dApp for the `ReputationAttestor` GenLayer
Intelligent Contract. This closes the gap the contract repo's own README flagged as out of scope:

> "A frontend (register your links, watch your score populate, browse the registry) is a natural
> next step but is not included here."

This package includes the frontend **and** a copy of the original contract source and tests
(under [`contract/`](./contract)) so the whole thing is reviewable as one self-contained submission.

## What's in this repo

```
reputation-frontend/
├── contract/                    # copy of the Intelligent Contract this frontend talks to
│   ├── contracts/ReputationAttestor.py
│   ├── tests/direct/            # gltest direct-VM test suite (unmodified)
│   ├── gltest.config.yaml
│   ├── CONTRACT_README.md       # the original contract README
│   └── CONTRACT_DECISION.md     # the original contract decision record
├── src/
│   ├── app/                     # routes (App Router)
│   │   ├── page.tsx             # overview / hero / quick lookup
│   │   ├── dashboard/           # "My Profile" — register, view, update, verify
│   │   ├── profile/[address]/   # public read-only lookup for any subject
│   │   ├── registry/            # paginated browse of all registered profiles
│   │   └── admin/                # blacklist / unblacklist lever
│   ├── components/              # all UI building blocks (forms, cards, tables, wallet button)
│   ├── lib/
│   │   ├── chain.ts              # GenLayer client construction (read + wallet-bound)
│   │   ├── contract.ts           # one typed function per contract method
│   │   ├── wallet.tsx             # MetaMask/EIP-1193 connect context
│   │   └── format.ts             # address/time/wei formatting helpers
│   └── types/reputation.ts        # TS shapes mirroring the contract's view returns
├── DECISION.md                    # why this frontend is built the way it is
└── README.md                      # this file
```

## Every contract method has a UI path

| Contract method | Where in the UI |
| --- | --- |
| `register_profile` | `/dashboard` — shown automatically when the connected wallet has no profile yet |
| `update_evidence` | `/dashboard` — "Evidence links" panel |
| `verify_reputation` | `/dashboard` **and** `/profile/[address]` — permissionless, so it's available from both your own dashboard and anyone else's public page, with a live cooldown countdown |
| `fund_rewards` | `/dashboard` — "Keeper reward pool" widget |
| `blacklist_profile` / `unblacklist_profile` | `/admin` |
| `get_reputation` | `ReputationCard`, used on `/dashboard` and `/profile/[address]` |
| `get_profile_links` | evidence display on `/dashboard` and `/profile/[address]` |
| `is_registered` | gates whether `/dashboard` shows the register form or the profile |
| `list_profiles` | `/registry` (paginated, 10 per page, client-sorted by score) |
| `get_reward_pool` | home page + the funding widget |

## Getting started

```bash
cd reputation-frontend
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_GENLAYER_CHAIN=studionet        # localnet | studionet | testnetAsimov
NEXT_PUBLIC_GENLAYER_RPC_URL=               # optional override
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
```

Then:

```bash
npm run dev
```

Open `http://localhost:3000`. Every page that talks to the contract will show a yellow warning
banner instead of crashing if `NEXT_PUBLIC_CONTRACT_ADDRESS` is unset or malformed.

### Deploying the contract itself

The frontend does not deploy the contract — that stays a `gltest`/GenLayer Studio operation, run
from `contract/`:

```bash
cd contract
pip install genlayer-test   # if not already installed
gltest deploy contracts/ReputationAttestor.py --network studionet
```

Copy the resulting address into `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### Running the contract's test suite

```bash
cd contract
gltest tests/direct/test_reputation_attestor.py
```

## How the frontend talks to GenLayer

- **Reads** (`get_reputation`, `list_profiles`, `is_registered`, `get_profile_links`,
  `get_reward_pool`) go through a wallet-less `genlayer-js` client (`getReadClient()`), so anyone
  can browse `/registry` and any `/profile/[address]` without connecting a wallet at all — the
  contract's own design goal ("readable permissionlessly by any protocol") holds for this UI too.
- **Writes** (`register_profile`, `update_evidence`, `verify_reputation`, `fund_rewards`,
  `blacklist_profile`, `unblacklist_profile`) go through a client bound to the connected wallet's
  address (`getWalletClient(address)`); `genlayer-js` defers actual signing to the injected
  wallet (MetaMask or any EIP-1193 provider), the same pattern `viem` uses for browser wallets. The
  UI waits for a `FINALIZED` receipt before refetching views, so the numbers you see after an
  action are the real post-transaction state, not an optimistic guess.
- Contract errors are classified by the `[EXPECTED]` / `[TRANSIENT]` / `[LLM_ERROR]` prefixes the
  contract itself raises with (see `src/lib/contract.ts`), and the cleaned message is shown
  directly rather than a generic "something went wrong."

## Design choices worth knowing about

See [`DECISION.md`](./DECISION.md) for the reasoning behind:

- why verification is exposed on *two* pages (dashboard and public profile), not just one;
- why the admin page never tries to pre-check who the admin is;
- why reads use a separate, wallet-less client from writes;
- why the registry does client-side sorting instead of asking the contract for a sorted list;
- the honest limitations this frontend inherits from the contract (Twitter scoring being
  frequently unscoreable, self-sovereign evidence, sybil resistance, single-admin blacklist).

## Known limitations of this frontend

- **No contract deployment or code-generation flow.** By design — this is a frontend for an
  already-deployed contract, not a Studio replacement.
- **No `get_admin` view on the contract**, so `/admin` cannot tell you in advance whether your
  connected wallet is authorized; it can only surface the contract's own rejection after you try.
  A natural contract-side follow-up would be adding a `get_admin() -> str` view.
- **No event indexing.** `list_profiles` is read directly from contract state on every page
  load/page-turn; there is no off-chain indexer, so very large registries will mean more RPC calls
  as you page through. Fine for the scale this ecosystem is at today; a future version could add
  a subgraph-style indexer if the registry grows large.
- **Amounts are entered in GEN, converted to wei client-side** (`genToWei`/`weiToGen` in
  `src/lib/format.ts`) using plain `BigInt` arithmetic — no external decimal library, since the
  only operations needed are string-to-wei and wei-to-string.
