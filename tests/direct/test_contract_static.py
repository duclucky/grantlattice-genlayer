from __future__ import annotations

import ast
from pathlib import Path


CONTRACT = Path(__file__).resolve().parents[2] / "contracts" / "grant_lattice.py"
HEADER = '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }'


def source() -> str:
    return CONTRACT.read_text(encoding="ascii")


def test_contract_exists_with_exact_header_and_ascii_source():
    assert CONTRACT.exists(), "contracts/grant_lattice.py must exist"
    text = source()
    assert text.splitlines()[0] == HEADER
    assert text.encode("ascii").decode("ascii") == text


def test_contract_has_exactly_one_project_specific_gl_contract():
    tree = ast.parse(source())
    subclasses = [
        node.name
        for node in tree.body
        if isinstance(node, ast.ClassDef)
        and any(ast.unparse(base) == "gl.Contract" for base in node.bases)
    ]
    assert subclasses == ["GrantLattice"]


def test_contract_locks_storage_and_public_interface():
    text = source()
    for declaration in (
        "grants: TreeMap[str, Grant]",
        "reviews: TreeMap[str, Review]",
        "used_nonces: TreeMap[str, bool]",
        "grant_ids: DynArray[str]",
    ):
        assert declaration in text

    tree = ast.parse(text)
    contract = next(
        node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "GrantLattice"
    )
    methods = {node.name for node in contract.body if isinstance(node, ast.FunctionDef)}
    assert {
        "create_root_grant",
        "propose_child_grant",
        "review_child_grant",
        "revoke_grant",
        "get_grant",
        "get_review",
        "is_effective",
        "can_invoke",
        "list_grant_ids",
    }.issubset(methods)

    can_invoke = next(
        node
        for node in contract.body
        if isinstance(node, ast.FunctionDef) and node.name == "can_invoke"
    )
    assert [argument.arg for argument in can_invoke.args.args] == [
        "self",
        "grant_id",
        "actor",
        "capability_id",
        "resource_id",
    ]


def test_v1_has_no_payable_or_value_transfer_path():
    text = source()
    assert "@gl.public.write.payable" not in text
    assert "emit_transfer" not in text
    assert "10**18" not in text


def test_semantic_review_uses_locked_safe_nondeterminism_api():
    text = source()
    assert "gl.vm.run_nondet(" in text
    assert "run_nondet_unsafe" not in text
    assert "isinstance(leader_result, gl.vm.Return)" in text


def test_transaction_time_has_no_zero_fallback_and_requires_raw_datetime():
    text = source()
    assert "return bigint(0)" not in text
    assert 'gl.message_raw["datetime"]' in text


def test_all_four_writes_are_public_and_none_is_payable():
    tree = ast.parse(source())
    contract = next(
        node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "GrantLattice"
    )
    expected = {
        "create_root_grant",
        "propose_child_grant",
        "review_child_grant",
        "revoke_grant",
    }
    observed = {}
    for method in contract.body:
        if isinstance(method, ast.FunctionDef) and method.name in expected:
            observed[method.name] = {ast.unparse(item) for item in method.decorator_list}
    assert set(observed) == expected
    for decorators in observed.values():
        assert decorators == {"gl.public.write"}
