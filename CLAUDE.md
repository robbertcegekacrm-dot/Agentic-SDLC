# Agentic SDLC – instructions for Claude Code

## Always read first
Before planning or building anything, read all files in /Skills and apply them:
- Skills/build-standards.md – Power Platform demo build conventions (publisher, app types, views, colors). Always apply.
- Skills/brand.md – Cegeka brand colors and styling
- Skills/page-style.md – styling for generative pages / dashboards
- Skills/plan-template.md – structure to use for docs/plan.md

## Way of working
- Workflow: create docs/plan.md from docs/briefing.md, then execute the plan when asked.
- Work autonomously: no review checkpoints or confirmation questions. Only at plan stage, confirm component
  types if unclear (model-driven app, generative page, canvas/coded app, flow, AI prompt, Copilot Studio agent).
- Everything goes in the separate unmanaged solution "Agentic SDLC" with the CGK publisher from build-standards.
  All components custom; no customizations of standard tables.

## Repo structure
- /app            → demo target app (the only folder GitHub Copilot may change; deployed to GitHub Pages)
- /powerplatform  → solution source, flows, prompt, demo data, scripts
- /docs           → briefing, plan, demo script, agent instructions
- /Skills         → build conventions
- /.github        → workflows, copilot-instructions.md, copilot-setup-steps.yml

## Rules
- This repo is public: never commit secrets, tokens, connection strings or customer data.
- The GitHub PAT is only set as current value of the environment variable in the environment, never as default value.
- No Azure resources.