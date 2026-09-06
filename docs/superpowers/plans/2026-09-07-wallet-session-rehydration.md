# Wallet Session Rehydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a deliberately selected browser wallet after reload by silently validating the provider's authorized account, while preserving explicit logout and fail-closed network behavior.

**Architecture:** `WalletProvider` remains the wallet-session owner. It stores only the selected provider `rdns` in `sessionStorage`; a mount-time restore path calls `eth_accounts` and `eth_chainId` without approval UI or signing, then attaches the same listeners used by manual connect. No account, transaction, grant, or private material is persisted.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, EIP-1193 browser-wallet providers, `sessionStorage`.

## Global Constraints

- Never call `eth_requestAccounts` during reload restoration; only deliberate selection may request access.
- Persist only provider `rdns`; the account must always come from the provider's `eth_accounts` response.
- Missing provider key, missing provider, empty account response, failed chain read, or wrong chain remains disconnected/not-ready.
- `disconnect()` removes the provider key and clears account/provider/listeners immediately.
- Do not change contract methods, transaction value, grant visibility, or canonical network truth.
- Run focused wallet tests first, then the full frontend check before browser verification.

---

### Task 1: Add failing wallet rehydration regression tests

**Files:**
- Modify: `frontend/src/wallet/WalletProvider.test.tsx`

**Interfaces:**
- Consumes: Existing `WalletProvider`, `WalletProviderInfo`, and fixture.
- Produces: Failing tests for silent reload restoration and logout persistence.

- [ ] **Step 1: Extend the fixture and isolate storage**

Make `fixture()` return `eth_accounts: [account]` and `eth_chainId: "0xf22f"` while preserving the existing `eth_requestAccounts` response. Update the existing deliberate-connect assertion to include `"eth_chainId"` after `"eth_requestAccounts"`. Add `afterEach(() => sessionStorage.clear())` to prevent cross-test provider keys.

- [ ] **Step 2: Add the failing silent-remount test**

```tsx
it("restores the deliberately selected provider silently after remount", async () => {
  const { info, request } = fixture();
  sessionStorage.setItem("grantlattice.wallet.provider.rdns", info.rdns);
  const first = render(
    <WalletProvider discover={async () => [info]}>
      <Harness />
    </WalletProvider>,
  );
  expect(await screen.findByText(account)).toBeInTheDocument();
  expect(request.mock.calls.map(([args]) => args.method)).toEqual([
    "eth_accounts",
    "eth_chainId",
  ]);
  first.unmount();
});
```

- [ ] **Step 3: Run the test and verify RED**

Run `cd D:\Genlayer Project\grantlattice\frontend; npx vitest run src/wallet/WalletProvider.test.tsx -t "restores the deliberately selected provider silently after remount"`.

Expected: FAIL because the current provider never reads `sessionStorage` or calls `eth_accounts`.

- [ ] **Step 4: Add the failing explicit-disconnect remount test**

```tsx
it("keeps an explicit disconnect logged out across remount", async () => {
  const user = userEvent.setup();
  const { info } = fixture();
  sessionStorage.setItem("grantlattice.wallet.provider.rdns", info.rdns);
  const first = render(
    <WalletProvider discover={async () => [info]}>
      <Harness />
    </WalletProvider>,
  );
  await screen.findByText(account);
  await user.click(screen.getByRole("button", { name: "Disconnect" }));
  first.unmount();
  render(
    <WalletProvider discover={async () => [info]}>
      <Harness />
    </WalletProvider>,
  );
  expect(await screen.findByText("Disconnected")).toBeInTheDocument();
  expect(sessionStorage.getItem("grantlattice.wallet.provider.rdns")).toBeNull();
});
```

- [ ] **Step 5: Run the test and verify RED**

Run `npx vitest run src/wallet/WalletProvider.test.tsx -t "keeps an explicit disconnect logged out across remount"`.

Expected: FAIL because the current implementation neither restores the seeded provider nor clears a persisted key.

- [ ] **Step 6: Commit the RED tests**

