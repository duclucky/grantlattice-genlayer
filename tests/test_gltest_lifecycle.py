from __future__ import annotations

from scripts.gltest_lifecycle import install_review_mocks, write_transaction


class FakeTransaction:
    def __init__(self, calls, method_name, args):
        self.calls = calls
        self.method_name = method_name
        self.args = args

    def transact(self, **kwargs):
        self.calls.append(("transact", self.method_name, self.args, kwargs))
        return "tx-hash"


class FakeConnectedContract:
    def __init__(self, calls):
        self.calls = calls

    def __getattr__(self, method_name):
        def method(*, args):
            self.calls.append(("method", method_name, args))
            return FakeTransaction(self.calls, method_name, args)

        return method


class FakeContract:
    def __init__(self):
        self.calls = []

    def connect(self, account):
        self.calls.append(("connect", account))
        return FakeConnectedContract(self.calls)


class FakeProvider:
    def __init__(self):
        self.request = None

    def make_request(self, *, method, params):
        self.request = {"method": method, "params": params}
        return {"ok": True}


class FakeClient:
    def __init__(self):
        self.provider = FakeProvider()


def test_every_grantlattice_write_uses_zero_value_fluent_transaction_api():
    contract = FakeContract()
    calls = [
        ("create_root_grant", ["root-1", "0xgrantee", "READ", "case-1", "[]", 10, 2, "n1"]),
        ("propose_child_grant", ["root-1", "child-1", "0xchild", "READ", "case-1", "[]", 9, "n2"]),
        ("review_child_grant", ["child-1"]),
        ("revoke_grant", ["root-1", "n3"]),
    ]
    for method_name, args in calls:
        assert write_transaction(contract, "actor", method_name, args) == "tx-hash"
        assert contract.calls[-1] == ("transact", method_name, args, {})


def test_review_mocks_are_installed_as_bare_dict_before_nondet_write():
    client = FakeClient()
    mocks = {
        ".*GrantLattice.*": '{"child_id":"child-1","attempt":1,"results":[]}'
    }
    install_review_mocks(client, llm_mocks=mocks)
    assert client.provider.request == {
        "method": "sim_installMocks",
        "params": {"llm_mocks": mocks},
    }
    assert isinstance(client.provider.request["params"], dict)
