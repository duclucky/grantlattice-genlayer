# Semantic Ambiguity Fingerprint Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a semantic `AMBIGUOUS` verdict terminal for an exact canonical delegation definition while keeping only technical `UNVERIFIABLE` failures retryable.

**Architecture:** The contract computes a Keccak-256 fingerprint from a length-prefixed canonical authority encoding that excludes `child_id` and nonce, stores fingerprints that reached semantic ambiguity, and rejects equivalent future proposals before mutation. The frontend models `AMBIGUOUS` separately and explains that material policy or scope revision is required.

**Tech Stack:** GenLayer Python Intelligent Contract, `Keccak256`, `TreeMap`, gltest direct mode, React 19, TypeScript, Vitest, GenLayerJS, Studionet, Vercel.

## Global Constraints

- Keep the existing pinned `Depends` header and exactly one `gl.Contract` class.
- All contract write entrypoints remain non-payable and accept 0 GEN.
- Only `ACTIVE` grants authorize; every missing, invalid, ambiguous, or unverifiable state fails closed.
- Fingerprints bind parent ID/version, child grantee, capabilities, resources, expiry, depth/max depth, and canonical clauses; they exclude child ID, nonce, and review attempt.
- `AMBIGUOUS` is terminal for the fingerprint; `UNVERIFIABLE` alone remains retryable.
- Preserve the existing design system and public-onchain visibility wording.

---

### Task 1: Contract regression tests

**Files:**
- Modify: `tests/direct/test_review.py`
- Modify: `tests/direct/test_child_grants.py`

**Interfaces:**
- Consumes: existing `create_root`, `propose_child`, `review_output`, and direct VM revert helpers.
- Produces: executable expectations for terminal ambiguity, cross-ID blocking, material revision, nonce rollback, and technical retry.

- [ ] **Step 1: Replace the grinding test with terminal-ambiguity assertions**

Assert attempt 1 stores verdict/status `AMBIGUOUS`, `is_effective` is false,
`can_invoke` returns `GRANT_INACTIVE`, and a second `review_child_grant` reverts
with `child is not reviewable` without incrementing the attempt.

- [ ] **Step 2: Add cross-ID fingerprint regression coverage**

Create an ambiguous child, then propose the identical definition under a new
child ID and nonce. Expect `authority definition is ambiguity-locked`, verify
the ID list is unchanged, and reuse that rejected nonce on a materially changed
definition to prove the failed proposal did not consume it.

- [ ] **Step 3: Add technical-retry coverage**

Feed malformed output on attempt 1 and assert `UNVERIFIABLE`/`RETRYABLE`; feed a
complete attenuated result with attempt 2 and assert `ATTENUATED`/`ACTIVE`.

- [ ] **Step 4: Update the 12-case corpus expectations**

Change semantic cases B1/B2 from `RETRYABLE` to `AMBIGUOUS`; retain invalid
output A2 as `RETRYABLE`.

