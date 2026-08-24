# Phase 5-6 local contract verification

Status: **PASS (local/direct evidence only)**

Date: 2026-08-24

Network claim: **none**. This file is not Studionet deployment, receipt, finality,
wallet, explorer, or browser-RPC evidence.

## TDD checkpoints observed

1. Root/child hierarchy RED:
   `python -m pytest test_contract_static.py test_root_grants.py test_child_grants.py -q`
   returned `4 failed, 12 errors`; every failure was the absent
   `contracts/grant_lattice.py`.
2. Root/child hierarchy GREEN: the same focused suite returned
   `16 passed in 0.65s`.
3. Semantic review RED: `pytest tests/direct/test_review.py -q` returned
   `8 failed`; every failure reached the deliberate `review not implemented`
   stub.
4. Semantic review GREEN: the focused suite returned `8 passed in 0.52s`.
5. Revocation/access RED: the focused revoke/temporal suite returned
   `6 failed, 9 passed`; failures were the revoke stub and pre-spec access
   reason strings.
6. Revocation/access GREEN: the focused suite returned `15 passed in 0.89s`.
7. Deployment helper RED: Python reported two missing script modules and Node
   reported missing `scripts/studionet.mjs`.
8. Deployment helper GREEN: Python returned `5 passed`; Node returned
   `5 passed, 0 failed`.

## Final project-wide local gate

Command:

```powershell
npm.cmd run check
```

Observed exit code: `0`.

Observed output summary:

```text
GenVM lint: Lint passed (3 checks)
Validation passed
Contract: GrantLattice
Methods: 9 (5 view, 4 write)

Python/direct/static/parser tests: 63 passed in 3.14s
Node deployment helper tests: 5 passed, 0 failed
Frontend: 16 test files passed, 45 tests passed
Frontend TypeScript: exit 0
Frontend production build: 4657 modules transformed, built in 430ms
```

The lint notice that a newer runner exists is informational. The source keeps
the locked Depends runner/API unit; no unproved runner migration was made.

## What the local gate proves

- Exact ASCII Depends header and exactly one validator-visible
  `GrantLattice(gl.Contract)` subclass.
- Four non-payable public writes and five public views; runtime tests send
  exactly **1 GEN** unexpectedly to each write path and prove rejection without
  authority mutation. Normal product writes send 0 GEN because v1 accepts no
  contract value.
- Authenticated root authorship, exact parent-grantee child authorship,
  sender-scoped nonce replay protection, canonical bounded inputs, objective
  subset enforcement, and exact clause-ID/kind coverage.
- `gl.vm.run_nondet` with a custom validator that compares the full normalized
  child/attempt/clause-class tuple; unsafe nondeterminism is absent.
- A named 12-case semantic corpus plus missing, extra, duplicate, invalid-enum,
  wrong-actor, prompt-injection, replay, retry, and terminal-state tests.
- Contract-derived `ATTENUATED`, `EXPANSION`, `AMBIGUOUS`, and `UNVERIFIABLE`
  outcomes; model output cannot choose access or stored status.
- Strict time checks at boundary minus one, equality, and boundary plus one;
  equality is late while stored phase/status deliberately remains stale.
- Authorized revocation before or after expiry, version increment, deep
  descendant fail-closed behavior, unrelated-tree isolation, depth 8 success,
  and depth 9 rejection.
- Exact `can_invoke` reason precedence and fresh canonical ancestry/time/scope
  evaluation.
- Raw and normalized Studio receipt projection through an explicit safe-field
  allowlist; validator configuration, traces, stdout, and complete receipts are
  never persisted by these helpers.
- Project `.env` precedence over parent `.env`, required-variable presence
  checks without secret output, deployment identity drift refusal, and
  canonical-state lifecycle resumption decisions.

## Honest limits at this checkpoint

- Direct-mode and parser evidence are not Studionet evidence.
- `studionet:deploy` remains deliberately stopped behind the Task 12 network
  preflight gate; no address or transaction is claimed here.
- The frontend still uses the fail-closed unconfigured adapter baseline; real
  contract reads/writes and browser-local RPC evidence belong to Tasks 11-13.
- No browser wallet signature, accepted/finalized receipt, explorer link, CI
  run, public repository, or live deployment is claimed by this file.
