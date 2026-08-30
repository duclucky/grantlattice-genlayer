from __future__ import annotations

from tests.direct.conftest import NOW, clauses, create_root, set_time
from tests.direct.test_child_grants import propose_child
from tests.direct.test_review import install_review, review_output


def activate_child(
    contract,
    vm,
    grantor,
    child_id: str = "child-1",
    *,
    attempt: int = 1,
) -> None:
    vm.clear_mocks()
    install_review(
        vm,
        review_output(
            {
                "purpose": "NARROWER_OR_EQUAL",
                "no-marketing": "NARROWER_OR_EQUAL",
            },
            child_id=child_id,
            attempt=attempt,
        ),
    )
    vm.sender = grantor
    contract.review_child_grant(child_id)


def deploy_active_child(contract, vm, principal, grantor, child_grantee) -> None:
    create_root(contract, vm, principal, grantor)
    propose_child(contract, vm, grantor, child_grantee)
    activate_child(contract, vm, grantor)


def test_can_invoke_returns_exact_fail_closed_reasons_in_locked_precedence(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    assert contract.can_invoke("missing", direct_bob, "READ", "case-1") == "GRANT_INACTIVE"
    create_root(contract, direct_vm, direct_alice, direct_bob)
    propose_child(contract, direct_vm, direct_bob, direct_charlie)
    assert contract.can_invoke("child-1", direct_charlie, "READ", "case-1") == "GRANT_INACTIVE"

    activate_child(contract, direct_vm, direct_bob)
    assert contract.can_invoke("child-1", direct_charlie, "READ", "case-1") == "ALLOWED"
    assert contract.can_invoke("child-1", direct_charlie, "WRITE", "case-1") == "CAPABILITY_MISSING"
    assert contract.can_invoke("child-1", direct_charlie, "READ", "case-2") == "RESOURCE_MISSING"

    direct_vm.sender = direct_alice
    contract.revoke_grant("root-1", "revoke-root")
    assert contract.get_grant("child-1").status == "ACTIVE"
    assert contract.can_invoke("child-1", direct_charlie, "READ", "case-1") == "ANCESTOR_INACTIVE"
    assert contract.can_invoke("root-1", direct_bob, "READ", "case-1") == "GRANT_INACTIVE"


def test_can_invoke_rejects_public_grant_id_for_wrong_actor(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)

    assert (
        contract.can_invoke("root-1", direct_charlie, "READ", "case-1")
        == "ACTOR_MISMATCH"
    )
    assert contract.can_invoke("root-1", direct_bob, "READ", "case-1") == "ALLOWED"


def test_own_expiry_precedes_scope_and_stale_active_never_allows(
    contract, direct_vm, direct_alice, direct_bob
):
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        capabilities="READ",
        resources="case-1",
        expires_at=NOW + 20,
    )
    set_time(direct_vm, NOW + 19)
    assert contract.is_effective("root-1") is True
    assert contract.can_invoke("root-1", direct_bob, "WRITE", "missing") == "CAPABILITY_MISSING"
    set_time(direct_vm, NOW + 20)
    assert contract.get_grant("root-1").status == "ACTIVE"
    assert contract.is_effective("root-1") is False
    assert contract.can_invoke("root-1", direct_bob, "WRITE", "missing") == "EXPIRED"
    set_time(direct_vm, NOW + 21)
    assert contract.can_invoke("root-1", direct_bob, "READ", "case-1") == "EXPIRED"


def test_recorded_grantor_and_root_principal_can_revoke_and_version_increments(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    deploy_active_child(contract, direct_vm, direct_alice, direct_bob, direct_charlie)
    direct_vm.sender = direct_bob
    contract.revoke_grant("child-1", "grantor-revoke")
    child = contract.get_grant("child-1")
    assert child.status == "REVOKED"
    assert int(child.version) == 2
    assert contract.is_effective("child-1") is False

    propose_child(
        contract,
        direct_vm,
        direct_bob,
        direct_charlie,
        child_id="child-2",
        nonce="child-nonce-2",
    )
    direct_vm.sender = direct_alice
    contract.revoke_grant("child-2", "principal-revoke")
    assert contract.get_grant("child-2").status == "REVOKED"
    assert int(contract.get_grant("child-2").version) == 2


def test_revoke_rejects_wrong_actor_duplicate_and_sender_nonce_replay(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        grant_id="root-2",
        nonce="root-nonce-2",
    )
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("caller cannot revoke grant"):
        contract.revoke_grant("root-1", "wrong-actor")
    assert contract.get_grant("root-1").status == "ACTIVE"

    direct_vm.sender = direct_alice
    contract.revoke_grant("root-1", "shared-revoke-nonce")
    with direct_vm.expect_revert("grant already revoked"):
        contract.revoke_grant("root-1", "another-nonce")
    with direct_vm.expect_revert("nonce already used"):
        contract.revoke_grant("root-2", "shared-revoke-nonce")
    assert contract.get_grant("root-2").status == "ACTIVE"
    with direct_vm.expect_revert("unknown grant"):
        contract.revoke_grant("missing", "missing-nonce")


def test_expired_grant_remains_protectively_revocable(
    contract, direct_vm, direct_alice, direct_bob
):
    create_root(
        contract,
        direct_vm,
        direct_alice,
        direct_bob,
        expires_at=NOW + 10,
    )
    set_time(direct_vm, NOW + 11)
    direct_vm.sender = direct_alice
    contract.revoke_grant("root-1", "expired-protection")
    assert contract.get_grant("root-1").status == "REVOKED"
    assert int(contract.get_grant("root-1").version) == 2


def test_root_revoke_fail_closes_deep_descendants_without_touching_other_tree(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    deploy_active_child(contract, direct_vm, direct_alice, direct_bob, direct_charlie)
    propose_child(
        contract,
        direct_vm,
        direct_charlie,
        direct_alice,
        parent_id="child-1",
        child_id="grandchild-1",
        capabilities="READ",
        resources="case-1",
        expires_at=NOW + 400,
        nonce="grandchild-nonce-1",
    )
    activate_child(contract, direct_vm, direct_charlie, "grandchild-1")

    create_root(
        contract,
        direct_vm,
        direct_charlie,
        direct_bob,
        grant_id="other-root",
        capabilities="READ",
        resources="case-1",
        nonce="other-root-nonce",
    )
    assert contract.is_effective("grandchild-1") is True
    assert contract.is_effective("other-root") is True

    direct_vm.sender = direct_alice
    contract.revoke_grant("root-1", "cascade-revoke")

    assert contract.get_grant("child-1").status == "ACTIVE"
    assert contract.get_grant("grandchild-1").status == "ACTIVE"
    assert contract.is_effective("child-1") is False
    assert contract.is_effective("grandchild-1") is False
    assert contract.can_invoke("grandchild-1", direct_alice, "READ", "case-1") == "ANCESTOR_INACTIVE"
    assert contract.is_effective("other-root") is True
    assert contract.can_invoke("other-root", direct_bob, "READ", "case-1") == "ALLOWED"
