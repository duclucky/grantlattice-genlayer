# Semantic ambiguity fingerprint lock

Date: 2026-09-06

Status: design approved by the user for implementation.

## Outcome

GrantLattice must never let a grantor retry the same semantically ambiguous
authority definition until a later nondeterministic review returns a favorable
result. An `AMBIGUOUS` result remains non-authorizing for that exact canonical
definition. A materially revised definition may be proposed and reviewed.

Technical or unverifiable review failures remain retryable because they do not
assert a semantic conclusion.

## Existing behavior and cause

`review_child_grant` currently accepts both `PROPOSED` and `RETRYABLE` children.
Both malformed/unverifiable output and a valid semantic `AMBIGUOUS` verdict set
the child status to `RETRYABLE`. The direct suite explicitly proves that the
same child can receive `AMBIGUOUS` on attempt 1 and `ATTENUATED`/`ACTIVE` on
attempt 2. A new `child_id` also bypasses per-grant state because no canonical
authority-definition registry exists.

## Chosen approach and alternatives

The chosen design stores a contract-derived fingerprint for each semantically
ambiguous canonical delegation definition. `AMBIGUOUS` becomes a distinct,
terminal, non-authorizing grant status. Proposal rejects any definition whose
fingerprint is already marked ambiguous, even when the caller changes only the
child ID or nonce.

Two alternatives were rejected:

- Treat `AMBIGUOUS` as `DENIED`. This prevents same-child retry but does not by
  itself prevent the same definition being recreated under a different ID, and
  it obscures the difference between detected expansion and uncertainty.
- Add only a per-child retry flag. This leaves the different-`child_id` bypass
  open and therefore does not close outcome grinding at the authority-definition
  boundary.

## Canonical fingerprint

The contract derives the fingerprint from a deterministic, length-delimited
encoding of:

- parent grant ID and recorded parent version;
- child grantee address;
- canonical capability CSV and resource CSV;
- child expiry, depth, and maximum depth;
- the canonical stored child clauses.

The child grant ID, proposal nonce, review attempt, transaction sender spelling,
and validator output are deliberately excluded. Changing only an identifier or
nonce therefore cannot bypass the lock. Changing actual authority state creates
a different fingerprint and permits a new proposal.

The encoding must be collision-resistant at the serialization boundary: each
field is length-prefixed before a deterministic digest is calculated. The
fingerprint is computed by contract code from validated canonical inputs, never
accepted from callers or validators.

## Contract state transitions

1. Proposal validates all existing objective, lineage, expiry, clause, and nonce
   invariants and derives the candidate fingerprint before any mutation.
2. If the fingerprint exists in the ambiguity registry, proposal reverts with a
   stable fail-closed error. No grant, index entry, or nonce is consumed.
3. A technically invalid, unavailable, malformed, or unverifiable review records
   `UNVERIFIABLE`, leaves the child `RETRYABLE`, and increments the attempt once.
4. A valid semantic result containing one or more `AMBIGUOUS` classifications
   records the fingerprint in the registry and moves the child to terminal
   `AMBIGUOUS`.
5. `review_child_grant` rejects `AMBIGUOUS`, `ACTIVE`, `DENIED`, and `REVOKED`
   children without starting another nondeterministic execution.
6. `is_effective` and `can_invoke` continue to fail closed because only `ACTIVE`
   grants authorize actions.

The review record exposes the contract-derived definition fingerprint so a
reviewer can verify which canonical content was locked without relying on
frontend state.

## Frontend behavior

The frontend adds `AMBIGUOUS` as a distinct grant status. It never renders the
semantic-review action for that state. The grant detail page explains that the
definition is non-authorizing and that a materially changed policy or scope must
be proposed under a new grant. `RETRYABLE` copy is reserved for technical or
unverifiable review failure.

This is a status/copy correction within the existing design system. No new
layout, navigation model, privacy claim, transaction type, or value flow is
introduced.

## Testing and evidence

Regression coverage must prove:

- semantic ambiguity is terminal and never effective;
- the same child cannot be reviewed again after ambiguity;
- the same authority definition under another child ID and nonce is rejected;
- changing only child ID or nonce does not change the fingerprint;
- a material scope or policy change produces a different fingerprint and can be
  proposed and reviewed;
- a rejected duplicate does not consume its nonce or append a grant ID;
- technical `UNVERIFIABLE` remains retryable and may later activate after a
  valid attenuated result;
- the frontend hides retry for `AMBIGUOUS`, explains remediation, and preserves
  technical retry behavior;
- lint, direct tests, frontend checks, deployment lifecycle, production browser
  verification, CI, and the project precheck all pass with real output.

## Deployment and compatibility

Intelligent Contract storage changes require a new Studionet deployment. The
new address becomes the sole active address in frontend configuration and
documentation; prior lifecycle evidence is archived by address. Transactions
remain non-payable and use 0 GEN because this correction introduces no value
flow. Existing public onchain visibility wording remains unchanged.

## Spec self-review

The design has one authority-safety outcome. It distinguishes semantic meaning
from technical execution failure, binds the lock to content rather than IDs,
defines mutation ordering and retry behavior, and names observable frontend and
test consequences. There are no placeholders, optional security branches, or
claims that implementation is already complete.
