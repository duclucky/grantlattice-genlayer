# Semantic ambiguity lock Studionet verification

Status: **PASS ON STUDIONET**

Date: 2026-09-11

## Deployment identity

```text
network: studionet
chainId: 61999
sourceCommit: ff389885019da7a6e3ec3184e90785f918824401
sourceSha256: 98cf8a88b0e7c34cac4415cae70536669e996005da765ca8725eb2c367817d2b
contract: 0x20Cc89F505849Fde12F5703a570B07852235F396
deploy transaction: 0xdd3a2f9daed4f5339aa11f0112e11d9e20137f3e1855c61e141d1975ad79e208
receipt: FINALIZED / SUCCESS / MAJORITY_AGREE
initial grant count: 0
contract balance after lifecycle: 0 GEN
```

Explorer:
`https://explorer-studio.genlayer.com/address/0x20Cc89F505849Fde12F5703a570B07852235F396`

## Commands and observed output

```powershell
npm run studionet:deploy
# Result: SUCCESS
# contractAddress: 0x20Cc89F505849Fde12F5703a570B07852235F396

npm run studionet:lifecycle
# Result: SUCCESS
# transactions: 10
# expectedRejections: 4
# accessAfter: ANCESTOR_INACTIVE
```

The sanitized canonical lifecycle proves:

- deterministic objective widening was rejected without creating a grant;
- semantic attenuation activated a valid child;
- semantic expansion denied an expanding child;
- semantic ambiguity stayed non-authorizing;
- review of the same ambiguous child was rejected;
- recreating the same ambiguous clauses under another child ID was rejected;
- recreating the same ambiguous clauses with only expiry changed was rejected;
- a materially revised ambiguous clause received a new review and activated;
- the exact recorded actor received `ALLOWED`, another actor received
  `ACTOR_MISMATCH`, and ancestor revocation returned `ANCESTOR_INACTIVE`;
- every contract write used `0 GEN` and the contract balance remained `0 GEN`.

The prior active revision at
`0xB80E78f0CdDe708d9dcDfD4A2c74050E38289f95` had a verified `0 GEN` contract
balance and is preserved under `archive/0xB80E78f0CdDe708d9dcDfD4A2c74050E38289f95/`
as inactive, superseded evidence.

Only allowlisted public receipt fields and canonical state are stored. No private
keys, raw receipts, traces, validator configuration, stdout, or stderr are included.

## Honest boundary

This is script-signed Studionet evidence. Production Vercel deployment and
browser-wallet interaction are verified separately.
