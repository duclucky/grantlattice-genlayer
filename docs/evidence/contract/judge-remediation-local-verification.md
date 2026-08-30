# Judge remediation local verification

Status: **LOCAL PASS; PRECHECK 0 BLOCKER; REMEDIATED DEPLOYMENT PENDING**

Date: 2026-08-31

## Scope

This evidence covers the reviewer-requested actor-bound access check, strict
transaction-time failure, explicit custom-validator error handling, and honest
wallet-scoped visibility language. It does not claim that the actor-bound ABI is
deployed to Studionet or production. The currently documented live address and
its browser evidence predate this contract revision.

## Full project gate

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
70 passed in 3.86s
deployment tests: 8 passed, 0 failed
Test Files 21 passed (21)
Tests 75 passed (75)
tsc -b --pretty false: exit 0
vite build: 5104 modules transformed; built in 545ms
process exit: 0
```

The lint informational message reported a newer runner. The Depends hash was
not changed because runner and API migration require an isolated compatibility
spike under workspace policy.

## Objective Projects precheck

Command:

```powershell
& 'D:\Genlayer Project\tools\genlayer-grading-bot\genlayer-precheck.ps1' `
  -Project 'D:\Genlayer Project\grantlattice' `
  -Category projects `
  -RepoUrl 'https://github.com/duclucky/grantlattice-genlayer' `
  -ExplorerUrl 'https://explorer-studio.genlayer.com/address/0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C' `
  -NotesFile 'D:\Genlayer Project\grantlattice\.submission-notes.txt'
```

Observed output:

```text
Summary: 0 BLOCKER, 3 WARN, 5 auto-verified OK
npm run check: PASS
gltest: PASS
git root OK
no internal/secret files tracked: OK
VERDICT: GATE OK
Rubric section estimate: 20/20
```

The wrapper exits `1` when warnings remain even though the objective blocker
count is zero. Warning triage:

1. The payability heuristic sees `gl.message.value` in `_require_no_value`.
   Every one of the four writes is intentionally nonpayable, calls that guard,
   and has AST/direct coverage proving no value-bearing path.
2. The pragma heuristic does not recognize the verified first-line Depends
   header. `genvm-lint check` passes and recognizes the project-specific class.
3. `run_nondet_unsafe` is intentional for the current documented custom-validator
   pattern requested by the reviewer. The adjacent source comment explains the
   exception, the validator catches `Exception` and returns `False`, and direct/
   static tests prove validator errors cannot agree or activate authority.

## Remediation proof map

| Reviewer request | Implementation | Fresh proof |
| --- | --- | --- |
| Bind the access decision to the acting grantee | Four-argument `can_invoke`; `ACTOR_MISMATCH` precedes time/scope checks | Direct wrong-actor test, static ABI test, adapter argument test, connected-wallet page test, deployment-helper argument test |
| Fail closed when transaction datetime is unavailable or malformed | `_now` reads required deterministic context and raises on missing, empty, naive, or unparsable values | Direct temporal tests prove no allow result and canonical state unchanged |
| Use current custom-validator pattern with explicit errors | `gl.vm.run_nondet_unsafe`; validator catches every exception and returns `False` | Static AST assertion and runtime validator-error disagreement test |
| Clarify visibility versus confidentiality | Disconnected screens and Help state that wallet connection only scopes the app; canonical state remains public onchain | Frontend route/page tests and updated README/spec/integration proof |

## Repository hygiene

Commands:

```powershell
git rev-parse --show-toplevel
git status --short
git ls-files
git log --all --name-only --pretty=format:
git check-ignore -v .env
```

Observed output:

```text
git root: D:/Genlayer Project/grantlattice
working tree before evidence update: clean
sensitive tracked/history path match: frontend/.env.example only
project .env exists and is ignored by .gitignore:1
precheck: no internal/secret files tracked
```

No private key, seed phrase, wallet export, parent-workspace control file, or
private `.env` is tracked. The example frontend environment contains public
configuration names only.

## Remaining evidence boundary

The source ABI has changed, so the old Studionet contract and Vercel deployment
must not be presented as proof of the remediation. A new deploy, actor-bound
Studionet lifecycle, frontend configuration update, browser-local CORS check,
production deploy, and wallet/browser verification require explicit publication
authorization and fresh evidence before those claims can become `PASS`.
