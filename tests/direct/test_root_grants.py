from __future__ import annotations

from tests.direct.conftest import NOW, address_hex, clauses, create_root, set_time


def test_create_root_locks_authenticated_actor_scope_and_index(
    contract, direct_vm, direct_alice, direct_bob
):
    create_root(contract, direct_vm, direct_alice, direct_bob)

    grant = contract.get_grant("root-1")
    assert grant.grant_id == "root-1"
    assert grant.parent_id == ""
    assert address_hex(grant.root_principal) == address_hex(direct_alice)
    assert address_hex(grant.grantor) == address_hex(direct_alice)
    assert address_hex(grant.grantee) == address_hex(direct_bob)
    assert grant.capabilities_csv == "READ,SUMMARIZE"
    assert grant.resources_csv == "case-1,case-2"
    assert int(grant.depth) == 0
    assert int(grant.max_depth) == 3
    assert int(grant.parent_version) == 0
    assert int(grant.version) == 1
    assert grant.status == "ACTIVE"
    assert list(contract.list_grant_ids(0, 25)) == ["root-1"]


def test_root_duplicate_id_and_sender_nonce_reject_without_index_mutation(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("grant already exists"):
        contract.create_root_grant(
            "root-1",
            direct_charlie,
            "READ",
            "case-1",
            clauses(),
            NOW + 500,
            2,
            "different-nonce",
        )
    with direct_vm.expect_revert("nonce already used"):
        contract.create_root_grant(
            "root-2",
            direct_charlie,
            "READ",
            "case-1",
            clauses(),
            NOW + 500,
            2,
            "root-nonce-1",
        )

    assert list(contract.list_grant_ids(0, 25)) == ["root-1"]
    with direct_vm.expect_revert("unknown grant"):
        contract.get_grant("root-2")


def test_root_rejects_noncanonical_or_malformed_input_without_state(
    contract, direct_vm, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    invalid = [
        ("ab", "READ", "case-1", clauses(), NOW + 100, 3, "root id"),
        ("root-1", "SUMMARIZE,READ", "case-1", clauses(), NOW + 100, 3, "capabilities"),
        ("root-1", "READ", "case-1,case-1", clauses(), NOW + 100, 3, "resources"),
        ("root-1", "READ", "case-1", "[]", NOW + 100, 3, "clauses"),
        ("root-1", "READ", "case-1", clauses(), NOW, 3, "expiry"),
        ("root-1", "READ", "case-1", clauses(), NOW + 100, 9, "max depth"),
    ]
    for grant_id, capabilities, resources, clause_json, expiry, depth, message in invalid:
        with direct_vm.expect_revert(message):
            contract.create_root_grant(
                grant_id,
                direct_bob,
                capabilities,
                resources,
                clause_json,
                expiry,
                depth,
                "nonce-" + message.replace(" ", "-"),
            )

    assert list(contract.list_grant_ids(0, 25)) == []


def test_root_expiry_equality_is_late_even_with_no_prior_phase_change(
    contract, direct_vm, direct_alice, direct_bob
):
    set_time(direct_vm, NOW + 50)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("expiry must be in the future"):
        contract.create_root_grant(
            "root-equal",
            direct_bob,
            "READ",
            "case-1",
            clauses(),
            NOW + 50,
            1,
            "equal-boundary",
        )
    assert list(contract.list_grant_ids(0, 25)) == []


def test_grant_id_pagination_is_bounded_and_ordered(
    contract, direct_vm, direct_alice, direct_bob
):
    create_root(contract, direct_vm, direct_alice, direct_bob, grant_id="root-1")
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        grant_id="root-2",
        nonce="root-nonce-2",
    )

    assert list(contract.list_grant_ids(0, 1)) == ["root-1"]
    assert list(contract.list_grant_ids(1, 25)) == ["root-2"]
    assert list(contract.list_grant_ids(2, 25)) == []
    with direct_vm.expect_revert("limit invalid"):
        contract.list_grant_ids(0, 0)
    with direct_vm.expect_revert("limit invalid"):
        contract.list_grant_ids(0, 26)