```powershell
git add frontend/src/wallet/WalletProvider.test.tsx
git commit -m "test: cover wallet session restoration"
```

### Task 2: Implement silent session restoration and logout clearing

**Files:**
- Modify: `frontend/src/wallet/WalletProvider.tsx`

**Interfaces:**
- Consumes: Task 1's storage key and existing discovery/connection APIs.
- Produces: A provider that restores only the previously selected provider, validates live account/chain, and clears the key on disconnect.

- [ ] **Step 1: Add safe provider-key storage helpers**

Add module-scope constant `const SELECTED_PROVIDER_KEY = "grantlattice.wallet.provider.rdns"` and helpers `readSelectedProviderRdns()`, `writeSelectedProviderRdns(rdns: string)`, and `clearSelectedProviderRdns()`. Each helper must catch storage errors; read returns `null` and writes/removes become no-ops when storage is unavailable.

- [ ] **Step 2: Extract shared connection state/listener setup**

Create a callback `setConnectedProvider(info: WalletProviderInfo, nextAccount: string, chainId: string)` that attaches `accountsChanged` and `chainChanged`, stores the listener record, sets `selectedProvider` and `account`, and sets `networkState` to `ready` only for `STUDIONET.chainId`, otherwise `wrong`. Empty account changes must still clear `account`.

- [ ] **Step 3: Update deliberate connect and disconnect**

Keep `ensureStudionet()` and `eth_requestAccounts` in `connect(info)`. After the account response, request `eth_chainId`, call `setConnectedProvider`, then persist `info.rdns`. Call `clearSelectedProviderRdns()` at the start of `disconnect()` before clearing listeners and in-memory state. Any failed request uses the existing error path and leaves the session cleared.

- [ ] **Step 4: Add mount-time silent restoration**

After discovery, read the stored `rdns`, find the matching provider only, request `eth_accounts`, and if an account exists request `eth_chainId`; then call `setConnectedProvider`. Do not call `eth_requestAccounts`, `ensureStudionet`, or any write method in this path. Missing key/provider, empty accounts, malformed chain ID, or request failure must leave the app disconnected/not-ready. Keep `refreshProviders()` as an explicit scan action and do not auto-select from it without a stored `rdns` match.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run `npx vitest run src/wallet/WalletProvider.test.tsx`. Expected: existing deliberate-connect/listener tests and both new rehydration tests pass.

- [ ] **Step 6: Commit the implementation**

```powershell
git add frontend/src/wallet/WalletProvider.tsx frontend/src/wallet/WalletProvider.test.tsx
git commit -m "fix: restore selected wallet after reload"
```

### Task 3: Full verification and browser reload check

**Files:**
- Modify: `docs/README.md` to describe reload restoration while retaining the UI-session boundary.

**Interfaces:**
- Consumes: Task 2 wallet behavior and tests.
- Produces: Fresh test and browser evidence for reload, logout, and fail-closed states.

- [ ] **Step 1: Run the complete check**

Run `cd D:\Genlayer Project\grantlattice; npm run check`. Expected: lint, contract checks, pytest, deployment checks, frontend tests, TypeScript, and Vite build pass.

- [ ] **Step 2: Update the user-facing session contract**

Change the wallet-session row and adjacent prose in `docs/README.md` so it states that the deliberately selected provider is silently revalidated after reload via the wallet's live `eth_accounts`, while explicit Disconnect clears the selection and requires deliberate reconnection. Keep the existing statement that wallet filtering is a UI workspace feature, not confidentiality.

- [ ] **Step 3: Verify production in Chrome with OKX**

Connect deliberately and confirm `Studionet ready`; reload the same tab and confirm the account returns without an approval popup; open Activity and confirm same-wallet history; choose Disconnect and confirm `Connect wallet`; reload again and confirm it remains disconnected with no activity.

- [ ] **Step 4: Review the final diff**

Run `git diff HEAD~1 --check; git status --short`. Expected: no whitespace errors and only intended wallet/tests/docs changes.
