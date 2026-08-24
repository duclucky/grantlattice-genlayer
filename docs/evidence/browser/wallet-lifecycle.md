# Production browser-wallet lifecycle

Status: **PASS**

Date: 2026-08-24

Live app: `https://grantlattice-genlayer.vercel.app`

## Deliberate wallet selection

The centered chooser discovered Rabby (`io.rabby`) and OKX
(`com.okex.wallet`) through the user's real Chrome profile and did not
auto-select either provider. The user explicitly selected OKX and approved the
account connection. The app displayed the connected account as
`0xc495...8272` and enabled writes only after Studionet was ready.

## Approved production write

The user approved this exact nonpayable root creation at action time:

```text
grant ID:     grantlattice-browser-okx-v1
grantor:      0xc495ef51618d03267a1f227afe5b27b38c748272
grantee:      0xc495ef51618d03267a1f227afe5b27b38c748272
capability:   READ
resource:     browser-demo
max depth:    1
expiry:       2026-09-24 12:00 local form value
value:        0 GEN
```

The production Activity route displayed the real lifecycle result and public
hash:

```text
Finalized on Studionet
Create root grant
Grant grantlattice-browser-okx-v1
0xf6f2d4863e783154a7e3fe6c9feaf2792c762010f139760496ddc9d5effe3904
```

A separate allowlisted SDK projection confirmed:

```json
{
  "status": "FINALIZED",
  "txExecutionResult": "SUCCESS",
  "consensusResult": "MAJORITY_AGREE"
}
```

Explorer:
`https://explorer-studio.genlayer.com/tx/0xf6f2d4863e783154a7e3fe6c9feaf2792c762010f139760496ddc9d5effe3904`

## Canonical reload and access consequence

`npm run studionet:inspect` listed `grantlattice-browser-okx-v1` in the deployed
contract index. Direct canonical reads returned `status=ACTIVE` and
`is_effective=true`.

The final production deployment (`dpl_B8xa7a4ssPjufAW81tCjHG9TPg1R`) then
rendered the same grant as `Active authority` / `Authority is effective` and
showed the exact capability/resource. A fresh production access check for
`READ` on `browser-demo` returned `ALLOWED`. A clean Chrome tab reported no
warning/error logs for either the detail or access-check route.

## Defects caught during the proof

The first submission attempt failed before a transaction hash because the
adapter overrode the SDK-normalized account object with a raw address string.
Canonical state remained unchanged. TDD removed that override in commit
`8e78e43`.

After the successful transaction, the detail route initially requested
`get_review` for a root grant, which cannot have a review. Studio's generic
absence error correctly left the UI fail-closed. Two regression tests were
added and the state-aware read was fixed in commit `6e5df77`; root and
`PROPOSED` grants now skip the impossible review call. The full project check
passed after both fixes.

No private key, raw receipt, validator configuration, or wallet secret was
captured. This browser-wallet evidence remains distinct from the earlier
script-signed lifecycle evidence.
