# Phase 8 Studionet deployment and lifecycle verification

Status: **PASS**

Date: 2026-08-24

Network: **GenLayer Studionet only**. No localnet, Asimov, or Bradbury evidence
is mixed into this directory.

## Official preflight

- Official network reference:
  `https://docs.genlayer.com/developers/networks`
- Official SDK reference:
  `https://github.com/genlayerlabs/genlayer-js`
- Official explorer:
  `https://explorer-studio.genlayer.com`

Direct RPC health command called `eth_chainId` at
`https://studio.genlayer.com/api` and returned:

```text
RPC_OK=true
CHAIN_ID_RESULT=0xf22f
```

`0xf22f` is decimal `61999`, matching the official Studionet documentation and
the pinned `genlayer-js` Studionet chain object.

## Local pre-deployment gate

Command:

```powershell
npm run check
```

Final pre-deployment and post-script-change runs exited `0`. The latest Phase 8
run reported:

```text
GenVM lint: PASS; Contract GrantLattice; 9 methods (5 view, 4 write)
Python/direct/static/parser: 63 passed
Deployment helpers: 7 passed, 0 failed
Frontend: 19 files passed, 58 tests passed
TypeScript: PASS
Production build: PASS (5104 modules, 551ms)
```

## Actor separation and 1 GEN funding

The project `.env` was created/updated locally and remains ignored. The
secondary key was never printed, logged, saved as evidence, or committed.

Command:

```powershell
npm run studionet:prepare-delegate
```

The first receipt was visible before balance propagation. The script rejected
the premature success claim, verified the existing public hash without sending
a second transaction, and recorded the eventual canonical balance change:

```text
Source:      0xC495ef51618D03267A1f227aFe5b27B38c748272
Destination: 0x3216E246181F597a91238b3D493Ddf47924A226f
Value:       1 GEN
Balance:     0 GEN -> 1 GEN
Status:      CONFIRMED
Hash:        0x3b5768f7a5bef5e6b9e3c85cb235ecfe1da92b567a63965501c0bc0adc7398c8
```

The funding transfer is the only value-bearing demo transaction. Every contract
write below sent 0 GEN because all four contract write entrypoints are
non-payable.

## Deployment

Command:

```powershell
npm run studionet:deploy
```

Observed result:

```text
Result: SUCCESS
Contract: 0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C
Hash: 0x1db352f36545fa2207389ebc12c40a7b857398895728c7e61ecc87542189b13f
Receipt: FINALIZED / SUCCESS / MAJORITY_AGREE
Deployed code present: true
Initial grant IDs: []
```

The active identity is bound to Studionet `61999`, public-history-equivalent
source commit `ef67dae9e930408b4f2ce388cfd6a0329d55ded3`, source SHA-256
`0fabc7b18aff444613389f577c5c218571f1c86d7cef2afb0315cb17bea1f842`,
the exact Depends runner, deployer, delegate, deployment hash, and contract
address. The sanitized identity retains the original pre-public-hygiene commit
mapping; only non-deliverable planning artifacts were removed and the contract
source digest is unchanged. A second `studionet:inspect` returned
`deploymentDecision: RESUME`.

## Consequential lifecycle

Command:

```powershell
npm run studionet:lifecycle
```

Observed terminal result:

```text
Result: SUCCESS
Root ID: grantlattice-root-v1
Successful contract writes: 8
Expected unchanged rejection: 1
Access after root revoke: ANCESTOR_INACTIVE
```

Canonical outcomes:

| Proof | Canonical result | Consequence |
| --- | --- | --- |
| Authenticated root creation | root `ACTIVE` before revoke | Delegate may propose within the root bounds |
| Objective expansion (`READ,WRITE`) | finalized failed execution; rejected child absent | Deterministic widening creates no grant |
| Valid qualitative attenuation | child `ACTIVE`; review `ATTENUATED` | `READ` on `case-1` returned `ALLOWED` |
| Semantic expansion | child `DENIED`; review `EXPANSION` | Child never authorizes |
| Undefined customer-care policy | child `RETRYABLE`; review `AMBIGUOUS` | Child remains inactive and may be retried legally |
| Root revocation | root `REVOKED` | Existing active descendant returns `ANCESTOR_INACTIVE` |

The script encountered the documented hosted-Studio rate limit (`30 requests
per minute`) after finalized transactions. It preserved pending/canonical state,
did not replay any finalized write, reduced redundant canonical reads, waited
for the service window, and resumed. Re-running the completed lifecycle returned
the same `SUCCESS`, `8`, `1`, and `ANCESTOR_INACTIVE` values with no new hash.

## Final inspect and hygiene

Final command output:

```text
deploymentDecision: RESUME
deployedCodePresent: true
contractBalanceGEN: 0
delegateBalanceGEN: 1
grantIds:
  grantlattice-root-v1
  grantlattice-valid-v1
  grantlattice-expansion-v1
  grantlattice-ambiguous-v1
```

Evidence denylist scan:

```powershell
rg -n -i -g '*.json' 'private[_ -]?key|seed phrase|mnemonic|node_config|validator.?config|"stdout"|"stderr"|"trace"' docs/evidence/studionet
```

Observed: `NO_DENYLIST_MATCHES`.

Only allowlisted public actors, GEN amounts, hashes, explorer URLs, status/
execution/consensus fields, timestamps, IDs, and canonical views are stored.
No complete RPC response, raw receipt, trace, validator configuration, stdout,
stderr, or wallet secret is evidence.

## Files

- `delegate-funding.json`: one confirmed 1 GEN EOA funding transfer.
- `deployment-attempts.json`: resumable allowlisted deploy attempt state.
- `deployment.json`: the one active deployment identity.
- `lifecycle.json`: per-action before/after canonical snapshots and safe receipt
  projections for the complete lifecycle.

## Honest limits

- These are script-signed Studionet transactions, not browser-wallet proof.
- Hosted Studio rate limiting was observed; no throughput/performance claim is
  made.
- The lifecycle proves one bounded semantic corpus on the live validator set,
  not universal language-model accuracy.
- At this Phase 8 checkpoint, production hosting, public CI, external adopter
  use, Portal acceptance, and a browser-wallet-signed write were pending.
  Production/CI and the browser root write were subsequently verified in
  `docs/evidence/browser/`; external adoption and Portal acceptance remain
  unclaimed.
