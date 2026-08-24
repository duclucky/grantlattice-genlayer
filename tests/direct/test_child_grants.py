from __future__ import annotations

from tests.direct.conftest import NOW, address_hex, clauses, create_root, set_time


def propose_child(contract, vm, grantor, child_grantee, **overrides) -> None:
    values = {
        "parent_id": "root-1",
        "child_id": "child-1",
        "capabilities": "READ",
        "resources": "case-1",
        "clause_json": clauses("Customer support for case 1 only", "No marketing or resale"),
        "expires_at": NOW + 500,
        "nonce": "child-nonce-1",
    }
    values.update(overrides)
    vm.sender = grantor
    vm.value = 0
    contract.propose_child_grant(
        values["parent_id"],
        values["child_id"],
        child_grantee,
        values["capabilities"],
        values["resources"],
        values["clause_json"],
        values["expires_at"],
        values["nonce"],
    )


def test_parent_grantee_can_propose_bounded_inactive_child(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    propose_child(contract, direct_vm, direct_bob, direct_charlie)

    child = contract.get_grant("child-1")
    assert child.parent_id == "root-1"
    assert address_hex(child.root_principal) == address_hex(direct_alice)
    assert address_hex(child.grantor) == address_hex(direct_bob)
    assert address_hex(child.grantee) == address_hex(direct_charlie)
    assert child.capabilities_csv == "READ"
    assert child.resources_csv == "case-1"
    assert int(child.depth) == 1
    assert int(child.max_depth) == 3
    assert int(child.parent_version) == 1
    assert int(child.version) == 1
    assert child.status == "PROPOSED"
    assert list(contract.list_grant_ids(0, 25)) == ["root-1", "child-1"]


def test_child_requires_exact_parent_grantee(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert("caller is not parent grantee"):
        propose_child(contract, direct_vm, direct_alice, direct_charlie)
    with direct_vm.expect_revert("unknown grant"):
        contract.get_grant("child-1")
    assert list(contract.list_grant_ids(0, 25)) == ["root-1"]


def test_child_cannot_widen_objective_scope(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    with direct_vm.expect_revert("capabilities exceed parent"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            capabilities="READ,WRITE",
        )
    with direct_vm.expect_revert("resources exceed parent"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            child_id="child-2",
            resources="case-1,case-3",
            nonce="child-nonce-2",
        )
    assert list(contract.list_grant_ids(0, 25)) == ["root-1"]


def test_child_requires_total_clause_ids_and_fixed_kinds(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    missing = '[{"id":"purpose","kind":"RESTRICTION","text":"Support only"}]'
    wrong_kind = clauses("Support only", "No marketing").replace(
        '"kind":"PROHIBITION"', '"kind":"RESTRICTION"', 1
    )

    with direct_vm.expect_revert("clause ids must match parent"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            clause_json=missing,
        )
    with direct_vm.expect_revert("clause kind must match parent"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            child_id="child-2",
            clause_json=wrong_kind,
            nonce="child-nonce-2",
        )
    assert list(contract.list_grant_ids(0, 25)) == ["root-1"]


def test_child_expiry_and_depth_bounds_fail_before_mutation(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        expires_at=NOW + 100,
        max_depth=1,
    )
    with direct_vm.expect_revert("child expiry exceeds parent"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            expires_at=NOW + 101,
        )
    propose_child(
        contract,
        direct_vm,
        direct_bob,
        direct_charlie,
        expires_at=NOW + 100,
    )
    with direct_vm.expect_revert("parent depth exhausted"):
        propose_child(
            contract,
            direct_vm,
            direct_charlie,
            direct_alice,
            parent_id="child-1",
            child_id="grandchild-1",
            capabilities="READ",
            resources="case-1",
            nonce="grandchild-nonce-1",
        )
    assert list(contract.list_grant_ids(0, 25)) == ["root-1", "child-1"]


def test_expired_parent_rejects_child_while_parent_status_stays_active(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        expires_at=NOW + 20,
    )
    set_time(direct_vm, NOW + 20)
    with direct_vm.expect_revert("parent is not effective"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_charlie,
            expires_at=NOW + 20,
        )
    assert contract.get_grant("root-1").status == "ACTIVE"
    assert list(contract.list_grant_ids(0, 25)) == ["root-1"]


def test_child_nonce_replay_does_not_create_another_child(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    propose_child(contract, direct_vm, direct_bob, direct_charlie)
    with direct_vm.expect_revert("nonce already used"):
        propose_child(
            contract,
            direct_vm,
            direct_bob,
            direct_alice,
            child_id="child-2",
        )
    assert list(contract.list_grant_ids(0, 25)) == ["root-1", "child-1"]
