# Phase 7 real frontend adapter and browser transport

Status: **PASS (local browser and mocked-wallet evidence only)**

Date: 2026-08-24

Network claim: **browser transport only**. No wallet was connected and no
transaction was signed or submitted in this phase. The temporary ignored local
address was a deliberate nonexistent placeholder, not a deployment address.

## UI/UX skill checkpoint

The project-local `ui-ux-pro-max` skill was re-read before frontend changes.
The first stack query, `wallet transaction lifecycle --stack react`, returned
zero results. The required narrower retry,
`async state feedback --stack react`, returned three React matches; the top
verified match was Concurrency (`startTransition`) and the next relevant match
was high-priority Error Handling. FE-PRESERVE remained active: the established
visual language was unchanged while async stages and fail-closed errors were
added.

## TDD checkpoints observed

1. Adapter RED: the focused suite failed because
   `src/adapters/genlayerContract.ts` did not exist and the transaction provider
   did not expose intermediate receipt stages.
2. Adapter GREEN: canonical snake/camel response mapping, paginated ID reads,
   sorted exact write arguments, selected-wallet writes, 0 GEN contract value,
   accepted/finalized waiting, and post-finality canonical reload passed.
3. Write-journey RED: four page tests failed because create/delegate/review/revoke
   controls were absent or permanently disabled.
4. Write-journey GREEN: all four actions became available only to a connected,
   Studionet-ready, authorized wallet and reported submitted, accepted,
   finalized, failed, and retryable stages.
5. Raw-receipt RED: a Studio receipt with numeric finalized status and nested
   leader execution returned `FAILED` instead of `FINALIZED`.
6. Raw-receipt GREEN: the adapter now requires the raw tuple
   `status=7`, `result=6`, and leader `execution_result=SUCCESS` before canonical
   reload. Normalized `FINALIZED` plus `FINISHED_WITH_RETURN` remains supported.
7. Input-preflight RED/GREEN: exact grant IDs, 20-byte EVM addresses, bounded
   unique scope labels, printable-ASCII clause text, and future-only expiry are
   now checked before a wallet request.
8. Wallet unknown-chain RED/GREEN: the add-chain path now accepts the plain
   EIP-1193 error object used by browser wallets, not only `Error` instances.

Focused adapter command:

```powershell
npm --prefix frontend test -- --run src/adapters/genlayerContract.test.ts
```

Observed result: `1 passed` file, `5 passed` tests, exit code `0`.

## Browser-local RPC proof

Command:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Browser URL: `http://127.0.0.1:5173/grants`

Observed browser snapshot:

```text
HTTP 200
Final URL: http://127.0.0.1:5173/grants
UI: Authority could not be verified
UI: The canonical read is unavailable. No grant is treated as active.
Console: GenLayer RPC error (gen_call): Contract
         0x0000000000000000000000000000000000000001 not found
```

There was no browser `Failed to fetch` and no CORS error. The application
therefore reached the GenLayer IC endpoint through the same-origin
`/api/genlayer` development proxy and received a protocol-level contract-not-
found response. The product surfaced the canonical-read failure honestly and
did not substitute fixture or local-storage state.

The IC read path and wallet write path are separate. Writes use only the wallet
provider explicitly selected in the existing centered EIP-6963/fallback wallet
chooser, require the selected wallet to be on Studionet, send `value: 0n`, wait
for accepted then finalized, and reload canonical views only after a successful
finalized receipt. No private key is used by the browser.

## Final project-wide local gate

Command:

```powershell
npm run check
```

Observed exit code: `0`.

Observed output summary:

```text
GenVM lint: Lint passed (3 checks)
Validation passed
Contract: GrantLattice
Methods: 9 (5 view, 4 write)

Python/direct/static/parser tests: 63 passed in 3.30s
Node deployment helper tests: 5 passed, 0 failed
Frontend: 19 test files passed, 58 tests passed
Frontend TypeScript: exit 0
Frontend production build: 5104 modules transformed, built in 531ms
Entry JS: 403.06 kB, gzip 123.42 kB; GenLayer SDK is lazy-split
```

## Honest limits at this checkpoint

- This is not a deployed-contract read or browser-wallet transaction proof.
- The nonexistent placeholder address proves transport and fail-closed handling
  only; it will be replaced by the verified deployment address in Phase 9.
- Accepted/finalized Studionet receipts, explorer links, and canonical network
  lifecycle evidence belong to Phase 8.
- Production-host browser behavior and a real wallet-signed browser workflow
  remain pending.
