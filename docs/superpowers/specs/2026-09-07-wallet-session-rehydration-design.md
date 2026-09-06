# Wallet session rehydration after reload

## Problem

GrantLattice currently keeps the selected browser wallet and account only in
React memory. A page reload therefore returns to `Connect wallet`, even when
the browser wallet has already granted this origin account access. This is
surprising for a connected user and prevents a reliable post-reload Activity
and write experience.

## Goal and non-goals

The goal is to restore the same deliberately selected wallet after a reload
without opening a wallet approval popup or signing anything. The restored
account must still come from the wallet provider, not from cached application
data.

This change does not persist private keys, transaction data, canonical grant
state, or an account as an authority credential. It does not auto-select an
unrelated wallet when no provider was previously selected, and it does not
change contract methods or transaction value.

## Chosen design

1. After a successful deliberate connect, store only a stable provider key
   (`rdns`) in `sessionStorage`.
2. On provider discovery during mount, read that key. If it matches one
   discovered provider, call `eth_accounts` (silent) and `eth_chainId`.
3. Restore the provider, account, listeners, and `ready`/`wrong` network state
   only when the provider returns an account. Never call `eth_requestAccounts`
   during rehydration.
4. If the key is missing, the provider is unavailable, the account list is
   empty, or the chain read fails, remain disconnected/fail-closed and require
   deliberate selection.
5. Explicit `disconnect()` removes the stored provider key as well as clearing
   the in-memory session. A later reload therefore remains disconnected until
   the user selects a provider again.
6. Account and chain listeners continue to update the live session. An empty
   `accountsChanged` result clears the account and disables writes; a chain
   change updates `ready` versus `wrong` without silently switching networks.

## Data flow

```text
mount -> discover providers -> read selected rdns from sessionStorage
      -> matching provider? -> eth_accounts + eth_chainId (silent)
      -> account returned?  -> attach listeners and restore session
      -> otherwise         -> disconnected/fail-closed

manual connect -> wallet_switchEthereumChain -> eth_requestAccounts
               -> persist rdns -> attach listeners -> ready

disconnect -> remove listeners -> remove rdns -> clear account/provider
```

## Tests and acceptance

- A remount/reload with a previously selected provider restores the account
  using `eth_accounts` and never calls `eth_requestAccounts`.
- Explicit disconnect removes the provider key and a subsequent mount stays
  disconnected even if `eth_accounts` would return an authorized account.
- No stored provider key does not auto-select the first detected wallet.
- A missing provider, empty account response, malformed chain response, or
  wrong chain never becomes `ready`.
- Existing deliberate-connect, listener-cleanup, network, and wallet-picker
  tests remain green.
- Production browser verification shows the connected account surviving a
  normal reload, while logout still clears it.

