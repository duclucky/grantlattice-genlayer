# Judge remediation Studionet verification

Status: **PASS ON STUDIONET**

Date: 2026-08-31

## Deployment identity

The prior successful revision at
`0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C` had zero contract balance and was
archived without deleting its lifecycle. The current active identity is:

```text
network: studionet
chainId: 61999
sourceCommit: b14577c7e3f6e1e1606641e8e4f9eeab2db99100
sourceSha256: 4af994411b35fc53a470f8c49c5c1596188cd69e2aca972edce04b5a624c9e4a
contract: 0x7E090E43D8d0b9dDfF20acAA89bD3093e705a162
deploy transaction: 0x10602aec494b55e4ef2e294df6a0b1d0fa0489370260c426e0bff093da0a657e
receipt: FINALIZED / SUCCESS / MAJORITY_AGREE
contract balance: 0 GEN
```

Explorer:
`https://explorer-studio.genlayer.com/address/0x7E090E43D8d0b9dDfF20acAA89bD3093e705a162`

Commands and observed output:

```powershell
npm run studionet:inspect
# deploymentDecision: DEPLOY; existing deployment: null

npm run studionet:deploy
# Result: SUCCESS
# contractAddress: 0x7E090E43D8d0b9dDfF20acAA89bD3093e705a162

npm run studionet:inspect
# deploymentDecision: RESUME
# deployedCodePresent: true
# contractBalanceGEN: 0
# grantIds: []
```

## Consequential lifecycle

Command:

```powershell
npm run studionet:lifecycle
```

Observed final output:

```text
Result: SUCCESS
rootId: grantlattice-root-v1
transactions: 8
expectedRejections: 1
accessAfter: ANCESTOR_INACTIVE
```

The sanitized canonical file proves:

- deterministic objective widening rejected with the child absent;
- valid semantic attenuation finalized `ATTENUATED` and child `ACTIVE`;
- semantic expansion finalized `EXPANSION` and child `DENIED`;
- ambiguous meaning finalized `AMBIGUOUS` and child `RETRYABLE`;
- the actor-bound access read returned `ALLOWED` for the recorded child grantee;
- the same public grant ID with the other authenticated actor returned
  `ACTOR_MISMATCH`;
- root revocation made the descendant return `ANCESTOR_INACTIVE`;
- principal balance, delegate balance, and contract balance were recorded in
  GEN; every contract write sent `0 GEN`, and contract balance remained `0 GEN`.

Re-running the completed lifecycle returned the same `SUCCESS`, 8 transactions,
1 expected rejection, and `ANCESTOR_INACTIVE` without submitting another write.

## Evidence files

- `deployment.json`: one current active deployment identity and safe receipt.
- `deployment-attempts.json`: old and current finalized deploy attempts.
- `lifecycle.json`: allowlisted actors, hashes, statuses, verdicts, state, and
  access reads.
- `archive/0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C/`: superseded identity and complete
  prior lifecycle, marked inactive with reason and zero remaining balance.

No private key, complete RPC receipt, trace, validator configuration,
`node_config`, stdout, or stderr is stored.

## Honest boundary

This is script-signed Studionet and canonical read evidence. It is not a new
browser-wallet write. Production deployment evidence is recorded independently
in `docs/evidence/frontend/judge-remediation-production.md`.
