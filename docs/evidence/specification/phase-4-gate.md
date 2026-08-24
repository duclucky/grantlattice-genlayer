# Phase 4 contract specification gate

Date: 2026-08-24
Project: GrantLattice (`IDEA-018`)
Category: Projects
Decision: PASS — contract implementation may begin

## Gate conclusion

The specification now locks every pre-code design boundary required by the
project template and workspace rules:

- exact public write/view signatures;
- stable IDs, input canonicalization, bounds, three top-level maps, and one
  append-only canonical grant-ID discovery index;
- complete state machine, illegal transitions, authorization, idempotency, and
  transaction-time temporal rules;
- one safety card per write and one frontend lifecycle row per claimed workflow;
- explicit evidence policy and a complete 11-column Evidence Authority Matrix;
- custom semantic validator/equivalence design and deterministic settlement
  invariants before child activation;
- consequence table, zero-value destination matrix, reuse boundary, threat
  model, tests, claim-to-code, analogue, deployment, DoD, honest limits, and kill
  criteria.

All 14 mandatory idea gates remain PASS at this design boundary. In particular,
Gate 4 (Evidence authenticity) remains PASS because v1 accepts no external
claimant evidence: policy bytes are authored by authenticated canonical senders,
actor/objective bindings come from stored state, and semantic text cannot
redefine authority. Missing or invalid semantic output cannot authorize access.

## Required completeness commands

Command:

```powershell
rg -n "BUILDING|Write-method safety cards|Value-destination matrix|Claim-to-code|EA-ROOT|boundary - 1|exact boundary|boundary \+ 1" docs/README.md
```

Real output:

```text
6:project status is `BUILDING`; no contract or network result is claimed yet.
14:- Status: `BUILDING`
70:| Claim-to-code | `PASS` | Every retained claim has a locked method/view, transition, direct/static/frontend test target, and network/browser evidence target; pending implementation is labelled. |
325:| `create_root_grant` | `now < expires_at` | `now == expires_at` is late | Test expiry `boundary - 1`, exact boundary, `boundary + 1`; rejected state/maps unchanged |
369:## Write-method safety cards
451:| `EA-ROOT`: sender may issue this root policy | Typed root calldata and transaction sender | Root caller | Authenticated GenVM sender, who becomes the policy principal/grantor | Bounds/canonicalization, absent ID, future expiry, non-payable metadata | Root ID, sender as principal/grantor, grantee, scopes, clause IDs/kinds/text, expiry, max depth | Unique ID plus `sender|create_root_grant|nonce`; live transaction time | None; issuance is deterministic after verification | Revert unchanged | Root `ACTIVE` issuance | Wrong binding, malformed input, replay, expiry -1/equal/+1; grants/nonces unchanged |
565:### Value-destination matrix
673:- Each time-bounded public write at boundary -1, exact boundary, and boundary +1
712:## Claim-to-code matrix
818:  pending; status `BUILDING` does not imply any of them passed.
```

Command:

```powershell
rg -n "\|[[:space:]]*\|" docs/README.md
```

Real output: no matches (`0` blank Markdown table cells).

## Section and interface audit

The required-heading audit returned PASS for all 16 checked sections:

```text
PASS ## State model
PASS ## Write-method safety cards
PASS ## Frontend lifecycle coverage matrix
PASS ## Evidence policy
PASS ### Evidence Authority Matrix
PASS ## Consensus design
PASS ## Consequence and accounting
PASS ## Reusable interface
PASS ## Threat model
PASS ## Test plan
PASS ## Claim-to-code matrix
PASS ## Analogue and differentiation matrix
PASS ## Deployment and evidence plan
PASS ## Definition of Done
PASS ## Honest limitations
PASS ## Kill criteria
```

The exact-signature search found all four writes and five views, including the
bounded canonical `list_grant_ids` view required by the frontend list.
The placeholder scan for `TODO|TBD|FIXME|PLACEHOLDER|PASS - DESIGN TARGET|PASS - FEASIBLE`
returned no matches.

Additional structural counts:

```text
contract_exists=False
blank_cells=0
eam_rows=4
safety_method_rows=4
claim_rows=7
```

`contract_exists=False` is required proof that this gate was completed before
`contracts/grant_lattice.py` was created.

## Gate-review deviation resolved before code

The approved implementation plan initially listed four point-read views while
the typed frontend seam already required `listGrants`. During this gate review,
that mismatch was rejected because an offchain-only list would violate
FE-PRODUCT and canonical-state honesty. The spec now includes an append-only
`grant_ids` index plus bounded `list_grant_ids(offset, limit)`. This is the
smallest closure: it adds no new trust judgment, actor, consequence, value path,
or contract; every listed ID still resolves through canonical `get_grant`.

## Locked implementation boundary

Task 7 must implement this specification without changing the product concept or
frontend baseline. A discovered GenVM API incompatibility may cause the smallest
documented signature/storage adjustment only after lint/direct proof. Any change
to evidence authenticity, semantic consequence, value movement, contract count,
or public product claim reopens the relevant idea gates before code continues.

Pending and not claimed: contract source, lint, direct tests, semantic consensus,
Studionet deployment/finality, real frontend adapter, browser RPC/CORS lifecycle,
public repository/CI/Vercel, precheck, Portal copy, submission, or acceptance.
