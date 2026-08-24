# GrantLattice project specification

This Stage 1 brief defines the selected product and provisional frontend
capabilities. Contract storage, public signatures, safety cards, consensus
invariants, and claim-to-code evidence are locked in Phase 4 before contract
implementation. Until that gate passes, the status remains `SELECTED`.

## Identity

- Idea ID: `IDEA-018`
- Project name: `GrantLattice`
- Project slug: `grantlattice`
- Category: `Projects`
- Status: `SELECTED`
- Repository: local child repository; public remote is created only after the
  pre-push hygiene gate
- Target network: `Studionet`

## One-sentence product hook

**Every delegated agent may become less powerful, never more powerful, even
when its limits are written in natural language.**

## Trust problem

- Decision that must not depend on one party: whether every qualitative child
  grant restriction preserves or narrows the exact parent authority.
- Why a database, ordinary EVM contract, or backend LLM is insufficient:
  deterministic code can prove structured capability, resource, time, depth,
  and quantity subsets, but one interested issuer would still control the
  meaning of purpose, retention, disclosure, audience, and prohibited-use text.
- Rights/access at risk: the effective capability to admit an agent task or
  protected tool invocation. V1 has no value-bearing path.

## Fingerprint

- Trust problem: neutral semantic monotonicity across an authenticated agent
  delegation graph.
- Actors/adversary: principal, parent grantee/delegator, child grantee, and
  downstream gateway; a parent or child benefits when hidden authority expands.
- Evidence class + authenticity mechanism: bounded contract-held grants authored
  by canonical transaction senders and bound to network/revision, actors, grant
  IDs, parent version, nonce, depth, expiry, clause IDs, and recomputed digests.
- Consensus question: after objective subset checks pass, whether every child
  clause is `NARROWER_OR_EQUAL`, `EXPANDS_AUTHORITY`, or `AMBIGUOUS` relative to
  exact parent clause IDs, with complete parent-prohibition coverage.
- State machine: root `ACTIVE`; child `PROPOSED -> REVIEWING -> ACTIVE | DENIED
  | RETRYABLE`; protective revocation and derived expiry make a grant ineffective.
- Direct consequence: only a finalized, invariant-valid attenuated verdict
  activates child authority; expansion denies it, and ambiguity/invalid output
  remains inactive and retryable.
- Reuse surface: `get_grant`, `get_review`, `is_effective`, and `can_invoke` for
  A2A AgentSkill gateways, MCP tools/call proxies, and Google ADK AgentTool guards.

## Mandatory gate matrix

| Gate | PASS/FAIL | Evidence/reason |
| --- | --- | --- |
| Replacement | `PASS` | Structured subsets remain deterministic, but ordinary code cannot neutrally interpret arbitrary qualitative restrictions; trusting one issuer model restores unilateral control. |
| Judgment | `PASS` | Validators compare exact stored parent/child clauses; the client never submits a verdict. |
| Evidence availability | `PASS` | Every consensus-critical input is bounded contract state before review. |
| Evidence authenticity | `PASS` | Canonical grantors author consequential bytes through authenticated transactions; external claimant evidence has no consequential path in v1. |
| Equivalence | `PASS` | Consensus locks grant IDs, total clause mappings, bounded classes, expansion/ambiguity sets, prohibition coverage, and the contract-derived consequence. |
| Consequence | `PASS` | A valid finalized verdict activates or denies executable child authority; revocation/expiry blocks descendant use. |
| Adversarial | `PASS` | Parent and child can benefit from overdelegation; malicious output can omit restrictions; prompt injection can try to redefine authority; consumers can replay stale grants. |
| State model | `PASS` | Entity-isolated grant trees, immutable parent links/clauses, bounded depth, nonce/idempotency, append-only attempts, retry, denial, revocation, and fail-closed reads are explicit. |
| Reuse | `PASS` | Three named consumer types use the same canonical read surface at different execution boundaries. |
| Contract count | `PASS` | One contract owns grants, reviews, and effective authority; a mirror consumer contract adds no independent trust boundary. |
| Differentiation | `PASS` | Parent-child semantic monotonicity, pre-action issuance, total clause coverage, and ancestor cascade differ from policy quorum, successor transfer, semantic clearing, interface quarantine, and post-action bond designs. |
| Claim-to-code | `PASS - DESIGN TARGET` | Every retained claim has a provisional method/view, transition, test class, frontend control, and future evidence target; implementation is not claimed. |
| Full lifecycle | `PASS - FEASIBLE, NOT VERIFIED` | The Projects journey covers wallet connect, root creation, child proposal, review, finality/failure/retry, canonical reload, access check, revocation, expiry, and descendant denial. |
| Scope honesty | `PASS` | No external execution, protocol-token compatibility, adoption, performance, Studionet behavior, browser proof, production security, or Portal outcome is claimed. |

