# Manual steps – Agentic SDLC

Everything else is built by `scripts/agentic-sdlc/run-all.sh` (all steps idempotent). Do these in this order.
Environment: https://cegekapowerstudios.crm.dynamics.com/ · Solution: Agentic SDLC (`AgenticSDLC`).

## 1. Summary prompt column on SDLC Story
Prompt columns cannot be created through the Web API.
1. make.powerapps.com → Solutions → Agentic SDLC → Tables → SDLC Story → New column → Data type **Prompt**.
2. Display name `Summary`, schema name `cgk_Summary`.
3. Prompt text:
   > Summarize this SDLC story in 2 to 4 sentences in English for a product owner. Mention the type, what the problem
   > or request is, the triage outcome (priority, complexity, risk, confidence and delivery path) and where it stands
   > now (status, test result, release). Use only the information below, no assumptions.
4. Inputs: Title, Story number, Type, Description, Triage rationale, Priority, Complexity, Risk, Triage confidence,
   Delivery path, Status Reason, Test result, Release.
5. Save, then run `node scripts/agentic-sdlc/02-forms-views.js`: the Summary field is placed on top of the Summary tab.

## 2. Connections on the connection references
Solutions → Agentic SDLC → Connection references → set a connection on each:
| Connection reference | Connector |
|---|---|
| `cgk_sdlc_dataverse` (Agentic SDLC – Dataverse) | Microsoft Dataverse |
| `cgk_sdlc_teams` (Agentic SDLC – Microsoft Teams) | Microsoft Teams |
GitHub is called over HTTP with the PAT; no GitHub connection is needed.

## 3. GitHub PAT as current value
1. Solutions → Agentic SDLC → Environment variables → **GitHub PAT** (`cgk_GitHubPAT`) → **Current value** = the
   fine-grained PAT. Never fill in *Default value*.
2. PAT permissions on `robbertcegekacrm-dot/Agentic-SDLC`: Issues, Pull requests, Contents and Actions read/write,
   Metadata read (needed to assign the Copilot coding agent).

## 4. Turn on the flows
Order (child flows first): **F2 – Send to GitHub**, **F4 – Notify reporter**, **F1 – Story triage**,
**F3 – Pipeline callback**, **F5 – Intake create story**, **F6 – Intake story status**.
Open each in the designer, confirm the connection references if asked, Save, Turn on.
For F2 and F4 (child flows): Details → *Run only users* → set each connection to "Use this connection".

## 5. PA_CALLBACK_URL secret
1. Open **F3 – Pipeline callback** → trigger *When an HTTP request is received* → copy the HTTP URL.
2. GitHub → repo → Settings → Secrets and variables → Actions → New repository secret `PA_CALLBACK_URL` = that URL.

## 6. Publish the Intake Agent
The agent, its instructions and all topics are created by `07-agent.sh`; publishing failed with a 409 because
F5/F6 were still off.
1. Copilot Studio → **Intake Agent** → check Settings → Generative AI: orchestration **Classic**, general knowledge off.
2. Open *Report an issue*, *Request a feature* and *Story status*: the flow nodes point to F5 / F6 (select them if the
   node shows a missing flow).
3. **Publish**. Channels → **Microsoft Teams and Microsoft 365 Copilot** → turn on → open the agent in Teams.

## 7. First deploy of the portal
1. GitHub → repo → Settings → **Pages** → Build and deployment → Source: **GitHub Actions** (was not enabled: the
   first Deploy portal run failed in `configure-pages` with "Get Pages site failed … Not Found").
2. GitHub → Actions → **Deploy portal** → Run workflow (main). The portal shows "Release 1.0.6" at
https://robbertcegekacrm-dot.github.io/Agentic-SDLC/.

## 8. Smoke test (once)
In the app, create an SDLC Story manually (Type Issue, title "Test – VAT 12%") and check that F1 triages it and F2
creates a GitHub issue assigned to Copilot. Close the GitHub issue, then run `05-seed.js --reset`.

## Before every demo
1. `app/scripts/reset-demo.sh` then `git push` (restores the seeded defects in a new commit).
2. `node scripts/agentic-sdlc/05-seed.js --reset` (fresh data, release 1.0.6 in the current week, next story STY-1042).
3. Open the SDLC Dashboard once to warm up.
