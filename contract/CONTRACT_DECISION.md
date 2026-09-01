# ReputationAttestor Decision Record

## The product

A self-sovereign evidence registry (a subject registers their own GitHub, X/Twitter, and
hackathon-results links) paired with a permissionless verification round that independently
scores each source and writes a composite, always-fresh reputation score other protocols can read
without running any evidence pipeline of their own.

## Counterfactual: why not just let each consuming protocol score reputation itself

Every lending protocol, DAO, or grant program that wants a signal like "has this address done
real public work" today either builds its own off-chain scoring service (opaque, not
independently checkable, a separate trust assumption per consumer) or ignores the signal
entirely. A single, consensus-verified, permissionlessly-read registry means the same evidence is
scored once, by the same rules, checkable by anyone -- exactly the "reusable infrastructure vs.
one more single-purpose contract" argument CoverMesh already made for insurance, applied here to
reputation.

## Why verification is non-destructive per component, unlike CoverMesh's claim settlement

CoverMesh's `check_claim` either resolves a cover to a final, permanent verdict or leaves it
retriable -- there is no partial state, because a cover is a single yes/no financial question with
one deadline. A reputation score is read continuously between verification rounds by third
parties who have no visibility into whether a round is "in progress," so the wrong failure mode
here is different: if a single flaky fetch (a rate-limited GitHub API call, for instance) zeroed
out a subject's entire score, every consuming protocol reading that score in the interim would see
a false collapse in reputation that has nothing to do with the subject's actual evidence. The fix
is to track each of the three components' own verified status and timestamp, and to only
overwrite a component when its specific evidence was fetchable in the current round. This is a
deliberate generalization of CoverMesh's `INSUFFICIENT_EVIDENCE` idea (never resolve on missing
evidence) down to per-field granularity, rather than an all-or-nothing round.

## Why registration is self-only but verification is permissionless

A profile's evidence *links* are a claim only the subject themselves should be able to make --
registering someone else's GitHub URL against your own address would let you steal their public
work as evidence for your own reputation. But once those links are on record, checking them
against the real, public state of GitHub/X/a hackathon page is not a privileged act -- it is
exactly the kind of permissionless, keeper-incentivized action CoverMesh's `check_claim` already
proved out for insurance claims. Reusing that shape here means any consuming protocol that wants a
subject's score refreshed right before making a decision (e.g. before extending undercollateralized
credit) can simply pay to trigger it themselves, rather than waiting on the subject's own
initiative.

## Why the reward pool is a separate, community-fundable pool instead of reusing CoverMesh's NAV pool

CoverMesh's keeper reward is paid from the same NAV pool that backs real financial liability,
because in CoverMesh the reward is a genuine, small operating cost the insurance pool bears as
part of paying claims. ReputationAttestor has no equivalent pool of at-risk capital -- there is
no liability to underwrite, only a public good (fresh reputation data) to fund. Modeling the
reward pool as a simple, permissionlessly-fundable balance (rather than forcing a CoverMesh-style
LP/NAV structure onto a contract with no actual insurance economics) keeps the incentive real
without inventing financial machinery this contract doesn't need. Verification still succeeds with
an empty pool -- the reward is a bonus for keepers, never a requirement for the registry to
function.

## Why activity levels, not raw follower/star counts, are the scored unit

Asking the model to extract a raw follower count or star count and comparing it against a
numeric threshold (the CoverMesh WEATHER/PRICE_THRESHOLD pattern) was considered and rejected for
this contract's three sources, because none of them expose a single canonical numeric signal the
way Open-Meteo or CoinGecko do -- GitHub's own activity signal is a mix of repo count, followers,
and account age; Twitter's rendered text rarely exposes a reliable number at all; a hackathon page
might report placements, not counts. Constraining the model to a four-level ordinal judgment
(`NONE`/`LOW`/`MEDIUM`/`HIGH`), validated against that fixed enum in code and mapped
deterministically to a score, keeps the categorical-classification discipline this ecosystem
already uses for genuinely non-numeric judgments (CoverMesh's own NEWS_EVENT adapter), rather than
forcing a false numeric precision onto evidence that doesn't actually support it.

## Why the blacklist lever is minimal and admin-gated rather than absent or elaborate

A registry that is otherwise fully permissionless still needs *some* emergency response to
clear, urgent abuse (for example, a large batch of registrations that turn out to be tied to a
single sybil operator, discovered off-chain). Building a full on-chain governance/dispute process
for this first version would be substantial additional surface area for a problem that, in
practice, needs a fast circuit breaker more than a deliberative process. The chosen middle ground
-- a single admin who can only toggle a binary blacklist flag (never edit a score directly, never
delete underlying evidence) -- bounds the admin's power to "hide this score from readers" rather
than "rewrite this subject's reputation," and is explicitly documented as a centralization
trade-off future versions should address with a timelocked or DAO-voted process.
