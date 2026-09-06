# Phase 8 Studionet deployment and lifecycle verification

Status: **PASS**

Date: 2026-09-06

Network: **GenLayer Studionet only** (chain ID `61999`). The active revision is
`0xB80E78f0CdDe708d9dcDfD4A2c74050E38289f95`; earlier revisions are retained
under `docs/evidence/studionet/archive/` and are not used as current proof.

## Deployment

Command:

```powershell
npm run studionet:deploy
```

Observed result:

```text
Result: SUCCESS
Contract: 0xB80E78f0CdDe708d9dcDfD4A2c74050E38289f95
Receipt: FINALIZED / SUCCESS / MAJORITY_AGREE
Deployed code present: true
Initial grant IDs: []
```

All four contract writes are non-payable and sent `0 GEN`; the deployed
contract balance is `0 GEN`.

## Semantic ambiguity lifecycle

Command:

```powershell
npm run studionet:lifecycle
```

Observed terminal result:

```text
Result: SUCCESS
Root ID: grantlattice-root-v1
Successful contract writes: 10
Expected unchanged rejection: 3
Access after root revoke: ANCESTOR_INACTIVE
```

The lifecycle records these canonical checks in
[`lifecycle.json`](lifecycle.json):

| Check | Canonical result | Safety consequence |
| --- | --- | --- |
| Valid attenuation | child `ACTIVE`; review `ATTENUATED` | exact `READ` / `case-1` access is `ALLOWED` before revoke |
| Semantic expansion | child `DENIED`; review `EXPANSION` | child never authorizes |
| Semantic ambiguity | child `AMBIGUOUS`; review `AMBIGUOUS` | terminal, inactive, fingerprint recorded |
| Same definition, same clauses, new `child_id` | finalized execution error; copy absent | fingerprint lock cannot be bypassed by ID/nonce changes |
| Material policy revision | child `ACTIVE`; review `ATTENUATED` | changed definition receives a new fingerprint and may be reviewed |
| Root revocation | root `REVOKED` | previously active descendant reads `ANCESTOR_INACTIVE` |
| Wrong actor | `ACTOR_MISMATCH` | public grant ID is not caller authorization |

The ambiguity fingerprint is
`9a56b66eadf4ef56a4905c1c391af53244ba18e7247e90256b86048bfc0b8322`.
It is derived from parent ID/version, grantee, capabilities, resources,
expiry/depth constraints, and canonical clauses; child ID, caller nonce, and
review attempt are deliberately excluded. The direct suite separately proves
that `UNVERIFIABLE` technical failures remain the only retryable review path.

## Safe evidence boundary

The JSON evidence stores sanitized finalized receipt fields, transaction hashes,
allowlisted actors, GEN amounts, IDs, and canonical view projections. It does
not store private keys, validator configuration, raw payloads, or complete RPC
responses.
