# Restores the demo start state of the portal in a new commit.
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
