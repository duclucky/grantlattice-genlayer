# GrantLattice integration boundary proof

Status: **PASS for the production frontend adapter and reusable read boundary;
external protocol adoption is not claimed**

Date: 2026-08-24

## Boundary

`frontend/src/adapters/genlayerContract.ts` is the sole product adapter between
UI journeys and `GrantLattice`. It creates an IC read client with the configured
same-origin `/api/genlayer` endpoint and creates a separate write client only
from the EIP-1193 provider explicitly selected by the user. It never accepts a
private key and sends `0 GEN` to all four nonpayable writes.

The production endpoint is implemented by `frontend/api/genlayer.mjs`. It
forwards only a POST JSON body to the locked Studionet RPC, copies no browser
authorization header, rejects other methods, and returns a bounded 502 response
when the upstream is unavailable.

## Canonical wrapper coverage

| User journey | Contract method/view | Control | Finality/reload proof |
| --- | --- | --- | --- |
| Root creation | `create_root_grant` | `/grants/new` submit | submitted -> accepted -> finalized; then `get_grant` |
| Child proposal | `propose_child_grant` | parent detail/delegate form | exact sorted arguments; then canonical child read |
| Semantic review/retry | `review_child_grant` | eligible child detail action | current state/attempt read dynamically; then review/grant reload |
| Revocation | `revoke_grant` | eligible detail action | finalized receipt; then grant/effective reload |
| Access guard | `can_invoke` | `/checks` | live canonical read; unavailable is never allowed |

Focused adapter tests cover raw and normalized receipt shapes, exact arguments,
SDK-normalized selected-provider writes, wrong-network/disconnected gates,
retryable failures, and canonical reload only after successful finalization.
Page tests cover all four write controls, submitted/accepted/finalized/failed/
retryable language, and state-aware review loading. The project-wide gate
reported 21 frontend files and 65 tests passed.

## Live production proof

`docs/evidence/browser/production-verification.md` records production reads,
fail-closed `ANCESTOR_INACTIVE`, real provider discovery, and the finalized
OKX-signed root creation. The resulting active grant reloaded canonically and
its exact `READ` / `browser-demo` access check returned `ALLOWED` with an empty
fresh-tab Chrome warning/error log.

## Reuse boundary

A2A AgentSkill gateways, MCP tool proxies, and Google ADK AgentTool guards can
perform a fresh `can_invoke` immediately before their distinct execution
boundaries. The `/integrate` page documents these patterns using the same views.
No external adapter deployment, adoption, callback, or consumer contract is
claimed; a real protocol adapter remains Milestone headroom.
