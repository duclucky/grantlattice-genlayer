# Wallet-scoped Activity history

Status: **PASS (automated, local HTTP, and live Studionet read)**

Date: 2026-08-31

## Intended behavior and visibility boundary

When an EVM wallet is deliberately connected and ready on Studionet, `/activity`
loads allowlisted transactions sent by that wallet to the one configured active
GrantLattice contract. The response contains only `hash`, `label`, `grantId`,
`createdAt`, and `stage`. It excludes calldata, raw receipts, validator data,
contract storage, and unrelated account activity.

The scope is a frontend workspace feature, not confidentiality. Studionet
transactions and canonical contract state remain public through RPC and
Explorer. Disconnect, account change, contract change, or loss of the ready
network scope removes the current Activity snapshot immediately.

The approved targeted UI change preserved the existing GrantLattice visual
language. Loading, unavailable/retry, genuine empty, restored history,
unconfirmed, and paginated states remain explicit; unavailable data never
becomes a false empty or success state.

## Project-wide verification

Command:

```powershell
npm run check
```

Safe output summary:

```text
Lint passed (3 checks)
Contract: GrantLattice
Methods: 9 (5 view, 4 write)
70 passed in 3.65s
deployment tests: 8 passed, 0 failed
Test Files  27 passed (27)
Tests       145 passed (145)
tsc -b --pretty false: exit 0
vite build: 5106 modules transformed; built successfully
```

Frontend coverage includes response/schema validation, wrong scope rejection,
loading/error/empty states, reload/remount restoration, account switch, logout,
late-response cancellation, contract switch, session/history deduplication,
unconfirmed receipt handling, retry, Explorer links, and pagination.

## Local browser-path HTTP proof

The Vite app was started from `frontend/` with its real development middleware:

```powershell
npx vite --host 127.0.0.1
```

Then `/activity` and same-origin `POST /api/activity` were requested. The command
printed only an allowlisted summary, not transaction bodies or receipt data:

```json
{"pageHttp":200,"apiHttp":200,"cacheControl":["no-store, private"],"scopeMatches":true,"activityCount":3,"containsBrowserGrant":true,"safeFieldsOnly":true}
```

This proves the local browser-facing route, same-origin endpoint, active account
scope, safe-field projection, and a real historical Studionet grant operation.
It is not a new wallet signature or transaction.

## Honest remaining browser boundary

The in-app browser-control backend failed before navigation with:

```text
failed to write kernel assets: The system cannot find the path specified. (os error 3)
```

Therefore this checkpoint does not claim a fresh visual click-through with the
OKX extension. Automated DOM/state tests and the real local HTTP path pass; a
manual post-deployment OKX reconnect and `/activity` screenshot remain separate
user-verifiable evidence.
