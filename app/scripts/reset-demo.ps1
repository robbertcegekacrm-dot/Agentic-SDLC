# Restores the demo start state of the portal (PowerStudios site, release 1.1.0 design) in a new commit:
# 'Requets quote' typo, VAT computed at 12% under a 'VAT (21%)' label, session expiring right after login,
# and no print button on the quote.
# The version in package.json is kept, so release numbers keep going up.
$ErrorActionPreference = 'Stop'
$appDir = Split-Path -Parent $PSScriptRoot
$seedDir = Join-Path $PSScriptRoot 'seed'
Push-Location $appDir
try {
    Get-ChildItem -Path $seedDir -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($seedDir.Length + 1)
        Copy-Item $_.FullName (Join-Path $appDir $rel) -Force
    }

    # Remove test files that are not part of the seed set.
    Get-ChildItem -Path src, tests -Recurse -File -Include *.test.js, *.spec.js | ForEach-Object {
        $rel = $_.FullName.Substring($appDir.Length + 1)
        if (-not (Test-Path (Join-Path $seedDir $rel))) {
            Remove-Item $_.FullName -Force
        }
    }

    # Sanity check: the seeded defects must be back.
    $main = Get-Content src/main.js -Raw
    $checks = @(
        @{ Ok = $main.Contains('Requets quote'); Msg = "'Requets quote' typo missing in src/main.js" },
        @{ Ok = $main.Contains('VAT (21%)'); Msg = "'VAT (21%)' label missing in src/main.js" },
        @{ Ok = (Get-Content src/quote.js -Raw).Contains('VAT_RATE = 0.12'); Msg = 'VAT_RATE 0.12 missing in src/quote.js' },
        @{ Ok = (Get-Content src/session.js -Raw).Contains('Math.floor(Date.now() / 1000)'); Msg = 'session bug missing in src/session.js' },
        @{ Ok = -not $main.Contains('window.print'); Msg = 'print button still present in src/main.js' }
    )
    foreach ($c in $checks) { if (-not $c.Ok) { throw "Seed check failed: $($c.Msg)" } }

    git add -A src tests
    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host 'Nothing to reset: the app is already in its demo start state.'
        return
    }
    git commit -m 'Reset demo: restore seeded defects'
    if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }
    Write-Host "Done. Run 'git push' to deploy the reset portal."
}
finally {
    Pop-Location
}
