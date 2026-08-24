from __future__ import annotations

import json

from scripts.deployment_receipts import normalize_receipt


SAFE_KEYS = {
    "transaction_hash",
    "status",
    "contract_address",
    "block_number",
    "created_at",
}


RAW_STUDIO_RECEIPT = {
    "hash": "0x" + "a" * 64,
    "status": "FINALIZED",
    "data": {"contract_address": "0x" + "1" * 40},
    "block_number": 42,
    "created_at": "2026-08-24T00:00:00Z",
    "consensus_data": {
        "leader_receipt": [
            {
                "execution_result": "SUCCESS",
                "node_config": {"private": "never expose"},
                "stdout": "private validator output",
            }
        ]
    },
    "trace": {"private": "never expose"},
}


def test_normalizes_raw_and_wrapped_receipts_without_private_config():
    for raw in (RAW_STUDIO_RECEIPT, {"result": RAW_STUDIO_RECEIPT}):
        safe = normalize_receipt(raw)
        assert set(safe) == SAFE_KEYS
        serialized = json.dumps(safe)
        assert "node_config" not in serialized
        assert "leader_receipt" not in serialized
        assert "private validator" not in serialized
        assert safe["transaction_hash"] == "0x" + "a" * 64
        assert safe["contract_address"] == "0x" + "1" * 40


def test_normalized_sdk_shape_and_aliases_are_supported():
    safe = normalize_receipt(
        {
            "result": {
                "transactionHash": "0x" + "b" * 64,
                "statusName": "FINALIZED",
                "contractAddress": "0x" + "2" * 40,
                "blockNumber": "0x2b",
                "timestamp": "2026-08-24T00:01:00Z",
                "node_config": {"private": True},
            }
        }
    )
    assert safe == {
        "transaction_hash": "0x" + "b" * 64,
        "status": "FINALIZED",
        "contract_address": "0x" + "2" * 40,
        "block_number": "0x2b",
        "created_at": "2026-08-24T00:01:00Z",
    }


def test_malformed_receipts_are_explicit_and_never_invent_success():
    for malformed in (None, "bad", [], {}, {"result": "bad"}):
        assert normalize_receipt(malformed) == {
            "transaction_hash": None,
            "status": "UNKNOWN",
            "contract_address": None,
            "block_number": None,
            "created_at": None,
        }
