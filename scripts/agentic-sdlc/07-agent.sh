#!/usr/bin/env bash
# Phase 7: create/update the Intake Agent from agents/intake-agent (pac copilot push),
# add it with its components to the AgenticSDLC solution and publish it.
# Needs flows F5/F6 to exist (06-flows.js) because topics call them by id.
set -euo pipefail
cd "$(dirname "$0")"
AGENT_DIR=../../agents/intake-agent
pac copilot push --project-dir "$AGENT_DIR"
node add-agent-to-solution.js cgk_IntakeAgent
pac copilot publish --bot cgk_IntakeAgent || echo "! publish failed: publish in Copilot Studio (manual step)"