- [ ] **Step 5: Run RED tests**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_review.py tests/direct/test_child_grants.py -q`

Expected: failures show current `AMBIGUOUS` becomes `RETRYABLE`, same-child retry
can activate, and equivalent cross-ID proposal is accepted.

### Task 2: Canonical contract lock

**Files:**
- Modify: `contracts/grant_lattice.py`

**Interfaces:**
- Produces: `_authority_definition_fingerprint(child: Grant) -> str`,
  `ambiguous_definitions: TreeMap[str, bool]`, terminal status `AMBIGUOUS`, and
  `Review.definition_fingerprint`.

- [ ] **Step 1: Add fingerprint storage and review evidence**

Append `definition_fingerprint: str` to `Review` and declare
`ambiguous_definitions: TreeMap[str, bool]` on `GrantLattice`.

- [ ] **Step 2: Implement collision-safe canonical encoding**

Build fields in this exact order:

```python
fields = [
    child.parent_id,
    str(int(child.parent_version)),
    self._address_key(child.grantee),
    child.capabilities_csv,
    child.resources_csv,
    str(int(child.expires_at)),
    str(int(child.depth)),
    str(int(child.max_depth)),
    child.clauses_json,
]
encoded = "".join(str(len(field.encode("utf-8"))) + ":" + field for field in fields)
return Keccak256(encoded.encode("utf-8")).hexdigest()
```

- [ ] **Step 3: Reject locked definitions before proposal mutation**

Construct the validated candidate `Grant`, derive its fingerprint, and raise
`gl.vm.UserError("authority definition is ambiguity-locked")` before appending
the child, storing its grant, or consuming its nonce.

- [ ] **Step 4: Separate semantic and technical transitions**

For invalid output, record `UNVERIFIABLE` with status `RETRYABLE`. For a valid
ambiguous result, store its fingerprint in `ambiguous_definitions`, record
`AMBIGUOUS` with status `AMBIGUOUS`, and make all later reviews fail the existing
reviewable-state guard. Record the definition fingerprint for every review.

- [ ] **Step 5: Lint immediately**

Run: `.venv\Scripts\genvm-lint.exe check contracts/grant_lattice.py`

Expected: exit 0 with lint and SDK validation passing.

- [ ] **Step 6: Run focused GREEN tests**

Run: `.venv\Scripts\python.exe -m pytest tests/direct/test_review.py tests/direct/test_child_grants.py -q`

Expected: all focused tests pass.

- [ ] **Step 7: Run the full direct suite and commit**

Run: `npm run test:direct`

Expected: all direct tests pass.

Commit: `fix: lock semantically ambiguous authority definitions`

### Task 3: Frontend terminal ambiguity state

**Files:**
- Modify: `frontend/src/domain/types.ts`
- Modify: `frontend/src/adapters/genlayerContract.ts`
- Modify: `frontend/src/components/StatusBadge.tsx`
- Modify: `frontend/src/pages/GrantDetailPage.tsx`
- Modify: `frontend/src/pages/GrantDetailPage.test.tsx`
- Modify: `frontend/src/pages/WriteJourneys.test.tsx`

**Interfaces:**
- Consumes: contract status `AMBIGUOUS` and existing `ReviewRecord`.
- Produces: typed parsing, terminal badge/copy, and review-action visibility only for `PROPOSED` or technical `RETRYABLE`.

- [ ] **Step 1: Write failing UI tests**

Render an `AMBIGUOUS` child and assert the badge and material-revision guidance
are visible while `Request semantic review` is absent. Preserve a separate
`RETRYABLE` fixture that still displays the review action.

- [ ] **Step 2: Run RED frontend tests**

Run: `npm --workspace frontend test -- src/pages/GrantDetailPage.test.tsx src/pages/WriteJourneys.test.tsx`

Expected: `AMBIGUOUS` is rejected by the status parser or lacks terminal copy.

- [ ] **Step 3: Query the UI skill and implement the minimal state correction**

Add `AMBIGUOUS` to the domain/parser status allowlists and status badge. Keep
review eligibility restricted to `PROPOSED` and `RETRYABLE`. On grant detail,
show concise guidance: the canonical definition is ambiguity-locked,
non-authorizing, and requires a materially revised policy or scope in a new
proposal.

- [ ] **Step 4: Run GREEN UI tests and frontend check**

Run: `npm --workspace frontend test -- src/pages/GrantDetailPage.test.tsx src/pages/WriteJourneys.test.tsx`

Run: `npm run check:frontend`

Expected: focused tests and full frontend test/typecheck/build pass.

- [ ] **Step 5: Commit**

Commit: `fix: surface terminal semantic ambiguity`

### Task 4: Specification, lifecycle, and deployment tooling

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `scripts/studionet.mjs`
- Modify: `tests/deployment/studionet-script.test.mjs`
- Modify: relevant current evidence manifests under `docs/evidence/`

**Interfaces:**
- Produces: documented transition matrix and a live lifecycle that proves
  ambiguity lock, cross-ID rejection, technical retry, and material revision.

- [ ] **Step 1: Write failing deployment-script tests**

Assert the lifecycle contains an ambiguity review followed by both a prohibited
same-child retry and prohibited equivalent cross-ID proposal, plus a materially
changed proposal and a technical `UNVERIFIABLE` retry path.

- [ ] **Step 2: Run RED deployment tests**

Run: `npm run check:deployment`

Expected: lifecycle source lacks the new ambiguity-lock operations/assertions.

- [ ] **Step 3: Update lifecycle and documentation**

Change every current-state matrix from `AMBIGUOUS/RETRYABLE` to
`AMBIGUOUS/AMBIGUOUS`, reserve `RETRYABLE` for `UNVERIFIABLE`, describe the
fingerprint fields and cross-ID behavior, and update the lifecycle script with
fail-closed assertions. Historical archived evidence remains immutable.

- [ ] **Step 4: Run GREEN deployment tests and doc consistency search**

Run: `npm run check:deployment`

Run: `rg -n "AMBIGUOUS.*RETRYABLE|ambiguity retry|may be retried" README.md docs frontend/src --glob '!docs/evidence/studionet/archive/**'`

Expected: deployment tests pass; no current documentation claims semantic
ambiguity is retryable.

- [ ] **Step 5: Commit**

Commit: `docs: specify ambiguity fingerprint lock`

### Task 5: Full verification, Studionet deployment, and production release

**Files:**
- Update generated active evidence under `docs/evidence/studionet/`
- Update active contract address references in `README.md`, `docs/README.md`, and frontend deployment configuration
- Append completion evidence to `D:\Genlayer Project\docs\IDEA-REGISTRY.md`

**Interfaces:**
- Consumes: verified source commit and existing deployment scripts/secrets.
- Produces: a new active Studionet contract, verified lifecycle evidence, updated Vercel production, GitHub/CI proof, and project precheck output.

- [ ] **Step 1: Run the complete local acceptance suite**

Run: `npm run check`

Expected: contract lint, all Python tests, deployment tests, frontend tests,
typecheck, and production build pass.

- [ ] **Step 2: Review the diff and commit verified source**

Run: `git diff --check`, `git status --short`, and `git diff HEAD~3 --stat`.

Verify the contract remains ASCII, first-line header unchanged, exactly one
`gl.Contract` class exists, no secret or generated dependency is tracked, and
all writes remain 0 GEN/non-payable.

- [ ] **Step 3: Inspect Studionet and deploy one new revision**

Run: `npm run studionet:inspect`

Run: `npm run studionet:deploy`

Expected: network/roles/funding are valid and deployment finalizes with a new
contract address.

- [ ] **Step 4: Execute the live lifecycle**

Run: `npm run studionet:lifecycle`

Expected: objective attenuation activates; expansion denies; semantic ambiguity
is terminal; same-child and cross-ID retries fail; material revision is
reviewable; technical failure remains retryable; actor-bound access and
revocation still fail closed.

- [ ] **Step 5: Update active evidence and production configuration**

Archive the previous address evidence, record the new address/transactions,
build with the new address, deploy Vercel production, and verify the production
site exposes the new configured address and terminal ambiguity UI.

- [ ] **Step 6: Push and verify CI/precheck**

Push the verified commits to `main`, wait for GitHub Actions success, then run
the repository precheck command for `-Project <this project> -Category projects`.

Expected: CI succeeds and precheck reports `NO BLOCKER`.

- [ ] **Step 7: Re-read the master prompt and close the project log**

Re-read `D:\Genlayer Project\MASTER-PROMPT-GENLAYER-END-TO-END.md` in full,
reconcile every phase/gate/directive against fresh evidence, append the semantic
ambiguity completion entry to `D:\Genlayer Project\docs\IDEA-REGISTRY.md`, and
list any uncertainty instead of inferring a pass.

## Plan self-review

Every spec requirement maps to a task: contract state and fingerprint in Tasks
1-2, frontend behavior in Task 3, documentation/lifecycle in Task 4, and live
deployment/acceptance in Task 5. Status and field names are consistent across
tasks. The only permitted retry is `UNVERIFIABLE`/`RETRYABLE`; semantic
`AMBIGUOUS` always maps to terminal `AMBIGUOUS`. No placeholder or optional
security path remains.
