# Wallet Activity History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Execute inline as requested; no subagent handoff.

**Goal:** Restore real wallet-scoped GrantLattice activity after reload/reconnect.

**Architecture:** A same-origin read-only endpoint filters Studionet transactions and returns a safe projection. A validated frontend client supplies a scope-keyed transaction provider that combines history with live progress. Activity renders explicit connection/loading/error/empty states and paged chronological cards.

**Tech Stack:** Existing React 19.2.8, TypeScript, Vite, Vitest, GenLayerJS 1.1.8 and Vercel functions; no new dependencies.

## Global Constraints

- No contract, ABI, wallet-discovery redesign, authentication system, or historical grant-revision migration belongs to this change.
- Do not use local storage or cached session state as canonical network truth.
- Wallet filtering is a UI workspace feature, not confidentiality.
- Preserve existing typography, colors, and cards.
- No new transaction or wallet signature is needed for verification.
- New endpoint returns only hash, label, grantId, createdAt, stage plus response scope; never raw RPC receipts.
- User-approved spec: `docs/superpowers/specs/2026-08-31-wallet-activity-history-design.md`.

## Task 1: Safe network history

**Files:** create `frontend/server/activity-history.mjs`, `frontend/server/activity-history.test.mjs`, `frontend/api/activity.mjs`, `frontend/api/activity.test.mjs`.

**Interfaces:** `projectHistory(records, scope)` returns sanitized activity entries. `loadHistory(scope, fetchImpl, signal)` verifies chain 61999 and queries `sim_getTransactionsForAddress` for the configured contract. API `POST /api/activity` accepts `{account}`; server reads configured network and contract. Scope is `{account, contractAddress, network: "studionet"}`.

- [ ] RED: encoded `create_root_grant` fixture produces exactly one safe entry; another sender/recipient is excluded. Tests dynamically load the not-yet-created module and assert its exported function exists before calling it, so the initial failure identifies the missing implementation.

```js
expect(projectHistory).toBeTypeOf('function');
expect(projectHistory([tx], scope)).toEqual([{
  hash: tx.hash, label: 'Create root grant', grantId: 'root-1',
  createdAt: '2026-08-30T22:05:30.000Z', stage: 'FINALIZED'
}]);
```

- [ ] GREEN: decode base64 using installed `abi.calldata.decode`; map four allowed method names and grant argument indices; reject malformed matching entries; normalize status without success fallback; deduplicate and sort. Test normalized and raw receipt fields, failures, unknown status, missing execution, bad timestamp/hash/calldata and duplicate conflicts.
- [ ] RED/GREEN API: reject malformed account/config without upstream calls; bounded timeout; wrong-chain/HTTP/RPC/malformed history maps to generic 502, not empty success. Set `Cache-Control: private, no-store`; never relay upstream errors.
- [ ] Run `npm --workspace frontend test -- server/activity-history.test.mjs api/activity.test.mjs` and inspect exact results, then full required checks before checkpoint commit.

## Task 2: Typed history client and isolated state

**Files:** create `frontend/src/transactions/activityHistory.ts`, `activityHistory.test.ts`, `RuntimeTransactionProvider.tsx`; modify `TransactionProvider.tsx`, `TransactionProvider.test.tsx`, `frontend/src/main.tsx`, related test harnesses.

**Interfaces:** `ActivityScope`, `ActivityEntry` (stage includes `UNCONFIRMED`), `loadActivityHistory(scope, signal, fetchImpl?)`. Provider receives `scope: ActivityScope | null`, injected `loadHistory` defaulting to the real client, and exposes `activities`, `historyState`, `refresh`, `run`. Runtime wrapper derives scope from selected wallet/network and configured deployment.

- [ ] RED: validate response account/contract/network and reject malformed entry/status/hash/date or wrong-scope result. Test POST with AbortSignal and no-store.
- [ ] GREEN: parse strict object and array shapes; return freshly projected typed entries; no arbitrary response properties enter state.
- [ ] RED: remount retrieves existing history; null scope starts no request; switch A-to-B and logout immediately remove A, including late requests/callbacks and A-to-B-to-A.

```tsx
const view = render(<TransactionProvider scope={a} loadHistory={loader}><Probe /></TransactionProvider>);
await screen.findByText('root-a');
view.rerender(<TransactionProvider scope={b} loadHistory={loader}><Probe /></TransactionProvider>);
expect(screen.queryByText('root-a')).not.toBeInTheDocument();
```

- [ ] GREEN: a keyed inner provider separates wallet/network/contract state generations; effects cancel on cleanup; refresh cancels previous request; session progress targets only its original mounted generation. Merge by lowercase hash with confirmed history preceding stale session failure; retain live progress newer than pending snapshots. Report waiting exceptions as unconfirmed, never proof of chain failure.
- [ ] Test loading/error/retry and delayed writes, then `npm --workspace frontend test -- src/transactions` and TypeScript.
- [ ] Update harnesses to provide explicit synthetic scope or runtime wrapper, preserving original write-finality assertions rather than weakening them.

## Task 3: Activity UI and local/production parity

**Files:** modify `frontend/src/pages/ActivityPage.tsx`, `ActivityPage.test.tsx`, `frontend/src/styles/global.css`, `frontend/vite.config.ts`; create `frontend/server/activity-dev.mjs`, `activity-dev.test.mjs` and module declarations as required.

- [ ] RED: disconnected, wrong-network, unconfigured, loading, empty, failed-and-retry, restored history, Explorer href, and oldest entries reachable through pagination.
- [ ] GREEN: scope-keyed page state, refresh on entry, accessible status/error regions, semantic Retry/Refresh and next/previous controls, 20 cards per page. Use timestamps from receipts; session timestamps are submission observations. Do not display a current grant verdict as a historical transaction verdict.

```tsx
<a href={`https://explorer-studio.genlayer.com/tx/${entry.hash}`} target="_blank" rel="noreferrer">View transaction</a>
```

- [ ] RED/GREEN local middleware: mount `/api/activity` before SPA fallback, parse only bounded POST JSON and adapt Node response to same production handler. Load public Vite configuration without outputting env values. Test valid and malformed requests.
- [ ] Test accessibility, long-hash wrapping at small viewports, reduced motion, retained design tokens and no automatic focus changes.
- [ ] Run `npm run check`, review complete diff and commit scoped implementation.

## Task 4: Runtime proof and documentation

**Files:** update product README/spec Activity wording; add `docs/evidence/frontend/wallet-activity-history.md` with commands and observed outcomes.

- [ ] Read-only live endpoint lookup must recover the previously verified browser-root transaction. Log only safe status/count/match booleans or the explicitly allowlisted public transaction fields.
- [ ] Test local browser reload/reconnect/switch/logout if browser tooling works. If the known browser runtime setup failure persists, record it separately and do not claim interactive PASS.
- [ ] Before publishing, verify intended repository root, staged/public allowlist, ignored secrets and no raw receipts. Deploy only within the user's existing authorized project workflow.
- [ ] Check production endpoint and deployed bundle, repeat full required checks, update acceptance evidence, and report remaining uncertainty. No contract deployment or new transaction.

## Self-review

The endpoint/client/provider/page interfaces align. Each task has a concrete test boundary, file list and command. The only retained ephemeral state is live session progress and explicitly stale same-scope snapshots. UI isolation does not imply authenticated private API access. Public chain history remains public. No database or unrelated styling change is included.
