# GrantLattice project specification

This specification locks the product, frontend baseline, contract interface,
storage, safety cards, consensus invariants, and claim-to-code evidence required
before contract implementation. The Phase 4 gate passed on 2026-08-24; the
contract, local checks, real frontend adapter, bounded Studionet lifecycle,
public repository, production hosting, and live canonical reads are now
verified. Browser-wallet write proof remains pending.

## Identity

- Idea ID: `IDEA-018`
- Project name: `GrantLattice`
- Project slug: `grantlattice`
- Category: `Projects`
- Status: `PRODUCTION_VERIFIED`
- Repository: `https://github.com/duclucky/grantlattice-genlayer` (public;
  pre-push hygiene and CI passed)
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
- State machine: root `ACTIVE`; child `PROPOSED | RETRYABLE -> ACTIVE | DENIED
  | RETRYABLE` after a review transaction; transaction-local reviewing is not a
  persisted grant status. Protective revocation and derived expiry make a grant
  ineffective.
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
| State model | `PASS` | Entity-isolated grant trees, immutable parent links/clauses, bounded depth, nonce/idempotency, monotonic attempt numbers with the latest canonical review, retry, denial, revocation, and fail-closed reads are explicit. |
| Reuse | `PASS` | Three named consumer types use the same canonical read surface at different execution boundaries. |
| Contract count | `PASS` | One contract owns grants, reviews, and effective authority; a mirror consumer contract adds no independent trust boundary. |
| Differentiation | `PASS` | Parent-child semantic monotonicity, pre-action issuance, total clause coverage, and ancestor cascade differ from policy quorum, successor transfer, semantic clearing, interface quarantine, and post-action bond designs. |
| Claim-to-code | `PASS` | Every retained claim maps to an implemented method/view, local test, frontend control/test, and sanitized Studionet/browser evidence; production wallet writes remain explicitly pending. |
| Full lifecycle | `PASS` | Studionet evidence proves authenticated root creation, deterministic objective rejection, validator-controlled attenuation/expansion/ambiguity outcomes, allow, revocation, and descendant denial. |
| Scope honesty | `PASS` | Studionet contract behavior, production hosting, and live canonical reads are claimed only from recorded evidence; browser-wallet writes, adoption, performance, security audit, and Portal outcome are not claimed. |

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

## Contract capability map

This map prevents the frontend from inventing impossible actions and is binding
for implementation.

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

This section is the verified `FE-WALLET-EVM` baseline from Phase 3A/3B and is
audited again against the real client before network claims.

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

## State model

### Stable IDs and canonical input

- `grant_id`, `parent_id`, and `child_id` are caller-chosen stable identifiers,
  globally unique in one contract, 3-80 characters, and restricted to printable
  ASCII `[A-Za-z0-9._:-]` with an alphanumeric first character.
- Capability/resource labels are 1-64 printable ASCII characters, use
  `[A-Za-z0-9._:/-]`, and are supplied as a comma-separated canonical string of
  1-16 unique items in strictly increasing lexical order. CSV length is 1-600;
  whitespace, empty items, duplicates, and non-canonical order reject.
- Clause input is JSON length 2-6000 and parses to an array of 1-8 exact objects
  `{id,text,kind}`. Clause IDs are unique and 1-64 characters; text is 1-600
  characters with control characters rejected; kind is exactly `RESTRICTION`
  or `PROHIBITION`.
- A child must use exactly the parent's clause-ID set and the same kind for each
  ID. This deterministically proves total parent-clause and prohibition coverage;
  the validator decides only whether each new text preserves/narrows, expands,
  or ambiguously changes that exact parent clause.
- Nonces are 1-120 printable ASCII characters. The canonical replay key is
  `sender|method|nonce`, so one actor cannot replay a write while unrelated
  actors may independently choose the same human nonce.
- Addresses come only from typed calldata or authenticated `gl.message.sender`;
  prose cannot redefine any actor, ID, scope, relationship, consequence, or
  destination.

### Structured storage

The contract stores these three top-level maps plus one append-only discovery
index required by the canonical frontend list:

```text
TreeMap[str, Grant] grants
TreeMap[str, Review] reviews
TreeMap[str, bool] used_nonces
DynArray[str] grant_ids
```

`Grant` fields are `grant_id`, `parent_id`, `root_principal`, `grantor`,
`grantee`, canonical `capabilities_csv`, canonical `resources_csv`, canonical
`clauses_json`, `depth`, `max_depth`, `expires_at`, `parent_version`, `version`,
and `status`. Sized integers are used in storage. Parent, actors, objective
scope, clauses, depth, maximum depth, and expiry are immutable after creation;
protective revocation changes only status and increments version.

Root fields are initialized with `parent_id=""`, `depth=0`, `parent_version=0`,
and `version=1`. A child copies the parent's `max_depth`, stores
`depth=parent.depth+1`, snapshots `parent_version=parent.version`, and starts at
`version=1`. Each successfully created root/child appends its ID exactly once to
`grant_ids`; rejected/duplicate calls do not alter the index.

`Review` fields are `child_id`, monotonic `attempt`, `verdict`, canonical
`expansion_clause_ids_csv`, canonical `ambiguous_clause_ids_csv`, and a
contract-derived `reason_code`. `reviews[child_id]` is the latest canonical
review, not a claim of full onchain attempt history. Wallet receipts and the
session Activity view remain distinct from canonical latest-review state.

### State machine

```text
root:  ABSENT -> ACTIVE -> REVOKED
child: ABSENT -> PROPOSED -> ACTIVE | DENIED | RETRYABLE
retry: RETRYABLE -> ACTIVE | DENIED | RETRYABLE
protective: PROPOSED | RETRYABLE | ACTIVE | DENIED -> REVOKED
derived: any non-REVOKED grant becomes ineffective when it or an ancestor expires
```

