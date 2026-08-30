# Judge remediation production verification

Status: **DEPLOYMENT/HTTP/BUNDLE/PROXY PASS; INTERACTIVE BROWSER PENDING**

Date: 2026-08-31

## Production deployment

The Vercel production environment variable `VITE_CONTRACT_ADDRESS` was updated
to `0x7E090E43D8d0b9dDfF20acAA89bD3093e705a162` before deployment.

Command:

```powershell
vercel --prod --yes --cwd frontend --no-color
```

Observed output:

```text
deployment: dpl_EUAbNMq9fwsDHjroABcXhPUbxAQr
readyState: READY
target: production
production deployment: https://grantlattice-genlayer-cgpwc9fr0-duckys-projects-bc83c6a0.vercel.app
alias: https://grantlattice-genlayer.vercel.app
Vite: 5104 modules transformed; built in 2.00s
```

## Live alias and bundle

Commands:

```powershell
curl.exe -sS -I https://grantlattice-genlayer.vercel.app
curl.exe -sS https://grantlattice-genlayer.vercel.app
curl.exe -sS https://grantlattice-genlayer.vercel.app/assets/index-zyBLDKEi.js
```

Observed output:

```text
HTTP/1.1 200 OK
HTML contains GrantLattice: true
HTML contains id="root": true
bundle contains 0x7E090E43D8d0b9dDfF20acAA89bD3093e705a162: true
bundle contains superseded 0x4CD1...3E4C: false
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

GitHub Actions run `33337312596` completed successfully for source/evidence
commit `46124db10eb0686c74dcce25dd46859cd57c7b4b` after 5m11s:

`https://github.com/duclucky/grantlattice-genlayer/actions/runs/33337312596`

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
