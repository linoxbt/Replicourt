"""
FR6 stake-settlement coverage.

Note on scope: the actual GEN payout (_pay_out -> an external `emit_transfer`
message to an EOA) is a cross-layer host call that GenVM direct mode does not
simulate (only glsim/Studio do — see gltest/direct/wasi_mock.py, which has no
handler for PostMessage/external messages). Direct mode CAN and does exercise
everything up to and including that call without erroring, so these tests
verify the win/loss decision and resulting status fields — the actual on-chain
transfer is verified against a live localnet in the Studio smoke test
(see tests/integration/test_full_flow.py and the deploy checklist in README).
"""
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


def test_min_challenger_stake_ratio_enforced(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "x", "source_credibility": "y"}))

    # CHALLENGE_MIN_RATIO_BPS = 2000 -> challenger stake must be >= 20% of claim stake (2 GEN here)
    direct_vm.sender = direct_bob
    direct_vm.value = int(1.9 * 10**18)
    with direct_vm.expect_revert("below minimum"):
        contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    direct_vm.value = 2 * 10**18  # exactly at the minimum -> allowed
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")
    assert contract.get_claim("claim-1")["status"] == "resolved"


def test_challenger_wins_settlement_flow_completes(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=CLAIM_STAKE)
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({
        "delta_pct": -30, "rationale": "strong contradicting evidence", "source_credibility": "peer-reviewed",
    }))

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    challenges = contract.get_challenges_for_claim("claim-1")
    assert challenges[0]["status"] == "resolved_challenge_wins"
    assert contract.get_claim("claim-1")["status"] == "resolved"


def test_claim_wins_settlement_flow_completes(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=CLAIM_STAKE)
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({
        "delta_pct": 4, "rationale": "corroborating evidence", "source_credibility": "peer-reviewed",
    }))

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    challenges = contract.get_challenges_for_claim("claim-1")
    assert challenges[0]["status"] == "resolved_claim_wins"
    assert challenges[0]["delta_bps"] == 400
    assert contract.get_claim("claim-1")["confidence_bps"] == 5400
    assert contract.get_claim("claim-1")["status"] == "resolved"


def test_challenger_win_threshold_boundary(direct_vm, direct_deploy, direct_alice, direct_bob):
    """delta of exactly -500bps (-5.00pp) is the CHALLENGER_WIN_THRESHOLD_BPS boundary -> challenger wins."""
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=CLAIM_STAKE)
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({
        "delta_pct": -5, "rationale": "borderline evidence", "source_credibility": "preprint",
    }))

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    challenges = contract.get_challenges_for_claim("claim-1")
    assert challenges[0]["delta_bps"] == -500
    assert challenges[0]["status"] == "resolved_challenge_wins"


def test_cannot_challenge_a_resolved_claim_twice(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=CLAIM_STAKE)
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "x", "source_credibility": "y"}))

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    direct_vm.value = 3 * 10**18
    with direct_vm.expect_revert("already resolved"):
        contract.challenge("challenge-2", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")