`REVIEWING` is a transaction-local UI/consensus condition, not a persisted
contract status. Root grants become `ACTIVE` after deterministic validation.
Child grants remain inactive until a finalized, invariant-valid `ATTENUATED`
review. `DENIED` is terminal for that child ID; a redesigned child uses a new ID.
`RETRYABLE` issues no authority and may be reviewed again while the complete
chain is unexpired and active.

### Temporal entrypoint rules

| Entrypoint/view | Transaction/read-time rule | Equality semantics | Stale-phase proof |
| --- | --- | --- | --- |
| `create_root_grant` | `now < expires_at` | `now == expires_at` is late | Test expiry `boundary - 1`, exact boundary, `boundary + 1`; rejected state/maps unchanged |
| `propose_child_grant` | Parent chain effective; `now < parent.expires_at`; `now < child.expires_at <= parent.expires_at` | Equality to either current expiry is late; child may equal parent's future expiry | Leave parent `ACTIVE` while clock crosses boundary; rejected child absent and nonce unused |
| `review_child_grant` | `now < child.expires_at` and `now < expires_at` for every ancestor | Equality at any chain expiry is late | Leave child `PROPOSED`/`RETRYABLE`; rejected review/status/attempt unchanged |
| `revoke_grant` | `N/A`: protective withdrawal remains legal before or after expiry | `N/A` | Tests prove expired grants remain revocable by an authorized actor |
| `is_effective` / `can_invoke` | Evaluate current read time across the bounded ancestor chain | Equality is expired | Stale stored `ACTIVE` never yields effective/allowed after boundary |

### Illegal transitions

- Create or propose an existing grant ID; reuse a consumed caller/method nonce.
- Propose from a missing, non-`ACTIVE`, ineffective, expired, or depth-exhausted
  parent; propose by anyone except the exact parent grantee.
- Propose wider capabilities/resources, a later child expiry, a different/missing/
  extra clause ID, or a changed clause kind.
- Review a root, missing child, `ACTIVE`, `DENIED`, `REVOKED`, expired child, or
  child under an inactive/expired ancestor; review by anyone except its grantor.
- Activate on missing/extra/duplicate clause coverage, invalid enums, mismatched
  child/attempt IDs, malformed JSON, or validator disagreement.
- Revoke a missing/already-revoked grant, a grant outside the caller's root tree,
  or by an actor other than the recorded grantor/root principal.
- Treat unavailable state, a stored `ACTIVE` flag without live ancestor/time
  checks, or frontend/local state as authority.

### Authorization

| Operation | Authorized actor | Canonical binding |
| --- | --- | --- |
| Create root | Any authenticated transaction sender | Sender becomes immutable root principal and grantor |
| Propose child | Exact grantee of the effective parent | Sender becomes immutable child grantor; child grantee comes from typed calldata |
| Review child | Exact recorded child grantor | Stored child ID, parent ID/version, attempt, clauses, and current chain state |
| Revoke | Exact grantor or immutable root principal of that grant's tree | Stored grant/root relationship; no prose override |
| Read/check | Public | Exact stored grant plus current bounded chain/time evaluation |

### Idempotency and double-action prevention

- Create/propose/revoke consume `sender|method|nonce` only in the successful
  deterministic mutation path; rejected calls leave the key unused.
- Global grant-ID uniqueness prevents duplicate roots/children and cross-tree
  overwrites.
- Final `ACTIVE`, `DENIED`, and `REVOKED` states reject duplicate semantic review
  or revocation. `RETRYABLE` review is an explicit new attempt and increments the
  stored counter exactly once after valid settlement.
- Views never mutate. Derived descendant denial is calculated from the complete
  current ancestor chain, so no batch cascade can be partially applied or replayed.

## Write-method safety cards

| Method | Caller authorization | Allowed state | Forbidden state | Temporal/expiry gate | Idempotency | Value/accounting | Affected canonical views | Required negative tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `create_root_grant` | Caller becomes root principal/grantor | Grant ID absent | Existing ID; malformed input | `now < expires_at`; equality late | Duplicate ID or `sender|create_root_grant|nonce` rejects | Non-payable; 0 GEN; accounting unchanged | `get_grant`, `is_effective`, `can_invoke` | Malformed/bounds, expiry -1/equal/+1, duplicate ID, replay, value metadata, unchanged maps |
| `propose_child_grant` | Caller equals active parent grantee | Parent `ACTIVE` and effective; depth available | Missing/inactive/revoked/expired/depth-full parent; existing child | `now < parent.expires_at`; `now < child.expires_at <= parent.expires_at`; equality late | Duplicate child or `sender|propose_child_grant|nonce` rejects | Non-payable; 0 GEN; accounting unchanged | `get_grant`, `get_review`, `is_effective`, `can_invoke` | Wrong caller/state, wider scopes, clause coverage/kind, time/depth boundaries, replay, child absent |
| `review_child_grant` | Caller equals recorded child grantor | Child `PROPOSED` or `RETRYABLE`; complete chain effective | Root/missing/active/denied/revoked/expired/inactive-ancestor child | `now` strictly before child and every ancestor expiry | Final states reject; each legal retry increments attempt once | Non-payable; 0 GEN; accounting unchanged | `get_grant`, `get_review`, `is_effective`, `can_invoke` | Wrong caller/state, expiry -1/equal/+1 with stale phase, malformed/malicious output, disagreement, duplicate final review, unchanged authority |
| `revoke_grant` | Caller equals grantor or root principal of the stored tree | Any existing non-`REVOKED` grant | Missing/already revoked/outside tree | `N/A`: protective withdrawal remains legal before/after expiry | Duplicate/replayed nonce rejects | Non-payable; 0 GEN; accounting unchanged | `get_grant`, `is_effective`, `can_invoke` | Wrong caller/tree, absent/duplicate/replay, expired success, descendant denial, no unrelated-tree effect |

