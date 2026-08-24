$ErrorActionPreference = "Stop"
$env:PYTHONUTF8 = "1"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host "[check] $Label"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

Invoke-Checked "GenVM contract lint" {
    & ".\.venv\Scripts\genvm-lint.exe" check "contracts/grant_lattice.py"
}
Invoke-Checked "direct-mode contract tests" {
    & ".\.venv\Scripts\python.exe" -m pytest "tests/direct" -q
}
Invoke-Checked "frontend tests" {
    & npm.cmd --workspace frontend test
}
Invoke-Checked "frontend TypeScript" {
    & npm.cmd --workspace frontend run typecheck
}
Invoke-Checked "frontend production build" {
    & npm.cmd --workspace frontend run build
}

Write-Host "[check] all required checks passed"
