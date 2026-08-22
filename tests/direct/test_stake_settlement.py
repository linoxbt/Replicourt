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
    assert contract.get_claim("claim-1")["status"] == "contested"


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
    assert contract.get_claim("claim-1")["status"] == "contested"


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
    assert contract.get_claim("claim-1")["status"] == "contested"


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


def test_claim_can_be_challenged_repeatedly(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    """The core "continuously-updating registry" property: a claim is never
    permanently locked after one challenge. Round 1 the challenger wins
    (confidence drops); round 2 a different challenger's evidence corroborates
    it (confidence rises again) — both rounds must succeed, confidence must
    accumulate across both, and round_count/round must track correctly.
    """
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=CLAIM_STAKE)
    _mock_counter_evidence(direct_vm)

    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "round 1", "source_credibility": "y"}))
    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    claim = contract.get_claim("claim-1")
    assert claim["confidence_bps"] == 2000  # 5000 - 3000
    assert claim["round_count"] == 1
    assert claim["status"] == "contested"

    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": 15, "rationale": "round 2", "source_credibility": "y"}))
    direct_vm.sender = direct_charlie
    direct_vm.value = 3 * 10**18  # min_stake is ratio-of-current-claim.stake or the absolute floor — either way this clears it
    contract.challenge("challenge-2", "claim-1", [COUNTER_URL], "Second round of counter-evidence.", "comparative")

    claim = contract.get_claim("claim-1")
    assert claim["confidence_bps"] == 3500  # 2000 + 1500, accumulated across both rounds
    assert claim["round_count"] == 2

    challenges = contract.get_challenges_for_claim("claim-1")
    assert len(challenges) == 2
    assert challenges[0]["round"] == 1
    assert challenges[1]["round"] == 2
    assert challenges[1]["status"] == "resolved_claim_wins"

    trail = contract.get_evidence_trail("claim-1")
    assert len(trail) == 2
    assert trail[0]["round"] == 1
    assert trail[1]["round"] == 2


def test_repeated_challenger_wins_shrink_claim_stake(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    """claim.stake is a persistent backing pool that shrinks (never fully
    drains to nothing, never gets locked) across consecutive challenger wins —
    verifies the exact wei math: 10e18 -> 2e18 -> 0.4e18.
    """
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=CLAIM_STAKE)
    _mock_counter_evidence(direct_vm)

    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "round 1", "source_credibility": "y"}))
    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")
    assert contract.get_claim("claim-1")["stake"] == str(2 * 10**18)  # 10e18 - 80%*10e18

    direct_vm.clear_mocks()
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "round 2", "source_credibility": "y"}))
    direct_vm.sender = direct_charlie
    # min_stake for round 2 is ratio-based off the now-shrunk 2e18 claim.stake (20% = 4e17),
    # not the original 10e18 — proves the min-stake check tracks the live pool.
    direct_vm.value = 5 * 10**17
    contract.challenge("challenge-2", "claim-1", [COUNTER_URL], "Second round of counter-evidence.", "comparative")
    assert contract.get_claim("claim-1")["stake"] == str(4 * 10**17)  # 2e18 - 80%*2e18


def test_challenge_below_absolute_stake_floor_rejected_even_with_tiny_claim_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """Once claim.stake has eroded far enough that the ratio-based minimum
    would collapse toward 0, MIN_ABSOLUTE_CHALLENGE_STAKE_WEI still applies —
    otherwise a claim with nothing left to lose becomes a free spam target for
    triggering repeated real LLM-consensus rounds.
    """
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice, stake=100)  # tiny claim stake
    _mock_counter_evidence(direct_vm)
    direct_vm.mock_llm(r".*", json.dumps({"delta_pct": -30, "rationale": "x", "source_credibility": "y"}))

    # ratio-based min_stake here is 100*2000//10000 = 20 wei, far below the
    # absolute floor (1e16) — the floor must be what actually governs.
    direct_vm.sender = direct_bob
    direct_vm.value = 20
    with direct_vm.expect_revert("below minimum"):
        contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")

    direct_vm.value = 1 * 10**16
    contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "comparative")
    assert contract.get_claim("claim-1")["round_count"] == 1
