# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from genlayer import *


@allow_storage
@dataclass
class Grant:
    grant_id: str
    parent_id: str
    root_principal: Address
    grantor: Address
    grantee: Address
    capabilities_csv: str
    resources_csv: str
    clauses_json: str
    depth: u256
    max_depth: u256
    expires_at: u256
    parent_version: u256
    version: u256
    status: str


@allow_storage
@dataclass
class Review:
    child_id: str
    attempt: u256
    verdict: str
    expansion_clause_ids_csv: str
    ambiguous_clause_ids_csv: str
    reason_code: str


class GrantLattice(gl.Contract):
    grants: TreeMap[str, Grant]
    reviews: TreeMap[str, Review]
    used_nonces: TreeMap[str, bool]
    grant_ids: DynArray[str]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def create_root_grant(
        self,
        grant_id: str,
        grantee: Address,
        capabilities_csv: str,
        resources_csv: str,
        clauses_json: str,
        expires_at: u256,
        max_depth: u256,
        nonce: str,
    ) -> None:
        self._require_no_value()
        self._require_grant_id(grant_id)
        if grant_id in self.grants:
            raise gl.vm.UserError("grant already exists")
        self._require_nonzero_address(grantee)
        self._require_canonical_csv(capabilities_csv, "capabilities")
        self._require_canonical_csv(resources_csv, "resources")
        self._parse_clauses(clauses_json)
        now = int(self._now())
        if int(expires_at) <= now:
            raise gl.vm.UserError("expiry must be in the future")
        if int(max_depth) < 1 or int(max_depth) > 8:
            raise gl.vm.UserError("max depth invalid")
        sender = self._sender()
        nonce_key = self._require_unused_nonce(sender, "create_root_grant", nonce)

        self.grants[grant_id] = Grant(
            grant_id=grant_id,
            parent_id="",
            root_principal=sender,
            grantor=sender,
            grantee=self._as_address(grantee),
            capabilities_csv=capabilities_csv,
            resources_csv=resources_csv,
            clauses_json=clauses_json,
            depth=u256(0),
            max_depth=max_depth,
            expires_at=expires_at,
            parent_version=u256(0),
            version=u256(1),
            status="ACTIVE",
        )
        self.grant_ids.append(grant_id)
        self.used_nonces[nonce_key] = True

    @gl.public.write
    def propose_child_grant(
        self,
        parent_id: str,
        child_id: str,
        child_grantee: Address,
        capabilities_csv: str,
        resources_csv: str,
        clauses_json: str,
        expires_at: u256,
        nonce: str,
    ) -> None:
        self._require_no_value()
        parent = self._require_grant(parent_id)
        sender = self._sender()
        if self._address_key(sender) != self._address_key(parent.grantee):
            raise gl.vm.UserError("caller is not parent grantee")
        if int(parent.depth) + 1 > int(parent.max_depth):
            raise gl.vm.UserError("parent depth exhausted")
        if parent.status != "ACTIVE" or not self._is_effective_at(parent_id, int(self._now())):
            raise gl.vm.UserError("parent is not effective")
        self._require_grant_id(child_id)
        if child_id in self.grants:
            raise gl.vm.UserError("grant already exists")
        self._require_nonzero_address(child_grantee)
        self._require_canonical_csv(capabilities_csv, "capabilities")
        self._require_canonical_csv(resources_csv, "resources")
        child_clauses = self._parse_clauses(clauses_json)
        parent_clauses = self._parse_clauses(parent.clauses_json)
        if not self._csv_is_subset(capabilities_csv, parent.capabilities_csv):
            raise gl.vm.UserError("capabilities exceed parent")
        if not self._csv_is_subset(resources_csv, parent.resources_csv):
            raise gl.vm.UserError("resources exceed parent")
        if self._clause_ids(child_clauses) != self._clause_ids(parent_clauses):
            raise gl.vm.UserError("clause ids must match parent")
        if not self._clause_kinds_match(child_clauses, parent_clauses):
            raise gl.vm.UserError("clause kind must match parent")
        now = int(self._now())
        if int(expires_at) <= now:
            raise gl.vm.UserError("expiry must be in the future")
        if int(expires_at) > int(parent.expires_at):
            raise gl.vm.UserError("child expiry exceeds parent")
        nonce_key = self._require_unused_nonce(sender, "propose_child_grant", nonce)

        self.grants[child_id] = Grant(
            grant_id=child_id,
            parent_id=parent_id,
            root_principal=parent.root_principal,
            grantor=sender,
            grantee=self._as_address(child_grantee),
            capabilities_csv=capabilities_csv,
            resources_csv=resources_csv,
            clauses_json=clauses_json,
            depth=u256(int(parent.depth) + 1),
            max_depth=parent.max_depth,
            expires_at=expires_at,
            parent_version=parent.version,
            version=u256(1),
            status="PROPOSED",
        )
        self.grant_ids.append(child_id)
        self.used_nonces[nonce_key] = True

    @gl.public.write
    def review_child_grant(self, child_id: str) -> None:
        self._require_no_value()
        raise gl.vm.UserError("review not implemented")

    @gl.public.write
    def revoke_grant(self, grant_id: str, nonce: str) -> None:
        self._require_no_value()
        raise gl.vm.UserError("revoke not implemented")

    @gl.public.view
    def get_grant(self, grant_id: str) -> Grant:
        return self._require_grant(grant_id)

    @gl.public.view
    def get_review(self, child_id: str) -> Review:
        if child_id not in self.reviews:
            raise gl.vm.UserError("unknown review")
        return self.reviews[child_id]

    @gl.public.view
    def is_effective(self, grant_id: str) -> bool:
        if grant_id not in self.grants:
            return False
        return self._is_effective_at(grant_id, int(self._now()))

    @gl.public.view
    def can_invoke(self, grant_id: str, capability_id: str, resource_id: str) -> str:
        if grant_id not in self.grants:
            return "UNKNOWN_GRANT"
        grant = self.grants[grant_id]
        if grant.status != "ACTIVE":
            return "INACTIVE_STATUS"
        if not self._is_effective_at(grant_id, int(self._now())):
            return "INACTIVE_CHAIN"
        if capability_id not in grant.capabilities_csv.split(","):
            return "CAPABILITY_NOT_GRANTED"
        if resource_id not in grant.resources_csv.split(","):
            return "RESOURCE_NOT_GRANTED"
        return "ALLOWED"

    @gl.public.view
    def list_grant_ids(self, offset: u256, limit: u256) -> DynArray[str]:
        if int(limit) < 1 or int(limit) > 25:
            raise gl.vm.UserError("limit invalid")
        result = []
        start = int(offset)
        end = start + int(limit)
        total = len(self.grant_ids)
        if end > total:
            end = total
        index = start
        while index < end:
            result.append(self.grant_ids[index])
            index += 1
        return result

    def _require_grant(self, grant_id: str) -> Grant:
        if grant_id not in self.grants:
            raise gl.vm.UserError("unknown grant")
        return self.grants[grant_id]

    def _is_effective_at(self, grant_id: str, now: int) -> bool:
        current_id = grant_id
        hops = 0
        while current_id != "":
            if current_id not in self.grants or hops > 8:
                return False
            grant = self.grants[current_id]
            if grant.status != "ACTIVE" or now >= int(grant.expires_at):
                return False
            if grant.parent_id != "":
                if grant.parent_id not in self.grants:
                    return False
                parent = self.grants[grant.parent_id]
                if int(grant.parent_version) != int(parent.version):
                    return False
            current_id = grant.parent_id
            hops += 1
        return True

    def _require_grant_id(self, value: str) -> None:
        if len(value) < 3 or len(value) > 80:
            raise gl.vm.UserError("root id invalid")
        if not self._is_alphanumeric(value[0]):
            raise gl.vm.UserError("root id invalid")
        for char in value:
            if not (self._is_alphanumeric(char) or char in "._:-"):
                raise gl.vm.UserError("root id invalid")

    def _require_canonical_csv(self, value: str, label: str) -> None:
        if len(value) < 1 or len(value) > 600:
            raise gl.vm.UserError(label + " invalid")
        items = value.split(",")
        if len(items) < 1 or len(items) > 16:
            raise gl.vm.UserError(label + " invalid")
        previous = ""
        for item in items:
            if len(item) < 1 or len(item) > 64:
                raise gl.vm.UserError(label + " invalid")
            for char in item:
                if not (self._is_alphanumeric(char) or char in "._:/-"):
                    raise gl.vm.UserError(label + " invalid")
            if previous != "" and item <= previous:
                raise gl.vm.UserError(label + " invalid")
            previous = item

    def _parse_clauses(self, value: str):
        if len(value) < 1 or len(value) > 6_000:
            raise gl.vm.UserError("clauses invalid")
        try:
            parsed = json.loads(value)
        except Exception:
            raise gl.vm.UserError("clauses invalid")
        if not isinstance(parsed, list) or len(parsed) < 1 or len(parsed) > 8:
            raise gl.vm.UserError("clauses invalid")
        seen = set()
        for clause in parsed:
            if not isinstance(clause, dict) or set(clause.keys()) != {"id", "kind", "text"}:
                raise gl.vm.UserError("clauses invalid")
            clause_id = clause["id"]
            text = clause["text"]
            kind = clause["kind"]
            if not isinstance(clause_id, str) or len(clause_id) < 1 or len(clause_id) > 64:
                raise gl.vm.UserError("clauses invalid")
            for char in clause_id:
                if not (self._is_alphanumeric(char) or char in "._:/-"):
                    raise gl.vm.UserError("clauses invalid")
            if clause_id in seen:
                raise gl.vm.UserError("clauses invalid")
            seen.add(clause_id)
            if not isinstance(text, str) or len(text) < 1 or len(text) > 600:
                raise gl.vm.UserError("clauses invalid")
            for char in text:
                if ord(char) < 32 or ord(char) > 126:
                    raise gl.vm.UserError("clauses invalid")
            if kind != "RESTRICTION" and kind != "PROHIBITION":
                raise gl.vm.UserError("clauses invalid")
        canonical = json.dumps(parsed, sort_keys=True, separators=(",", ":"))
        if canonical != value:
            raise gl.vm.UserError("clauses invalid")
        return parsed

    def _clause_ids(self, clauses) -> str:
        ids = []
        for clause in clauses:
            ids.append(clause["id"])
        ids.sort()
        return ",".join(ids)

    def _clause_kinds_match(self, child, parent) -> bool:
        parent_kinds = {}
        for clause in parent:
            parent_kinds[clause["id"]] = clause["kind"]
        for clause in child:
            if parent_kinds[clause["id"]] != clause["kind"]:
                return False
        return True

    def _csv_is_subset(self, child: str, parent: str) -> bool:
        parent_items = parent.split(",")
        for item in child.split(","):
            if item not in parent_items:
                return False
        return True

    def _require_unused_nonce(self, sender: Address, method: str, nonce: str) -> str:
        if len(nonce) < 1 or len(nonce) > 120:
            raise gl.vm.UserError("nonce invalid")
        for char in nonce:
            if ord(char) < 32 or ord(char) > 126:
                raise gl.vm.UserError("nonce invalid")
        key = self._address_key(sender) + "|" + method + "|" + nonce
        if key in self.used_nonces:
            raise gl.vm.UserError("nonce already used")
        return key

    def _require_no_value(self) -> None:
        if int(gl.message.value) != 0:
            raise gl.vm.UserError("method does not accept GEN")

    def _require_nonzero_address(self, account: Address) -> None:
        if self._address_key(account) == "0x" + "0" * 40:
            raise gl.vm.UserError("zero grantee address")

    def _sender(self) -> Address:
        try:
            return gl.message.sender_address
        except Exception:
            return gl.message.sender

    def _address_key(self, account: Address) -> str:
        if hasattr(account, "as_hex"):
            return account.as_hex.lower()
        return Address(account).as_hex.lower()

    def _as_address(self, account: Address) -> Address:
        if hasattr(account, "as_bytes"):
            return account
        return Address(account)

    def _now(self) -> bigint:
        try:
            raw = gl.message_raw.get("datetime", "")
        except Exception:
            try:
                raw = gl.message.datetime
            except Exception:
                return bigint(0)
        raw_text = str(raw)
        if raw_text.isdigit():
            return bigint(int(raw_text))
        try:
            normalized = raw_text[:-1] + "+00:00" if raw_text.endswith("Z") else raw_text
            parsed = datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return bigint(int(parsed.timestamp()))
        except Exception:
            return bigint(0)

    def _is_alphanumeric(self, char: str) -> bool:
        return (
            "a" <= char <= "z"
            or "A" <= char <= "Z"
            or "0" <= char <= "9"
        )
