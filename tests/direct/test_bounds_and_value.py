from __future__ import annotations

import json

from tests.direct.conftest import NOW, clauses, create_root
from tests.direct.test_child_grants import propose_child
from tests.direct.test_review import install_review, review_output
from tests.direct.test_revoke_access import activate_child


GEN = 10**18


def test_create_root_rejects_one_gen_without_mutation(
    contract, direct_vm, direct_alice, direct_bob
):
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("method does not accept GEN"):
        contract.create_root_grant(
            "root-value",
            direct_bob,
            "READ",
            "case-1",
            clauses(),
            NOW + 100,
            2,
            "root-value-nonce",
        )
    assert list(contract.list_grant_ids(0, 25)) == []


def test_child_review_and_revoke_each_reject_one_gen_without_hard_state_change(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_bob
    direct_vm.value = GEN
    with direct_vm.expect_revert("method does not accept GEN"):
        contract.propose_child_grant(
            "root-1",
            "child-value",
            direct_charlie,
            "READ",
            "case-1",
            clauses("Support case 1 only", "No marketing or resale"),
            NOW + 50,
            "child-value-nonce",
        )
    with direct_vm.expect_revert("unknown grant"):
        contract.get_grant("child-value")

    direct_vm.value = 0
    propose_child(contract, direct_vm, direct_bob, direct_charlie)
    install_review(
        direct_vm,
        review_output(
            {
                "purpose": "NARROWER_OR_EQUAL",
                "no-marketing": "NARROWER_OR_EQUAL",
            }
        ),
    )
    direct_vm.value = GEN
    with direct_vm.expect_revert("method does not accept GEN"):
        contract.review_child_grant("child-1")
    assert contract.get_grant("child-1").status == "PROPOSED"
    with direct_vm.expect_revert("unknown review"):
        contract.get_review("child-1")

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("method does not accept GEN"):
        contract.revoke_grant("root-1", "root-value-revoke")
    assert contract.get_grant("root-1").status == "ACTIVE"


def test_locked_upper_bounds_are_accepted(
    contract, direct_vm, direct_alice, direct_bob
):
    long_id = "r" + "a" * 79
    long_label = "A" * 64
    long_clause_id = "c" * 64
    long_text = "x" * 600
    clause_json = json.dumps(
        [{"id": long_clause_id, "kind": "RESTRICTION", "text": long_text}],
        sort_keys=True,
        separators=(",", ":"),
    )
    direct_vm.sender = direct_alice
    contract.create_root_grant(
        long_id,
        direct_bob,
        long_label,
        long_label,
        clause_json,
        NOW + 100,
        8,
        "n" * 120,
    )
    grant = contract.get_grant(long_id)
    assert len(grant.grant_id) == 80
    assert int(grant.max_depth) == 8


def test_every_locked_upper_bound_rejects_before_storage(
    contract, direct_vm, direct_alice, direct_bob
):
    nine_clauses = json.dumps(
        [
            {"id": "c" + str(index), "kind": "RESTRICTION", "text": "x"}
            for index in range(9)
        ],
        sort_keys=True,
        separators=(",", ":"),
    )
    oversized_text = json.dumps(
        [{"id": "purpose", "kind": "RESTRICTION", "text": "x" * 601}],
        sort_keys=True,
        separators=(",", ":"),
    )
    cases = [
        ("r" + "a" * 80, "READ", "case-1", clauses(), 2, "nonce"),
        ("root-cap", "A" * 65, "case-1", clauses(), 2, "nonce"),
        ("root-csv", "READ", "r" * 601, clauses(), 2, "nonce"),
        ("root-count", "READ", "case-1", nine_clauses, 2, "nonce"),
        ("root-text", "READ", "case-1", oversized_text, 2, "nonce"),
        ("root-json", "READ", "case-1", "[" + " " * 6_001 + "]", 2, "nonce"),
        ("root-depth", "READ", "case-1", clauses(), 9, "nonce"),
        ("root-nonce", "READ", "case-1", clauses(), 2, "n" * 121),
    ]
    direct_vm.sender = direct_alice
    for grant_id, capabilities, resources, clause_json, depth, nonce in cases:
        with direct_vm.expect_revert():
            contract.create_root_grant(
                grant_id,
                direct_bob,
                capabilities,
                resources,
                clause_json,
                NOW + 100,
                depth,
                nonce,
            )
    assert list(contract.list_grant_ids(0, 25)) == []


def test_depth_eight_is_effective_and_depth_nine_is_rejected(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        max_depth=8,
        expires_at=NOW + 1_000,
    )
    parent_id = "root-1"
    grantor = direct_bob
    grantees = [direct_charlie, direct_alice, direct_bob]
    for depth in range(1, 9):
        child_id = "level-" + str(depth)
        grantee = grantees[(depth - 1) % len(grantees)]
        propose_child(
            contract,
            direct_vm,
            grantor,
            grantee,
            parent_id=parent_id,
            child_id=child_id,
            expires_at=NOW + 900 - depth,
            nonce="level-nonce-" + str(depth),
        )
        activate_child(contract, direct_vm, grantor, child_id)
        assert int(contract.get_grant(child_id).depth) == depth
        assert contract.is_effective(child_id) is True
        parent_id = child_id
        grantor = grantee

    with direct_vm.expect_revert("parent depth exhausted"):
        propose_child(
            contract,
            direct_vm,
            grantor,
            direct_charlie,
            parent_id="level-8",
            child_id="level-9",
            expires_at=NOW + 800,
            nonce="level-nonce-9",
        )
    with direct_vm.expect_revert("unknown grant"):
        contract.get_grant("level-9")