## Frontend lifecycle coverage matrix

| User-visible workflow | Client wrapper | UI control | Frontend test | Lifecycle handling | Canonical reload/read |
| --- | --- | --- | --- | --- | --- |
| Create root | `GrantLatticeAdapter.createRoot` | `/grants/new` submit | Valid/invalid form, disconnected/wrong-network, submitted/finalized/failed | `TransactionProvider` tracks submitted, accepted, finalized, failed | Reload `get_grant`/`list_grant_ids` only after `FINALIZED` |
| Propose child | `GrantLatticeAdapter.proposeChild` | `/grants/:id/delegate` submit | Parent unavailable/ineligible, validation, finality/failure | Same real transaction stages; no optimistic authority | Reload child/parent after `FINALIZED` |
| Review/retry | `GrantLatticeAdapter.reviewChild` | Eligible detail action | Proposed/retryable visibility, accepted/finalized/retry/failed | Validator decision is not shown as finalized early | Reload `get_review` and `get_grant` after `FINALIZED` |
| Revoke | `GrantLatticeAdapter.revokeGrant` | Eligible detail action | Wrong role/state hidden/disabled, failure/finality | No descendant denial claim before finalization | Reload grant, descendants, and access result after `FINALIZED` |
| Grant discovery/detail | `list_grant_ids` plus `GrantLatticeAdapter.listGrants/getGrant` | `/grants` list/search and detail links | Pagination, empty, filter, not-found, unavailable | Read-only; no transaction/finality claim | Every displayed record resolves through canonical `get_grant` |
| Access check | `GrantLatticeAdapter.canInvoke` | `/checks` form | Allowed, denied reason, adapter exception fail-closed | Read/validation state; unavailable is never allow | Each check is a fresh canonical read |
| Wallet session | `WalletProvider.connect/disconnect` | Header picker/account menu | Deliberate selection, Escape/focus, listener cleanup | Switching/ready/error without simulated account | Disconnect clears provider/account and disables writes |

The route/control/state framework and real GenLayer adapter are implemented and
tested. Browser-local transport reached Studionet without CORS/Failed-to-fetch;
a user-wallet-signed production write remains pending and is not claimed here.

## Evidence policy

- Authoritative sources: authenticated transaction sender and immutable/bounded
  canonical GrantLattice storage authored by the actors who control delegation.
- Provenance/authentication: GenVM transaction authentication plus exact stored
  grantor, grantee, root principal, parent link/version, and attempt bindings.
- Authorized attestor/signer: `N/A` for external attestors; the canonical sender
  is the policy author for root/child/revocation writes.
- Anti-replay event/digest identity: stable grant ID plus
  `sender|method|nonce`; review uses stored child ID and monotonic attempt.
- Signed timestamp bounds: `N/A` for external signed artifacts; consensus
  transaction/read time is checked directly against stored epoch expiries.
- Immutable policy/source version URLs and hashes: `N/A` because no external
  policy URL is accepted; deployment identity binds source commit and contract
  revision, while each grant stores immutable parent/version and policy bytes.
- Allowed schemes/domains/paths: `N/A`; the v1 consequential path fetches no URL.
- Time/window rules: strict `now < expiry` on every time-dependent entrypoint and
  view; equality is late.
- Size/count bounds: IDs, labels, CSV, clauses, clause count/text, depth, and nonce
  bounds are locked in the State model section.
- Missing/contradictory evidence: missing or inconsistent state rejects; semantic
  ambiguity remains inactive and `RETRYABLE`.
- Unavailable source: validator/RPC unavailability never activates or allows;
  transaction fails unchanged or the UI reports unavailable.
- Invalid/unverifiable attestation: `N/A` external attestation; malformed or
  invariant-invalid semantic output is non-authorizing and retryable/unchanged.
- Canonical objective/policy source and hash: exact contract-held parent and child
  grant bytes; no hash is treated as authenticity.
- Workflow/entity, step/requirement, actor/subject binding: child ID, parent ID and
  version, root, grantor, grantee, attempt, clause IDs/kinds, scopes, and expiry.
- Prompt-injection boundary: clause text is quoted untrusted data; schema,
  authority, expected IDs, classifications, and consequences come from code.
- Private/unverifiable evidence excluded: all private evidence, claimant URLs,
  screenshots, self-reported logs, and hash-only artifacts.

- V1 uses no external URL, claimant artifact, screenshot, or offchain signature
  as consequential evidence. Consensus input is bounded contract state authored
  through authenticated transactions.
- Actor-controlled clause prose is untrusted semantic content. Deterministic
  authority, actors, IDs, parent/version, objective scopes, expected clause IDs,
  kinds, attempt number, consequence rules, and value destinations come only
  from locked state/code.
- The semantic prompt quotes each exact stored parent/child clause as data and
  explicitly forbids following text instructions or redefining actors, scope,
  output schema, authority, or consequence.
- No digest is stored for fetched evidence because v1 fetches no evidence. If a
  future milestone adds external evidence, it must add authoritative provenance,
  exact-content digest recomputation, freshness/replay binding, and a new Gate 4
  audit before any consequence.
- Missing, malformed, contradictory, unavailable, or invariant-invalid review
  output can only revert unchanged or create a non-authorizing `RETRYABLE`
  record. It can never activate a child or grant access.

