# ReputationAttestor

An on-chain reputation registry that periodically LLM-verifies off-chain evidence -- a GitHub
profile, an X/Twitter profile, a hackathon-results page -- and maintains a composite score,
readable permissionlessly by any other protocol. A lending protocol, a DAO membership gate, or a
grant program can read `get_reputation(address)` directly, without running its own evidence
pipeline: a shared "proof of work" layer for the rest of this ecosystem.

## Reviewer summary

- **Live app**: not included in this submission -- see "Scope" below.
- **Source**: part of this repository, under `reputation-attestor/`.
- **Contract**: add StudioNet contract address here when deployed.
- **Main workflow**: a subject registers their own evidence links (`register_profile`, self-only)
  -> anyone permissionlessly triggers `verify_reputation`, which independently checks all three
  evidence sources in one bounded consensus round and updates whichever component score was
  actually verifiable this round -> any protocol reads the composite score forever via
  `get_reputation`.

## The core design choice: reputation is read repeatedly, so a bad round must never destroy data

CoverMesh (this ecosystem's parametric-insurance contract) settles a claim exactly once -- a
cover either resolves or stays open, and `INSUFFICIENT_EVIDENCE` simply means "try again later."
A reputation score is different: it is read continuously by other protocols, potentially between
verification rounds, so a single transient failure (a GitHub API rate limit, a Twitter page that
didn't render this round) must never wipe out a subject's previously-verified standing.

This is why each of the three score components -- `github_score`, `twitter_score`,
`hackathon_score` -- tracks its **own** `_status` (`VERIFIED`/`UNVERIFIED`) and
`_last_verified_at` timestamp, and `verify_reputation` only overwrites a component when that
specific evidence source was actually fetchable in the current round. A GitHub outage during an
otherwise-successful verification leaves the subject's GitHub score exactly as it was, while their
Twitter and hackathon scores still get a fresh update in the same call.

## Why evidence-link registration is self-only, but verification is permissionless

Registering evidence links is a claim about the registrant's own identity -- only they should be
able to say "this is my GitHub, this is my X account, this is my hackathon history." Once
registered, however, *checking* that evidence against the public record is not a privileged
action: anyone (a consuming lending protocol that wants a fresh score before extending credit, a
community keeper bot) can trigger `verify_reputation`, and can be rewarded for doing so from a
permissionlessly-fundable `reward_pool` -- mirroring CoverMesh's "keeper reward paid from the
pool's own accounting" pattern, generalized here to a pool anyone (not just the pool that owns the
underlying asset) can top up.

## Architecture

- `contracts/ReputationAttestor.py` -- a single Intelligent Contract: self-sovereign profile
  registration with domain-restricted GitHub/Twitter URLs and a syntax-validated (but
  domain-open) hackathon URL, a single consensus round (`_consensus_verify`) that scores all three
  sources in one bounded call (three fetches, one `gl.nondet.exec_prompt`), and a minimal
  admin-only blacklist lever for clear abuse cases.
- `tests/direct/` -- direct-VM `gltest` tests covering registration and link validation,
  evidence updates, the non-destructive partial-failure verification path, cooldown and retry,
  keeper-reward accounting (funded and unfunded), out-of-enum activity-level downgrades, and the
  blacklist/unblacklist lever.

### Contract methods

| Method | Kind | Consensus round? | What it does |
| --- | --- | --- | --- |
| `register_profile(...)` | write, self-only | No | Registers a subject's own evidence links (one-time). |
| `update_evidence(...)` | write, self-only | No | Updates evidence links; invalidates a component's score only if that component's URL actually changed. |
| `verify_reputation(subject)` | write, permissionless | **Yes -- once per attempt** | Runs the bounded consensus round, updating whichever components were verifiable. |
| `fund_rewards()` | payable write, permissionless | No | Tops up the keeper-reward pool. |
| `blacklist_profile` / `unblacklist_profile` | admin-only write | No | Emergency lever for clear abuse; zeroes/restores the readable score. |
| `get_reputation(subject)` | view | No | The reusable read primitive: composite score + per-component breakdown. |
| `get_profile_links` / `is_registered` / `list_profiles` / `get_reward_pool` | view | No | Registry reads. |

## Scoring

- Each source is independently classified into an activity level of `NONE`/`LOW`/`MEDIUM`/`HIGH`
  by the consensus round, then mapped deterministically in the contract's own code to a
  component score out of that component's max (`GITHUB_SCORE_MAX=400`,
  `TWITTER_SCORE_MAX=300`, `HACKATHON_SCORE_MAX=300`; `total_score` out of 1000).
