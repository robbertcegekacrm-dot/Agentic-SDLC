#!/usr/bin/env bash
# Restores the demo start state of the portal (PowerStudios site, release 1.1.0 design) in a new commit:
# 'Requets quote' typo, VAT computed at 12% under a 'VAT (21%)' label, session expiring right after login,
# and no print button on the quote.
# The version in package.json is kept, so release numbers keep going up.
set -euo pipefail
cd "$(dirname "$0")/.."

for f in $(cd scripts/seed && find src tests -type f); do
  cp "scripts/seed/$f" "$f"
done

# Remove test files that are not part of the seed set.
for f in $(find src tests -type f \( -name '*.test.js' -o -name '*.spec.js' \)); do
  [ -f "scripts/seed/$f" ] || git rm -q -f "$f" 2>/dev/null || rm -f "$f"
done

# Sanity check: the seeded defects must be back.
grep -q 'Requets quote' src/main.js || { echo "Seed check failed: 'Requets quote' typo missing in src/main.js"; exit 1; }
grep -q 'VAT (21%)' src/main.js || { echo "Seed check failed: 'VAT (21%)' label missing in src/main.js"; exit 1; }
grep -q 'VAT_RATE = 0.12' src/quote.js || { echo "Seed check failed: VAT_RATE 0.12 missing in src/quote.js"; exit 1; }
grep -q 'Math.floor(Date.now() / 1000)' src/session.js || { echo "Seed check failed: session bug missing in src/session.js"; exit 1; }
if grep -qi 'window.print' src/main.js; then echo "Seed check failed: print button still present in src/main.js"; exit 1; fi

git add src tests
if git diff --cached --quiet; then
  echo "Nothing to reset: the app is already in its demo start state."
  exit 0
fi
git commit -m "Reset demo: restore seeded defects"
echo "Done. Run 'git push' to deploy the reset portal."
