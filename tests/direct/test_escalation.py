import json

SOURCE_URL = "https://example.com/study-1"
COUNTER_URL = "https://example.com/replication-failure"
CLAIM_DESC = "Compound X reduces marker Y by 23% in a randomized controlled trial"
CLAIM_STAKE = 10 * 10**18


def _post_claim(contract, direct_vm, poster, stake=CLAIM_STAKE):
    direct_vm.mock_web(SOURCE_URL.replace(".", r"\."), {"status": 200, "body": "ok"})
    direct_vm.sender = poster
    direct_vm.value = stake
    contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL, "health")
    direct_vm.value = 0


def _mock_counter_evidence(direct_vm, text="counter-evidence text"):
    direct_vm.mock_web(COUNTER_URL.replace(".", r"\."), {"status": 200, "body": text})


def _challenge(contract, direct_vm, challenger, delta_pct, challenge_id="challenge-1"):
    direct_vm.mock_llm(r".*", json.dumps({
        "delta_pct": delta_pct, "rationale": "initial evidence", "source_credibility": "peer-reviewed",
    }))
    direct_vm.sender = challenger
    direct_vm.value = 3 * 10**18
    contract.challenge(challenge_id, "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")
    direct_vm.value = 0


def test_escalate_requires_bond(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)
    _mock_counter_evidence(direct_vm)
    _challenge(contract, direct_vm, direct_bob, delta_pct=-30)

    direct_vm.sender = direct_bob
    direct_vm.value = 0
    with direct_vm.expect_revert("requires a bond"):
        contract.escalate("challenge-1")


def test_escalate_unknown_challenge_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    direct_vm.value = 1 * 10**18
    with direct_vm.expect_revert("unknown challenge"):
        contract.escalate("does-not-exist")


def test_escalate_re_resolves_and_updates_evidence_trail(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)
    _mock_counter_evidence(direct_vm)
    _challenge(contract, direct_vm, direct_bob, delta_pct=-30)

    claim_before = contract.get_claim("claim-1")
    assert claim_before["confidence_bps"] == 2000  # 5000 - 3000

    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({
        "delta_pct": -25, "rationale": "escalated re-derivation, tighter scrutiny", "source_credibility": "peer-reviewed",
    }))

    direct_vm.sender = direct_charlie
    direct_vm.value = 2 * 10**18
    contract.escalate("challenge-1")

    challenges = contract.get_challenges_for_claim("claim-1")
    assert challenges[0]["escalated"] is True
    assert challenges[0]["delta_bps"] == -2500

    claim_after = contract.get_claim("claim-1")
    # prior_conf recovers to 5000 (2000 - (-3000)), then + new delta -2500 -> 2500
    assert claim_after["confidence_bps"] == 2500

    trail = contract.get_evidence_trail("claim-1")
    assert len(trail) == 2
    assert trail[0]["mode"] == "comparative"
    assert trail[1]["mode"] == "escalated_comparative"
    assert trail[1]["delta_bps"] == -2500


def test_escalate_refunds_bond_to_escalator(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    """escalate()'s bond is spam-prevention, not a bet against a re-settlement pool
    that doesn't exist — it must be refunded, not left stuck in the contract. Direct
    mode doesn't simulate the actual emit_transfer host call (see test_stake_settlement.py's
    module docstring), so this asserts the call completes without erroring when the new
    self._pay_out(escalator, bond) line executes, exercising that code path.
    """
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)
    _mock_counter_evidence(direct_vm)
    _challenge(contract, direct_vm, direct_bob, delta_pct=-30)

    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -25, "rationale": "x", "source_credibility": "y"}))

    direct_vm.sender = direct_charlie
    direct_vm.value = 2 * 10**18
    contract.escalate("challenge-1")  # must not raise

    assert contract.get_challenges_for_claim("claim-1")[0]["escalated"] is True


def test_escalate_twice_rejected(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)
    _mock_counter_evidence(direct_vm)
    _challenge(contract, direct_vm, direct_bob, delta_pct=-30)

    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -25, "rationale": "x", "source_credibility": "y"}))

    direct_vm.sender = direct_charlie
    direct_vm.value = 2 * 10**18
    contract.escalate("challenge-1")

    direct_vm.value = 2 * 10**18
    with direct_vm.expect_revert("already escalated"):
        contract.escalate("challenge-1")


def test_escalate_only_allowed_on_most_recent_round(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    """With repeated challenge rounds now allowed, escalating an OLDER round
    would corrupt the confidence trajectory that later rounds already built on
    top of (see the comment in escalate() explaining prior_conf recovery) — the
    contract must reject it and only allow escalating the latest round.
    """
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)
    _mock_counter_evidence(direct_vm)
    _challenge(contract, direct_vm, direct_bob, delta_pct=-30, challenge_id="challenge-1")

    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    _challenge(contract, direct_vm, direct_charlie, delta_pct=10, challenge_id="challenge-2")

    # challenge-1 is no longer the latest round (challenge-2 is) -> rejected
    direct_vm.sender = direct_bob
    direct_vm.value = 2 * 10**18
    with direct_vm.expect_revert("most recent challenge round"):
        contract.escalate("challenge-1")

    # challenge-2 IS the latest round -> allowed
    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": 20, "rationale": "x", "source_credibility": "y"}))
    direct_vm.sender = direct_charlie
    direct_vm.value = 2 * 10**18
    contract.escalate("challenge-2")  # must not raise
    assert contract.get_challenges_for_claim("claim-1")[1]["escalated"] is True
