#!/usr/bin/env bash
# Phase 8: export the unmanaged solution and unpack it to powerplatform/solution.
# Guards: no environment variable values and no GitHub tokens in the unpacked source.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p out
pac solution export --name AgenticSDLC --path out/AgenticSDLC.zip --overwrite
pac solution unpack --zipfile out/AgenticSDLC.zip --folder powerplatform/solution --packagetype Unmanaged --clobber --allowDelete
if [ -d powerplatform/solution/environmentvariablevalues ]; then
  echo "! environment variable values found in the solution: removing them (the PAT must never be exported)"; rm -rf powerplatform/solution/environmentvariablevalues
fi
if grep -rIlE 'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}' powerplatform/solution; then echo "! token-like string found, aborting"; exit 1; fi
echo "Exported and unpacked to powerplatform/solution"
