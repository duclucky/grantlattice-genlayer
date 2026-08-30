# GrantLattice integration boundary proof

Status: **PASS locally and on Studionet for the actor-bound reusable read
boundary; remediated production browser deployment and external protocol
adoption are not claimed**

Date: 2026-08-31

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
| Access guard | `can_invoke(grant_id, actor, capability_id, resource_id)` | `/checks` | connected wallet supplies the actor; mismatch or unavailable read is never allowed |

Focused adapter tests cover raw and normalized receipt shapes, exact arguments
including the authenticated actor in the four-argument access ABI,
SDK-normalized selected-provider writes, wrong-network/disconnected gates,
retryable failures, and canonical reload only after successful finalization.
Page tests cover all four write controls, submitted/accepted/finalized/failed/
retryable language, actor mismatch, wallet-scoped visibility disclaimers, and
state-aware review loading. Fresh project-wide verification is recorded in the
judge-remediation evidence.

## Live production proof

`docs/evidence/browser/production-verification.md` records historical production reads,
fail-closed `ANCESTOR_INACTIVE`, real provider discovery, and the finalized
OKX-signed root creation. The resulting active grant reloaded canonically and
its exact `READ` / `browser-demo` access check returned `ALLOWED` with an empty
fresh-tab Chrome warning/error log. That evidence predates the actor-bound ABI
and does not prove the remediation is deployed.

## Reuse boundary

A2A AgentSkill gateways, MCP tool proxies, and Google ADK AgentTool guards must
authenticate their external actor, load the canonical grant, verify
`actor == grantee`, pass that actor into a fresh `can_invoke`, and proceed only
on `ALLOWED` immediately before their distinct execution boundaries. The
contract comparison is defense in depth; it does not authenticate an external
request by itself. The `/integrate` page documents these patterns using the same
views. No external adapter deployment, adoption, callback, or consumer contract
is claimed; a real protocol adapter remains Milestone headroom.

Wallet gating is a frontend workspace feature only. Canonical grant state is
public through contract reads, RPC, and Explorer, including after disconnect.

`docs/evidence/studionet/judge-remediation-verification.md` records the current
four-argument ABI returning `ALLOWED` for the recorded grantee,
`ACTOR_MISMATCH` for the other public actor, and `ANCESTOR_INACTIVE` after root
revocation.
