from __future__ import annotations


EMPTY_RECEIPT = {
    "transaction_hash": None,
    "status": "UNKNOWN",
    "contract_address": None,
    "block_number": None,
    "created_at": None,
}


def _payload(receipt) -> dict:
    if not isinstance(receipt, dict):
        return {}
    wrapped = receipt.get("result")
    if isinstance(wrapped, dict):
        return wrapped
    return receipt


def normalize_receipt(receipt) -> dict:
    payload = _payload(receipt)
    if not payload:
        return dict(EMPTY_RECEIPT)

    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    transaction_hash = payload.get("transaction_hash") or payload.get("transactionHash") or payload.get("hash")
    status = payload.get("statusName") or payload.get("status_name") or payload.get("status") or "UNKNOWN"
    contract_address = (
        payload.get("contract_address")
        or payload.get("contractAddress")
        or data.get("contract_address")
        or data.get("contractAddress")
    )
    block_number = payload.get("block_number") if "block_number" in payload else payload.get("blockNumber")
    created_at = payload.get("created_at") or payload.get("createdAt") or payload.get("timestamp")
    return {
        "transaction_hash": transaction_hash,
        "status": status,
        "contract_address": contract_address,
        "block_number": block_number,
        "created_at": created_at,
    }
