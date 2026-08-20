"""
Non-comparative (methodology-critique) challenge coverage.

Note on scope: gl.eq_principle.prompt_non_comparative uses a distinct internal
host call (ExecPromptTemplate) that gltest's direct-mode WASI shim does not
implement (only plain ExecPrompt, used by gl.nondet.exec_prompt / the
comparative path's run_nondet_unsafe, is mocked — see wasi_mock.py's
_handle_gl_call). So the full consensus round-trip for this branch can only be
exercised against a live localnet (Studio/glsim), not direct mode. What direct
mode *can* verify without a VM round-trip is the response parsing/validation
logic that both branches share (_clean_json_text / _validate_delta_fields) —
this is exactly the "LLM resilience" surface that's most likely to break on
real, messy model output, so it's the highest-value thing to unit test here.
"""
import json

SOURCE_URL = "https://example.com/study-1"
COUNTER_URL = "https://example.com/methodology-critique"
CLAIM_DESC = "Compound X reduces marker Y by 23% in a randomized controlled trial"
CLAIM_STAKE = 10 * 10**18


def _post_claim(contract, direct_vm, poster, stake=CLAIM_STAKE):
    direct_vm.mock_web(SOURCE_URL.replace(".", r"\."), {"status": 200, "body": "ok"})
    direct_vm.sender = poster
    direct_vm.value = stake
    contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL)
    direct_vm.value = 0


def test_challenge_invalid_mode_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/replicourt.py")
    _post_claim(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * 10**18
    with direct_vm.expect_revert("mode must be"):
        contract.challenge("challenge-1", "claim-1", [COUNTER_URL], "Counter-evidence description for testing.", "vibes")


def test_validate_delta_fields_well_founded_critique(direct_vm, direct_deploy):
    """Parsing/clamping logic for a well-founded methodology critique's JSON."""
    contract = direct_deploy("contracts/replicourt.py")
    parsed = contract._validate_delta_fields({
        "delta_pct": -18,
        "rationale": "No control group and n=8 is a serious methodological flaw.",
        "source_credibility": "critique cites specific flaws present in the source text",
    })
    assert parsed["delta_bps"] == -1800
    assert "control group" in parsed["rationale"]


def test_validate_delta_fields_clamps_out_of_range(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/replicourt.py")
    parsed = contract._validate_delta_fields({"delta_pct": -250, "rationale": "extreme"})
    assert parsed["delta_bps"] == -10000  # clamped to the -100..100 range


def test_validate_delta_fields_key_aliasing(direct_vm, direct_deploy):
    """LLMs sometimes use alternate key names for the delta."""
    contract = direct_deploy("contracts/replicourt.py")
    parsed = contract._validate_delta_fields({"delta": "-7.5%", "rationale": "aliased key, percent sign"})
    assert parsed["delta_bps"] == -750


def test_validate_delta_fields_rejects_missing_delta(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/replicourt.py")
    with direct_vm.expect_revert("missing delta_pct"):
        contract._validate_delta_fields({"rationale": "no delta field at all"})


def test_clean_json_text_strips_markdown_fences_and_trailing_commas(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/replicourt.py")
    messy = '```json\n{"delta_pct": -12, "rationale": "flawed sample size",}\n```'
    data = contract._clean_json_text(messy)
    assert data["delta_pct"] == -12
    assert data["rationale"] == "flawed sample size"
