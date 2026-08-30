# GrantLattice Judge Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten GrantLattice's actor and transaction-time authorization boundaries, adopt the current custom-validator API pattern safely, and make the public-state visibility limit explicit.

**Architecture:** The contract becomes the canonical actor-equality and scope guard through a four-argument `can_invoke`; consumers still authenticate the external actor before calling it. Transaction time comes only from the required deterministic GenVM context and errors instead of inventing zero. The React access check derives actor from the selected wallet, while docs and UI distinguish workspace filtering from onchain confidentiality.

**Tech Stack:** GenVM Python contract, gltest/pytest, React 19, TypeScript, Vitest/Testing Library, genlayer-js 1.1.8.

## Global Constraints

- Preserve the exact ASCII Depends header and exactly one project-specific `gl.Contract` subclass.
- Keep all writes nonpayable and all human-facing token amounts in GEN.
- No public state, transaction, wallet, finality, or confidentiality simulation.
- `run_nondet_unsafe` is permitted only for this documented judge/official-guidance exception and must catch validator exceptions explicitly.
- Historical Studionet evidence remains immutable; a new ABI requires a new deployed revision before any production-complete claim.
- Do not push, deploy, update production, or click Portal Submit without explicit publication authorization.

---

### Task 1: Bind the authenticated actor into canonical access checks

**Files:**
- Modify: `tests/direct/test_revoke_access.py`
- Modify: `tests/direct/test_contract_static.py`
- Modify: `contracts/grant_lattice.py`

**Interfaces:**
- Consumes: stored `Grant.grantee` and `_address_key(Address)`.
- Produces: `can_invoke(grant_id: str, actor: Address, capability_id: str, resource_id: str) -> str` and `ACTOR_MISMATCH`.

- [ ] **Step 1: Write the failing actor-boundary tests**

Update every direct `can_invoke` call to pass the expected grantee, then add:

```python
def test_can_invoke_rejects_public_grant_id_for_wrong_actor(
    contract, direct_vm, direct_alice, direct_bob, direct_charlie
):
    create_root(contract, direct_vm, direct_alice, direct_bob)
    assert contract.can_invoke(
        "root-1", direct_charlie, "READ", "case-1"
    ) == "ACTOR_MISMATCH"
    assert contract.can_invoke(
        "root-1", direct_bob, "READ", "case-1"
    ) == "ALLOWED"
```

Add an AST assertion that the four public parameters are exactly `grant_id`,
`actor`, `capability_id`, and `resource_id`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
.venv\Scripts\python.exe -m pytest tests/direct/test_revoke_access.py tests/direct/test_contract_static.py -q
```

Expected: failures because `can_invoke` still accepts three arguments and does
not define `ACTOR_MISMATCH`.

- [ ] **Step 3: Implement the minimal actor check**

Use this order immediately after the active-grant check:

```python
if self._address_key(actor) != self._address_key(grant.grantee):
    return "ACTOR_MISMATCH"
```

Keep the remaining expiry, ancestry, capability, and resource precedence
unchanged.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same pytest command. Expected: all selected tests pass.

- [ ] **Step 5: Commit the actor boundary**

```powershell
git add contracts/grant_lattice.py tests/direct/test_revoke_access.py tests/direct/test_contract_static.py
git commit -m "fix: bind access checks to grant actor"
```

---

### Task 2: Make transaction datetime strictly fail closed

**Files:**
- Modify: `tests/direct/test_temporal_boundaries.py`
- Modify: `tests/direct/test_contract_static.py`
- Modify: `contracts/grant_lattice.py`

**Interfaces:**
- Consumes: required `gl.message_raw["datetime"]` ISO 8601 transaction context.
- Produces: `_now() -> bigint` or bounded `gl.vm.UserError("transaction datetime unavailable")` / `gl.vm.UserError("transaction datetime invalid")`.

- [ ] **Step 1: Write failing malformed-context tests**

Add tests that temporarily set the direct SDK's `genlayer.gl.message_raw`
datetime to missing, empty, naive, and invalid values. For a write, assert the
grant remains absent; for a view, assert it never returns `ALLOWED`. Restore the
valid warped datetime in `finally`.

Add static assertions:

```python
assert "return bigint(0)" not in text
assert 'gl.message_raw["datetime"]' in text
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
.venv\Scripts\python.exe -m pytest tests/direct/test_temporal_boundaries.py tests/direct/test_contract_static.py -q
```

Expected: the old fallback returns zero or the new static assertions fail.

- [ ] **Step 3: Implement strict parsing**

Replace `_now` with direct required-field access. Accept `Z` by normalizing it
to `+00:00`, require a non-empty timezone-aware value, and raise bounded
`gl.vm.UserError` on missing/unparseable input. Never catch and convert an error
to a numeric timestamp.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the same pytest command. Expected: all selected tests pass and rejected
writes preserve state.

- [ ] **Step 5: Commit strict transaction time**

```powershell
git add contracts/grant_lattice.py tests/direct/test_temporal_boundaries.py tests/direct/test_contract_static.py
git commit -m "fix: fail closed on invalid transaction time"
```

---

### Task 3: Adopt the current custom-validator pattern with explicit errors

**Files:**
- Modify: `tests/direct/test_contract_static.py`
- Modify: `tests/direct/test_review.py`
- Modify: `contracts/grant_lattice.py`

**Interfaces:**
- Consumes: `leader_fn`, `gl.vm.Return`, `_review_fingerprint`.
- Produces: `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` whose validator returns `False` for every handled exception.

- [ ] **Step 1: Write failing API and validator-error tests**

Change the static test to require `run_nondet_unsafe`, a nearby rationale
containing `custom validator`, and a `try`/`except Exception` inside
`validator_fn`. Add a direct review test whose validator-side independent LLM
response is malformed and assert the child does not become `ACTIVE` and no
authorizing review is committed.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
.venv\Scripts\python.exe -m pytest tests/direct/test_contract_static.py tests/direct/test_review.py -q
```

