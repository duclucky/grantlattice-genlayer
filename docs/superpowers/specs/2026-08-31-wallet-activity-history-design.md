# Wallet-scoped Activity history

Date: 2026-08-31

Status: conversational design and written specification approved by the user.

## Outcome

After connecting a wallet, Activity retrieves that wallet's real transactions
to the currently configured GrantLattice contract on Studionet. Reloading or
reconnecting must not erase the retrievable history. This change does not
modify, redeploy, or submit transactions to the Intelligent Contract.

## Existing behavior and cause

`frontend/src/transactions/TransactionProvider.tsx` stores activity only in
React state, initialized to an empty array. `ActivityPage.tsx` renders that
array without loading network history. A page reload resets it. The provider
also does not scope its stored entries to a wallet, so account changes and
logout require explicit isolation in the replacement design.

The Studionet RPC method `sim_getTransactionsForAddress` is present in the
installed SDK's RPC types and was successfully used to recover the recent
root-creation transaction during diagnosis. This is transaction history,
not a replacement for canonical grant views or proof of external actor
authentication.

## Chosen approach and alternatives

Use network-backed history plus an ephemeral, wallet-scoped list of operations
submitted during the current session. Merge by transaction hash.

Browser persistence alone was rejected: it cannot recover previous operations
on another device or after browser data is cleared. A separate indexed database
is unnecessary for this bounded correction and would add data retention and
operational responsibilities.

## Scope and data boundary

- Include transactions sent by the connected wallet to the active contract.
  Compare addresses case-insensitively. Exclude other senders, other contracts,
  other networks, deployments, and unrelated transfers.
- Include the four existing user operations: root creation, child proposal,
  child review, and revocation. A script-signed transaction from the same
  wallet qualifies as network activity; do not label it browser-signed.
- The server reads the configured contract address, rather than accepting an
  arbitrary upstream URL or contract address from the browser.
- A dedicated same-origin history endpoint validates the requested address,
  filters the upstream records, decodes only the operation and relevant grant
  identifier, and returns an explicit safe field projection.
- Returned activity fields are transaction hash, operation label, grant ID,
  creation time, and normalized transaction status. Include a response scope
  identifying the queried wallet, contract, and network so the client can reject
  a response for another scope. Explorer URLs are built from the known network
  and a validated hash, not accepted from upstream prose.
- Do not return or log complete receipts, calldata arguments, grant clauses,
  validator configuration, consensus internals, or private material. Mark
  history responses as non-cacheable by shared caches.
- Wallet filtering is a UI workspace feature, not confidentiality. These
  transactions remain public onchain. Connecting a wallet is not a new
  server-authenticated private-data session, and the endpoint must not claim
  otherwise. No new private database or signing challenge is introduced.
- Do not use local storage or cached session state as canonical network truth.

## Lifecycle and state isolation

1. Disconnected: show a connect-wallet state and no activity entries. Do not
   start a history request.
2. Connected on the configured network: load network history. Re-entering
   Activity, reconnecting, or refreshing must load again without a transaction
   signature. A wrong-network session shows a network notice rather than
   implying that another network's history is being displayed.
3. Loading: show accessible loading feedback, not a false empty-history state.
4. Success: order newest first, use transaction hash as the stable identity,
   and offer an Explorer link. Render a bounded page of entries with a way to
   reveal additional retrieved entries; do not silently discard older entries.
5. Empty: say that this wallet has no transactions for this contract only after
   a successful, valid response contains none.
6. Failure: show history unavailable with Retry. If a refresh fails, any retained
   same-wallet snapshot must be explicitly marked stale; never represent a
   failure as an empty list or a finalized transaction.
7. Live submission: keep the existing submitted/accepted/finalized progress.
   Merge the session entry with history without duplication. Successful network
   receipts take precedence over stale session failures caused by a wait timeout.
8. Account, network, or contract change: immediately hide the previous scope.
   Ignore or cancel all previous requests and late write-progress callbacks.
   A reconnect creates a fresh request generation even for the same address.
9. Logout: immediately hide and clear session activity. Completion of a request
   started before logout must never repopulate the disconnected screen.

## Status honesty

Use the actual transaction status and explicit execution outcome. A finalized
transaction with failed execution is not successful. Missing or unknown receipt
fields must not become success by default. Use an explicit unconfirmed status
or unavailable-history state when the result cannot be established.

Do not infer a historical review outcome from the grant's latest review:
the contract stores only the latest review. Transaction finality, execution
success, and canonical grant authority remain distinct. Access checks are reads
and do not create Activity transactions.

## Implementation boundaries

- History endpoint and pure projection/parser: upstream validation, filtering,
  status normalization, safe output, timeout, and generic errors.
- Frontend history client: typed response validation, cancellation, and scope
  verification through the same-origin endpoint.
- Transaction provider: scoped session progress, loading/error state, refresh,
  stale-response protection, and deduplication.
- Activity page: preserve existing typography, colors, and cards; add wallet,
  loading, network, empty, error/retry, time, and Explorer-link states.
- Local dev server: exercise the same history handler/projection as production;
  do not use a raw pass-through shortcut for this new endpoint.

No contract, ABI, wallet-discovery redesign, authentication system, or historical
grant-revision migration belongs to this change.

## Verification and acceptance

- Parser/API tests: raw and normalized receipts, operation-to-grant mapping,
  correct sender/recipient/network, invalid address, invalid fields, malformed
  upstream responses, unknown status, failed execution, duplicate records,
  timeout, upstream HTTP/RPC error, and sensitive-field exclusion.
- Provider tests: restore on remount/reload, reconnect, A-to-B account switch,
  logout during a read, delayed A response after B connects, A-to-B-to-A races,
  delayed session callbacks, live/history deduplication, retry, and empty versus
  unavailable history.
- UI tests: disconnected/network/loading/empty/error/success states, chronological
  entries, accessible Retry, Explorer links, long-hash wrapping, and pagination
  through retrieved entries.
- Run `npm run check` after implementation and retain the actual output.
- Verify the existing root-creation hash is recovered by the new read-only
  endpoint. Do not submit a replacement transaction for evidence.
- Verify browser-local same-origin behavior and production after an authorized
  deployment. Distinguish unit tests, server RPC checks, and actual browser proof.
  If browser tooling remains unavailable, report that gap instead of claiming
  a browser pass.
- Verify logout and account switching do not display another wallet's history.
  Public onchain visibility remains an explicit product limitation.

## Spec self-review

The design has one scope: persistent access to wallet-scoped network history.
The reload requirement is satisfied by re-querying the network, not by browser
storage. Privacy wording does not promise onchain confidentiality. Error and
unknown-status paths cannot manufacture success. No new transactions are needed
for implementation verification. The written specification does not claim that
code changes, tests, or deployment have been completed.