One failed mandatory gate requires redesign or rejection before contract code.

## Actors, roles, and incentives

| Actor | Permissions | Right at risk | Incentive to bias |
| --- | --- | --- | --- |
| Principal | Author a root grant; inspect the tree; revoke grants in the root tree | Control of delegated authority | Wants least privilege but may prefer convenient broad delegation |
| Parent grantee / delegating operator | Propose one direct child within an active parent; request review as recorded grantor | Ability to delegate work | May disguise a wider child purpose to reduce operational friction |
| Child grantee | Receive authority only after finalized attenuation | Ability to invoke a protected capability/resource | Benefits from a broader audience, purpose, retention, disclosure, or execution right |
| Integrator/gateway | Read effective authority and admit or deny an external action | Protected task/tool boundary | Wants low-latency decisions and may be tempted to fail open when reads are unavailable |
| Validators | Compare exact stored qualitative clauses | Neutrality of the canonical decision | A malicious leader may omit prohibitions or follow injected artifact instructions |

## Scope and non-goals

### In scope

- Authenticated root grants and direct child proposals.
- Deterministic capability/resource/depth/expiry subset checks.
- Validator-controlled qualitative attenuation with total clause coverage.
- Canonical active, denied, retryable, revoked, and derived-expired outcomes.
- Bounded fail-closed ancestor evaluation and capability/resource access checks.
- A complete multi-page Projects frontend with deliberate wallet selection,
  honest transaction finality, canonical reload, history, help, and integration guidance.

### Out of scope

- External action receipts, claimant-hosted artifacts, screenshots, or hash-only
  evidence as a basis for authority.
- LLM signature verification or unproved A2A, MCP, AP2, or other protocol-token
  compatibility.
- Automatic execution of an external task or tool in v1.
- Bonds, fees, rewards, escrow, payout, credits, or other GEN movement.
- Legal-agency, production-security, adoption, performance, Portal acceptance,
  or external integration claims without direct evidence.

## Provisional contract-capability sketch

This sketch prevents the frontend from inventing impossible actions. Phase 4
locks exact method signatures and storage after the built frontend is audited.

| Capability | Human role | Visible action/outcome | Minimum canonical view data | Finality/value | Failure/recovery |
| --- | --- | --- | --- | --- | --- |
| Root creation | Principal | Establish root authority | ID, grantor/grantee, scope summary, expiry, status/effective | Real write; submitted -> accepted/decided -> finalized; no value | Failed/rejected write creates no canonical grant; edit and retry |
| Child proposal | Active parent grantee | Delegate a strictly narrower grant | Parent actor/scope/expiry/effective state and child form rules | Real write; full finality; no value | Objective widening rejects unchanged; edit the child proposal |
| Semantic review | Recorded child grantor | Ask validators to decide qualitative attenuation | Child status, attempt, user-facing verdict/recovery | Nondeterministic real write; full finality; no value | Invalid/ambiguous output remains inactive and retryable |
| Protective revocation | Recorded grantor or root principal | Stop one grant and its descendant authority | Actor eligibility, current status, lineage/effective outcome | Real write; full finality; no value | Wrong actor/duplicate rejects unchanged; unavailable reads fail closed |
| Access check | Integrator or operator | Decide whether one capability/resource may proceed | Exact grant ID, effective result, user-facing denial reason | Canonical deterministic read; no value | Read unavailable is never an allow result |
| Disconnect | Connected user | Clear selected wallet/account and disable writes | Selected provider/account UI session only | Immediate local session action | Reconnect by deliberately selecting a provider again |

## Product/frontend blueprint

### Human users and jobs

| User/role | Primary job | Decision or outcome needed |
| --- | --- | --- |
| Principal/security operator | Establish least-privilege root authority and retain emergency control | Which authority exists, who holds it, and whether revocation blocks the tree |
| Delegating operator | Give a child agent a narrower task without accidental expansion | Whether objective and qualitative constraints are safe enough to activate |
| Integrator/developer | Protect one task/tool boundary with canonical state | Whether the exact capability/resource invocation is currently allowed |

### Primary journeys

1. Principal: discover the rule -> deliberately select a wallet -> create a root
   grant -> follow real finality -> see canonical authority -> return later to
   inspect or revoke it.
