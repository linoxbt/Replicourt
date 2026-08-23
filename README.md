<p align="center">
  <img src="assets/brand/logo-light.svg" alt="RepliCourt" width="360">
</p>

# RepliCourt

**The scientific record is a PDF that never updates. This one does.**

RepliCourt is a staked, continuously-updating registry of empirical scientific
claims, built on [GenLayer](https://genlayer.com) Intelligent Contracts. A poster
stakes GEN on a specific, checkable claim; anyone can challenge it by staking GEN
against it with counter-evidence; GenLayer validators independently fetch that
evidence live from the open web and re-derive a confidence-score delta through
real multi-model LLM consensus. The claim's on-chain state is a running confidence
score with a full, timestamped evidence trail — never a single overwritten
verdict, and never just one model's opinion.

It's the difference between "peer reviewed once, in 2019" and "peer reviewed
continuously, on-chain, with money behind every correction."

Built for the GenLayer Hackathon, implementing a Comparative / Non-Comparative
Equivalence Principle design end to end and verified live against two real
GenLayer networks (not just local mocks) — see [Live deployment](#live-deployment)
below for the actual on-chain proof.

## Table of contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Live deployment](#live-deployment)
- [Contract API](#contract-api)
- [Repo layout](#repo-layout)
- [Design decisions that diverge from the illustrative spec skeleton](#design-decisions-that-diverge-from-the-illustrative-spec-skeleton)
- [Two real GenVM SDK bugs/quirks found and worked around while building this](#two-real-genvm-sdk-bugsquirks-found-and-worked-around-while-building-this)
- [Audit fixes](#audit-fixes)
- [Repeated challenge rounds](#repeated-challenge-rounds)
- [Settlement consistency (second steward round)](#settlement-consistency-second-steward-round)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Tech stack](#tech-stack)
- [Explicitly deferred](#explicitly-deferred-out-of-scope-for-this-hackathon-build)

## Why this exists

Published research doesn't update when it's contradicted. A single failed
replication, a retraction, or a methodology critique rarely changes the
document itself — it becomes a separate citation someone has to go find. There's
no running, adversarial, financially-backed score attached to a claim that
reflects the current state of evidence for it.

RepliCourt makes that score a first-class on-chain object. Posting a claim costs
a stake. Challenging it costs a stake. Losing a challenge — as poster or as
challenger — costs real GEN, decided by GenLayer's Optimistic Democracy validator
consensus rather than a single model call or a moderator's judgment.

## Features

- **Global claim registry** — every posted claim, live confidence score, stake
  size, and challenge count, sortable by most-confident / most-contested, with
  **search and filters** (free text, category, minimum confidence, minimum stake).
- **Post a claim** — stake GEN on a specific, checkable empirical claim (an
  effect size, a study design, a source citation, a category); a deterministic
  source-existence check runs before it's accepted.
- **Challenge a claim** — stake GEN against it with counter-evidence URLs and a
  free-text description of what the evidence shows and why it should move
  confidence. Two challenge modes:
  - **Comparative** (numeric effect sizes) — every validator independently
    re-derives the same confidence delta from the same counter-evidence and
    must converge within a tolerance.
  - **Non-comparative** (methodology critiques) — validators judge whether the
    stated critique is actually supported by the fetched source text, against
    explicit criteria.
- **Evidence trail** — a reverse-chronological, fully timestamped record of
  every challenge on a claim: the challenger's argument, the validators' own
  rationale (with **source credibility** broken out as its own field), the
  confidence delta, and the source links — not a single overwritten verdict.
- **Confidence chart** — a live chart of a claim's confidence score over time,
  built from its evidence trail.
- **Escalation** — contested resolutions can be escalated to a larger validator
  panel (5 → 9 validators) under a stricter convergence tolerance, plus a
  separate **real on-chain appeal** button (GenLayer's own protocol-level
  appeal, testnet Asimov only — see "Live deployment").
- **Manual finalize** — a `finalize(txId)` button for testnet Asimov
  transactions this browser submitted, since real testnet writes don't
  auto-finalize the way studionet's hosted network does.
- **Embeddable confidence badge** — a live SVG badge for any claim
  (`/.netlify/functions/badge?claim=<id>`), copyable as markdown, for dropping
  into the paper/blog post/README the claim is actually about.
- **Leaderboard** — ranked by resolutions won (claims successfully defended +
  challenges that moved confidence), with win rate and total GEN staked.
- **Notifications** — a bell in the nav that polls for "your claim was
  challenged" / "your challenge was resolved" against the connected wallet.
- **Per-wallet dashboard** — your posted claims and your challenges, with a win
  rate.
- **Real wallet connect** — Reown AppKit (EIP-1193), not a burner-key stub, with
  a runtime **network switcher** between studionet and testnet Asimov.
- **Mobile-first** — responsive nav that collapses into a hamburger menu.

## How it works

1. **Post a claim.** Stake GEN on a specific, checkable empirical claim — an
   effect size, a study design, a source citation.
2. **Anyone can challenge it.** A challenger stakes GEN against the claim with
   counter-evidence: a failed replication, a contradicting study, a methodology
   flaw, plus a written description of what that evidence shows.
3. **Validators re-derive, live.** GenLayer validators fetch the evidence and
   independently re-derive the confidence delta — not just agree that an
   answer sounds plausible. Comparative challenges must converge on the same
   number; non-comparative challenges are judged against the source text and
   explicit criteria.
4. **Confidence updates, on the record.** The claim's state is a running score
   with a full timestamped evidence trail — not a single overwritten verdict.
   A resolved challenge slashes the losing side's stake and rewards the
   winner, so the incentive to chase down a bad claim (or defend a good one)
   is real money, not just reputation.

## Architecture

```
┌─────────────────────────┐        genlayer-js (EIP-1193 + AppKit)        ┌──────────────────────────┐
│   Frontend (Vite/React) │ ───────────────────────────────────────────▶ │  GenLayer Intelligent     │
│   Reown AppKit wallet   │ ◀─────────────────────────────────────────── │  Contract (replicourt.py) │
│   Network switcher      │        reads: claims / challenges / views    │  studionet + testnet Asimov│
└─────────────────────────┘                                              └────────────┬─────────────┘
                                                                                        │ gl.get_webpage /
                                                                                        │ run_nondet_unsafe /
                                                                                        │ prompt_non_comparative
                                                                                        ▼
                                                                          ┌──────────────────────────┐
                                                                          │  GenLayer validator set   │
                                                                          │  (multi-model LLM         │
                                                                          │  consensus, Optimistic    │
                                                                          │  Democracy)                │
                                                                          └──────────────────────────┘
```

The frontend never talks to an LLM, a web-fetch API, or a database directly —
every read and write goes straight to the deployed Intelligent Contract via
`genlayer-js`. There is no backend server and no mock data path in production;
`contractApi.ts` always calls the live contract.

## Frontend

Vite + React + TypeScript + Tailwind, wired live to the contract via `genlayer-js`
(no mock data anywhere) with **Reown AppKit** for real wallet connect (EIP-1193,
custom GenLayer network defs reused from `genlayer-js/chains`) and a **runtime
network switcher** between studionet and testnet Asimov — see
`frontend/src/lib/{networks,appkit,ReplicourtProvider}.tsx`. Pages: a landing page,
the global claim registry, a per-wallet dashboard (your posted claims + your
challenges, win rate), post claim, claim detail (confidence chart + evidence
trail), challenge flow, escalation. Mobile nav collapses into a hamburger menu.

`VITE_REOWN_PROJECT_ID` in `frontend/.env.local` needs a free Project ID from
cloud.reown.com — without it, wallet-connect shows a clear "unavailable" state
instead of breaking.

## Live deployment

**Studionet** (studio.genlayer.com): `0xE3c97A5D4dB7Ed8BEBfBb04e84A5169aA2e43312`

Redeployed after a second steward review (see "Settlement consistency" below)
fixed comparative-validator boundary agreement and escalation's
confidence/status/payout reconciliation — live-verified end-to-end: post_claim
→ challenge → escalate all completed without reverting on the fixed contract.
Before that, it was redeployed after a first steward review (see "Repeated
challenge rounds" below) added **repeated challenge rounds** — live-verified: a
claim was challenged twice in a row (round 1, round 2), `round_count` correctly
went 0→1→2, and confidence accumulated across both rounds (`5000 → 5000 → 5200`
bps). Before that, it was redeployed after an independent audit (see "Audit
fixes" below) — live-verified: posted a claim, challenged it, and escalated it
end-to-end on real infrastructure, including confirming the escalation bond is
actually refunded (contract balance before/after matched the exact expected
math, not just "the call didn't revert"). Before that, it was redeployed once
to add a **`category` field** (`post_claim`'s final argument) — live-verified:
posted a claim with `category="psychology"` and confirmed `get_claim`
round-trips it correctly.

Verified end-to-end against real infrastructure, not just local mocks: a claim was
posted ("A daily 10-minute walk reduces resting heart rate by 5% over 8 weeks"),
challenged with a real Wikipedia source, and real multi-validator LLM consensus
(mixed OpenAI/Anthropic/Google/Mistral/Qwen/GLM/Grok models behind studio.genlayer.com's
router) resolved the challenge — confidence moved 5000 → 3800 bps with this rationale:

> "The evidence highlights regression toward the mean: if the original 5% heart-rate
> drop came from unusually high baseline measurements or uncontrolled before-after
> data, some apparent improvement may be statistical artifact rather than a true
> walking effect. This moderately weakens confidence, but does not directly refute
> the claim. [sources: Wikipedia article; credibility: other. Useful for explaining
> a well-known statistical phenomenon, but not peer-reviewed primary evidence and
> weaker than a systematic review or trial.]"

This run caught and fixed a real GenVM constraint not mentioned in current docs:
**calldata encoding rejects bare Python floats crossing a nondet boundary.**
`_validate_delta_fields` originally returned `delta_pct` as a `float`; the leader's
`run_nondet_unsafe` result (and, separately, `prompt_non_comparative`'s result)
crashed with `TypeError: not calldata encodable -20.0: float` the moment a live
LLM returned a non-integer percentage. Fixed by converting to integer basis points
*inside* `_validate_delta_fields`, before any value crosses a nondet boundary — see
the comment at that function and in `_resolve_comparative`/`_resolve_non_comparative`.

Redeployed once since the original run above to add **`evidence_description`** —
`challenge()` now requires a free-text explanation of what the evidence shows,
threaded into the LLM prompt alongside the fetched source text. Live-verified:
a challenger claimed a study "had no control group," backed by an unrelated
Wikipedia page; the validator correctly refused to trust the claim and returned
`delta_bps: 0` with the rationale "the challenger's specific critique is not
supported by this source" — proving the contract weighs the stated argument
against the real fetched content rather than taking it at face value.

**Testnet Asimov**: `0xC576bd60228384Bd8F7345Ff106fb80BA6Ec8e70`, redeployed
from the same `replicourt-asimov-deployer-2` account after the settlement-
consistency fixes. Four prior contract versions are now orphaned and no
longer referenced by the frontend: the original deploy at
`0xf6a56C9ec97E80479c0e430A10FE47663bBA61D5` (pre-`category`), its successor at
`0xB0762453FB43D6B1e7AD442D5F2175aB8d887777` (pre-audit-fixes),
`0xF17e675b3598C704ddAD3e8085B64Db8422eB56E` (pre-repeated-rounds), and
`0x304253B50d2F8FC1f91aBa5DDEfe36EA26443434` (pre-settlement-consistency). The
original deployment's `post_claim`/`challenge` reached real multi-validator
consensus (`FINISHED_WITH_RETURN`, a real LLM-derived rationale about
publication bias computed on-chain) — confirmed via `genlayer trace <txId>`,
since real-testnet transaction receipts don't expose the same nested `data.*`
shape studionet's do.

**A real testnet-Asimov RPC quirk hit during the audit redeploy, worth knowing if
you deploy here yourself:** the public node occasionally returns `error -32005:
transaction gas rate limit exceeded: node is at capacity` under load, and a
deploy's own `waitForTransactionReceipt` can need several minutes (observed ~5)
to reach `ACCEPTED` — `deploy/deployScript.ts`'s wait was bumped from 40 retries
at 3s (120s total) to 100 retries at 5s (500s total) after hitting this for real.

One thing worth knowing if you deploy here yourself: **unlike studio.genlayer.com,
real testnet transactions don't auto-finalize.** After consensus, a transaction sits
in `READY_TO_FINALIZE` — state changes aren't visible to reads until a separate,
public `finalize(txId)` call succeeds, and that call itself reverts if attempted
before the protocol's appeal/finality window has elapsed. This is expected chain
behavior (anyone can call finalize — a keeper, the poster, a frontend cron), not a
RepliCourt bug. The frontend now offers a manual **Finalize** button on
`ClaimDetail` for any tx it submitted itself (see `lib/txLog.ts` and
`FinalizePanel.tsx`) — there's no server-side transaction index, so this only
covers transactions submitted from the same browser; a real always-on keeper is
still future work (see "Explicitly deferred").

**Real protocol appeal is testnet-Asimov-only.** `genlayer-js`'s
`appealTransaction`/`getMinAppealBond` need a chain preset with
`feeManagerContract`/`roundsStorageContract` wired in — studio.genlayer.com's
hosted preset doesn't have them (`getMinAppealBond` fails with "Appeal bond
calculation not supported on this chain"), confirmed live rather than assumed.
The Escalation page's **Appeal on-chain** button (as opposed to `escalate()`'s
contract-level approximation) only renders on testnet Asimov as a result — see
`network.supportsAppeal` in `lib/networks.ts`.

## Repo layout

```
contracts/replicourt.py            the Intelligent Contract
tests/direct/                       fast, no-Docker unit tests (25 passing)
tests/integration/                  Studio-mode consensus tests (optional, slower)
deploy/deployScript.ts              one-time deploy script for any network
frontend/                           Vite + React + TypeScript + Tailwind + genlayer-js
frontend/netlify/functions/badge.mts embeddable live confidence badge (SVG)
assets/brand/                       logo/favicon SVG + PNG set
netlify.toml                        Netlify build + functions config
```

## Contract API

`contracts/replicourt.py` exposes three writes and four views. All numeric
fields (`effect_size`, `confidence`, deltas) are **basis-point integers**
(scale 10,000 — e.g. `1500` = 15.00%), never floats — see
[Design decisions](#design-decisions-that-diverge-from-the-illustrative-spec-skeleton)
below for why.

**Writes**

| Method | Signature | What it does |
| --- | --- | --- |
| `post_claim` | `(claim_id, description, effect_size_bps, study_design, source_url, category) -> None` | Stakes the sent GEN on a new claim. Runs a deterministic `strict_eq` check that `source_url` actually resolves before accepting. `category` is free text (blank falls back to `"uncategorized"`); the frontend suggests a fixed list so registry filtering has a stable set to group by. |
| `challenge` | `(challenge_id, claim_id, counter_refs, evidence_description, mode) -> None` | Stakes the sent GEN against a claim (must be nonzero). `mode` is `"comparative"` or `"non_comparative"`. `counter_refs` is capped at 5 URLs. Fetches every URL live, resolves via the matching Equivalence Principle, and settles stakes in the same call. **Can be called repeatedly** against the same claim — there is no terminal lock, see "Repeated challenge rounds" below. |
| `escalate` | `(challenge_id) -> None` | Pays a bond to re-resolve a challenge under a stricter tolerance and a larger (9 vs. 5) validator panel. Only the **most recent** challenge round on a claim can be escalated. Confidence, winner status, and payout are kept consistent with each other: if the re-derived result flips the winner, a corrective payout goes to the newly-determined winner (from `claim.stake` or the escalation bond, depending on direction — see "Settlement consistency" below) instead of leaving the stale original payout standing. Whatever bond isn't consumed by a correction is refunded to the caller. |

**Views**

| Method | Returns |
| --- | --- |
| `get_claim(claim_id)` | A single claim's current state (description, effect size, confidence, stake, poster, `round_count`). |
| `get_all_claims()` | Every claim in the registry. |
| `get_challenges_for_claim(claim_id)` | Every challenge round against a claim (one per `challenge()` call — can be more than one), in posting order, each carrying its own `round` number. |
| `get_evidence_trail(claim_id)` | The full timestamped evidence trail used to drive the confidence chart, one entry per round (plus one more per escalation), each carrying `round`. |

## Design decisions that diverge from the illustrative spec skeleton

The hackathon spec's contract skeleton is explicitly marked "illustrative,
confirm exact SDK signatures at build time." Several things needed correcting
against the real, current GenLayer docs and SDK:

- **No `float`/`dict`/`list` in storage.** GenVM only supports sized integers
  and `TreeMap`/`DynArray`. `effect_size`, `confidence`, and deltas are stored
  as **basis-point integers** (scale 10,000) — converted to human percentages
  only when building LLM prompts or displaying in the UI.
- **`challenges: TreeMap[str, Challenge]` was added** — the spec's skeleton
  never introduced this, but FR6 (slash the loser, reward the winner) needs
  per-challenge stake bookkeeping that survives the call that resolves it.
- **Comparative EP for the numeric effect-size delta** is implemented as a
  hand-rolled `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` pair with an
  explicit percentage-point tolerance, per current docs guidance ("most
  contracts outgrow `prompt_comparative` quickly — start with a custom
  validator function"). This is still Comparative EP in spirit: both sides
  independently re-derive the number and must converge.
- **Non-Comparative EP for methodology critiques** uses
  `gl.eq_principle.prompt_non_comparative` — the validator judges the leader's
  stated delta against the fetched source text and explicit criteria, without
  re-deriving a second number. This is exactly its documented use case.
- **Source-existence checks** use `gl.eq_principle.strict_eq` — deterministic,
  no LLM needed.
- **`challenge()` resolves and settles in one call**, rather than a separate
  `resolve_challenge()` step. This matches the spec's own non-functional
  requirement ("a challenge resolution should resolve within one Leader
  round") and avoids a second call that would need to carry escrow state.
- **Slashing (FR6):** the loser's stake is split 80/20 — the winner gets their
  own stake back plus 80% of the loser's stake; the remaining 20% simply stays
  as the contract's un-withdrawn balance (a protocol reserve; there's no
  treasury withdrawal method in this MVP). Outbound payouts to posters/
  challengers (plain addresses) use the documented external-message pattern:
  an empty `@gl.evm.contract_interface` class whose
  `emit_transfer(value=..., on='finalized')` sends GEN to a plain address.
- **`escalate()` is a defensible approximation, not the real appeal flow.**
  GenLayer has no contract-level "bigger validator panel" hook — real
  escalation is the protocol's transaction-level appeal flow
  (`genlayer appeal <hash>`), which operates on a resolved transaction's
  finality window, not on arbitrary contract state. `escalate()` here is a
  contract-level stand-in: an extra bond, a stricter numeric tolerance
  (3.0pp vs. the normal 8.0pp), and a re-recorded evidence event. It keeps
  confidence, winner status, and payout mutually consistent — see
  "Settlement consistency" below for how, since a first version of this that
  simply revised confidence without touching status/payout was flagged and
  fixed. The UI's Escalation page visualizes this as an expanding validator
  panel (5 → 9 dots) to represent the concept, and its copy is honest about
  when the bond is fully refunded vs. partially redirected as a corrective
  payment. Since a claim can now be challenged repeatedly (below),
  `escalate()` only allows escalating the **most recent** round — escalating
  an older one would corrupt the confidence trajectory later rounds already
  built on top of.

## Two real GenVM SDK bugs/quirks found and worked around while building this

1. **`DynArray[str]()` (bare instantiation) raises `TypeError: this class
   can't be instantiated by user`.** The fix: assign a plain Python `list`
   directly to a `DynArray[...]`-typed field — the storage layer converts it
   on assignment. (`gl.storage.inmem_allocate(DynArray[str])` is the
   documented in-memory-allocation primitive, but it errored in the direct-
   test harness in this SDK version — plain-list assignment is both simpler
   and worked reliably.)
2. **Direct-mode test mocking can't return bare Python floats from a mocked
   LLM response** — `gl_call encode error: not calldata encodable -2.0: float`.
   Test mocks use integer `delta_pct` values; the contract's own parsing
   (`float(str(raw))`) handles both ints and floats fine at runtime.

## Audit fixes

An independent audit of this project (re-reading every file fresh against the
requirements, not trusting prior claims) found and every item below was fixed,
verified, and redeployed — not just patched and assumed to work:

- **`escalate()`'s bond was collected and never used** — refunded to the
  caller now instead of sitting in the contract with no defined purpose.
  Live-verified on studionet by checking the contract's own balance before and
  after a real escalate() call matched the exact expected math (not just "the
  call didn't revert") — this also surfaced a real, separate finding: even
  studionet's deferred (`on="finalized"`) payouts need a few seconds past
  `ACCEPTED` before they actually land, not just testnet Asimov.
- **The confidence chart double-counted an escalated challenge's delta**,
  since the contract subtracts the original delta before applying the
  escalated one (so both events staying in the evidence trail summed wrong).
  Fixed to mirror the contract's own subtract-then-add math exactly, verified
  against the exact numbers in `test_escalate_re_resolves_and_updates_evidence_trail`,
  and the chart's final point is now always forced to match the authoritative
  `confidence_bps` shown in the gauge next to it, so the two can never
  visibly disagree even if the historical reconstruction is ever imperfect.
- **The embeddable badge function had a stale, retired contract address for
  testnet Asimov** — every badge for that network 404'd in production. Fixed,
  and the two addresses now live in one shared `contractAddresses.ts` that
  both the app and the Netlify Function import, instead of duplicated
  literals that can drift apart again.
- **`challenge()` had no cap on `counter_refs`** — an unbounded submission
  forces every validator to fetch every URL, inflating consensus cost/time
  with no limit. Capped at 5, contract-side and client-side.
- **`challenge()`'s zero-stake guard was implicit** (relied on the ratio
  check flooring to a nonzero minimum) rather than explicit like
  `post_claim`'s — added the same explicit check.
- **Checks-effects-interactions ordering**: `challenge()` set the
  re-challenge guard (`claim.status = "resolved"`) *after* the external
  payout call, not before. Reordered — defensive regardless of whether
  GenVM's async message model actually permits synchronous re-entry.
- **No global error boundary** — a render-time exception anywhere crashed to
  a blank white screen. Added one.
- **No loading indicator during initial boot** — the lazy-loaded ~1.6MB
  wallet bundle showed nothing at all while loading. Added a spinner.
- **Silent data loss**: `evidence_description` was truncated to 1000 chars
  server-side with no client-side warning. Added a `maxLength` + live
  character counter.
- **No client-side guard against 0-value stakes/bonds** in Post Claim,
  Challenge, and Escalate — each wasted a wallet-signing round trip before
  reverting on-chain. Added upfront validation to all three.
- **Escalation never disclosed that it doesn't reverse the original stake
  payout** before the user pays a bond. Added explicit copy.
- **The notifications dropdown had no click-outside-to-close handler**
  (inconsistent with the network switcher, which has one). Added.
- **The embeddable badge silently rendered broken in local `vite dev`**
  (Netlify Functions don't run there) with no explanation. Added a dev-mode
  notice.
- Removed dead code: `Claim["status"]` included `"under_challenge"`, which
  the contract never actually sets.
- Fixed `badge.mts` collapsing every failure (RPC down, bad ID, network
  error) into one generic "claim not found" — now distinguishes a real
  missing claim (404, `[EXPECTED] unknown claim`) from a transient failure
  (503, shorter cache).
- Fixed `deployScript.ts` silently deploying from a fresh unfunded account on
  *any* chain (including real testnets) when no keystore was given — now
  throws a clear error for anything other than localnet/studionet. Also
  bumped its deploy-confirmation timeout after hitting a real ~5-minute
  testnet Asimov confirmation delay during this very redeploy.
- Minor: an oxlint-flagged `Date.now()` call during render, a missing
  `.catch()` on a clipboard write, `aria-hidden` on the landing page's
  decorative scrolling ticker, and slightly stronger (timestamp + random
  suffix) client-generated IDs to reduce an already-rare collision window.

Two items from the audit were considered and deliberately left as-is:
`GenLayerClient<any>`/`useAppKitProvider<any>` typing (tightening it risks
breaking the generic across two differently-shaped chain configs for a purely
cosmetic type-safety gain), and the registry/leaderboard/dashboard/
notifications N+1 read pattern (a real scaling limit, but fixing it needs a
new contract view — see "Explicitly deferred").

## Repeated challenge rounds

A GenLayer Foundation Portal steward reviewed the submission and flagged two
concrete gaps: **"each claim closes after one challenge, so the continuously
updating registry is not implemented, and a newly deployed address is not
consumed by the frontend."** Both were real, verified findings, not just
feedback to argue with:

- **`challenge()` permanently locked every claim after one round.** Confirmed
  in the code: it rejected any call against a claim whose `status ==
  "resolved"`, and unconditionally set that status at the end of every
  challenge. Fixed by making `claim.stake` a **persistent backing pool** that
  evolves across rounds instead of being fully paid out once:
  - **Challenger wins a round**: paid `challenger.stake + 80%*claim.stake`
    (same ratio as before). `claim.stake` is reduced by that 80% — the
    leftover 20% simply remains as `claim.stake` going forward (shrinks each
    loss, isn't swept anywhere), so the claim stays challengeable at whatever
    backing remains.
  - **Claim wins a round**: the poster is paid `80%*challenger.stake`
    **only** — `claim.stake` is left untouched, not paid out. This is a
    deliberate change from the pre-existing one-shot model (where the
    poster's whole stake returned to them on every win): posting a claim is
    now an ongoing stake commitment for as long as it's listed, since there's
    no mechanism to replenish `claim.stake` otherwise once repeated rounds
    are allowed.
  - `min_stake` per round is `max(MIN_ABSOLUTE_CHALLENGE_STAKE_WEI,
    claim.stake * CHALLENGE_MIN_RATIO_BPS // CONFIDENCE_SCALE)` — the
    absolute floor exists because a claim whose pool has eroded toward 0
    after repeated losses would otherwise let the ratio-based minimum
    collapse too, decoupling the anti-spam guard from its purpose (cheap
    repeated LLM-consensus rounds are a real validator-cost DoS vector even
    once there's nothing left in the pool to actually extract).
  - No cap on round count — the absolute-stake floor plus real per-round
    LLM-consensus cost is the practical throttle, not an artificial terminal
    state, since a hard cap would just reintroduce the same "closes forever"
    problem the steward flagged.
  - This design was **not** implemented on the first draft — a Plan agent
    was used specifically to stress-test it before writing any code, and
    caught a real self-contradiction (the first draft's claim-wins payout
    both "returned the poster's stake" and "kept it as backing pool," which
    can't both be true) and a second real bug: `escalate()`'s confidence
    recovery (`prior_conf = claim.confidence_bps - ch.delta_bps`) only holds
    if the escalated challenge was the *last* thing to touch
    `confidence_bps` — with repeated rounds now possible, escalating an
    older round while later rounds had already stacked deltas on top would
    corrupt the whole trajectory. Fixed by restricting `escalate()` to only
    the most recent round (`Claim.round_count` / `Challenge.round` were added
    specifically to make this checkable).
  - Live-verified end-to-end on studionet: a claim was challenged twice in a
    row, `round_count` went `0 → 1 → 2`, and confidence accumulated correctly
    across both rounds (`5000 → 5000 → 5200` bps) — this is the literal
    "continuously updating" proof.
- **A fresh deploy's address never reached the running frontend.**
  `deploy/deployScript.ts` wrote `VITE_CONTRACT_ADDRESS` into
  `frontend/.env.local`, but nothing in the app ever read that variable —
  the actual source of truth, `frontend/src/lib/contractAddresses.ts`
  (introduced in the audit-fix pass above to stop the studionet/testnetAsimov
  addresses from being duplicated in two places), was hardcoded and manually
  edited after every deploy. Fixed: the deploy script now writes the deployed
  address directly into `contractAddresses.ts` itself, for every chain the
  frontend's network switcher exposes — confirmed by construction on the
  redeploys that produced the addresses at the top of this README, with zero
  manual editing involved.
- **The integration test was stale against current method signatures.**
  `tests/integration/test_full_flow.py` called `post_claim` with 5 args
  (missing `category`) and `challenge` with 4 (missing
  `evidence_description`) — both added in earlier sessions. Fixed, and
  extended to actually exercise a second challenge round against the same
  claim as the direct test of the "continuously updating" property.
- Two frontend files silently relied on the same "one challenge per claim"
  assumption without the steward ever mentioning them —
  `Leaderboard.tsx` and `NotificationsBell.tsx` both only looked at
  `challenges[0]`. Fixed to iterate every round. `EscalationPanel.tsx` now
  only offers the Escalate action on a claim's latest round, matching the
  new contract guard, instead of letting a user hit an on-chain revert on an
  older one.

## Settlement consistency (second steward round)

After the repeated-challenge-rounds fix above shipped, the steward flagged
one more concrete settlement issue: **"make comparative validators agree on
the same side of the payout boundary, and make escalation reconcile
confidence, winner status, and payout consistently, including clamped
rounds."** Two real, verified bugs, both in settlement logic that had never
been exercised by repeated challenge rounds until the previous fix made them
reachable:

- **Comparative validators could "agree" while disagreeing about who won.**
  `_resolve_comparative`'s `validator_fn` only checked numeric closeness
  between the leader's `delta_bps` and a validator's own independently
  re-derived number (`abs(mine - leader) <= tolerance_bps`, 800bps normally /
  300bps escalated). The win/lose decision, `challenger_wins = delta_bps <=
  -CHALLENGER_WIN_THRESHOLD_BPS` (500bps), is only checked afterward, on the
  single leader-accepted number. Because both tolerance bands are wider than
  the threshold's margin from zero, a validator's own number could land on
  the *opposite side* of the payout boundary from the leader's — e.g.
  leader=-450 (claim wins), validator's own=-950 (challenger wins), a 500bps
  gap, within the 800bps tolerance — and consensus would still accept the
  leader's result, since it only measures numeric closeness, never agreement
  on which side of the boundary the number falls. Fixed by adding a
  same-side-of-threshold check to `validator_fn` alongside the existing
  tolerance check, so equivalence now requires both: close enough, *and* on
  the same side of the payout boundary. Lives in the shared
  `_resolve_comparative` function, so it covers both `challenge()`'s call and
  `escalate()`'s call automatically — the escalated path isn't immune either
  (two numbers within even a 300bps band can still straddle a fixed threshold
  point).
- **`escalate()` didn't reconcile confidence, status, and payout.** Three
  compounding gaps:
  - `prior_conf = claim.confidence_bps - ch.delta_bps` silently reconstructed
    the wrong pre-round baseline whenever the original `challenge()` call's
    confidence update had clamped at 0 or 10000 — the module docstring even
    admitted this ("doesn't perfectly undo clamping"). Fixed at the root: the
    `Challenge` record now stores `confidence_before_bps` directly, captured
    at `challenge()`-time before that round's delta is applied, so recovery
    is exact regardless of clamping.
  - `ch.status` was set once in `challenge()` and never reassigned in
    `escalate()`, even though `ch.delta_bps` gets overwritten with a value
    that can flip which side of the win/lose threshold it falls on — status
    could flatly contradict the currently-recorded delta. Fixed: `escalate()`
    now recomputes the winner the same way `challenge()` does and reassigns
    `ch.status` to match.
  - The original settlement's payout was never revisited, so a flip in the
    escalated result never moved any money. Funds already sent to an
    external address can't be clawed back on-chain, so this had to be a
    forward corrective payment, not a literal reversal: when escalation flips
    claim-wins → challenger-wins, the correction is funded from `claim.stake`
    (still fully intact, since the original claim-wins settlement never
    touched it); when it flips challenger-wins → claim-wins, the challenger
    already received their full stake + bonus, so there's no leftover pool
    from that round to draw from — the correction is instead funded from the
    escalation bond, capped at whatever's escrowed (always solvent, an
    insufficient bond just means a partial correction, not a revert). The
    escalation bond therefore now doubles as a corrective-payout source
    rather than being pure spam-prevention; whatever isn't consumed by a
    correction is still refunded as before.
  - `EscalationPanel.tsx`'s copy was updated to match — it no longer claims
    the bond is unconditionally refunded or that escalation can never affect
    the original payout.

## Testing

```bash
cd /root/replicourt
uv venv .venv && source .venv/bin/activate
uv pip install "genlayer-test[sim]" pytest
uvx --from genvm-linter genvm-lint check contracts/replicourt.py
pytest tests/direct/ -v
```

35 direct-mode tests cover: claim posting + source-reachability + category
defaulting, both EP modes'
win/loss decisions, stake-ratio enforcement, the challenger-win-threshold
boundary, comparative-validator boundary agreement (numeric closeness *and*
same-side-of-threshold), escalation (bond-refund/corrective-payout code
paths, the latest-round-only guard, and confidence-baseline recovery across
clamped rounds), repeated challenge rounds against the same claim (including
the exact stake-pool-shrinking math across consecutive challenger wins), the
`counter_refs`/zero-stake/absolute-stake-floor guards, and LLM-response
parsing/resilience (key aliasing, range clamping, markdown-fence/trailing-
comma cleanup).

**Known direct-mode coverage gap** (documented, not silently skipped): GenVM's
direct-mode test harness doesn't simulate cross-layer host calls — outbound
`emit_transfer` payouts and `gl.eq_principle.prompt_non_comparative`'s internal
`ExecPromptTemplate` call aren't mocked there (only plain `ExecPrompt` is).
Both are exercised correctly by design (verified against docs + a live
Studio smoke test), but the full round-trip for the payout and the
non-comparative consensus path is real-network-only test surface — see
`tests/direct/test_stake_settlement.py` and
`tests/direct/test_challenge_non_comparative.py` for exactly what direct mode
does and doesn't prove.

## Getting started

**Prerequisites:** Node.js 20+, Python 3.12+ with [`uv`](https://github.com/astral-sh/uv),
Docker (only if running a local GenLayer Studio instead of the live networks
above), and a free [Reown](https://cloud.reown.com) Project ID for wallet connect.

The fastest way to see it running is to point the frontend at one of the live
deployments above — no contract deploy or local Studio needed:

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in VITE_REOWN_PROJECT_ID (and VITE_CONTRACT_ADDRESS if pinning studionet)
npm run dev
```

Connect a wallet via the nav bar's **Connect** button, switch networks with the
network selector, and post/challenge claims against the live studionet or
testnet Asimov contract. Network + contract addresses are configured in
`src/lib/networks.ts`, not env vars — `VITE_REOWN_PROJECT_ID` is the only
variable the running app actually reads.

### Deploying your own contract instance

Against a hosted network (no local infra needed — studionet is gasless):

```bash
GL_CHAIN=studionet KEYSTORE_PATH=~/.genlayer/keystores/x.json KEYSTORE_PASSWORD=*** \
  npx tsx deploy/deployScript.ts
```

Or against a local GenLayer Studio:

```bash
genlayer init --localnet-version v0.65.0 --numValidators 5   # first time only
genlayer up
GL_CHAIN=localnet npx tsx deploy/deployScript.ts
```

Either way, `deployScript.ts` writes the resulting address directly into
`frontend/src/lib/contractAddresses.ts` — the actual module the running app
imports — for whichever chain already has an entry there (currently
studionet and testnet Asimov, both auto-written with no manual step).
localnet/testnet Bradbury deploys have nowhere in the frontend's network
switcher to be wired into, so those addresses are only printed to the
console.

## Tech stack

- **Contract:** Python (GenVM), GenLayer's Optimistic Democracy consensus,
  `gl.vm.run_nondet_unsafe` (Comparative EP), `gl.eq_principle.prompt_non_comparative`
  (Non-Comparative EP), `gl.eq_principle.strict_eq` (deterministic checks),
  `gl.get_webpage` (live evidence fetching), `@gl.evm.contract_interface` (GEN payouts).
- **Frontend:** Vite, React 19, TypeScript, Tailwind CSS v4, React Router,
  Recharts (confidence chart).
- **Wallet:** Reown AppKit (`@reown/appkit`, `@reown/appkit-adapter-ethers`),
  EIP-1193, custom GenLayer network defs reused from `genlayer-js/chains`.
- **Chain client:** `genlayer-js` (`createClient`, `readContract`/`writeContract`,
  chain presets for studionet/testnetAsimov/localnet).
- **Testing:** `genlayer-test` direct-mode framework (`pytest`), `genvm-lint`.
- **Deployment:** Netlify (frontend), GenLayer studionet + testnet Asimov
  (contract).

## Explicitly deferred (out of scope for this hackathon build)

- An **always-on finalize keeper** for testnet Asimov — the frontend's
  `finalize(txId)` button (see "Live deployment") only covers transactions
  submitted from the same browser, since there's no server-side transaction
  index; a real keeper (scheduled function + a DB of pending tx ids) is future
  work.
- The **registry, leaderboard, dashboard, and notifications all use an N+1
  read pattern** (one `get_challenges_for_claim` call per claim) — fine at
  hackathon scale, but the contract doesn't expose a batched or wallet-indexed
  view, so this wouldn't scale to a registry with thousands of claims without
  either a new view method or an off-chain indexer.
- Cross-contract composition — single contract only.
- Formal economic modeling of the 80/20 slash ratio — it's a documented,
  tunable constant, not a derived model.
- **No withdrawal mechanism for `claim.stake`, under any circumstance.**
  Posting a claim is a permanent, one-way stake commitment: `_settle()`'s
  claim-wins branch pays the poster only the 80% bonus (not `claim.stake`
  itself), the challenger-wins branch reduces `claim.stake` but never returns
  any of it to the poster, and `escalate()`'s corrective-settlement paths
  (see "Settlement consistency" above) never touch it either. A poster could
  win every challenge against a claim forever and never recover the GEN they
  originally staked. This is disclosed directly in the Post Claim form (see
  `PostClaim.tsx`) rather than hidden — a real withdrawal mechanism (e.g.
  gated to `round_count == 0`) is future work, not implemented here.

## License

MIT — see [`LICENSE`](LICENSE).
