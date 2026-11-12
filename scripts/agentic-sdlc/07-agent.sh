#!/usr/bin/env bash
# Phase 7: Intake Agent from agents/intake-agent.
# 1. If cgk_IntakeAgent does not exist: create it in the solution from a template extracted
#    from a simple existing agent (pac copilot extract-template + create).
# 2. Clone it (pac push only works on a synced workspace), overlay agent.mcs.yml, settings
#    and topics from the repo, remove template tools, push.
# 3. Add to the solution, set classic orchestration, try to publish (publish needs F5/F6 on).
set -euo pipefail
cd "$(dirname "$0")"
ROOT=$(cd ../.. && pwd)
SRC="$ROOT/agents/intake-agent"
OUT="$ROOT/out/agent"
TEMPLATE_BOT=${TEMPLATE_BOT:-11891146-be1d-4530-8825-e921a91ee5de}   # "Test Chat Agent" in this environment

BOT_ID=$(node -e 'require("./dv").get("bots?$select=botid&$filter=schemaname eq %27cgk_IntakeAgent%27").then(r=>console.log(r.value[0]?.botid||""))')
if [[ -z "$BOT_ID" ]]; then
  mkdir -p "$OUT" && pac copilot extract-template --bot "$TEMPLATE_BOT" --templateFileName "$OUT/tpl.yaml" --overwrite
  pac copilot create --schemaName cgk_IntakeAgent --templateFileName "$OUT/tpl.yaml" --displayName "Intake Agent" --solution AgenticSDLC
  BOT_ID=$(node -e 'require("./dv").get("bots?$select=botid&$filter=schemaname eq %27cgk_IntakeAgent%27").then(r=>console.log(r.value[0].botid))')
fi

rm -rf "$OUT/clone" && pac copilot clone --bot "$BOT_ID" --output-dir "$OUT/clone"
WS="$OUT/clone/Intake Agent"
TPL=$(grep '^template:' "$WS/settings.mcs.yml" || true)
cp "$SRC/agent.mcs.yml" "$WS/"
if [[ -n "$TPL" ]]; then sed "s/^template: .*/$TPL/" "$SRC/settings.mcs.yml" > "$WS/settings.mcs.yml"; else cp "$SRC/settings.mcs.yml" "$WS/"; fi
rm -rf "$WS/tools" && mkdir -p "$WS/topics" && cp "$SRC"/topics/*.yml "$WS/topics/"
pac copilot push --project-dir "$WS"

node add-agent-to-solution.js cgk_IntakeAgent
node set-agent-config.js cgk_IntakeAgent
pac copilot publish --bot cgk_IntakeAgent || echo "! publish failed (turn on F5/F6 first): publish in Copilot Studio (manual step)"
