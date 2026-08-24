from __future__ import annotations

import pytest

from tests.direct.conftest import NOW, clauses, create_root, set_time
from tests.direct.test_child_grants import propose_child
from tests.direct.test_review import install_review, review_output


@pytest.mark.parametrize("clock_offset, succeeds", [(-1, True), (0, False), (1, False)])
def test_create_root_checks_boundary_with_no_phase_dependency(
    contract, direct_vm, direct_alice, direct_bob, clock_offset, succeeds
):
    expiry = NOW + 50
    set_time(direct_vm, expiry + clock_offset)
    direct_vm.sender = direct_alice
    if succeeds:
        contract.create_root_grant(
            "root-boundary",
            direct_bob,
            "READ",
            "case-1",
            clauses(),
            expiry,
            2,
            "root-boundary-nonce",
        )
        assert contract.get_grant("root-boundary").status == "ACTIVE"
    else:
        with direct_vm.expect_revert("expiry must be in the future"):
            contract.create_root_grant(
                "root-boundary",
                direct_bob,
                "READ",
                "case-1",
                clauses(),
                expiry,
                2,
                "root-boundary-nonce",
            )
        with direct_vm.expect_revert("unknown grant"):
            contract.get_grant("root-boundary")


@pytest.mark.parametrize("clock_offset, succeeds", [(-1, True), (0, False), (1, False)])
def test_propose_child_checks_live_parent_boundary_while_status_stays_active(
    contract,
    direct_vm,
    direct_alice,
    direct_bob,
    direct_charlie,
    clock_offset,
    succeeds,
):
    parent_expiry = NOW + 50
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        expires_at=parent_expiry,
    )
    set_time(direct_vm, parent_expiry + clock_offset)
    if succeeds:
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            expires_at=parent_expiry,
        )
        assert contract.get_grant("child-1").status == "PROPOSED"
    else:
        with direct_vm.expect_revert("parent is not effective"):
            propose_child(
                contract,
                direct_vm,
                direct_bob,
                direct_charlie,
                expires_at=parent_expiry,
            )
        with direct_vm.expect_revert("unknown grant"):
            contract.get_grant("child-1")
    assert contract.get_grant("root-1").status == "ACTIVE"


@pytest.mark.parametrize("clock_offset, succeeds", [(-1, True), (0, False), (1, False)])
def test_review_checks_child_boundary_and_rejected_attempt_is_absent(
    contract,
    direct_vm,
    direct_alice,
    direct_bob,
    direct_charlie,
    clock_offset,
    succeeds,
):
    child_expiry = NOW + 50
    create_root(contract, direct_vm, direct_alice, direct_bob, expires_at=NOW + 100)
    propose_child(
        contract,
        direct_vm,
        direct_bob,
        direct_charlie,
        expires_at=child_expiry,
    )
    install_review(
        direct_vm,
        review_output(
            {
                "purpose": "NARROWER_OR_EQUAL",
                "no-marketing": "NARROWER_OR_EQUAL",
            }
        ),
    )
    set_time(direct_vm, child_expiry + clock_offset)
    direct_vm.sender = direct_bob
    if succeeds:
        contract.review_child_grant("child-1")
        assert contract.get_grant("child-1").status == "ACTIVE"
        assert int(contract.get_review("child-1").attempt) == 1
    else:
        with direct_vm.expect_revert("child is expired"):
            contract.review_child_grant("child-1")
        assert contract.get_grant("child-1").status == "PROPOSED"
        with direct_vm.expect_revert("unknown review"):
            contract.get_review("child-1")
