import json

SOURCE_URL = "https://example.com/study-1"
COUNTER_URL = "https://example.com/replication-failure"
CLAIM_DESC = "Compound X reduces marker Y by 23% in a randomized controlled trial"


def _post_claim(contract, direct_vm, poster, stake=10 * 10**18):
    direct_vm.mock_web(SOURCE_URL.replace(".", r"\."), {"status": 200, "body": "ok"})
    direct_vm.sender = poster
    direct_vm.value = stake
    contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL, "health")
    direct_vm.value = 0


def _mock_counter_evidence(direct_vm, text="A large pre-registered replication (n=500) found no significant effect."):
    direct_vm.mock_web(COUNTER_URL.replace(".", r"\."), {"status": 200, "body": text})


def test_challenge_comparative_challenger_wins(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=10 * 10**18)
    _mock_counter_evidence(direct_vm)

    llm_response = json.dumps({
        "delta_pct": -30,
        "rationale": "Large pre-registered replication found no effect.",
        "source_credibility": "peer-reviewed replication study",
    })
    direct_vm.mock_llm(r".*", llm_response)

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18  # 30% of claim stake, above the 20% minimum
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    claim = contract.get_claim("claim-1")
    # confidence started at 5000, delta -30% -> -3000bps -> 2000
    assert claim["confidence_bps"] == 2000
    assert claim["status"] == "resolved"

    challenges = contract.get_challenges_for_claim("claim-1")
    assert len(challenges) == 1
    assert challenges[0]["status"] == "resolved_challenge_wins"
    assert challenges[0]["delta_bps"] == -3000
    assert challenges[0]["mode"] == "comparative"

    trail = contract.get_evidence_trail("claim-1")
    assert len(trail) == 1
    assert trail[0]["mode"] == "comparative"
    assert trail[0]["delta_bps"] == -3000

    # Validator independently re-derives the same delta -> converges -> agrees
    assert direct_vm.run_validator() is True


def test_challenge_comparative_claim_wins(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=10 * 10**18)
    _mock_counter_evidence(direct_vm, text="A small underpowered study found a weaker but still positive effect.")

    llm_response = json.dumps({
        "delta_pct": -2,
        "rationale": "Minor weakening from an underpowered study.",
        "source_credibility": "preprint, small sample",
    })
    direct_vm.mock_llm(r".*", llm_response)

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    claim = contract.get_claim("claim-1")
    assert claim["confidence_bps"] == 4800  # 5000 - 200

    challenges = contract.get_challenges_for_claim("claim-1")
    assert challenges[0]["status"] == "resolved_claim_wins"


def test_challenge_comparative_validator_disagrees_outside_tolerance(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=10 * 10**18)
    _mock_counter_evidence(direct_vm)

    direct_vm.mock_llm(r".*", json.dumps({
        "delta_pct": -30,
        "rationale": "Strong contradicting replication.",
        "source_credibility": "peer-reviewed",
    }))

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    # Simulate the validator independently re-deriving a wildly different number
    # (outside the +/-8pp COMPARATIVE_TOLERANCE_PCT) -> must disagree.
    agrees = direct_vm.run_validator(leader_result={
        "delta_bps": -500,
        "rationale": "Weak effect only.",
        "source_credibility": "preprint",
    })
    assert agrees is False


def test_challenge_min_stake_enforced(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=10 * 10**18)
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "x", "source_credibility": "y"}))

    direct_vm.sender = direct_bob
    direct_vm.value = 1 * 10**18  # 10% of claim stake, below the 20% minimum
    with direct_vm.expect_revert("below minimum"):
        contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")


def test_challenge_requires_evidence_description(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=10 * 10**18)
    _mock_counter_evidence(direct_vm)

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    with direct_vm.expect_revert("evidence_description is required"):
        contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "   ", "comparative")
