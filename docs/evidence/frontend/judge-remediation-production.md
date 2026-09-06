# Judge remediation production verification

Status: **DEPLOYMENT/HTTP/BUNDLE/PROXY PASS; INTERACTIVE BROWSER PENDING**

Date: 2026-09-06

## Production deployment

The Vercel production environment variable `VITE_CONTRACT_ADDRESS` was updated
to `0xB80E78f0CdDe708d9dcDfD4A2c74050E38289f95` before deployment.

Command:

```powershell
vercel --prod --yes --cwd frontend --no-color
```

Observed output:

```text
deployment: dpl_3YomkqTmLa7Z4DvY3vW1hc1sgXky
readyState: READY
target: production
production deployment: https://grantlattice-genlayer-ii27yfpyg-duckys-projects-bc83c6a0.vercel.app
alias: https://grantlattice-genlayer.vercel.app
Vite: 5106 modules transformed; built in 1.99s
```

## Live alias and bundle

Commands:

```powershell
curl.exe -sS -I https://grantlattice-genlayer.vercel.app
curl.exe -sS https://grantlattice-genlayer.vercel.app
curl.exe -sS https://grantlattice-genlayer.vercel.app/assets/index-44iSmDK0.js
```

Observed output:

```text
HTTP/1.1 200 OK
HTML contains GrantLattice: true
HTML contains id="root": true
bundle contains 0xB80E78f0CdDe708d9dcDfD4A2c74050E38289f95: true
bundle contains superseded 0x7E09...A162: false
```

## Same-origin RPC

Command:

```powershell
curl.exe -sS -D - -X POST `
  https://grantlattice-genlayer.vercel.app/api/genlayer `
  -H 'Content-Type: application/json' `
  -H 'Origin: https://grantlattice-genlayer.vercel.app' `
  --data-binary '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
```

Observed output:

```text
HTTP/1.1 200 OK
{"jsonrpc":"2.0","result":"0xf22f","id":1}
```

The result is chain ID 61999. This proves the deployed same-origin proxy reaches
Studionet from the production origin. It is not a substitute for interactive
browser rendering and console/network inspection.

## Public CI

GitHub Actions run `34046195858` completed successfully for source/evidence
commit `4b39c3700ab765b56d720091b3e9a5bf3b5e8770`:

`https://github.com/duclucky/grantlattice-genlayer/actions/runs/34046195858`

## Interactive browser boundary

The required browser-control setup was attempted twice. Both attempts failed
before navigation with:

```text
failed to write kernel assets: The system cannot find the path specified. (os error 3)
```

Therefore this evidence does not claim a fresh interactive browser PASS, console
PASS, or wallet signature on the remediated revision. Existing OKX/browser
evidence belongs to the archived contract revision. Manual or restored-tool
verification must still confirm the rendered disclaimer, connected actor,
`ACTOR_MISMATCH`, canonical reload, and absence of browser CORS/console errors.
