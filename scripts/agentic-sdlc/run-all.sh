#!/usr/bin/env bash
# Runs all build phases in order. Each step is idempotent, so the script can be re-run.
# First run asks for a device login (https://login.microsoft.com/device).
set -euo pipefail
cd "$(dirname "$0")"
(cd ../lib && npm ci --silent)
node 00-verify.js
node 01-schema.js
node 01b-state-colors.js
node 02-forms-views.js
node 03-app.js || true            # command step may need a re-run after the dashboard upload
./03b-dashboard.sh
node 05-seed.js "$@"
node 06-flows.js
./07-agent.sh || echo "! agent push failed: see docs/manual-steps.md"
./08-export.sh
