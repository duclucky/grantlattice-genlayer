from __future__ import annotations

import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest
from gltest.direct.loader import deploy_contract


DIRECT_SDK_VERSION = "v0.2.16"
CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "grant_lattice.py"
NOW = 1_900_000_000


def _install_windows_stdin_patch() -> None:
    if os.name != "nt":
        return

    from gltest.direct import loader
    from gltest.direct.vm import VMContext

    if getattr(loader, "_grantlattice_windows_stdin_patch", False):
        return

    def inject_message_to_fd0(vm: VMContext) -> None:
        from genlayer.py import calldata
        from genlayer.py.types import Address

        sender = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
        contract = (
            Address(vm._contract_address)
            if isinstance(vm._contract_address, bytes)
            else vm._contract_address
        )
        origin = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin
        encoded = calldata.encode(
            {
                "contract_address": contract,
                "sender_address": sender,
                "origin_address": origin,
                "stack": [],
                "value": vm._value,
                "datetime": vm._datetime,
                "is_init": False,
                "chain_id": vm._chain_id,
                "entry_kind": 0,
                "entry_data": b"",
                "entry_stage_data": None,
            }
        )

        fd, path = tempfile.mkstemp()
        try:
            os.write(fd, encoded)
            os.lseek(fd, 0, os.SEEK_SET)
            vm._original_stdin_fd = os.dup(0)
            os.dup2(fd, 0)
            vm._grantlattice_stdin_temp_path = path
        finally:
            os.close(fd)

    original_cleanup = VMContext._cleanup_after_deactivate

    def cleanup_after_deactivate(self: VMContext) -> None:
        try:
            original_cleanup(self)
        finally:
            path = getattr(self, "_grantlattice_stdin_temp_path", None)
            if path:
                try:
                    os.unlink(path)
                except FileNotFoundError:
                    pass
                self._grantlattice_stdin_temp_path = None

    loader._inject_message_to_fd0 = inject_message_to_fd0
    loader._grantlattice_windows_stdin_patch = True
    VMContext._cleanup_after_deactivate = cleanup_after_deactivate


_install_windows_stdin_patch()


def set_time(vm, timestamp: int) -> None:
    timestamp_text = datetime.fromtimestamp(timestamp, timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )
    vm.warp(timestamp_text)
    gl_module = sys.modules.get("genlayer.gl")
    if gl_module is not None and getattr(gl_module, "message_raw", None) is not None:
        gl_module.message_raw["datetime"] = timestamp_text


def address_hex(address) -> str:
    if hasattr(address, "as_hex"):
        return address.as_hex.lower()
    if isinstance(address, bytes):
        from genlayer.py.types import Address

        return Address(address).as_hex.lower()
    return str(address).lower()


def clauses(purpose: str = "Customer support only", prohibition: str = "No marketing") -> str:
    return json.dumps(
        [
            {"id": "no-marketing", "kind": "PROHIBITION", "text": prohibition},
            {"id": "purpose", "kind": "RESTRICTION", "text": purpose},
        ],
        sort_keys=True,
        separators=(",", ":"),
    )


@pytest.fixture
def direct_deploy(direct_vm):
    def _deploy(path: str | Path = CONTRACT_PATH):
        return deploy_contract(
            Path(path).resolve(),
            direct_vm,
            sdk_version=DIRECT_SDK_VERSION,
        )

    return _deploy


@pytest.fixture
def contract(direct_vm, direct_deploy):
    set_time(direct_vm, NOW)
    direct_vm.value = 0
    return direct_deploy()


def create_root(
    contract,
    vm,
    principal,
    grantee,
    *,
    grant_id: str = "root-1",
    capabilities: str = "READ,SUMMARIZE",
    resources: str = "case-1,case-2",
    expires_at: int = NOW + 1_000,
    max_depth: int = 3,
    nonce: str = "root-nonce-1",
) -> None:
    vm.sender = principal
    vm.value = 0
    contract.create_root_grant(
        grant_id,
        grantee,
        capabilities,
        resources,
        clauses(),
        expires_at,
        max_depth,
        nonce,
    )
