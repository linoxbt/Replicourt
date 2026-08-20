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
  size, and challenge count, sortable by most-confident / most-contested.
- **Post a claim** — stake GEN on a specific, checkable empirical claim (an
  effect size, a study design, a source citation); a deterministic
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
  rationale, the confidence delta, and the source links — not a single
  overwritten verdict.
- **Confidence chart** — a live chart of a claim's confidence score over time,
  built from its evidence trail.
- **Escalation** — contested resolutions can be escalated to a larger validator
  panel (5 → 9 validators) under a stricter convergence tolerance.
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

**Studionet** (studio.genlayer.com): `0xbafe748FE66B7fB41046E81040195431439dE492`

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

**Testnet Asimov**: `0xf6a56C9ec97E80479c0e430A10FE47663bBA61D5`, deployed from a
fresh `replicourt-asimov-deployer` account funded via testnet-faucet.genlayer.foundation.
`post_claim` and `challenge` were both submitted and reached real multi-validator
consensus (`FINISHED_WITH_RETURN`, a real LLM-derived rationale about publication
bias computed on-chain) — confirmed via `genlayer trace <txId>`, since real-testnet
transaction receipts don't expose the same nested `data.*` shape studionet's do.

One thing worth knowing if you deploy here yourself: **unlike studio.genlayer.com,
real testnet transactions don't auto-finalize.** After consensus, a transaction sits
in `READY_TO_FINALIZE` — state changes aren't visible to reads until a separate,
public `finalize(txId)` call succeeds, and that call itself reverts if attempted
before the protocol's appeal/finality window has elapsed. This is expected chain
behavior (anyone can call finalize — a keeper, the poster, a frontend cron), not a
RepliCourt bug; the frontend doesn't currently drive this call automatically — see
"Explicitly deferred" below.

## Repo layout

```
contracts/replicourt.py     the Intelligent Contract
tests/direct/                fast, no-Docker unit tests (23 passing)
tests/integration/           Studio-mode consensus tests (optional, slower)
deploy/deployScript.ts       one-time deploy script for a fresh localnet
frontend/                    Vite + React + TypeScript + Tailwind + genlayer-js
assets/brand/                logo/favicon SVG + PNG set
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
| `post_claim` | `(claim_id, description, effect_size_bps, study_design, source_url) -> None` | Stakes the sent GEN on a new claim. Runs a deterministic `strict_eq` check that `source_url` actually resolves before accepting. |
| `challenge` | `(challenge_id, claim_id, counter_refs, evidence_description, mode) -> None` | Stakes the sent GEN against a claim. `mode` is `"comparative"` or `"non_comparative"`. Fetches every URL in `counter_refs` live, resolves via the matching Equivalence Principle, and settles stakes in the same call. |
| `escalate` | `(challenge_id) -> None` | Stakes an extra bond to re-resolve an already-resolved challenge under a stricter tolerance and a larger (9 vs. 5) validator panel. Does not reverse the original settlement. |

**Views**

| Method | Returns |
| --- | --- |
| `get_claim(claim_id)` | A single claim's current state (description, effect size, confidence, stake, poster). |
| `get_all_claims()` | Every claim in the registry. |
| `get_challenges_for_claim(claim_id)` | Every challenge (resolved or escalated) against a claim, in posting order. |
| `get_evidence_trail(claim_id)` | The full timestamped evidence trail used to drive the confidence chart. |

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
  (3.0pp vs. the normal 8.0pp), and a re-recorded evidence event. It
  deliberately does **not** reverse stakes already settled by the original
  `challenge()` call — a full re-settlement flow was out of scope for this
  MVP. The UI's Escalation page visualizes this as an expanding validator
  panel (5 → 9 dots) to represent the concept, and is honest in its own
  copy about what "escalated" means here.

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

## Testing

```bash
cd /root/replicourt
uv venv .venv && source .venv/bin/activate
uv pip install "genlayer-test[sim]" pytest
uvx --from genvm-linter genvm-lint check contracts/replicourt.py
pytest tests/direct/ -v
```

23 direct-mode tests cover: claim posting + source-reachability, both EP modes'
win/loss decisions, stake-ratio enforcement, the challenger-win-threshold
boundary, escalation, and LLM-response parsing/resilience (key aliasing, range
clamping, markdown-fence/trailing-comma cleanup).

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

Either way, `deployScript.ts` writes the resulting address into
`frontend/.env.local` as `VITE_CONTRACT_ADDRESS` automatically for
localnet/studionet (testnet Asimov's address is printed, not auto-written —
see [Explicitly deferred](#explicitly-deferred-out-of-scope-for-this-hackathon-build)).

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

- Automatically calling `finalize(txId)` on testnet Asimov after a transaction
  reaches `READY_TO_FINALIZE` (see the Asimov section above) — the frontend
  currently only waits for `ACCEPTED`, which is sufficient on studionet but not
  enough for testnet reads to reflect a write yet.
- The real protocol-native appeal flow as a live, wired button (the UI
  visualizes the concept; triggering a real `genlayer appeal` on a
  transaction hash is future work).
- Cross-contract composition — single contract only.
- Formal economic modeling of the 80/20 slash ratio — it's a documented,
  tunable constant, not a derived model.

## License

MIT — see [`LICENSE`](LICENSE).
