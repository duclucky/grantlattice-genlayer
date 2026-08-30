# GrantLattice Judge Remediation Design

Date: 2026-08-31

Status: approved by user on 2026-08-31

## Goal

Address all four judge follow-ups without weakening GrantLattice's fail-closed
authority model or overstating frontend visibility as confidentiality.

## Decision and alternatives

Three approaches were considered for the `can_invoke` boundary:

1. Bind an actor into the contract view and also require authentication at the
   consumer boundary. This is selected because it removes the public
   `can_invoke(grant_id, capability_id, resource_id)` footgun and gives every
   consumer a canonical `ACTOR_MISMATCH` result.
2. Keep the existing contract ABI and document an integration-only actor check.
   This avoids a new deployment but leaves the public view easy to misuse, so it
   is rejected.
3. Convert access checking into a signed state-changing transaction. This would
   authenticate the sender onchain but adds unnecessary cost and state for a
   pre-action guard, so it is rejected.

The semantic-validator alternatives were also evaluated. The current official
GenLayer documentation recommends `gl.vm.run_nondet_unsafe` for custom
leader/validator pairs, while the workspace default prefers `run_nondet` unless
there is a clear documented reason. The judge request plus the updated official
guidance supplies that reason. The migration is therefore allowed only with an
explicit source comment and explicit exception handling inside the validator.

## Contract interface and behavior

Change the canonical view to:

```python
can_invoke(
    grant_id: str,
    actor: Address,
    capability_id: str,
    resource_id: str,
) -> str
```

The result precedence is:

1. Missing or non-`ACTIVE` grant: `GRANT_INACTIVE`.
2. `actor != grant.grantee`: `ACTOR_MISMATCH`.
3. Target expiry: `EXPIRED`.
4. Ineffective ancestry: `ANCESTOR_INACTIVE`.
5. Missing capability: `CAPABILITY_MISSING`.
6. Missing resource: `RESOURCE_MISSING`.
7. Otherwise: `ALLOWED`.

An actor address passed to a view is not self-authenticating. The contract
enforces equality with the recorded grantee; the integration that controls the
external action must authenticate its caller, derive that caller's address, and
pass that exact address. It must reject an unavailable read and must never let a
caller provide an unauthenticated arbitrary actor value.

## Transaction time

`_now()` reads the required deterministic `gl.message_raw["datetime"]` value
directly. It accepts a valid timezone-aware ISO 8601 transaction datetime and
converts it to Unix seconds. A missing, empty, naive, or unparsable value raises
a bounded `gl.vm.UserError`; it never returns `0` and never permits a temporal
check to continue with invented time.

This failure reverts every write before mutation. Views either return a normal
deny reason from valid context or fail; frontend and consumers already treat a
failed/unavailable canonical read as denial.

## Custom semantic validator

Replace the custom call with `gl.vm.run_nondet_unsafe(leader_fn,
validator_fn)`. The validator will:

- reject any leader result that is not `gl.vm.Return`;
- independently execute the semantic review;
- compare only the normalized review fingerprint and required IDs;
- catch its own parsing, LLM, and normalization exceptions and return `False`;
- perform no storage writes inside the nondeterministic block.

Leader failure or validator disagreement cannot activate a grant. Existing
post-consensus normalization and settlement invariants remain mandatory before
any state transition.

## Frontend and integration boundary

The React adapter adds `actor` to `canInvoke` and forwards all four arguments in
the new ABI order. The access-check page does not expose a free-text actor input.
It derives actor from the currently selected EIP-1193 wallet account, disables
the check while disconnected, and explains that the wallet identifies the
workspace actor for this check. The result remains a pre-action guard, not a
signature over the eventual external action.

External A2A, MCP, and ADK consumers must authenticate the actor at their own
execution boundary, load the canonical grant, verify actor/grantee equality,
call `can_invoke` with the authenticated actor immediately before execution,
and fail closed on mismatch, denial, or read failure.

## Visibility and confidentiality language

All product and submission copy will distinguish:

- wallet-scoped workspace visibility in the frontend; from
- public canonical contract state readable through contract views/RPC/Explorer.

Logout hides grant data from the product workspace and disables actions. It
does not erase, encrypt, or make onchain grant state confidential. No privacy or
confidentiality claim is permitted for v1.

## Tests and evidence

The implementation follows red-green TDD and adds coverage for:

- correct grantee returns `ALLOWED` and another address returns
  `ACTOR_MISMATCH`;
- actor mismatch cannot be bypassed with a known public grant ID;
- every existing denial reason preserves the locked precedence;
- missing, empty, naive, and malformed transaction datetime fail closed;
- rejected time reads/writes leave canonical state unchanged;
- static source uses `run_nondet_unsafe`, documents why, and catches validator
  exceptions;
- validator exceptions cannot activate or mutate a proposed child;
- frontend forwards the connected account as actor and disables checks while
  disconnected;
- visible copy states that onchain grant state is public and wallet gating is
  workspace visibility only.

Fresh completion evidence must include focused red/green runs, contract lint,
all direct/deployment/frontend tests, TypeScript, production build, full
`npm run check`, final diff/public-file/secret review, and the Projects precheck.

## Deployment impact and scope boundary

The `can_invoke` ABI change creates a new contract revision. The existing
Studionet address and production frontend must not be presented as containing
this remediation. After local verification, deployment, evidence refresh,
frontend environment update, public push, CI, and production release require
explicit publication authorization. The Portal final Submit action remains a
separate action-time approval.

Historical evidence remains historical and will not be rewritten. A new active
deployment record must bind the new address, source commit, runner/API family,
and lifecycle evidence while archiving the prior revision accurately.
