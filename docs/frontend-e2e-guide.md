# GrantLattice frontend E2E guide

Production app: https://grantlattice-genlayer.vercel.app  
Network: GenLayer Studionet (chain 61999)  
Contract: `0xC9A8F8640e80591BE0d0F67d411BbBE3e60213fE`  
Explorer: https://explorer-studio.genlayer.com/address/0xC9A8F8640e80591BE0d0F67d411BbBE3e60213fE

Every write below is non-payable and sends **0 GEN**. The wallet popup is a
signature/transaction confirmation, not a token transfer.

## E2E journey

1. Connect OKX on Studionet. The account chip is the authenticated actor.
2. **Grants → Create root grant**: enter a unique ID, grantee, capabilities,
   resources, expiry, depth, and qualitative clauses. Submit and sign
   `create_root_grant`; wait for `Finalized in canonical contract state`.
3. Open the root and choose **Delegate a narrower grant**. Keep capabilities and
   resources as subsets, expiry no later than the parent, and preserve clause IDs
   and kinds. Submit and sign `propose_child_grant`.
4. On the child detail, choose **Request semantic review** and sign
   `review_child_grant`. Only `ATTENUATED / ALL_CLAUSES_NARROWER` activates it.
   `EXPANSION` denies; `AMBIGUOUS` is terminal and requires a meaningful clause
   revision. Case, punctuation, whitespace, ID, expiry, and other unrelated
   edits do not bypass an ambiguity lock.
5. **Access check** requires the exact grant, actor, capability, and resource.
   Expected outcomes include `ALLOWED`, `ACTOR_MISMATCH`,
   `CAPABILITY_MISSING`, `RESOURCE_MISSING`, and `GRANT_INACTIVE`.
6. **Activity** shows only the connected wallet's allowlisted contract
   operations. Each card links to the real Studionet transaction. A genuine
   unavailable read is shown as an error with Retry; it is never shown as empty
   or allowed.
7. **Revoke grant** is a signed 0 GEN write. After finality, the grant detail
   becomes inactive and the same access check returns `GRANT_INACTIVE`.

## Adversarial clause smoke corpus

The deployed contract was tested with three live child clauses that attempt to
instruct the evaluator to return `NARROWER_OR_EQUAL` while explicitly granting
broader or unsafe authority. All three live reviews finalized as `EXPANSION` and
the canonical grants are `DENIED` with `is_effective=false`.

See the exact clause text, normalized verdicts, canonical consequences, and
Explorer transactions in
[`docs/evidence/studionet/ambiguity-lock-remediation.md`](evidence/studionet/ambiguity-lock-remediation.md).
