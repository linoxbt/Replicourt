# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
RepliCourt — a staked, continuously-updating registry of empirical scientific claims.

Design notes (verified against docs.genlayer.com at build time, not the hackathon
spec's illustrative skeleton, which is stale on several points):

- No float/dict/list in persistent storage: GenVM only supports sized ints and
  TreeMap/DynArray. effect_size, confidence and deltas are stored as basis-point
  integers (scale 10,000; e.g. -2350 = -23.50%). Converted to human percentages
  only when building LLM prompts.
- Numeric effect-size deltas (the "Comparative Equivalence Principle" from the
  spec) are implemented with a hand-rolled gl.vm.run_nondet_unsafe leader/validator
  pair with an explicit percentage-point tolerance, per current docs guidance
  ("most contracts outgrow prompt_comparative quickly; start with a custom
  validator function"). This is still Comparative EP in spirit: both sides
  independently re-derive the number and must converge.
- Qualitative methodology critiques ("Non-Comparative Equivalence Principle")
  use gl.eq_principle.prompt_non_comparative — the validator judges the leader's
  stated delta against the fetched source text and explicit criteria, without
  re-deriving a second number itself. This is exactly its documented use case.
- Source-existence checks use gl.eq_principle.strict_eq (deterministic, no LLM).
- challenge() resolves and settles stakes in the same call (rather than a
  separate resolve step) — this matches the spec's own non-functional
  requirement that "a challenge resolution should resolve within one Leader
  round," and avoids a second escrow-carrying call.
- Slashing/reward: the loser's stake is split 80/20 (SLASH_WINNER_SHARE_BPS) —
  the winner gets their own stake back plus 80% of the loser's stake; the
  remaining 20% simply stays as the contract's un-withdrawn balance (a
  protocol reserve — no treasury withdrawal method exists in this MVP).
- Outbound payouts to claim posters/challengers (EOAs) use the documented
  external-message pattern: an empty @gl.evm.contract_interface class whose
  emit_transfer(value=..., on='finalized') sends GEN to a plain address.
- escalate() has no native "bigger validator panel" contract hook in GenLayer —
  real escalation is the protocol's transaction-level appeal flow, not a
  contract method. escalate() here is a defensible contract-level
  approximation: an extra bond, a stricter numeric tolerance, and a
  re-recorded evidence event. It revises the recorded confidence and evidence
  trail; it deliberately does NOT reverse stakes already settled by the
  original challenge() call — a full re-settlement flow is out of scope for
  this hackathon MVP.
"""

from genlayer import *
from dataclasses import dataclass
import json
import re
import typing
from datetime import datetime, timezone

# ---- Error prefixes for consensus-aware error classification ----
ERR_EXPECTED = "[EXPECTED]"    # deterministic business-logic error — must match exactly
ERR_EXTERNAL = "[EXTERNAL]"    # external API 4xx — must match exactly
ERR_TRANSIENT = "[TRANSIENT]"  # network/5xx — both sides hitting transient is fine
ERR_LLM = "[LLM_ERROR]"        # malformed LLM output — always disagree, force rotation

CONFIDENCE_SCALE = 10_000            # basis points denominator (100.00% = 10000)
INITIAL_CONFIDENCE_BPS = 5000        # neutral 50% prior for a freshly posted claim
CHALLENGE_MIN_RATIO_BPS = 2000       # challenger stake must be >= 20% of the claim's stake
COMPARATIVE_TOLERANCE_PCT = 8.0      # leader/validator deltas must agree within +/-8pp
ESCALATED_TOLERANCE_PCT = 3.0        # tighter tolerance once a challenge is escalated
SLASH_WINNER_SHARE_BPS = 8000        # winner takes 80% of the loser's stake
CHALLENGER_WIN_THRESHOLD_BPS = 500   # confidence must drop >=5pp for the challenger to "win"
MAX_SOURCE_CHARS = 3000              # per-source text budget fed into prompts


@allow_storage
@dataclass
class Claim:
    id: str
    poster: Address
    description: str
    effect_size_bps: i32
    study_design: str
    source_url: str
    stake: u256
    confidence_bps: u32
    status: str          # "active" | "under_challenge" | "resolved"
    created_at: u64


@allow_storage
@dataclass
class Challenge:
    id: str
    claim_id: str
    challenger: Address
    counter_refs: DynArray[str]
    evidence_description: str  # challenger's own explanation of what the evidence shows
    mode: str             # "comparative" | "non_comparative"
    stake: u256
    status: str            # "resolved_claim_wins" | "resolved_challenge_wins"
    delta_bps: i32
    rationale: str
    escalated: bool
    created_at: u64
    resolved_at: u64


@allow_storage
@dataclass
class EvidenceEvent:
    claim_id: str
    challenge_id: str
    delta_bps: i32
    evidence_refs: DynArray[str]
    evidence_description: str
    mode: str
    rationale: str
    timestamp: u64


# Sending GEN to a plain address (EOA) is an external message and uses the EVM
# contract-interface syntax even though the recipient isn't a contract.
# See: https://docs.genlayer.com/developers/intelligent-contracts/features/value-transfers
@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass


class RepliCourt(gl.Contract):
    claims: TreeMap[str, Claim]
    claim_ids: DynArray[str]
    challenges: TreeMap[str, Challenge]
    challenge_ids_by_claim: TreeMap[str, DynArray[str]]
    evidence_trail: TreeMap[str, DynArray[EvidenceEvent]]

    def __init__(self):
        pass

    # ---------------- internal helpers ----------------

    def _now(self) -> u64:
        return u64(int(datetime.now(timezone.utc).timestamp()))

    def _fetch_sources(self, refs: list) -> str:
        text = ""
        for ref in refs:
            page = gl.nondet.web.get(ref)
            if page.status >= 500:
                raise gl.vm.UserError(f"{ERR_TRANSIENT} source temporarily unavailable: {ref}")
            if page.status >= 400:
                raise gl.vm.UserError(f"{ERR_EXTERNAL} source unreachable: {ref} ({page.status})")
            text += f"\n--- SOURCE: {ref} ---\n" + page.body.decode("utf-8", "ignore")[:MAX_SOURCE_CHARS]
        return text

    def _clean_json_text(self, text: str) -> dict:
        first, last = text.find("{"), text.rfind("}")
        if first == -1 or last == -1:
            raise gl.vm.UserError(f"{ERR_LLM} no JSON object in response")
        snippet = re.sub(r",(?!\s*?[\{\[\"'\w])", "", text[first:last + 1])
        try:
            return json.loads(snippet)
        except Exception:
            raise gl.vm.UserError(f"{ERR_LLM} malformed JSON from model")

    def _validate_delta_fields(self, data) -> dict:
        if not isinstance(data, dict):
            data = self._clean_json_text(str(data))
        raw = data.get("delta_pct")
        if raw is None:
            for alt in ("delta", "confidence_delta", "delta_percent"):
                if alt in data:
                    raw = data[alt]
                    break
        if raw is None:
            raise gl.vm.UserError(f"{ERR_LLM} missing delta_pct. keys={list(data.keys())}")
        try:
            delta_pct = float(str(raw).strip().rstrip("%"))
        except (TypeError, ValueError):
            raise gl.vm.UserError(f"{ERR_LLM} non-numeric delta_pct: {raw}")
        delta_pct = max(-100.0, min(100.0, delta_pct))
        # GenVM's calldata encoder rejects bare Python floats crossing a nondet
        # boundary (confirmed against real Studio infra, not just a test-mock
        # quirk: "TypeError: not calldata encodable -20.0: float" when a
        # leader_fn/nondet block tried to return one) — convert to integer
        # basis points immediately so no float ever leaves this function.
        delta_bps = int(round(delta_pct * 100))
        return {
            "delta_bps": delta_bps,
            "rationale": str(data.get("rationale", ""))[:1500],
            "source_credibility": str(data.get("source_credibility", ""))[:500],
        }

    def _resolve_comparative(
        self, description: str, effect_size_bps: int, refs: list, evidence_description: str, tolerance_pct: float
    ):
        original_pct = effect_size_bps / 100.0

        def leader_fn():
            evidence = self._fetch_sources(refs)
            prompt = f"""
You are re-deriving a confidence adjustment for a scientific claim given new counter-evidence.

ORIGINAL CLAIM: {description}
ORIGINAL STATED EFFECT SIZE: {original_pct}%

CHALLENGER'S EXPLANATION OF THE EVIDENCE:
{evidence_description}

FETCHED SOURCE TEXT:
{evidence}

Weigh the challenger's explanation against what the fetched source text actually says —
do not simply trust the explanation if the source doesn't support it. Estimate how many
percentage points this evidence should move the claim's confidence score, on a -100 to
+100 scale (negative = weakens the claim, positive = strengthens it). State the
credibility of each source (peer-reviewed / preprint / blog / other).

Return ONLY JSON: {{"delta_pct": <number -100..100>, "rationale": "<= 400 chars", "source_credibility": "<= 200 chars"}}
"""
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            return self._validate_delta_fields(raw)

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                leader_msg = getattr(leaders_res, "message", "")
                try:
                    leader_fn()
                    return False  # leader errored, we succeeded -> disagree
                except gl.vm.UserError as e:
                    msg = getattr(e, "message", str(e))
                    if msg.startswith(ERR_EXPECTED) or msg.startswith(ERR_EXTERNAL):
                        return msg == leader_msg
                    if msg.startswith(ERR_TRANSIENT) and str(leader_msg).startswith(ERR_TRANSIENT):
                        return True
                    return False
                except Exception:
                    return False
            mine = leader_fn()
            # Comparative Equivalence Principle: independently re-derive the delta,
            # must converge within an explicit percentage-point tolerance
            # (expressed in basis points here since deltas are ints, see above).
            tolerance_bps = int(round(tolerance_pct * 100))
            return abs(mine["delta_bps"] - leaders_res.calldata["delta_bps"]) <= tolerance_bps

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        delta_bps = result["delta_bps"]
        rationale = f"{result['rationale']} [sources: {result['source_credibility']}]"[:2000]
        return delta_bps, rationale

    def _resolve_non_comparative(
        self, description: str, effect_size_bps: int, refs: list, evidence_description: str
    ):
        original_pct = effect_size_bps / 100.0

        def fetch_source():
            return self._fetch_sources(refs)

        task = f"""
You are assessing a qualitative methodology critique submitted as counter-evidence
against a scientific claim.

ORIGINAL CLAIM: {description}
ORIGINAL STATED EFFECT SIZE: {original_pct}%

CHALLENGER'S STATED CRITIQUE:
{evidence_description}

Read the source text and determine whether the challenger's critique is well-founded and
actually supported by the source, then recommend a confidence adjustment.

Return ONLY JSON: {{"delta_pct": <number -100..100>, "rationale": "<= 400 chars", "source_credibility": "<= 200 chars"}}
"""
        criteria = """
The recommended delta_pct must be justified by specific methodological flaws that are
actually present in the source text, not fabricated or assumed, and must match what the
challenger claims — reject the critique if the challenger's stated flaw isn't the one
actually supported by the source. A well-founded, serious flaw (no control group, tiny
sample size, p-hacking, failed replication) should move delta_pct meaningfully negative.
A weak or unsubstantiated critique should move delta_pct near zero. The rationale must
name the specific flaw(s) cited from the source text; reject critiques that cite a flaw
with no support in the source text.
"""
        raw = gl.eq_principle.prompt_non_comparative(fetch_source, task=task, criteria=criteria)
        parsed = self._validate_delta_fields(raw)
        delta_bps = parsed["delta_bps"]
        rationale = f"{parsed['rationale']} [sources: {parsed['source_credibility']}]"[:2000]
        return delta_bps, rationale

    def _pay_out(self, recipient: Address, amount: u256) -> None:
        if amount == u256(0):
            return
        _Payee(recipient).emit_transfer(value=amount, on="finalized")

    def _settle(self, claim: Claim, ch: Challenge, challenger_wins: bool) -> None:
        if challenger_wins:
            loser_stake = claim.stake
            winner_bonus = loser_stake * u256(SLASH_WINNER_SHARE_BPS) // u256(CONFIDENCE_SCALE)
            self._pay_out(ch.challenger, ch.stake + winner_bonus)
        else:
            loser_stake = ch.stake
            winner_bonus = loser_stake * u256(SLASH_WINNER_SHARE_BPS) // u256(CONFIDENCE_SCALE)
            self._pay_out(claim.poster, claim.stake + winner_bonus)

    # ---------------- writes ----------------

    @gl.public.write.payable
    def post_claim(self, claim_id: str, description: str, effect_size_bps: int,
                    study_design: str, source_url: str) -> None:
        if claim_id in self.claims:
            raise gl.vm.UserError(f"{ERR_EXPECTED} claim id already exists")
        stake = gl.message.value
        if stake == u256(0):
            raise gl.vm.UserError(f"{ERR_EXPECTED} claim requires a nonzero stake")

        def check_source() -> str:
            page = gl.nondet.web.get(source_url)
            return "ok" if page.status < 400 else "unreachable"

        # Source-existence check: deterministic (DOI/URL either resolves or not),
        # so strict equality is the right EP mode — no LLM involved.
        reachability = gl.eq_principle.strict_eq(check_source)
        if reachability != "ok":
            raise gl.vm.UserError(f"{ERR_EXPECTED} source_url did not resolve")

        self.claims[claim_id] = Claim(
            id=claim_id,
            poster=gl.message.sender_address,
            description=description,
            effect_size_bps=i32(effect_size_bps),
            study_design=study_design,
            source_url=source_url,
            stake=stake,
            confidence_bps=u32(INITIAL_CONFIDENCE_BPS),
            status="active",
            created_at=self._now(),
        )
        self.claim_ids.append(claim_id)

    @gl.public.write.payable
    def challenge(
        self, challenge_id: str, claim_id: str, counter_refs: list, evidence_description: str, mode: str
    ) -> None:
        if claim_id not in self.claims:
            raise gl.vm.UserError(f"{ERR_EXPECTED} unknown claim")
        if challenge_id in self.challenges:
            raise gl.vm.UserError(f"{ERR_EXPECTED} challenge id already exists")
        if mode not in ("comparative", "non_comparative"):
            raise gl.vm.UserError(f"{ERR_EXPECTED} mode must be comparative or non_comparative")
        if not evidence_description.strip():
            raise gl.vm.UserError(f"{ERR_EXPECTED} evidence_description is required")

        claim = self.claims[claim_id]
        if claim.status == "resolved":
            raise gl.vm.UserError(f"{ERR_EXPECTED} claim already resolved")

        stake = gl.message.value
        min_stake = claim.stake * u256(CHALLENGE_MIN_RATIO_BPS) // u256(CONFIDENCE_SCALE)
        if stake < min_stake:
            raise gl.vm.UserError(f"{ERR_EXPECTED} challenger stake below minimum")

        refs_list = [str(r) for r in counter_refs]
        evidence_description = evidence_description[:1000]

        if mode == "comparative":
            delta_bps, rationale = self._resolve_comparative(
                claim.description, int(claim.effect_size_bps), refs_list, evidence_description,
                COMPARATIVE_TOLERANCE_PCT
            )
        else:
            delta_bps, rationale = self._resolve_non_comparative(
                claim.description, int(claim.effect_size_bps), refs_list, evidence_description
            )

        new_conf = max(0, min(CONFIDENCE_SCALE, int(claim.confidence_bps) + delta_bps))
        claim.confidence_bps = u32(new_conf)

        challenger_wins = delta_bps <= -CHALLENGER_WIN_THRESHOLD_BPS
        status = "resolved_challenge_wins" if challenger_wins else "resolved_claim_wins"
        now = self._now()

        # Assigning a plain python list into a DynArray[str]-typed dataclass field
        # converts it to persistent storage; DynArray can't be user-instantiated
        # directly (gl.storage.inmem_allocate is for in-memory-only use).
        self.challenges[challenge_id] = Challenge(
            id=challenge_id, claim_id=claim_id, challenger=gl.message.sender_address,
            counter_refs=refs_list, evidence_description=evidence_description, mode=mode,
            stake=stake, status=status,
            delta_bps=i32(delta_bps), rationale=rationale, escalated=False,
            created_at=now, resolved_at=now,
        )
        if claim_id not in self.challenge_ids_by_claim:
            self.challenge_ids_by_claim[claim_id] = []
        self.challenge_ids_by_claim[claim_id].append(challenge_id)

        if claim_id not in self.evidence_trail:
            self.evidence_trail[claim_id] = []
        self.evidence_trail[claim_id].append(EvidenceEvent(
            claim_id=claim_id, challenge_id=challenge_id, delta_bps=i32(delta_bps),
            evidence_refs=refs_list, evidence_description=evidence_description,
            mode=mode, rationale=rationale, timestamp=now,
        ))

        self._settle(claim, self.challenges[challenge_id], challenger_wins)
        claim.status = "resolved"

    @gl.public.write.payable
    def escalate(self, challenge_id: str) -> None:
        if challenge_id not in self.challenges:
            raise gl.vm.UserError(f"{ERR_EXPECTED} unknown challenge")
        bond = gl.message.value
        if bond == u256(0):
            raise gl.vm.UserError(f"{ERR_EXPECTED} escalation requires a bond")

        ch = self.challenges[challenge_id]
        if ch.escalated:
            raise gl.vm.UserError(f"{ERR_EXPECTED} challenge already escalated")
        claim = self.claims[ch.claim_id]
        refs_list = [r for r in ch.counter_refs]

        if ch.mode == "comparative":
            delta_bps, rationale = self._resolve_comparative(
                claim.description, int(claim.effect_size_bps), refs_list, ch.evidence_description,
                ESCALATED_TOLERANCE_PCT
            )
        else:
            delta_bps, rationale = self._resolve_non_comparative(
                claim.description, int(claim.effect_size_bps), refs_list, ch.evidence_description
            )

        # Recover the claim's confidence as it stood before this challenge's original
        # delta, then apply the re-derived escalated delta. This is an approximation
        # (it doesn't perfectly undo clamping at 0/10000) that is acceptable for the
        # hackathon MVP given escalate() is a "Should", not "Must", requirement.
        prior_conf = int(claim.confidence_bps) - int(ch.delta_bps)
        claim.confidence_bps = u32(max(0, min(CONFIDENCE_SCALE, prior_conf + delta_bps)))

        ch.escalated = True
        ch.delta_bps = i32(delta_bps)
        ch.rationale = rationale
        ch.resolved_at = self._now()

        self.evidence_trail[ch.claim_id].append(EvidenceEvent(
            claim_id=ch.claim_id, challenge_id=challenge_id, delta_bps=i32(delta_bps),
            evidence_refs=ch.counter_refs, evidence_description=ch.evidence_description,
            mode=f"escalated_{ch.mode}", rationale=rationale,
            timestamp=self._now(),
        ))

    # ---------------- views ----------------

    @gl.public.view
    def get_claim(self, claim_id: str) -> dict:
        if claim_id not in self.claims:
            raise gl.vm.UserError(f"{ERR_EXPECTED} unknown claim")
        c = self.claims[claim_id]
        return {
            "id": c.id,
            "poster": str(c.poster),
            "description": c.description,
            "effect_size_bps": int(c.effect_size_bps),
            "study_design": c.study_design,
            "source_url": c.source_url,
            "stake": str(int(c.stake)),
            "confidence_bps": int(c.confidence_bps),
            "status": c.status,
            "created_at": int(c.created_at),
        }

    @gl.public.view
    def get_all_claims(self) -> list:
        return [self.get_claim(cid) for cid in self.claim_ids]

    @gl.public.view
    def get_evidence_trail(self, claim_id: str) -> list:
        if claim_id not in self.evidence_trail:
            return []
        return [
            {
                "claim_id": ev.claim_id,
                "challenge_id": ev.challenge_id,
                "delta_bps": int(ev.delta_bps),
                "evidence_refs": [r for r in ev.evidence_refs],
                "evidence_description": ev.evidence_description,
                "mode": ev.mode,
                "rationale": ev.rationale,
                "timestamp": int(ev.timestamp),
            }
            for ev in self.evidence_trail[claim_id]
        ]

    @gl.public.view
    def get_challenges_for_claim(self, claim_id: str) -> list:
        if claim_id not in self.challenge_ids_by_claim:
            return []
        out = []
        for cid in self.challenge_ids_by_claim[claim_id]:
            ch = self.challenges[cid]
            out.append({
                "id": ch.id,
                "claim_id": ch.claim_id,
                "challenger": str(ch.challenger),
                "counter_refs": [r for r in ch.counter_refs],
                "evidence_description": ch.evidence_description,
                "mode": ch.mode,
                "stake": str(int(ch.stake)),
                "status": ch.status,
                "delta_bps": int(ch.delta_bps),
                "rationale": ch.rationale,
                "escalated": ch.escalated,
                "created_at": int(ch.created_at),
                "resolved_at": int(ch.resolved_at),
            })
        return out
