"""
Integration test: proves real multi-validator consensus resolves challenges —
including a SECOND round against the same claim, the literal proof that this
is a continuously-updating registry and not a one-shot resolve — not just the
mocked leader-only logic already covered by tests/direct/ (31 passing tests
there cover every business-logic branch via mock_web/mock_llm).

Requires a live GenLayer Studio localnet:

    genlayer up
    gltest tests/integration/ -v -s --network localnet

This test hits the real network for both the claim's source_url and the
challenge's counter_refs (Wikipedia pages — stable, always reachable, cheap
to fetch) and uses the real LLM configured for local Studio to actually
derive a confidence delta. It is deliberately slow (seconds-to-minutes) and
is not part of the default fast test loop.

Method signatures below are kept in sync with contracts/replicourt.py by
hand — this file previously drifted (missing post_claim's category arg and
challenge's evidence_description arg) and would have failed if ever actually
run; caught during a GenLayer Foundation Portal review.
"""
import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

CLAIM_SOURCE_URL = "https://en.wikipedia.org/wiki/Randomized_controlled_trial"
COUNTER_URL_1 = "https://en.wikipedia.org/wiki/Replication_crisis"
COUNTER_URL_2 = "https://en.wikipedia.org/wiki/Meta-analysis"

CLAIM_STAKE = 10 * 10**18  # 10 GEN
CHALLENGE_STAKE = 3 * 10**18  # 3 GEN, well above the 20% (2 GEN) minimum for round 1


@pytest.mark.slow
def test_full_flow_two_challenge_rounds_resolve_via_consensus():
    factory = get_contract_factory("RepliCourt")
    contract = factory.deploy(args=[])

    claim_id = "rct-replication-claim-1"
    post_receipt = contract.post_claim(
        args=[
            claim_id,
            "Randomized controlled trials reduce bias by 90% relative to observational studies",
            9000,  # effect_size_bps: 90.00%
            "Meta-analysis of trial methodology",
            CLAIM_SOURCE_URL,
            "methodology",  # category
        ],
        value=CLAIM_STAKE,
    ).transact()
    assert tx_execution_succeeded(post_receipt)

    claim_after_post = contract.get_claim(args=[claim_id]).call()
    assert claim_after_post["confidence_bps"] == 5000
    assert claim_after_post["status"] == "active"
    assert claim_after_post["round_count"] == 0

    # --- Round 1 ---
    challenge_1_id = "rct-replication-challenge-1"
    challenge_1_receipt = contract.challenge(
        args=[
            challenge_1_id,
            claim_id,
            [COUNTER_URL_1],
            "The replication crisis literature suggests RCT bias-reduction claims are often overstated.",
            "comparative",
        ],
        value=CHALLENGE_STAKE,
    ).transact()
    assert tx_execution_succeeded(challenge_1_receipt)

    claim_after_round_1 = contract.get_claim(args=[claim_id]).call()
    assert claim_after_round_1["confidence_bps"] != 5000
    assert claim_after_round_1["status"] == "contested"
    assert claim_after_round_1["round_count"] == 1
    # The claim is NOT permanently locked — this is the property that was
    # previously broken and is the actual point of this test.

    # --- Round 2: prove the registry is genuinely continuously-updating ---
    challenge_2_id = "rct-replication-challenge-2"
    # min_stake for round 2 is a ratio of the (possibly now-shrunk) claim.stake,
    # floored by MIN_ABSOLUTE_CHALLENGE_STAKE_WEI — 1 GEN clears either case
    # comfortably at this claim size.
    challenge_2_receipt = contract.challenge(
        args=[
            challenge_2_id,
            claim_id,
            [COUNTER_URL_2],
            "Meta-analytic methodology supports that well-conducted RCTs do meaningfully reduce bias.",
            "comparative",
        ],
        value=1 * 10**18,
    ).transact()
    assert tx_execution_succeeded(challenge_2_receipt)

    claim_after_round_2 = contract.get_claim(args=[claim_id]).call()
    assert claim_after_round_2["round_count"] == 2
    assert claim_after_round_2["confidence_bps"] != claim_after_round_1["confidence_bps"]

    trail = contract.get_evidence_trail(args=[claim_id]).call()
    assert len(trail) == 2
    assert trail[0]["challenge_id"] == challenge_1_id
    assert trail[0]["round"] == 1
    assert trail[1]["challenge_id"] == challenge_2_id
    assert trail[1]["round"] == 2

    challenges = contract.get_challenges_for_claim(args=[claim_id]).call()
    assert len(challenges) == 2
    for ch in challenges:
        assert ch["status"] in ("resolved_claim_wins", "resolved_challenge_wins")
