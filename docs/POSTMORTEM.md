# GrantLattice postmortem and reuse note

Date: 2026-08-24

## What held up

- Problem-first selection and all 14 gates kept the product centered on one
  neutral semantic decision with a real canonical consequence.
- Keeping objective subset checks deterministic and qualitative comparison
  validator-controlled made adversarial tests and settlement invariants clear.
- One contract plus `get_grant`, `is_effective`, and `can_invoke` produced a
  reusable boundary without inventing a pass-through consumer contract.
- The resumable Studionet runner and allowlisted evidence projection prevented
  duplicate writes and avoided exposing validator-private receipt data.

## What browser proof caught

- Passing a raw address back into `writeContract` bypassed the SDK-normalized
  JSON-RPC account. The first attempt failed before a hash; a focused regression
  test now locks the normalized-client behavior.
- A root grant has no review, but the detail page requested `get_review`
  unconditionally. Studio returned a generic execution error, so the UI
  correctly failed closed. State-aware detail loading and two regression tests
  now skip impossible review reads for roots and unreviewed children.

## Reusable lesson

Finality is not the end of a Projects proof. The browser journey must also read
the exact resulting entity and exercise the product consequence. GrantLattice's
proof therefore ends with the active/effective root and an `ALLOWED`
`can_invoke`, not merely a transaction hash.

## Milestone headroom

Build one real fail-closed A2A, MCP, or Google ADK enforcement adapter that
checks finalized state immediately before execution. A later independent
milestone can authenticate remote protocol credentials or AP2 mandates before
accepting cross-domain grants. Neither increment is a rename or cosmetic UI
change.
