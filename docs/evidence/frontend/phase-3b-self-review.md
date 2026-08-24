# Phase 3B — Frontend self-review and FE-PRODUCT baseline

Date: 2026-08-24
Status: PASS — FE-PRESERVE becomes binding after this checkpoint

## Route-by-route product audit

| Route | Primary user job | Canonical data / honest state | Primary action |
|---|---|---|---|
| `/` | Understand validator-controlled least-privilege delegation | Product explanation only; says unavailable reads never become permission | Establish root authority |
| `/grants` | Find and inspect a grant | Adapter-backed loading, ready, empty, filtered-empty, and fail-closed error states | Create root grant |
| `/grants/new` | Define maximum root authority | Validated fields; write remains disabled until wallet and real adapter are ready | Connect wallet to create |
| `/grants/:grantId` | Inspect lineage, objective scope, clauses, review, and effectiveness | Adapter-backed loading, not-found, ready, and fail-closed error states | Delegate narrower grant / check access; revoke remains disabled |
| `/grants/:grantId/delegate` | Propose a strictly narrower child | Parent-bound form and explicit canonical-parent warning; write remains disabled until real binding | Connect wallet to delegate |
| `/checks` | Check exact grant + capability + resource before execution | Initial, allowed, denied-with-reason, and unavailable-read fail-closed states | Check canonical authority |
| `/activity` | Follow the current session's real write lifecycle | Empty plus submitted, accepted, finalized, failed, and retryable labels from `TransactionProvider` | No fabricated action |
| `/integrate` | Choose an execution-boundary pattern | A2A, MCP, and Google ADK patterns with an explicit v1 non-deployment disclaimer | No system-only control |
| `/help` | Understand safety properties and honest limitations | Static product guidance | No privileged control |

## State-set audit

- Empty: no grants, no matching grants, no wallet activity, no detected wallet.
- Loading: grant list and grant detail canonical reads.
- Error/unavailable: list and detail reads display fail-closed language; access checks never convert an exception into `allowed`.
- Submitted: `Submitted to your wallet network`.
- Accepted: `Accepted for validator decision`.
- Finalized: `Finalized on Studionet`.
- Failed: `Transaction failed; canonical authority was not changed`.
- Retryable: `Review needs another validator attempt`.
- Canonical reload: the hook reloads only on `FINALIZED`, verified by test.

## Wallet and session audit

- EIP-6963 discovery is requested first.
- OKX, Rabby, MetaMask, Coinbase, Brave, multi-injected `ethereum.providers`, and generic `window.ethereum` fallbacks are included.
- Providers are deduplicated by object identity and reverse-domain identifier.
- Discovery does not call `eth_requestAccounts` and never auto-selects a provider.
- The centered picker is titled/described, focus-trapped by Radix Dialog, Escape-closeable, and restores trigger focus.
- The account address is a clickable button that opens a menu with provider, full address, network state, and `Disconnect`.
- Disconnect removes account/chain listeners and clears selected provider, account, network, and error state.
- Studionet switch uses `0xf22f`; unknown-chain error `4902` adds GenLayer Studionet with GEN (18 decimals), current RPC, and current explorer.

## FE-SURFACE and system-only-content audit

Primary product surfaces do not expose:

- raw contract storage or maps;
- validator prompts, leader output, node configuration, or internal review JSON;
- fake balances, gas, fees, signatures, transaction hashes, or finality;
- deployment/operator controls;
- local-storage authority.

The UI exposes only grant scope, lineage, status, exact access decisions, user-legal next actions, session transaction stages, and integration patterns. All displayed human-facing value copy says non-payable actions send `0 GEN`; no raw base-unit amount is shown.

## Role/action audit

At this pre-contract baseline all state-changing buttons are visibly disabled and say that a wallet connection is required. The product does not pretend a browser write exists. Canonical grantor/root-principal gating and post-finalization reload remain mandatory for the real adapter phase; they are not claimed complete here.

## Fixture audit

- `canonicalTestAdapter` exists only under `frontend/src/test/`.
- It is imported only by tests and the test render helper.
- `frontend/src/main.tsx` injects `unconfiguredContract`, never the canonical test fixture.
- The browser-local production entry therefore displays unavailable/fail-closed state, proving the fixture is not product state.

## Verification commands and real output

Focused Phase 3A/3B gate:

```powershell
npm test -- src/accessibility.test.tsx src/responsive.test.tsx
```

```text
Test Files  2 passed (2)
Tests       12 passed (12)
```

Full frontend gate:

```powershell
npm test
```

```text
Test Files  16 passed (16)
Tests       45 passed (45)
```

```powershell
npm run typecheck
```

```text
> tsc -b --pretty false
exit 0
```

```powershell
npm run build
```

```text
vite v8.2.2
4657 modules transformed
dist/assets/index-CbR2nImn.js 390.62 kB (119.57 kB gzip)
built in 437ms
exit 0
```

## Binding directives after this gate

- FE-PRESERVE: preserve this verified hierarchy, route model, palette, typography, spacing, responsiveness, focus behavior, and interaction language unless a later requirement forces a documented minimal change.
- FE-HONEST: keep unavailable/pending states explicit; never fabricate chain, wallet, balance, transaction, verdict, or finality evidence.
- FE-WALLET-EVM: retain deliberate multi-provider selection, current-network switch/add behavior, clickable address menu, and disconnect state clearing.
- FE-SURFACE: keep system-only contract and validator internals out of primary product surfaces.
- FE-PRODUCT: every claimed browser workflow must retain a client wrapper, UI control, frontend test, lifecycle handling, and canonical reload.
