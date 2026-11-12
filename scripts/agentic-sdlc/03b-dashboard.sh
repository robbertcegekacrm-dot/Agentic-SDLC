#!/usr/bin/env bash
# Phase 3b: upload the "SDLC Dashboard" generative page with pac, replace the view
# placeholders with real view ids, add the page to the solution and put it first
# in the sitemap (re-runs 03-app.js). Idempotent: updates the page when page-id.txt exists.
set -euo pipefail
cd "$(dirname "$0")"
DIR=../../powerplatform/genpages/sdlc-dashboard
APP_ID=$(cat app-id.txt)
BUILD=$(mktemp -d)
node -e '
const fs = require("fs"); const v = require("./views.json");
const map = { ALL_OPEN: "story:default", AUTONOMOUS_PIPELINE: "story:Autonomous pipeline", RELEASED: "story:Released",
  AWAITING_HUMAN: "story:Awaiting a human", RELEASED_THIS_WEEK: "story:Released this week" };
let src = fs.readFileSync(process.argv[1], "utf8");
for (const [k, key] of Object.entries(map)) src = src.split(`__VIEW_${k}__`).join(v[key]);
fs.writeFileSync(process.argv[2], src);
' "$DIR/page.tsx" "$BUILD/page.tsx"
cp "$DIR/RuntimeTypes.ts" "$BUILD/" 2>/dev/null || true

ARGS=(--app-id "$APP_ID" --code-file "$BUILD/page.tsx" --name "SDLC Dashboard"
  --data-sources cgk_sdlcstory,cgk_agentactivity,cgk_release --prompt-file "$DIR/prompt.txt" --agent-message "SDLC Dashboard built per Skills/page-style.md." --model claude-opus-5-5)
if [[ -s "$DIR/page-id.txt" ]]; then ARGS+=(--page-id "$(cat "$DIR/page-id.txt")"); fi
OUT=$(pac model genpage upload "${ARGS[@]}" 2>&1) || { echo "$OUT"; exit 1; }
echo "$OUT"
if [[ ! -s "$DIR/page-id.txt" ]]; then
  echo "$OUT" | grep -i 'Page ID:' | grep -oiE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | grep -vi "$APP_ID" | head -1 > "$DIR/page-id.txt"
fi
echo "page id: $(cat "$DIR/page-id.txt")"
node add-genpage-to-solution.js "$(cat "$DIR/page-id.txt")"
node 03-app.js