2. Delegating operator: open an effective parent -> propose a narrower child ->
   correct objective widening or request semantic review -> follow
   accepted/finalized/failure/retry states -> see activation or denial history.
3. Integrator: open Access Check -> enter an exact grant/capability/resource ->
   read a fail-closed decision -> open the relevant integration pattern.

### Information architecture and route map

Persistent desktop/tablet navigation uses a restrained top navigation bar. On
small screens it collapses into one accessible menu; the same routes, labels,
and hierarchy remain available. Deep detail pages include an orientation link
back to Grants without replacing browser back behavior.

| Screen/route | User purpose | Primary action | Required states | Mobile behavior |
| --- | --- | --- | --- | --- |
| Home `/` | Understand the least-privilege promise and how GrantLattice protects delegation | Connect a wallet or learn the workflow | Disconnected, connected, network issue, product explanation | Single-column hero; primary action first; no auto-playing media |
| Grants `/grants` | Find, filter, and revisit delegation chains | Open a grant or create a root | First-run empty, loading, canonical list, filtered empty, read unavailable | Search/filter stack above cards; wrapped status/identity tokens |
| New root `/grants/new` | Establish root authority safely | Submit root grant | Disconnected, wrong network, editable, validation errors, wallet pending, submitted, accepted, finalized, failed | One field group at a time; persistent labels/helper text; no horizontal form grid |
| Grant detail `/grants/:grantId` | Understand lineage, effective authority, clauses, history, and legal next actions | Delegate, review/retry, revoke, or check access when eligible | Loading, not found, active, proposed, denied, retryable, revoked, expired, read unavailable | Core outcome before technical context; lineage becomes vertical list |
| Delegate `/grants/:grantId/delegate` | Propose one direct child bounded by its parent | Submit child proposal | Parent loading/unavailable, unauthorized, ineffective/expired, editable, validation, wallet/finality states | Parent limits remain visible in a collapsible summary; touch-friendly clause rows |
| Access Check `/checks` | Decide whether one protected action should proceed | Run canonical access check | Empty, validating, reading, allowed, denied with reason, unavailable/fail-closed | Result follows form in reading order; no color-only allow/deny signal |
| Activity `/activity` | Revisit real wallet operations and recovery actions | Open the related grant or legal retry | Empty, submitted, accepted/decided, finalized, failed, retryable | Chronological cards with concise state and one contextual action |
| Integrate `/integrate` | Understand the stable consumer read boundary | Choose A2A, MCP, or Google ADK pattern | Overview and three documented patterns; no adoption claim | Segmented links become stacked buttons; code wraps horizontally within its own scroller |
| Help `/help` | Understand statuses, safety, recovery, limits, and network behavior | Find a recovery answer or return to the relevant task | Searchable sections, wallet/network help, review states, honest limits | Collapsible sections with keyboard-accessible native controls |

### Visibility matrix

| Function/data group | Visibility | Eligible role/state | User need or reason hidden |
| --- | --- | --- | --- |
| Product promise and workflow | `USER_PRIMARY` | Everyone | Needed to understand the consequence before connecting |
| Wallet provider, connected address, network, disconnect | `USER_PRIMARY` | Wallet users | Needed to authorize writes and control the session |
| Grant ID, human-readable scopes, grantee, expiry, effective state | `USER_PRIMARY` | Operators and integrators | Needed to decide what authority exists |
| Lineage and parent relationship | `USER_PRIMARY` | Grant viewers | Needed to understand inherited authority and cascade |
| User-facing review outcome and next step | `USER_PRIMARY` | Grant viewers | Needed to know activation, denial, or retry consequence |
| Transaction hash and Explorer link | `USER_CONTEXTUAL` | User who submitted a transaction | Optional verification without dominating the workflow |
| Clause IDs and exact canonical text | `USER_CONTEXTUAL` | Grant detail/integration contexts | Needed for careful verification but not as dashboard metrics |
| Integration method/view names | `USER_CONTEXTUAL` | Integrators on `/integrate` | Needed only at the integration boundary |
| Raw validator JSON, prompt, reasoning, attempt internals | `SYSTEM_ONLY` | Contract/tests/evidence | Exposing it invites confusion and prompt-oriented misuse |
| Storage layout, digests, nonce keys, runner/validator configuration | `SYSTEM_ONLY` | Contract/tests/evidence | Security plumbing, not a user decision |
| Submission scoring, reviewer notes, control prompts | `SYSTEM_ONLY` | Internal process only | Never part of the product surface |

