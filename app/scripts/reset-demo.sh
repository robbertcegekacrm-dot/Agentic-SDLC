#!/usr/bin/env bash
# Restores the demo start state of the portal in a new commit.
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

git add src tests
if git diff --cached --quiet; then
  echo "Nothing to reset: the app is already in its demo start state."
  exit 0
fi
git commit -m "Reset demo: restore seeded defects"
echo "Done. Run 'git push' to deploy the reset portal."
