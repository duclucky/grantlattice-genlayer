# Phase 15 pre-submission audit

Status: **PRECHECK 0 BLOCKER; all Projects evidence gates verified**

Date: 2026-08-24

## Objective precheck

The documented Python wrapper path does not exist in the current workspace.
Runtime discovery found the maintained PowerShell orchestrator at
`tools/genlayer-grading-bot/genlayer-precheck.ps1`, which combines the current
static checker, dynamic project gate, git hygiene, and grader.

Command:

```powershell
& '..\tools\genlayer-grading-bot\genlayer-precheck.ps1' `
  -Project 'D:\Genlayer Project\grantlattice' `
  -Category projects `
  -RepoUrl 'https://github.com/duclucky/grantlattice-genlayer' `
  -ExplorerUrl 'https://explorer-studio.genlayer.com/address/0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C' `
  -NotesFile 'D:\Genlayer Project\grantlattice\.submission-notes.txt'
```

Observed output:

```text
Summary: 0 BLOCKER, 2 WARN, 4 auto-verified OK
npm run check: PASS
git root OK
no internal/secret files tracked: OK
GATE: all five Projects items PASS
Rubric section estimate: 20/20
GitHub repository URL: OK
Explorer address URL: OK
Submission notes <= 1000 chars: OK (reported 966)
```

The two static warnings are reviewed and intentionally retained:

1. The checker sees `gl.message.value` inside nonpayable writes. GrantLattice
   reads it only to add a defensive explicit zero-value rejection. Making those
   methods payable would weaken the stated no-value contract and contradict the
   verified metadata/tests.
2. The checker recommends a generic class named `Contract`. Current
   `genvm-lint` recognizes the single project-specific class `GrantLattice`, and
   workspace policy explicitly requires a recognized project-specific name.

Neither warning is a blocker or an unverified behavior claim.

## Four-source cross-check

### Contract source

```text
gl.Contract subclasses: 1 (GrantLattice)
ASCII: True
Header: exact pinned Depends runner
Methods: 9 (4 write, 5 view)
Value paths: none; all writes nonpayable and defensively require 0 GEN
```

The Evidence Authority Matrix contains four complete consequential rows:
authenticated root issuance, authenticated child proposal, exact stored-clause
semantic review, and authenticated revocation. There is no external evidence or
value destination in v1.

### Current tests

```text
GenVM lint: PASS (3 checks)
Python/direct/static/parser: 63 passed
Deployment helpers: 7 passed
Frontend: 21 files, 65 tests passed
TypeScript: PASS
Production build: PASS (5104 modules)
Critical skip/xfail: 0
```

The suites cover caller/state/replay/value invariants, temporal boundaries,
entity isolation, malformed and malicious semantic output, total coverage,
invalid IDs/classes, prompt injection, raw/normalized receipts, provider/network
behavior, transaction lifecycle, canonical reload, and fail-closed UI reads.

### Network evidence

```text
Lifecycle status: SUCCESS
Successful transactions: 8; all FINALIZED/SUCCESS
Expected rejection: 1; finalized ERROR and canonical child absent
Access: ALLOWED -> ANCESTOR_INACTIVE
Final statuses: REVOKED, ACTIVE (lineage ineffective), DENIED, RETRYABLE
Contract balance: 0 GEN
```

No rejected or ambiguous transaction is counted as a successful hard
consequence. Expansion and ambiguity remain non-authorizing as designed.

### Public/product claims

- Public repository, current CI, Vercel alias, contract explorer, live route,
  production IC reads, access denial, and real Rabby/OKX discovery have direct
  evidence.
- Every claimed browser write has a wrapper, UI control, test, lifecycle state,
  and post-finality canonical reload path.
- OKX transaction `0xf6f2d4863e783154a7e3fe6c9feaf2792c762010f139760496ddc9d5effe3904`
  finalized successfully; production reloaded the active/effective grant and
  returned `ALLOWED` for its exact capability/resource.
- A2A, MCP, and ADK are reuse patterns, not adoption claims.
- No fees, payouts, audit, benchmark, production usage, Portal submission, or
  acceptance is claimed.

## Engineering-quality result

No high-impact maintainability defect was found that justifies a late refactor.
Contract state transitions remain isolated behind one contract API; frontend
wallet, transaction, canonical-read, domain-validation, and hosting-proxy
concerns have explicit module boundaries; changed production transport and
effective-status behavior are regression-tested. Broad cleanup is deferred to
avoid changing verified observable behavior before submission.