Expected: static API assertion fails while the source still uses `run_nondet`.

- [ ] **Step 3: Implement the explicit validator boundary**

Use:

```python
def validator_fn(leader_result) -> bool:
    try:
        if not isinstance(leader_result, gl.vm.Return):
            return False
        independent = leader_fn()
        return self._review_fingerprint(...) == self._review_fingerprint(...)
    except Exception:
        return False

# Current GenLayer guidance recommends the unsafe primitive for a custom
# validator; all validator exceptions are converted to explicit disagreement.
raw_review = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

- [ ] **Step 4: Run the focused tests and contract lint**

Run:

```powershell
.venv\Scripts\python.exe -m pytest tests/direct/test_contract_static.py tests/direct/test_review.py -q
$env:PYTHONUTF8='1'; .venv\Scripts\genvm-lint.exe check contracts/grant_lattice.py
```

Expected: tests pass; lint recognizes `GrantLattice` and reports validation
success.

- [ ] **Step 5: Commit the validator migration**

```powershell
git add contracts/grant_lattice.py tests/direct/test_contract_static.py tests/direct/test_review.py
git commit -m "fix: handle custom validator errors explicitly"
```

---

### Task 4: Bind the frontend check to the selected wallet

**Files:**
- Modify: `frontend/src/domain/types.ts`
- Modify: `frontend/src/adapters/contract.ts`
- Modify: `frontend/src/adapters/genlayerContract.ts`
- Modify: `frontend/src/adapters/genlayerContract.test.ts`
- Modify: `frontend/src/adapters/unconfiguredContract.test.ts`
- Modify: `frontend/src/test/canonicalTestAdapter.ts`
- Modify: `frontend/src/pages/AccessCheckPage.tsx`
- Modify: `frontend/src/pages/AccessCheckPage.test.tsx`

**Interfaces:**
- Consumes: selected `wallet.account` from `useWallet()`.
- Produces: `canInvoke(grantId, actor, capabilityId, resourceId)` and a disabled disconnected access check.

- [ ] **Step 1: Run focused UI/stack guidance searches**

Run:

```powershell
python ..\.agents\skills\ui-ux-pro-max\scripts\search.py "authenticated actor disabled state" --domain ux
python ..\.agents\skills\ui-ux-pro-max\scripts\search.py "wallet form state" --stack react
```

Verify the returned domain/stack and apply only guidance consistent with the
existing GrantLattice visual language.

- [ ] **Step 2: Write failing adapter and page tests**

Add `ACTOR_MISMATCH` to `AccessReason`. Assert the adapter sends:

```typescript
expect(readContract).toHaveBeenCalledWith(expect.objectContaining({
  functionName: "can_invoke",
  args: ["root-1", grantee, "READ", "case-1"],
}));
```

Page tests must prove the check button is disabled before wallet connection,
the adapter is not called while disconnected, and the connected wallet account
is passed as actor without a free-text actor field.

- [ ] **Step 3: Run frontend tests and verify RED**

Run:

```powershell
npm --workspace frontend test -- src/adapters/genlayerContract.test.ts src/pages/AccessCheckPage.test.tsx src/adapters/unconfiguredContract.test.ts
```

Expected: type/signature/argument and disconnected-state assertions fail.

- [ ] **Step 4: Implement the minimal wallet-bound UI**

Update the adapter ABI order and page submit call. Use the selected account as
the actor, disable the submit button when no account is connected, and display
short explanatory copy such as “Actor comes from the connected wallet.” Do not
add a manually editable actor field or redesign the page.

- [ ] **Step 5: Run frontend tests, typecheck, and build**

Run:

```powershell
npm --workspace frontend test -- src/adapters/genlayerContract.test.ts src/pages/AccessCheckPage.test.tsx src/adapters/unconfiguredContract.test.ts
npm --workspace frontend run typecheck
npm --workspace frontend run build
```

Expected: selected tests, TypeScript, and Vite build pass.

- [ ] **Step 6: Commit the wallet-bound access UI**

```powershell
git add frontend/src
git commit -m "fix: authenticate access checks with wallet actor"
```

---

### Task 5: Correct visibility claims and every integration reference

**Files:**
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `docs/evidence/integration/adapter-proof.md`
- Modify: `frontend/src/pages/IntegratePage.tsx`
- Modify: `frontend/src/pages/HelpPage.tsx`
- Modify: `frontend/src/pages/GrantsPage.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/pages/GrantsPage.test.tsx`
- Modify: `scripts/studionet.mjs`

**Interfaces:**
- Consumes: new four-argument ABI and public canonical storage model.
- Produces: accurate consumer sequence and explicit workspace-visibility disclaimer.

- [ ] **Step 1: Write failing copy/signature tests**

Add UI assertions for the sentences:

```text
Wallet connection scopes this app workspace. Canonical grant state remains public onchain.
Consumers must authenticate the actor before calling can_invoke.
```

Rename the old “privacy gate” test to “wallet-scoped visibility” and require
copy that makes the public-state limit visible. Add a static/script assertion or
deployment test proving the lifecycle call passes the recorded grantee actor.

- [ ] **Step 2: Run affected tests and verify RED**

Run:

```powershell
npm --workspace frontend test -- src/App.test.tsx src/pages/GrantsPage.test.tsx src/routes.test.tsx
node --test tests/deployment/*.test.mjs
```

Expected: new copy and four-argument lifecycle assertions fail.

- [ ] **Step 3: Update copy, docs, and lifecycle script**

Document the mandatory external sequence: authenticate actor, load grant,
compare actor to `grantee`, call actor-bound `can_invoke`, fail closed on every
non-`ALLOWED` or unavailable result. Replace every three-argument signature.
State prominently that frontend filtering/logout is not confidentiality because
contract views/RPC/Explorer remain public. Update the Studionet lifecycle read
to pass the known grantee actor.

- [ ] **Step 4: Run affected tests and verify GREEN**

Run the same frontend and deployment commands. Expected: all selected tests
pass.

- [ ] **Step 5: Commit honest integration documentation**

```powershell
git add README.md docs/README.md docs/evidence/integration/adapter-proof.md frontend/src scripts/studionet.mjs tests/deployment
git commit -m "docs: clarify public grant visibility boundary"
```

---

### Task 6: Full verification and publication readiness

**Files:**
- Modify if needed: `docs/evidence/contract/phase-5-6-local-verification.md`
- Modify if needed: `.submission-notes.txt` (ignored/local only)

**Interfaces:**
- Consumes: all remediation commits.
- Produces: fresh local proof and an exact list of remaining deployment work.

- [ ] **Step 1: Run the complete project gate**

Run:

```powershell
npm run check
```

Expected: contract lint, all pytest suites, deployment tests, all frontend
tests, TypeScript, and production build pass with exit code `0`.

- [ ] **Step 2: Review the complete diff and public hygiene**

Run:

```powershell
git status --short
git diff --check HEAD~5..HEAD
git diff --stat HEAD~5..HEAD
git ls-files
rg -n -i "private[_ -]?key|seed phrase|mnemonic|node_config|validator.?config" --glob "!package-lock.json" .
```

Confirm no secret values, parent-workspace control files, generated build
artifacts, stale ABI calls, or confidentiality claims are present.

- [ ] **Step 3: Run the Projects precheck**

Run the workspace grading script with `-Project` set to this repository,
`-Category projects`, the current repository URL, the current active Explorer
URL (explicitly labeled pre-remediation until redeployment), and the local notes
file. Require `0 BLOCKER`; report warnings exactly.

- [ ] **Step 4: Stop before publication**

Report local evidence, the ABI/deployment incompatibility with the existing
Studionet address, and the exact deployment/push/CI/Vercel steps awaiting user
authorization. Do not push, deploy, alter production, or submit the Portal form.