### Evidence Authority Matrix

| Consequential claim/fact | Evidence/artifact | Data controller | Authoritative source/issuer | Deterministic verification | Canonical objective/entity/actor binding | Freshness/anti-replay | Semantic role after verification | Non-penalizing failure state | Consequence blocked | Required negative test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EA-ROOT`: sender may issue this root policy | Typed root calldata and transaction sender | Root caller | Authenticated GenVM sender, who becomes the policy principal/grantor | Bounds/canonicalization, absent ID, future expiry, non-payable metadata | Root ID, sender as principal/grantor, grantee, scopes, clause IDs/kinds/text, expiry, max depth | Unique ID plus `sender|create_root_grant|nonce`; live transaction time | None; issuance is deterministic after verification | Revert unchanged | Root `ACTIVE` issuance | Wrong binding, malformed input, replay, expiry -1/equal/+1; grants/nonces unchanged |
| `EA-CHILD`: parent holder may propose this direct child | Stored parent plus typed child calldata and sender | Parent grantee controls proposal; parent/root authors control inherited bounds | Authenticated sender must equal exact effective parent grantee; stored parent is canonical | Parent/ancestor status/time, parent version, depth, subset scopes, exact clause-ID/kind coverage, child expiry | Root, parent/child IDs, parent version, grantor/grantee, objective scopes, clauses, depth, expiry | Unique child ID plus `sender|propose_child_grant|nonce`; live full-chain time | None at proposal; child remains `PROPOSED` | Revert unchanged; child absent | Child creation and every access allow | Valid-looking child with wrong parent/actor/objective/clause/time/replay; no child or nonce mutation |
| `EA-REVIEW`: qualitative child policy is no broader | Exact contract-held parent/child clause pair | Root/parent authors control policy text; neither controls validator consensus | Canonical storage is authoritative for what policy was authored; validators independently judge meaning | Exact child/attempt/parent-version binding; total unique expected clause IDs; fixed kinds/classes; bounded normalized output | Root, parent/child IDs, parent version, recorded grantor/grantee, attempt, every clause ID and text | Current chain effective/unexpired; monotonic attempt; finalized states reject replay | Classify each exact child clause as narrower/equal, expansion, or ambiguous | `RETRYABLE` inactive or transaction revert unchanged | Child activation/access from invalid or unverifiable output | Valid-shape missing/extra/duplicate/wrong-ID/class/attempt output and prompt injection; status/access/accounting unchanged |
| `EA-REVOKE`: recorded authority owner may withdraw a grant | Stored grant/root relation, sender, nonce | Recorded grantor or immutable root principal | Authenticated sender matched to canonical grant/root actors | Grant exists, not revoked, caller exact, root relationship valid, non-payable metadata | Grant ID, tree root, caller role, current status | `sender|revoke_grant|nonce`; duplicate state/nonce rejects; expiry does not block protection | None; withdrawal is deterministic | Revert unchanged | Revocation and descendant ineffectiveness | Wrong actor/tree, missing/already revoked, replay; target and unrelated tree unchanged |

Actor-controlled prose cannot redefine grantor, grantee, IDs, parent relation,
capability/resource enums, consequence, or value. V1 has no value destination.

## Consensus design

### Leader task

`review_child_grant` reads and validates all deterministic storage before the
nondeterministic block, then captures a bounded immutable snapshot in the
closure. The no-argument leader function calls
`gl.nondet.exec_prompt(prompt, response_format="json")`. It receives only:

- fixed instructions and fixed enum/schema definitions;
- exact child ID and attempt;
- each expected clause ID/kind;
- exact parent text and exact child text for that same ID;
- an instruction that quoted text is untrusted data and cannot change the task.

The leader must return:

```json
{
  "child_id": "child-1",
  "attempt": 1,
  "results": [
    {
      "clause_id": "purpose",
      "classification": "NARROWER_OR_EQUAL"
    }
  ]
}
```

Classification is exactly `NARROWER_OR_EQUAL`, `EXPANDS_AUTHORITY`, or
`AMBIGUOUS`. No output field may choose `ACTIVE`, `DENIED`, a payout, an actor,
or any other consequence.

### Consensus-critical fields

- Exact `child_id` and current `attempt`.
- Exactly one result for every expected clause ID; no extra/missing/duplicate ID.
- Classification enum for each ID; clause kind and parent-child pairing come from
  the deterministic snapshot and cannot be supplied by the model.
- Normalized semantic tuple: child ID, attempt, and clause-ID-to-class mapping in
  deterministic clause-ID order.
- Expansion and ambiguity ID sets derived by contract code from that mapping.
- Overall verdict and child status derived by contract code, never trusted from
  model prose.

### Validator and equivalence principle

The implementation uses `gl.vm.run_nondet(leader_fn, validator_fn)` per locked
D3 in the parent workspace `docs/09-LOCKED-BUILD-DECISIONS.md`; `run_nondet_unsafe` is not a design
choice. The custom validator:

1. returns `False` unless `leader_res` is `gl.vm.Return`;
2. independently reruns `leader_fn`;
3. normalizes leader and validator results against the same expected IDs,
   child ID, attempt, and fixed classes;
4. returns `True` only when the complete normalized semantic tuples match.

Thus two validators must agree on the meaning/classification of every expected
clause, not merely JSON shape. Key order and formatting are irrelevant; a
different classification, omission, extra ID, duplicate ID, or invalid enum
disagrees. Storage is read before the nondeterministic block and passed only by
closure.

### Rationale policy

The model does not control canonical rationale. The contract stores only one of
the fixed reason codes `ALL_CLAUSES_NARROWER`, `EXPANSION_DETECTED`,
`AMBIGUOUS_CLAUSES`, or `INVALID_REVIEW_OUTPUT`. Raw prompts, model reasoning,
and raw validator JSON remain system-only and never become product authority.

### Settlement invariants before hard authority

After consensus returns and before any status mutation, deterministic code
validates the output again:

- output is a bounded object with only the required semantic fields;
- child ID and attempt equal locked state;
- every expected clause ID is covered exactly once;
- no extra/missing/duplicate IDs or invalid class exists;
- stored child/parent clause-ID sets and kinds still match;
- child is still in the legal status and its whole chain is still effective and
  strictly unexpired at transaction time;
- expansion/ambiguity sets are derived from normalized classes;
- `ATTENUATED` occurs only when every class is `NARROWER_OR_EQUAL`;
- `EXPANSION` occurs when at least one class expands; otherwise any ambiguity
  yields `AMBIGUOUS`/`RETRYABLE`.

Invalid output cannot activate, deny, route, settle, or grant access. It either
reverts the transaction unchanged or records a fixed non-authorizing
`UNVERIFIABLE`/`RETRYABLE` outcome if the output is safely normalizable enough
to identify the current child/attempt.

## Consequence and accounting

### Consequence table

| Normalized semantic result | Contract-derived verdict | Child status | `is_effective` / `can_invoke` consequence | Legal next step |
| --- | --- | --- | --- | --- |
| Every expected clause `NARROWER_OR_EQUAL` | `ATTENUATED` | `ACTIVE` | May become effective only if every ancestor/time/scope check also passes | Use exact canonical access check; grantor/root may revoke |
| One or more `EXPANDS_AUTHORITY` | `EXPANSION` | `DENIED` | Always ineffective; never allowed | Create a new, genuinely narrower child ID |
| No expansion and one or more `AMBIGUOUS` | `AMBIGUOUS` | `RETRYABLE` | Inactive; never allowed | Recorded grantor may request another review before expiry |
| Malformed/invariant-invalid/unavailable/disagreed output | `UNVERIFIABLE` or transaction failure | `RETRYABLE` or prior state unchanged | Inactive; never allowed | Retry only after distinguishing transient from structural failure |
| Authorized revoke | `N/A — deterministic protection` | `REVOKED` | Target and all descendants fail live ancestor evaluation | No restore in v1; issue a new bounded grant if appropriate |
| Own/ancestor expiry | `N/A — derived time rule` | Stored status unchanged | Ineffective/denied at read and every time-sensitive write | New grant required; protection may still be revoked |

### Value-destination matrix

| Value/purse | Payer/source | Locked state | Release/refund/forfeit destination | Terminal states | Duplicate/late/retry behavior | Canonical proof view |
| --- | --- | --- | --- | --- | --- | --- |
| Contract GEN balance | `N/A — all v1 entrypoints are non-payable and send 0 GEN` | No purse, bond, fee, reward, escrow, or credit exists | `N/A — no GEN accepted or transferred` | All grant states preserve zero value accounting | Any unexpected value is rejected by non-payable metadata; retry also sends 0 GEN | Source decorators/static tests plus deployment balance evidence |

There is no rounding, remainder, withdrawal, refund, slashing, fee, or orphaned
value path in v1. Human-facing copy uses GEN only; demo writes are non-payable
and therefore use 0 GEN. If a future milestone adds value, it requires a new
value-destination matrix and 1-2 GEN bounded demo plan before implementation.

## Reusable interface

### Write methods

```python
create_root_grant(grant_id: str, grantee: Address, capabilities_csv: str, resources_csv: str, clauses_json: str, expires_at: u256, max_depth: u256, nonce: str) -> None
propose_child_grant(parent_id: str, child_id: str, child_grantee: Address, capabilities_csv: str, resources_csv: str, clauses_json: str, expires_at: u256, nonce: str) -> None
review_child_grant(child_id: str) -> None
revoke_grant(grant_id: str, nonce: str) -> None
```

All four writes are non-payable. No convenience alias, admin bypass, bulk write,
or second contract is part of the v1 public surface.

### View methods

```python
get_grant(grant_id: str) -> Grant
get_review(child_id: str) -> Review
is_effective(grant_id: str) -> bool
can_invoke(grant_id: str, capability_id: str, resource_id: str) -> str
list_grant_ids(offset: u256, limit: u256) -> DynArray[str]
```

`can_invoke` returns exactly `ALLOWED`, `GRANT_INACTIVE`, `ANCESTOR_INACTIVE`,
`EXPIRED`, `CAPABILITY_MISSING`, or `RESOURCE_MISSING`. Missing grants return
`GRANT_INACTIVE`; an unavailable RPC is a frontend/integrator error and must not
be converted to an onchain `ALLOWED` value.

`get_grant` and `get_review` raise a bounded not-found `UserError`; the frontend
adapter maps only that known absence to `null` and treats transport/unknown errors
as unavailable. `list_grant_ids` requires `1 <= limit <= 25`, returns IDs from the
append-only canonical index starting at `offset`, and never invents records. The
adapter fetches each returned record through `get_grant`; optional account
filtering is presentation over canonical records, not authority.

`can_invoke` reason precedence is locked: missing/non-`ACTIVE` target ->
`GRANT_INACTIVE`; own expiry -> `EXPIRED`; inactive/expired ancestor ->
`ANCESTOR_INACTIVE`; missing capability -> `CAPABILITY_MISSING`; missing resource
-> `RESOURCE_MISSING`; otherwise `ALLOWED`.

### Consumer/callback boundary

V1 has no callback and no separate consumer contract. Consumers perform a fresh
public read immediately before the protected action and fail closed if the read
is unavailable or not `ALLOWED`. Because no contract-to-contract delivery is
claimed, callback sender authentication and delivery idempotency are `N/A`.
Milestone adapters may add real A2A/MCP/ADK execution boundaries without changing
the canonical grant interface.

### Consumer proof matrix

| Consumer | Structurally different workflow | Canonical read boundary | Output needed | V1 claim |
| --- | --- | --- | --- | --- |
| A2A AgentSkill gateway | A parent delegates a cross-agent task before another agent executes a skill | Check `can_invoke` immediately before `AgentSkill.execute` | `ALLOWED` or exact fail-closed reason plus effective lineage state | Interface documented; external execution adapter is milestone work |
| MCP tool proxy | A caller invokes a protected server tool over `tools/call` | Check `can_invoke` before forwarding the tool request | Canonical allow/deny for grant, tool capability, and resource | Interface documented; no production MCP enforcement claim |
| Google ADK AgentTool guard | An orchestrator invokes an agent as an in-process tool | Check `is_effective`/`can_invoke` in the pre-execution guard | Effective authority and exact denial reason | Interface documented; no ADK integration/adoption claim |

## Threat model

| Threat/adversary goal | Preventive control | Fail-closed result | Required proof |
| --- | --- | --- | --- |
| Unauthorized caller creates/reviews/revokes for another actor | Authenticated sender matched to stored role; no actor from prose | Revert unchanged | Wrong caller for every write; maps/status/accounting unchanged |
| Replay or duplicate overwrites state | Stable unique IDs, caller/method nonce keys, terminal-state guards | Revert unchanged | Duplicate ID, nonce, review, revoke, and cross-method/cross-caller cases |
| Child widens objective scopes | Canonical sorted CSV and deterministic subset/depth/time checks before storage | Child absent | Extra capability/resource, later expiry, depth overflow, malformed/noncanonical CSV |
| Child drops or changes a parent qualitative rule | Exact equal clause-ID set and fixed kind before semantic review | Proposal rejects | Missing/extra/duplicate ID and kind mismatch |
| Prompt injection redefines authority/output/consequence | Quoted untrusted clause data; fixed schema/IDs/classes; code-derived status | Inactive retry or unchanged | Clause text instructs payout/authority/schema override; no hard-state effect |
| Malicious leader returns valid JSON with unsafe meaning/coverage | Independent semantic validator plus deterministic settlement invariants | Inactive retry or unchanged | Wrong child/attempt, extra/missing/duplicate ID, invalid enum, semantic disagreement |
| Validator/source unavailable or disagrees | `gl.vm.run_nondet` consensus; no optimistic state | Transaction failure or `RETRYABLE`; never active | Mock timeout/error/rollback/disagreement and canonical state unchanged |
| Stale stored `ACTIVE` bypasses expiry/revoke | Every time-dependent write and view walks live bounded ancestry/time | Denied | Boundary -1/equal/+1 with stale phase; revoked/expired ancestor denial |
| Revocation mutates only part of a subtree | Descendant ineffectiveness is derived, not batch-written | Complete fail-closed cascade | Deep descendant plus unrelated-tree isolation |
| Consumer fails open on RPC error | Adapter exceptions map to unavailable; no local authority cache | Protected action denied | Frontend/integration unavailable-read test; no `ALLOWED` display |
| Test fixture appears as product truth | Production dependency injection uses only unconfigured/real adapter | Fail-closed product state | Import/tree audit and browser proof with contract unconfigured |
| Unexpected GEN becomes trapped | All entrypoints non-payable; no transfer/ledger code | Transaction rejects | Decorator/metadata AST test and deployment balance evidence |
| Oversized input or ancestor walk exhausts resources | Fixed length/count bounds and `max_depth <= 8` | Revert/deny within bound | Every upper bound, malformed JSON, deepest allowed and overflow depth |

## Test plan

### Static and authoring tests

- Contract source is ASCII; first line is the exact verified Depends header.
- Exactly one validator-visible project-specific `gl.Contract` subclass exists.
- No forbidden imports/types, bare nondeterministic call, payable write, transfer,
  second contract, placeholder, or raw base-unit human copy exists.
- Public signatures, storage types, bounds, enum constants, and view return types
  match this specification; `genvm-lint check` recognizes the class.

### Direct deterministic tests

- Root/child entity and tree isolation; caller authorization; immutable fields.
- Append-only grant-ID index, pagination bounds/order, duplicate rejection, and
  `get_grant` resolution for every listed ID.
- Every input minimum/maximum and malformed/noncanonical CSV/JSON branch.
- Objective subset, exact clause coverage/kind, depth, child expiry, and parent
  version rules.
- Wrong caller, wrong state, duplicate ID/nonce/revoke/review, and unchanged-map
  assertions for every rejection.
- Each time-bounded public write at boundary -1, exact boundary, and boundary +1
  while stored phase stays stale; canonical state and accounting unchanged.
- Root, child, and ancestor expiry/revocation; deepest allowed ancestry;
  unrelated-tree isolation; all `can_invoke` reasons and precedence.
- Non-payable metadata for every write and zero contract accounting throughout.

### Nondeterministic and adversarial tests

- Mock LLM before review transactions; leader/validator independent semantic
  agreement on all three clause classifications.
- ATTENUATED, EXPANSION, AMBIGUOUS, unavailable, malformed, fenced JSON, invalid
  enum, missing/extra/duplicate IDs, wrong child/attempt, and leader rollback.
- Valid-shape malicious outputs with invalid settlement meaning cannot mutate
  hard authority; prompt-injection clauses cannot redefine actors/schema/status.
- Retry increments exactly once; final outcomes reject replay; accounting remains
  zero on all accepted, rejected, failed, and retry paths.

### Frontend and client tests

- All nine routes, loading/empty/error states, status language, access allow/deny/
  unavailable, transaction lifecycle, and reload only after finalization.
- EIP-6963 plus injected provider fallback/deduplication; deliberate selection;
  network switch/add; modal focus/Escape; account menu and disconnect cleanup.
- Real wrapper argument mapping, no write while disconnected/wrong network, role/
  state action visibility, raw and normalized receipt parsing, retry ID read from
  current canonical state, and post-finalization reload.
- Axe, reduced motion, keyboard focus, 360/768/1024/1440 overflow, browser console,
  wallet-RPC and IC-RPC browser-CORS checks.

### Network evidence tests

- Bounded Studionet smoke test before the full lifecycle.
- Deployment source identity and finalized deploy receipt.
- Root create, child propose, semantic review, access allow, authorized revoke,
  descendant denial, receipt/finality, and fresh canonical view reads.
- Primary/secondary actor separation. If a secondary EOA is required, fund it
  with exactly 1 GEN from the authorized primary wallet and preserve safe balance/
  receipt fields only; contract writes remain 0 GEN.

## Claim-to-code matrix

| Public/product claim | Method/state transition | Canonical view | Direct/static test | Frontend control/test | Studionet/browser evidence target | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| Root authority is authenticated and isolated | `create_root_grant`: absent -> `ACTIVE`; sender locked as root/grantor; append ID once | `get_grant`, `list_grant_ids`, `is_effective` | Wrong caller binding, duplicate ID/nonce, index isolation/pagination, time bounds | Root form, wallet gate, list/detail lifecycle/reload tests | `docs/evidence/studionet/lifecycle.json` (`CREATE_ROOT`) | Local + Studionet PASS; browser write pending |
| A child cannot exceed deterministic parent scope | `propose_child_grant`: absent -> `PROPOSED` after subset/depth/time/clause checks | `get_grant`, `is_effective` | Wider cap/resource/time/depth, clause mismatch, wrong actor/state | Delegate form parent gate/validation/finality tests | `docs/evidence/studionet/lifecycle.json` (`PROVE_OBJECTIVE_REJECTION`, `PROPOSE_VALID`) | Local + Studionet PASS; browser write pending |
| Only validator-agreed qualitative attenuation activates a child | `review_child_grant`: `PROPOSED/RETRYABLE -> ACTIVE/DENIED/RETRYABLE` | `get_review`, `get_grant`, `is_effective` | Semantic replay, malicious leader/validator outputs, total coverage/invariant tests | Review/retry control, stages, canonical reload | `docs/evidence/studionet/lifecycle.json` (three review outcomes) | Local + Studionet PASS; browser write pending |
| Revocation/expiry fail-closes every descendant without partial cascade | `revoke_grant`: target -> `REVOKED`; descendant result derived | `is_effective`, `can_invoke`, `get_grant` | Deep chain, expired revoke, wrong actor, unrelated tree, no double revoke | Eligible revoke control and descendant refresh | `docs/evidence/studionet/lifecycle.json` (`REVOKE_ROOT`) | Local + Studionet PASS; browser write pending |
| Exact protected actions fail closed | No write; live bounded chain/scope evaluation | `can_invoke` exact reason | All reason enums, boundary equality, missing grant, stale phase | `/checks` allowed/denied/unavailable tests | `docs/evidence/studionet/lifecycle.json` (`ALLOWED -> ANCESTOR_INACTIVE`); `docs/evidence/browser/production-verification.md` | Local + Studionet + production browser PASS |
| Browser users choose a wallet and see only real lifecycle state | Wallet/network session plus adapter writes; no simulated state | Fresh contract reads after `FINALIZED` | Provider/network/receipt parser tests | Picker, account menu, disconnect, Activity, reload tests | `docs/evidence/frontend/phase-7-real-adapter.md`; `docs/evidence/browser/production-verification.md` | Production reads and real provider discovery PASS; wallet-signed write pending |
| One interface is reusable at three distinct execution boundaries | Same views; no consumer mirror contract | `is_effective`, `can_invoke` | Adapter examples and fail-closed wrapper tests | `/integrate` patterns and honesty disclaimer | `docs/evidence/frontend/phase-7-real-adapter.md` | Real adapter PASS; external adoption not claimed |

## Analogue and differentiation matrix

| Analogue/alternative | What it handles well | Missing trust property for this project | GrantLattice differentiation |
| --- | --- | --- | --- |
| Ordinary RBAC/ACL database | Deterministic named roles and resource lists | One backend controls policy meaning and final access state | Validator-controlled qualitative monotonicity plus canonical fail-closed state |
| Capability tokens/macaroons | Deterministic attenuation of structured caveats | Arbitrary natural-language purpose/audience/retention meaning remains issuer/interpreter controlled | Deterministic objective subset first, then consensus on exact qualitative clauses |
| Centralized policy LLM | Flexible natural-language comparison | One operator/model can bias or change verdicts offchain | Validators independently compare meaning and contract derives consequence |
| Multisig/manual approval | Human quorum for high-value changes | Does not produce a reusable clause-complete semantic access primitive | Bounded reusable read interface for pre-execution gateways |
| CampaignScoreRegistry-style JSON registry | Stores submitted text/results | Write-only artifacts, overwriteable globals, offchain judgment, no canonical consequence | Entity-keyed states, authenticated actors, onchain nondeterminism, enforced access outcome |
| Existing workspace primitives (policy quorum, successor transfer, semantic clearing, interface quarantine, post-action bonds) | Solve different quorum, succession, settlement, compatibility, or accountability problems | None owns parent-child least-privilege semantic monotonicity before action | Exact parent-child clause coverage and live ancestor cascade before execution |

## Deployment and evidence plan

1. Use the locked network, Portal channel, and nondeterministic API decisions only
   by reference to the parent workspace `docs/09-LOCKED-BUILD-DECISIONS.md`.
2. Create the repository Python 3.12 `.venv`, install pinned requirements, and
   prove lint/direct/frontend/root checks before any network write.
3. Discover secrets from project `.env`, then authorized parent `.env`; report
   presence only. Never log complete receipts, validator config, keys, or `.env`.
4. Run a bounded Studionet deploy/smoke transaction with allowlisted safe fields.
   Bind network, source commit, Depends/API revision, deployer, address, attempt,
   and status in one active `deployment.json`; archive superseded revisions.
5. Use separate primary/root and parent-grantee actors for the lifecycle. Generate
   and fund a secondary EOA only if required; funding is exactly 1 GEN and is
   distinct from non-payable contract calls.
6. Execute resumable create -> propose -> review -> finalized reads -> access allow
   -> revoke -> descendant denial. Dynamically read current review attempt/status;
   never hardcode attempt `-1` or replay finalized state.
7. Capture only allowlisted address, hash, status, block/finality timestamp, actor,
   method, grant IDs, verdict/reason code, and canonical view fields under
   `docs/evidence/studionet/`. Keep localnet and Studionet evidence separate.
8. Wire the frontend real adapter, then prove wallet-compatible write RPC and
   separate IC read path in a local browser with no Failed-to-fetch/CORS errors.
9. Publish only after public-file, history, secret, claim, and intended-root
   hygiene; require green CI. Deploy production frontend, verify every route and
   honest missing-configuration state, and record the final URL.
10. Run `python ../tools/genlayer_precheck.py -Project GrantLattice -Category projects`
    and require `NO BLOCKER` before preparing copy-ready Portal fields. Do not
    click final Submit without explicit action-time authorization.

Evidence and remaining targets:

- `docs/evidence/specification/phase-4-gate.md`
- `docs/evidence/contract/phase-5-6-local-verification.md`
- `docs/evidence/frontend/phase-7-real-adapter.md`
- `docs/evidence/studionet/delegate-funding.json`
- `docs/evidence/studionet/deployment.json`
- `docs/evidence/studionet/deployment-attempts.json`
- `docs/evidence/studionet/lifecycle.json`
- `docs/evidence/browser/wallet-lifecycle.md`
- `docs/evidence/browser/production-verification.md`
- `docs/evidence/integration/adapter-proof.md`

## Definition of Done

### Intelligent Contract foundation

- One ASCII contract with exact Depends header and exactly one recognized,
  project-specific `gl.Contract` subclass.
- Public signatures, storage, status machine, role checks, non-payable metadata,
  temporal gates, idempotency, consensus validator, settlement invariants, and
  views exactly match this spec.
- Lint, static tests, direct tests, nondeterministic adversarial tests, parser
  tests, TypeScript, frontend tests, and production build all pass under root
  `npm run check`.
- Bounded Studionet smoke and full lifecycle finalize with safe evidence;
  contract balance/accounting remains zero.

### Projects product

- All nine routes remain reachable, responsive, accessible, and FE-PRESERVE
  compliant.
- EVM provider discovery lists detected wallets for deliberate selection;
  network switching/adding uses current verified parameters; address menu and
  disconnect work.
- Every claimed browser workflow has a real client wrapper, legal UI control,
  frontend test, submitted/accepted/finalized/failed/retry handling, and fresh
  canonical state reload.
- Browser-local and production RPC behavior has no CORS/Failed-to-fetch failure;
  production URL and route verification exist; no fixtures or simulated chain state ship.
- Public repository contains only allowlisted project files, green CI, accurate
  exact counts/claims, and no secret/control/parent-workspace material.
- Precheck for project/category reports `NO BLOCKER`; every master checklist item
  has command/output proof; final master reread lists any uncertainty.
- Copy-ready Portal fields are prepared, but final Submit remains unclicked until
  explicit action-time authorization.

## Honest limitations

- The local 12-case corpus supplements rather than replaces the recorded
  multi-validator Studionet lifecycle; it is not performance or adoption evidence.
- Contract implementation, lint/direct tests, semantic mocks, deployment,
  Studionet finality, public CI, production hosting, real adapter, and live IC
  transport are verified. A browser-wallet-signed transaction remains pending.
- The validator judges authored policy meaning, not external real-world truth;
  semantic false positives/negatives remain possible and ambiguity fail-closes.
- V1 accepts at most 8 clauses, 16 capabilities/resources, and depth 8; larger
  policies require decomposition or a later measured revision.
- Only the latest canonical review is stored; full onchain review history and
  restore/cure of revoked grants are out of scope.
- A2A, MCP, and Google ADK are documented consumer patterns, not deployed or
  adopted protocol integrations. One external fail-closed protocol adapter is
  still required for the next milestone.
- No contract value path, fee, bond, reward, escrow, payout, or credit exists.
- No adopter commitment, external integration request, Portal submission, or
  acceptance exists yet.

## Kill criteria

- Kill or redesign if deterministic structured checks eliminate the need for
  qualitative validator judgment.
- Kill if exact contract-held evidence cannot be bounded and authenticated.
- Kill if malicious/invalid semantic output can activate or deny authority
  without complete settlement-invariant validation.
- Kill if the Projects frontend cannot prove a real wallet write, finality,
  canonical reload, and fail-closed access check on Studionet.