### UI action matrix

| Visible control | Contract capability/method | Eligible role | Legal state | Input/value | Finality | Failure/recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Connect wallet | Provider session | Any visitor | Disconnected | Selected detected provider; no value | Immediate account request after selection | Choose another provider, reject safely, or retry |
| Create root grant | `create_root_grant` | Principal | Connected; valid future expiry | Grant ID, grantee, scopes, clauses, expiry, max depth, nonce; no value | Submitted -> accepted/decided -> finalized | Failure leaves no canonical grant; edit and retry |
| Delegate child | `propose_child_grant` | Active parent grantee | Parent effective and depth available | Parent/child IDs, grantee, subset scopes, clauses, expiry, nonce; no value | Submitted -> accepted/decided -> finalized | Objective failure leaves no child; correct form and retry |
| Request review | `review_child_grant` | Recorded child grantor | `PROPOSED` or `RETRYABLE`; unexpired chain | Child ID; no value | Nondeterministic accepted/decided -> finalized | Invalid/ambiguous output remains inactive and offers legal retry |
| Revoke grant | `revoke_grant` | Recorded grantor or root principal | Existing, not already revoked | Grant ID and nonce; no value | Submitted -> accepted/decided -> finalized | Wrong actor/duplicate rejects unchanged; refresh canonical state |
| Check access | `can_invoke` | Any reader/integrator | Canonical read available | Grant, capability, resource; no value | Deterministic read | Unavailable canonical read fails closed and offers retry |
| Open account menu | Wallet session | Connected user | Connected | No value | Immediate UI action | Menu remains keyboard dismissible |
| Disconnect | Wallet session | Connected user | Connected | No value | Immediate UI action | Clears selected provider/account and disables writes |

### User-facing state language

| Canonical status/violation | User-facing label | User consequence/next step |
| --- | --- | --- |
| `ACTIVE` and effective | Active authority | The exact capability/resource may be checked for use |
| `PROPOSED` | Awaiting review | The child cannot act; the recorded grantor may request review |
| Frontend transaction reviewing | Validators are deciding | Keep this page open or revisit Activity; no success is implied |
| `ATTENUATED` | Safely narrowed | The finalized child becomes active after canonical reload |
| `EXPANSION` / `DENIED` | Broader than parent | The child remains inactive; create a genuinely narrower proposal |
| `AMBIGUOUS` / `RETRYABLE` | Needs another review | No authority was issued; eligible grantor may retry |
| `REVOKED` | Revoked | This grant and affected descendants cannot authorize use |
| Derived expiry | Expired | The grant cannot authorize use; create a new bounded grant if needed |
| `CAPABILITY_MISSING` | Capability not granted | Do not execute this action |
| `RESOURCE_MISSING` | Resource not granted | Do not access this resource |
| `ANCESTOR_INACTIVE` | Delegation chain is inactive | Do not execute; inspect the lineage for revoke/expiry |
| Canonical read unavailable | Authority could not be verified | Fail closed and retry the read; never treat it as allowed |
| `SUBMITTED` | Submitted to the network | Wait for accepted/decided and finalized status |
| `ACCEPTED` | Accepted for validator decision | The transaction is not yet presented as finalized |
| `FINALIZED` | Finalized on Studionet | Reload canonical grant state |
| `FAILED` | Transaction failed | Canonical authority was not changed; inspect and retry if legal |

### Wallet and network behavior

This section is the provisional `FE-WALLET-EVM` contract for Phase 3A and is
audited again against the real client in Phase 7.

- Discover EIP-6963 providers first, then compatible injected fallbacks for OKX,
  Rabby, MetaMask, Coinbase, Brave, and `window.ethereum`; deduplicate results.
- Open a centered, labelled wallet-selection modal. Never auto-select a provider
  or request accounts before the user chooses one.
- Switch/add GenLayer Studionet with chain ID `61999` (`0xf22f`), currency `GEN`,
  RPC `https://studio.genlayer.com/api`, and explorer
  `https://explorer-studio.genlayer.com` before writes.
- Keep the selected wallet-write client separate from the IC read client even
  when both use the official endpoint. Route IC reads through a same-origin proxy
  if direct browser calls fail CORS verification.
- Make the connected address a button that opens an account menu with a clear
  disconnect action. Disconnect removes listeners, clears provider/account UI
  state, and disables every write until a new deliberate connection.
- Show submitted, accepted/decided, finalized, failed, and retryable states from
  real receipts only, then reload canonical contract state after finality.

