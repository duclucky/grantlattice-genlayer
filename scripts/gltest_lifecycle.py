from __future__ import annotations


def write_transaction(contract, account, method_name: str, args: list):
    method = getattr(contract.connect(account), method_name)
    return method(args=args).transact()


def install_review_mocks(client, *, llm_mocks: dict):
    params = {"llm_mocks": llm_mocks}
    return client.provider.make_request(method="sim_installMocks", params=params)
