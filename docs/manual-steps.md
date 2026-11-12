# Manual steps – Agentic SDLC

Do these in this order. Steps marked **(blocking)** must be done before the build scripts can continue.
Environment: https://cegekapowerstudios.crm.dynamics.com/ · Solution: Agentic SDLC (`AgenticSDLC`).

## 1. Create the solution (blocking)
During the build the solution `AgenticSDLC` did **not** exist in the environment (`pac solution list` shows no
Agentic solution), and the build never creates a solution or publisher.
1. make.powerapps.com → environment *Power Studios @ Cegeka* → Solutions → New solution.
2. Display name `Agentic SDLC`, name `AgenticSDLC`, publisher **Cegeka** (prefix `cgk`, option value prefix 76663).

## 2. Run the build scripts (blocking, needs an interactive login)
```bash
cd scripts/agentic-sdlc
./run-all.sh
```
On the first call a device login is shown (`https://login.microsoft.com/device` + code). Sign in as
robbert@CegekaCRM.onmicrosoft.com. The token is cached in `.token-cache.json` (git ignored). All steps are idempotent;
re-run `./run-all.sh` after any fix. Then commit `powerplatform/solution` (exported by `08-export.sh`).

## 3. AI prompt "SDLC Story Triage"
Not created by code (AI Builder prompt creation is not exposed reliably through the Web API).
1. Power Apps → Solutions → Agentic SDLC → New → AI → Prompt.
2. Name `SDLC Story Triage`; inputs, prompt text and JSON output exactly as in
   [powerplatform/prompts/sdlc-story-triage.md](../powerplatform/prompts/sdlc-story-triage.md). Test with the sample
   values, save.
3. Re-run `node scripts/agentic-sdlc/06-flows.js`: F1 then finds the prompt by name and binds it (only while F1 is off).

## 4. Summary prompt column on SDLC Story
Prompt columns cannot be created through the Web API.
1. Solutions → Agentic SDLC → Tables → SDLC Story → New column → Data type **Prompt**.
2. Display name `Summary`, schema name `cgk_Summary`.
3. Prompt text:
   > Summarize this SDLC story in 2 to 4 sentences in English for a product owner. Mention the type, what the problem
   > or request is, the triage outcome (priority, complexity, risk, confidence and delivery path) and where it stands
   > now (status, test result, release). Use only the information below, no assumptions.
4. Inputs: Title, Story number, Type, Description, Triage rationale, Priority, Complexity, Risk, Triage confidence,
   Delivery path, Status Reason, Test result, Release.
5. Save, then re-run `node scripts/agentic-sdlc/02-forms-views.js`: the Summary field is placed on top of the Summary tab.

## 5. Connection references
Solutions → Agentic SDLC → Connection references, set a connection on each:
| Connection reference | Connector |
|---|---|
| `cgk_sdlc_dataverse` (Agentic SDLC – Dataverse) | Microsoft Dataverse |
| `cgk_sdlc_teams` (Agentic SDLC – Microsoft Teams) | Microsoft Teams |
GitHub is called over HTTP with the PAT, so the GitHub connection is not needed.

## 6. GitHub PAT as current value
1. Solutions → Agentic SDLC → Environment variables → **GitHub PAT** (`cgk_GitHubPAT`).
2. Set **Current value** = the fine-grained PAT. Never fill in *Default value*.
3. The PAT needs on repo `robbertcegekacrm-dot/Agentic-SDLC`: Issues read/write, Pull requests read/write,
   Contents read/write, Actions read/write, Metadata read (needed to assign the Copilot coding agent).

## 7. Turn on the flows
In this order (child flows first): **F2 – Send to GitHub**, **F4 – Notify reporter**, then **F1 – Story triage**,
**F3 – Pipeline callback**, **F5 – Intake create story**, **F6 – Intake story status**.
Open each flow once in the designer if it asks to confirm the connection references, then Save and Turn on.
For F2 and F4 (child flows): Details → *Run only users* → set the connections to "Use this connection".

## 8. PA_CALLBACK_URL secret
1. Open **F3 – Pipeline callback**, trigger *When an HTTP request is received*, copy the HTTP URL.
2. GitHub → repo → Settings → Secrets and variables → Actions → New repository secret `PA_CALLBACK_URL` = that URL.

## 9. Intake Agent
`07-agent.sh` pushes the agent with `pac copilot push`. If that step failed (see the build log):
1. Copilot Studio → Create → New agent → skip to configure, name `Intake Agent`, solution **Agentic SDLC**.
2. Description and instructions from [docs/agent-intake.md](agent-intake.md). Settings → Generative AI →
   orchestration **Classic**, general knowledge **off**.
3. Then `pac copilot clone --bot <agent id> --output-dir out/agent`, copy `agents/intake-agent/topics/*.yml` into
   the clone's `topics/`, and `pac copilot push --project-dir out/agent/<folder>`. Alternatively paste each topic in
   the topic code editor.
4. In each flow node (Report an issue, Request a feature, Story status) check that F5 / F6 is selected.

Then always:
5. Publish the agent; Channels → Microsoft Teams and Microsoft 365 Copilot → turn on; add it in Teams.

## 10. First deploy of the portal
GitHub → Actions → **Deploy portal** → Run workflow (main). The portal shows "Release 1.0.6" at
https://robbertcegekacrm-dot.github.io/Agentic-SDLC/.

## 11. Before every demo
1. `app/scripts/reset-demo.sh` then `git push` (restores the seeded defects in a new commit).
2. `node scripts/agentic-sdlc/05-seed.js --reset` (fresh data, release 1.0.6 in the current week, next story STY-1042).
   Then set the autonumber again only if you created test stories afterwards.
3. Open the SDLC Dashboard once to warm up.