### Visual preservation constraints

- Visual language/layout to preserve after Phase 3B: the verified
  `design-system/grantlattice/MASTER.md`, persistent navigation, approved route
  structure, semantic tokens, typography, component geometry, and responsive
  hierarchy.
- Allowed functional edits after Phase 3B: smallest changes needed to wire real
  reads/writes, correct conditional visibility, add a required state/message,
  or fix accessibility/responsive defects.
- System/reviewer details excluded from primary UI: raw validator data, prompts,
  storage/digests/nonces, attempt internals, submission material, private
  configuration, and any fixture presented as canonical.

## Phase 4 completion gate

Before contract source is written, Phase 4 will replace this provisional section
with the final stable IDs, structured storage, state machine, temporal rules,
illegal transitions, authorization, idempotency, complete write-method safety
cards, frontend lifecycle coverage, full Evidence Authority Matrix, consensus
invariants, consequence table, reusable interface, threat model, adversarial
test plan, claim-to-code matrix, analogue matrix, deployment plan, Definition of
Done, honest limits, and kill criteria. Status remains `SELECTED` until every
required table cell is complete and audited.

## Evidence Authority Matrix

| Consequential path | Canonical objective | Authority and deterministic bindings | Failure result | Consequence blocked | Required negative proof |
| --- | --- | --- | --- | --- | --- |
| `EA-ROOT` | Create one root grant | Transaction sender becomes locked root principal/grantor; bind network/revision, root ID, grantee, exact scopes/clauses, expiry, max depth, nonce | Revert before mutation | Root authority issuance | Wrong actor/binding, replay, invalid/future boundary leaves maps unchanged |
| `EA-CHILD` | Propose one direct child | Sender equals active, unexpired parent grantee; bind parent ID/version, child ID/grantee, exact scopes/clauses, depth, expiry, nonce | Revert before activation | Child issuance and every allow result | Wrong caller/parent/version/objective/depth/time/replay leaves child absent |
| `EA-REVIEW` | Compare exact stored parent/child pair | No external issuer; recompute exact stored digests and bind grant IDs, clause IDs, parent version, review attempt | Non-penalizing `RETRYABLE`; child stays inactive | Activation or denial from invalid output | Valid-shape malicious output with missing/extra/duplicate/wrong mappings changes no hard authority |
| `EA-REVOKE` | Withdraw an authored grant | Sender equals recorded grantor or locked root principal under the final rule; bind grant ID, root relation, nonce | Revert before mutation | Revocation/cascade state | Wrong actor/tree/replay/duplicate leaves grant and descendants unchanged |

Actor-controlled prose cannot redefine grantor, grantee, IDs, parent relation,
capability/resource enums, consequence, or value. V1 has no value destination.

## Reuse proof matrix

| Consumer | Structurally different workflow | Canonical read boundary | Output needed | V1 claim |
| --- | --- | --- | --- | --- |
| A2A AgentSkill gateway | A parent delegates a cross-agent task before another agent executes a skill | Check `can_invoke` immediately before `AgentSkill.execute` | `ALLOWED` or exact fail-closed reason plus effective lineage state | Interface documented; external execution adapter is milestone work |
| MCP tool proxy | A caller invokes a protected server tool over `tools/call` | Check `can_invoke` before forwarding the tool request | Canonical allow/deny for grant, tool capability, and resource | Interface documented; no production MCP enforcement claim |
| Google ADK AgentTool guard | An orchestrator invokes an agent as an in-process tool | Check `is_effective`/`can_invoke` in the pre-execution guard | Effective authority and exact denial reason | Interface documented; no ADK integration/adoption claim |

## Honest limitations at selection

- The 12-case corpus is a single-model design spike, not GenVM,
  multi-validator, Studionet, integration, performance, or adoption evidence.
- Exact GenVM source-size, clause-count, and bounded ancestor-walk behavior need
  implementation and network proof.
- Browser wallet chain switching and CORS behavior need local-browser and
  Studionet proof.
- No adopter commitment, external integration request, public repository, live
  application, Portal submission, or acceptance exists yet.

## Kill criteria

- Kill or redesign if deterministic structured checks eliminate the need for
  qualitative validator judgment.
- Kill if exact contract-held evidence cannot be bounded and authenticated.
- Kill if malicious/invalid semantic output can activate or deny authority
  without complete settlement-invariant validation.
- Kill if the Projects frontend cannot prove a real wallet write, finality,
  canonical reload, and fail-closed access check on Studionet.
