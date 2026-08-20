import json

SOURCE_URL = "https://example.com/study-1"
CLAIM_DESC = "Compound X reduces marker Y by 23% in a randomized controlled trial"


def _mock_reachable(direct_vm, url=SOURCE_URL):
    direct_vm.mock_web(url.replace(".", r"\."), {"status": 200, "body": "ok"})


def _mock_unreachable(direct_vm, url=SOURCE_URL):
    direct_vm.mock_web(url.replace(".", r"\."), {"status": 404, "body": "not found"})


def test_post_claim_success(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/replicourt.py")
    _mock_reachable(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 10 * 10**18
    contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL)

    claim = contract.get_claim("claim-1")
    assert claim["description"] == CLAIM_DESC
    assert claim["effect_size_bps"] == 2300
    assert claim["confidence_bps"] == 5000
    assert claim["status"] == "active"
    assert claim["stake"] == str(10 * 10**18)
    assert claim["source_url"] == SOURCE_URL

    all_claims = contract.get_all_claims()
    assert len(all_claims) == 1
    assert all_claims[0]["id"] == "claim-1"


def test_post_claim_duplicate_id_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/replicourt.py")
    _mock_reachable(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 5 * 10**18
    contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL)

    with direct_vm.expect_revert("already exists"):
        contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL)


def test_post_claim_zero_stake_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/replicourt.py")
    _mock_reachable(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("nonzero stake"):
        contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL)


def test_post_claim_unreachable_source_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/replicourt.py")
    _mock_unreachable(direct_vm)

    direct_vm.sender = direct_alice
    direct_vm.value = 5 * 10**18
    with direct_vm.expect_revert("did not resolve"):
        contract.post_claim("claim-1", CLAIM_DESC, 2300, "RCT, n=120", SOURCE_URL)
