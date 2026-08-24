# GrantLattice

GrantLattice uses GenLayer validator consensus to ensure natural-language agent delegation can only narrow, then exposes canonical fail-closed authority to wallets and integrations.

## Live App

[`https://grantlattice-genlayer.vercel.app`](https://grantlattice-genlayer.vercel.app)

## Deployed Contract

- Network: GenLayer Studionet
- Contract: [`0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C`](https://explorer-studio.genlayer.com/address/0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C)
- Contract writes: nonpayable (`0 GEN`)

## The Problem

Structured permission lists can prove that capabilities, resources, depth, and
expiry become narrower. They cannot neutrally decide whether a natural-language
purpose, audience, retention, disclosure, or prohibited-use clause silently
expands authority. A backend LLM would leave that decision with one interested
operator.

GrantLattice stores authenticated parent and child grants as canonical contract
state. GenLayer validators compare every exact child clause with its parent and
agree on one of three bounded meanings:

- `NARROWER_OR_EQUAL`: every clause safely attenuates, so the child activates.
- `EXPANDS_AUTHORITY`: at least one clause is broader, so the child is denied.
- `AMBIGUOUS`: meaning is not safe to settle, so the child remains inactive and retryable.

Revocation or expiry of any ancestor makes descendant authority ineffective.
Consumers call `can_invoke` immediately before an action and fail closed when
canonical state is unavailable.

## Architecture

```text
EIP-6963 wallet -> nonpayable Studionet writes -> GrantLattice contract
                                                   |
same-origin /api/genlayer proxy -> canonical views -+
                                                   |
                         A2A / MCP / ADK guards <- can_invoke
```

- One ASCII Intelligent Contract and exactly one `gl.Contract` subclass.
- Four authenticated writes and five canonical views.
- Deterministic objective subset checks run before validator judgment.
- Deterministic settlement invariants reject missing, extra, duplicate, invalid,
  or semantically inconsistent validator output before hard state changes.
- The React/Vite frontend deliberately lists detected EVM wallets, keeps wallet
  writes separate from IC reads, reports accepted/finalized/failure/retry states,
  and reloads canonical state only after finalization.

The full locked specification and claim-to-code matrix are in
[`docs/README.md`](docs/README.md).

## Verified Evidence

- GenVM lint: 3 checks passed; `GrantLattice` recognized with 9 methods.
- Python/direct/static/parser tests: 63 passed.
- Deployment helper tests: 7 passed.
- Frontend tests: 63 passed across 20 files, plus TypeScript and production build.
- Studionet lifecycle: root creation, deterministic widening rejection,
  validator-controlled attenuation/expansion/ambiguity, allow, revocation, and
  descendant denial all recorded with sanitized finalized evidence.
- Browser reads: deployed grant list and `ANCESTOR_INACTIVE` access denial loaded
  through the same-origin IC path without CORS or `Failed to fetch` errors.
- Chrome wallet discovery: Rabby and OKX were detected without auto-selection.

See [`docs/evidence`](docs/evidence) for current command output, safe receipt
projections, canonical reads, and honest evidence boundaries.

- Public repository: [`duclucky/grantlattice-genlayer`](https://github.com/duclucky/grantlattice-genlayer)
- Successful CI: [Windows verification run 32700485243](https://github.com/duclucky/grantlattice-genlayer/actions/runs/32700485243)

## Run Locally

Requirements: Node.js 24+, Python 3.12, and Git.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
Copy-Item frontend/.env.example frontend/.env.local
```

Set the public deployed address in `frontend/.env.local`:

```dotenv
VITE_CONTRACT_ADDRESS=0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C
VITE_GENLAYER_IC_RPC_PATH=/api/genlayer
VITE_GENLAYER_NETWORK=studionet
```

Then run:

```powershell
npm run check
npm --prefix frontend run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. No private key belongs in frontend environment
variables.

## Studionet Deployment

Deployment scripts discover `STUDIONET_PRIVATE_KEY` from the ignored project
`.env` first, then from the authorized ignored parent `.env`. They report only
presence and allowlisted receipt fields; they never print private keys or raw
validator payloads.

```powershell
npm run studionet:inspect
npm run studionet:prepare-delegate
npm run studionet:deploy
npm run studionet:lifecycle
```

The lifecycle commands are resumable and recover finalized state instead of
replaying writes. A secondary actor is funded with exactly `1 GEN` only when
needed; every contract call sends `0 GEN`.

## Reusable Interface

- `get_grant(grant_id)` returns canonical grant scope, lineage, and state.
- `get_review(grant_id)` returns the latest normalized semantic outcome.
- `is_effective(grant_id)` derives live authority through bounded ancestry.
- `can_invoke(grant_id, capability_id, resource_id)` returns an exact fail-closed reason.

These views fit an A2A AgentSkill gateway, an MCP tool proxy, or a Google ADK
AgentTool guard without a mirror contract. The repository documents those
patterns; it does not claim external adoption.

## Honest Limitations

- Browser-wallet signing and a production-host write remain pending explicit
  action-time wallet confirmation; script-signed Studionet evidence is separate.
- The validator judges authored policy meaning, not external real-world truth;
  ambiguity intentionally remains inactive and retryable.
- V1 is bounded to 8 clauses, 16 capabilities/resources, and delegation depth 8.
- A2A, MCP, and Google ADK are documented integration patterns, not deployed adopters.
- No value, fee, bond, reward, escrow, payout, or credit path exists.
- No security audit, performance benchmark, production adoption, or Portal
  acceptance is claimed.

## License

MIT