- Scores are always a **fresh, independent snapshot** each round, not a running or incremental
  total -- a subject cannot accumulate score simply by being verified repeatedly; only genuinely
  improved (or degraded) evidence changes the number.
- A blacklisted profile always reads `total_score: 0` regardless of its stored component scores,
  without the admin needing to zero out or delete any underlying data (which is preserved for
  potential future reinstatement via `unblacklist_profile`).

## Scope of this submission

This submission is **Contract + Tests**. A frontend (register your links, watch your score
populate, browse the registry) is a natural next step but is not included here.

## Ownership binding

Registering a link is only a *claim*. Without a check, any wallet could point at someone else's
genuinely-active GitHub/X/hackathon profile and inherit its score -- the subject named in the URL
never has to be the wallet doing the registering. `verify_reputation` closes this: a source is
only scored when the subject's own wallet address string is found, verbatim, in that source's
fetched page (a bio, a pinned post, a submission page -- anywhere the real owner can edit). This
check runs in code against each validator's independently-fetched page, so it stays
consensus-safe the same way the existing fetch-availability check already was; the LLM never even
sees a source that failed it. A source that fetches fine but shows no ownership proof is marked
`UNBOUND` and is never scored, non-destructively -- exactly like a genuine fetch outage.

Because a subject could otherwise register real evidence, get verified, then swap in fabricated
links while the old (legitimate) score stayed visible until the next round, `update_evidence` now
invalidates a component's score immediately whenever that component's URL actually changes --
per-component, so changing only the hackathon link never touches an untouched, still-valid GitHub
score.

## Honest limitations

- **Twitter/X evidence is frequently unscoreable.** Most profile pages require an authenticated
  session to show meaningful follower/engagement data to an unauthenticated renderer; a
  `twitter_score` of `NONE`/low is expected and common, not necessarily a sign of low real
  activity. This is documented rather than papered over.
- **Ownership binding requires the subject to be able to edit the page.** GitHub/X bios are
  always subject-editable, so the check is strong there. A hackathon-results page is sometimes a
  platform's own listing rather than the subject's own editable content -- if the platform gives
  no way to add free text, that source will legitimately stay `UNBOUND` until it does, which is a
  usability cost, not a security gap (the alternative is scoring evidence no one has proven they
  control).
- **Self-sovereign evidence means the subject picks what gets scored.** A subject who has a low-
  activity GitHub account under one username and a high-activity one under another will only be
  scored on whichever they register -- this is a feature (subjects genuinely control which public
  identity they're attesting to) but also means the score reflects the *chosen* evidence, not
  necessarily the subject's single most representative profile.
- **Single-admin blacklist is centralized.** The blacklist lever exists for clear, urgent abuse
  cases (e.g. evidence of large-scale sybil registration) and is deliberately minimal -- it can
  only blacklist or unblacklist, never edit a score directly. A future version could move this to
  a timelocked or DAO-voted process.
- **No sybil resistance beyond the evidence itself.** Nothing stops one person from registering
  many different addresses, each pointing at a *different* real, wallet-bound evidence account, to
  accumulate several separate reputation scores. Ownership binding proves each wallet controls the
  account it points at; it does not and cannot prove a one-human-one-address property.
