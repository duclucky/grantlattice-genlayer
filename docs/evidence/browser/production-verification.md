# Phases 11-13 public release and production verification

Status: **PASS for public repository, CI, production deployment, canonical
reads, access decisions, wallet discovery, and an OKX-signed write**

Date: 2026-08-24

## Public repository hygiene and CI

Repository: `https://github.com/duclucky/grantlattice-genlayer`

Before the first push, the required commands resolved the project root to
`D:/Genlayer Project/grantlattice`, returned a clean status/diff/staging set,
and listed only deliverables. The explicit allowlist scan reported:

```text
ALLOWLIST PASS: 109 tracked deliverable files
HISTORY PATH PASS: 111 unique paths
HISTORY SECRET PASS: no credential-shaped content
PROJECT_ENV_PRESENT=True
PARENT_ENV_PRESENT=True
FRONTEND_LOCAL_ENV_PRESENT=True
.env
frontend/.env.local
```

Two non-deliverable planning artifacts found before the first push were removed
from every local commit. The 17-commit sequence was preserved. Sanitized
deployment evidence maps the pre-hygiene hashes to the public equivalents and
the contract source SHA-256 remains
`0fabc7b18aff444613389f577c5c218571f1c86d7cef2afb0315cb17bea1f842`.

GitHub verification:

```text
visibility: PUBLIC
default branch: main
local commit count: 17
remote commit count: 17
CI run: 32700485243
CI conclusion: success
CI verify job: 5m51s
```

Successful CI:
`https://github.com/duclucky/grantlattice-genlayer/actions/runs/32703854895`

The latest functional commit covered by that run is `6e5df77`; the first-push
hygiene run remains `32700485243`.

## Vercel production deployment

Project: `grantlattice-genlayer`

Production URL: `https://grantlattice-genlayer.vercel.app`

Active deployment ID: `dpl_B8xa7a4ssPjufAW81tCjHG9TPg1R`

The deployment used `frontend/` as the project root, the Vite build command,
`dist` output, and the persisted non-sensitive Production variable
`VITE_CONTRACT_ADDRESS=0x4CD1Af773D89f7c8c8b561C99060f52f77383E4C`.
Vercel reported `READY`; the final production build transformed 5104 modules
and completed in 1.57 seconds. Earlier ready deployments were superseded while
the browser-wallet path was debugged; the stable alias points to the deployment
above.

## Required HTTP checks

Command:

```powershell
curl.exe -I https://grantlattice-genlayer.vercel.app
```

Observed result: `HTTP/1.1 200 OK`, `Content-Type: text/html; charset=utf-8`.

The first 4,000-byte content check returned the real HTML and reported:

```text
HAS_PROJECT_NAME=True
HAS_REACT_ROOT=True
DEEP_ROUTE_HTTP=200
```

The HTML contained `<title>GrantLattice</title>` and
`<div id="root"></div>`.

## Live browser checks

Chrome loaded `https://grantlattice-genlayer.vercel.app/grants` through the
production same-origin `/api/genlayer` function. After the bounded Studionet
read completed, it displayed:

```text
grantlattice-root-v1       Revoked
grantlattice-valid-v1      Inactive through lineage
grantlattice-expansion-v1  Broader than parent
grantlattice-ambiguous-v1  Needs another review
```

The live `/checks` route used `grantlattice-valid-v1`, capability `READ`, and
resource `case-1`, then displayed:

```text
Action denied
ANCESTOR_INACTIVE
```

Chrome console warning/error collection was empty for both routes. There was no
CORS error, `Failed to fetch`, fixture state, or local-storage authority.

The centered live wallet chooser discovered Rabby (`io.rabby`) and OKX
(`com.okex.wallet`) and did not auto-select either provider.

## Production wallet and canonical reload

The user deliberately selected OKX, connected
`0xc495ef51618d03267a1f227afe5b27b38c748272`, and approved a `0 GEN` root grant.
Transaction
`0xf6f2d4863e783154a7e3fe6c9feaf2792c762010f139760496ddc9d5effe3904`
finalized with successful execution and majority agreement. The final
production UI reloaded the resulting `ACTIVE`, effective grant and a fresh
`can_invoke` returned `ALLOWED`. The complete, secret-safe record is in
`docs/evidence/browser/wallet-lifecycle.md`.
