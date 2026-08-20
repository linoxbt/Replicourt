"""
Integration test: proves real multi-validator consensus resolves a challenge,
not just the mocked leader-only logic already covered by tests/direct/ (23
passing tests there cover every business-logic branch via mock_web/mock_llm).

Requires a live GenLayer Studio localnet:

    genlayer up
    gltest tests/integration/ -v -s --network localnet

This test hits the real network for both the claim's source_url and the
challenge's counter_refs (Wikipedia pages — stable, always reachable, cheap
to fetch) and uses the real LLM configured for local Studio (Ollama, per this
project's setup) to actually derive a confidence delta. It is deliberately
slow (seconds-to-minutes) and is not part of the default fast test loop.
"""
import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

CLAIM_SOURCE_URL = "https://en.wikipedia.org/wiki/Randomized_controlled_trial"
COUNTER_URL = "https://en.wikipedia.org/wiki/Replication_crisis"

CLAIM_STAKE = 10 * 10**18  # 10 GEN
CHALLENGE_STAKE = 3 * 10**18  # 3 GEN, well above the 20% (2 GEN) minimum


@pytest.mark.slow
def test_full_flow_challenge_resolves_via_consensus():
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
        ],
        value=CLAIM_STAKE,
    ).transact()
    assert tx_execution_succeeded(post_receipt)

    claim_after_post = contract.get_claim(args=[claim_id]).call()
    assert claim_after_post["confidence_bps"] == 5000
    assert claim_after_post["status"] == "active"

    challenge_id = "rct-replication-challenge-1"
    challenge_receipt = contract.challenge(
        args=[challenge_id, claim_id, [COUNTER_URL], "comparative"],
        value=CHALLENGE_STAKE,
    ).transact()
    assert tx_execution_succeeded(challenge_receipt)

    claim_after_challenge = contract.get_claim(args=[claim_id]).call()
    assert claim_after_challenge["confidence_bps"] != 5000
    assert claim_after_challenge["status"] == "resolved"

    trail = contract.get_evidence_trail(args=[claim_id]).call()
    assert len(trail) == 1
    assert trail[0]["mode"] == "comparative"
    assert trail[0]["challenge_id"] == challenge_id

    challenges = contract.get_challenges_for_claim(args=[claim_id]).call()
    assert len(challenges) == 1
    assert challenges[0]["status"] in ("resolved_claim_wins", "resolved_challenge_wins")
