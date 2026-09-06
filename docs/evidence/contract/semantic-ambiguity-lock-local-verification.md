# Semantic ambiguity lock — local verification

Status: **PASS**

Date: 2026-09-06

## Contract and regression suite

Command:

```powershell
npm run check
```

Observed output:

```text
Lint passed (3 checks)
Validation passed
Contract: GrantLattice
Methods: 9 (5 view, 4 write)
72 passed in 4.02s
deployment tests: 8 passed, 0 failed
Test Files 27 passed (27)
Tests 149 passed (149)
tsc -b --pretty false: exit 0
vite: 5106 modules transformed
process exit: 0
```

Focused direct tests prove that a semantic `AMBIGUOUS` review:

- records a 64-character definition fingerprint;
- leaves the child terminal `AMBIGUOUS` and ineffective;
- rejects a second review of the same child without changing the review or
  attempt; and
- rejects the same authority definition under a different `child_id` before
  consuming its nonce or appending a grant.

A materially changed clause produces a different fingerprint and remains
reviewable. A malformed or unavailable technical result is still normalized as
`UNVERIFIABLE` with non-authorizing `RETRYABLE` status, which is the only legal
retry path.

The contract remains ASCII, uses the pinned Depends runner, has exactly one
`gl.Contract` subclass, and uses `run_nondet_unsafe` deliberately with explicit
validator exception-to-disagreement handling as requested by the reviewer.
