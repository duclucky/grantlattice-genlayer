# Phase 9 production-address browser proof

Status: **PASS for deployed-state reads and wallet discovery at the Phase 9
checkpoint; superseded by the finalized wallet proof**

Date: 2026-08-24

Network: Studionet (`chainId` 61999)

Contract: `0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C`

This phase binds the ignored local frontend configuration to the verified
Phase 8 deployment. It does not place a private key in the frontend and it does
not treat script-signed lifecycle evidence as browser-wallet evidence.

## Production build with the deployed address

Command:

```powershell
npm --prefix frontend run build
```

Observed output:

```text
5104 modules transformed
dist/index.html                  0.53 kB | gzip 0.32 kB
dist/assets/index-BtWEubyW.js  403.20 kB | gzip 123.51 kB
built in 521ms
exit code 0
```

The GenLayer SDK remained lazy-split. The contract address and network are
public configuration; the project `.env.local` remains ignored.

## Canonical deployed-state read

Command:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Browser URL: `http://127.0.0.1:5173/grants`

Observed canonical cards:

```text
grantlattice-root-v1       Revoked
grantlattice-valid-v1      Inactive through lineage
grantlattice-expansion-v1  Broader than parent
grantlattice-ambiguous-v1  Needs another review
```

Console output contained only the Vite connection and React development
messages. There was no `Failed to fetch`, CORS error, or GenLayer RPC error.
The stored child status is `ACTIVE`, but its canonical effective flag is false
because the root was revoked. A focused TDD regression now labels that state
`Inactive through lineage` instead of the misleading `Active authority`.

Focused regression command:

```powershell
npm --prefix frontend test -- --run src/pages/GrantsPage.test.tsx
```

Observed result: `1 passed` file, `2 passed` tests, exit code `0`.

## Fail-closed access check

Browser URL: `http://127.0.0.1:5173/checks`

Inputs:

```text
grantId: grantlattice-valid-v1
capabilityId: READ
resourceId: case-1
```

Observed result:

```text
Action denied
ANCESTOR_INACTIVE
```

The browser result matches the finalized Phase 8 lineage state. The action was
not displayed as allowed after the ancestor revocation.

## Real browser wallet discovery

The centered wallet chooser was opened in both browser environments.

- The isolated test browser reported `No compatible browser wallet was
  detected.` This proves the empty state without inventing a provider.
- The user's connected Chrome profile discovered `Rabby Wallet` (`io.rabby`)
  and `OKX Wallet` (`com.okex.wallet`) and still required an explicit choice.

No provider was auto-selected. No account address or transaction was approved
at this Phase 9 checkpoint. The user subsequently selected OKX and approved the
root write recorded in `docs/evidence/browser/wallet-lifecycle.md`; the earlier
script-signed Phase 8 receipts remain separate.

## Copy and value audit

The user-facing source contains no Vietnamese text, `wei`, `base units`,
`testnet`, lorem copy, or fixture-as-live wording. Contract writes are
nonpayable and the interface states that they send `0 GEN`. The only value-
bearing runtime checks in the project deliberately send `1 GEN` and assert
rejection; Phase 8 delegate funding also used exactly `1 GEN`.

## Project-wide verification

Command:

```powershell
npm run check
```

Observed result:

```text
GenVM lint: PASS (3 checks), GrantLattice, 9 methods (5 view, 4 write)
Python/direct/static/parser tests: 63 passed
Deployment helper tests: 7 passed
Frontend at this checkpoint: 20 files passed, 63 tests passed
TypeScript: exit code 0
Production build: 5104 modules transformed, built in 521ms
Overall exit code: 0
```

## Production transport hardening

A TDD checkpoint caught that the Vite development proxy does not exist after a
static production build. The first focused run failed because
`frontend/api/genlayer.mjs` did not exist. The green implementation adds a
same-origin Vercel function that forwards only the JSON request body to the
locked Studionet endpoint, rejects non-POST requests, and returns a bounded 502
error when the upstream is unavailable. Vercel filesystem-first routing keeps
that function reachable while falling back to `index.html` for React routes.

Focused command:

```powershell
npm --prefix frontend test -- api/genlayer.test.mjs
```

Observed result: `1 passed` file, `3 passed` tests, exit code `0`.
