# Briefing: Agentic SDLC demo (concept)

## Goal
Show the concept of an agentic software development lifecycle end to end:
**request/report → triage → autonomous build/fix → test → release**, fully traceable in a model-driven app.
Simple, low-risk stories are built and released by agents; complex or risky ones are routed to a human.
Concept demo: it must show the elements clearly, it does not need to be production-grade.
**No Azure resources anywhere.** Hosting = GitHub Pages, integration = Power Automate HTTP trigger.

## Read first
Read `CLAUDE.md` and all files in `/Skills` before planning. Apply `Skills/build-standards.md`,
`Skills/brand.md` and `Skills/page-style.md` throughout; structure `docs/plan.md` per `Skills/plan-template.md`.

## Repository (single repo: `robbertcegekacrm-dot/Agentic-SDLC`, public)
```
/app            → demo target app (the only thing Copilot changes and Pages deploys)
/powerplatform  → solution source, flows, prompt, demo data, scripts
/docs           → briefing, plan.md, demo script
/Skills         → build conventions
/.github        → workflows, copilot-instructions.md, copilot-setup-steps.yml
```
Rules:
- copilot-instructions.md: "Only change files under /app. Never touch /powerplatform, /docs or /Skills."
- ci.yml and deploy.yml use `paths: ['app/**']`, working-directory `app`; Pages publishes `app/dist` only
- Repo is public: never commit secrets. The GitHub PAT exists only as the *current value* of the
  environment variable in the environment, never as default value in the exported solution.

## Already set up (manual, done)
Copilot cloud agent enabled (Copilot Business), workflow approval for Copilot runs off, Pages source =
GitHub Actions, fine-grained PAT, GitHub connection in Power Automate. After F3 exists, Robbert adds
`PA_CALLBACK_URL` as repo secret manually.

## Solution
- **New, separate unmanaged solution: "Agentic SDLC"** (unique name `AgenticSDLC`)
- **Publisher: CGK** (as defined in `Skills/build-standards.md`, use its prefix for all components)
- **Everything custom**: custom tables, choices, app, pages, flows, prompt, environment variables, agent.
  No customizations of standard tables (lookups to User are allowed).
- Environment: demo environment from build-standards

---

## 1. Dataverse (all custom tables)

### SDLC Story (key entity → custom summary page + summary prompt field)
| Field | Type | Notes |
|---|---|---|
| Story number | Autonumber | `STY-{SEQNUM:4}` (e.g. STY-1042) |
| Title | Text | Primary name |
| **Type** | Choice (colored) | New feature, Issue, Improvement, Change request, Technical debt, Question |
| Description | Multiline | |
| Steps to reproduce | Multiline | Issues only (show via business rule) |
| Expected vs actual | Multiline | Issues only |
| Acceptance criteria | Multiline | Written by triage, editable |
| Reported by | Lookup User | |
| Channel | Choice | Teams, M365 Copilot, Portal, Manual |
| Affected component | Choice | UI, Calculation, Data, Integration, Authentication |
| Priority | Choice (colored) | Critical, High, Medium, Low |
| Complexity | Choice (colored) | Simple, Complex |
| Risk | Choice (colored) | Low, Medium, High |
| Triage confidence | Whole number | 0–100 |
| Triage rationale | Multiline | |
| Delivery path | Choice (colored) | Autonomous, Human |
| Possible duplicate of | Lookup SDLC Story | |
| GitHub issue number | Whole number | |
| GitHub issue URL | URL | |
| Pull request URL | URL | |
| Commit SHA | Text | |
| Test result | Choice (colored) | Not run, Running, Passed, Failed |
| Release | Lookup Release | |
| Resolved on | Date/time | |
| Lead time (min) | Whole number | Set by flow on release |
| Summary | Multiline | Summary prompt field |
| Status Reason (default, colored) | | Active: New, Triaging, Triaged, In development, Testing, Awaiting approval · Inactive: Released, Routed to human, Closed |

### Agent Activity (log; subgrid on Story, newest first)
| Field | Type |
|---|---|
| Name | Text (e.g. "Triage completed") |
| SDLC Story | Lookup |
| Agent | Choice (colored): Intake, Triage, Build, Test, Release, Human |
| Action | Text |
| Details | Multiline |
| Outcome | Choice (colored): Success, Warning, Failed, Info |
| Timestamp | Date/time |

### Release
| Field | Type |
|---|---|
| Name | Text ("Release 1.0.7") |
| Version | Text |
| Environment | Choice: Production |
| Released on | Date/time |
| Deployment URL | URL |
| Commit SHA | Text |
| Stories | 1:N from SDLC Story |

---

## 2. Model-driven app: "Agentic SDLC"
- Custom app in the Agentic SDLC solution, updated navigation: Yes
- **Start page: generative page "SDLC Dashboard"**, built per `Skills/page-style.md` and brand:
  - KPI tiles: open stories, % delivered autonomously, avg lead time, awaiting human, released this week
  - Pipeline/kanban strip by Status Reason (New → Released) with counts
  - Breakdown by Type and by Delivery path
  - Live Agent Activity feed (latest 15, agent + outcome colors)
  - Last 5 releases with deployment links
  - Click-through to the story record
- Navigation: Dashboard · SDLC Stories · Agent Activity · Releases
- Story views (grid control, colored choices): All open · Autonomous pipeline · Routed to human ·
  New features · Issues · Released this week · All stories
- Story form: header (Type, Status Reason, Priority, Delivery path, Test result); tabs Summary / Triage /
  Delivery (GitHub links, release) / Activity (Agent Activity subgrid)
- Command button "Approve release" (visible when Awaiting approval): opens Pull request URL

---

## 3. Triage (AI prompt + flow, presented as "Triage Agent")
**Prompt "SDLC Story Triage"** — input: type, title, description, steps, expected vs actual, open story titles.
Output JSON: `type, component, priority, complexity, risk, confidence, rationale, duplicateOfTitle, acceptanceCriteria`.
- Triage may correct Type if clearly wrong (e.g. reported as Issue but is a New feature)
- Simple = isolated change in one file/function, no auth/security/data model impact
- Risk High for authentication, payments, data deletion, permissions
- Acceptance criteria concrete and testable

**Decision rule (flow):**
Type in (Issue, Improvement, New feature) AND Simple AND Low risk AND confidence ≥ 80 → Autonomous; else Human.
Question → Human (or answered by Intake agent).

---

## 4. Power Automate flows (in solution, solution-aware connection references)
**F1 – Story triage** (trigger: SDLC Story created): status Triaging → run prompt → write fields → Triaged →
log → if Autonomous call F2, else Routed to human + log reason + call F4 (reporter hears it went to a human).

**F2 – Send to GitHub**: create GitHub issue `[STY-xxxx] <title>` with type, description, rationale,
acceptance criteria and "Include STY-xxxx in the PR title. Only change files under /app."
Assign to Copilot via HTTP (GitHub REST, assignee `copilot-swe-agent`, PAT from env var); on failure log Warning
(presenter assigns manually). Store issue number/URL; status In development; log Agent = Build.

**F3 – Pipeline callback** (HTTP trigger, "Anyone"). Payload:
```json
{ "storyRef": "STY-1042", "githubIssue": 12, "event": "pr_opened|tests_passed|tests_failed|deployed",
  "prUrl": "", "commitSha": "", "version": "", "deployUrl": "" }
```
- pr_opened → PR URL; Testing; Test result Running; log Build
- tests_passed → Passed; Awaiting approval; log Test
- tests_failed → Failed; In development; log Test (Warning)
- deployed → create/reuse Release; link story; Released; Resolved on; Lead time; log Release; call F4

**F4 – Notify reporter** (child flow, called by F3 and F1): Teams message to the reporter.
- released → "STY-xxxx is live in release x.y.z: <url>"
- routed → "STY-xxxx has been routed to the development team … Reason: <triage rationale>. You will get a message when it is live."

Environment variables (CGK prefix): GitHub owner, GitHub repo, GitHub PAT (Text, no default value).

---

## 5. Agent (Copilot Studio, created manually in the Agentic SDLC solution)
**Intake Agent** (Teams / M365 Copilot)
- Description: "Helps employees submit feature requests and report issues for the PowerStudios Customer Portal and logs them as SDLC Stories for automatic triage."
- Instructions: Determine whether it's a new feature, issue, improvement or question. For issues ask what happened,
  where and what was expected; for features ask what the user wants and why. Max 2 follow-up questions.
  Create an SDLC Story (Dataverse tool) with Type, Channel = Teams, Reported by = current user.
  Confirm the story number. Can answer "status of STY-xxxx" (status, delivery path, PR, release).

Claude Code: provide the description + instructions text in `docs/agent-intake.md`.

---

## 6. Demo target app (`/app`)
- Vite + vanilla JS or React: "PowerStudios Customer Portal" with home, quote calculator, login page
- Visible version + footer "Release x.y.z" from package.json; Cegeka-close styling
- Seeded stories:
  1. **Issue, simple** – quote button text "Requets quote" → autonomous
  2. **Issue, simple** – VAT 12% instead of 21% → autonomous
  3. **New feature, simple** – "Add a 'Download quote as PDF'-style print button" (window.print) → autonomous
  4. **Issue, complex** – session expires immediately after login → human
- Tests: Vitest (VAT calculation), Playwright smoke (pages load, button label)
- `.github/copilot-instructions.md`: only change /app; minimal changes; add/update a test; STY-xxxx in PR title; bump patch version
- `.github/workflows/copilot-setup-steps.yml`: checkout, Node, `npm ci`, `npx playwright install --with-deps chromium` (working-directory app)
- `ci.yml` (pull_request, paths app/**): tests → POST `pr_opened`, then `tests_passed`/`tests_failed` to `PA_CALLBACK_URL`;
  extract `STY-\d+` from PR title/body/branch, fallback linked issue number
- `deploy.yml` (push to main, paths app/**, + workflow_dispatch): build, deploy Pages, find merged PR for commit, POST `deployed`
- `app/scripts/reset-demo.sh` (+ .ps1): restores the seeded bugs/missing feature in a new commit

---

## 7. Demo data
- ~25 historical stories across all Types and statuses (mix Autonomous/Human)
- Agent Activity entries for each; 6 historical Releases (1.0.1–1.0.6)
- One fully completed autonomous story (STY-1038 "Wrong date format on invoice page") as live fallback

## 8. Demo storyline (`docs/demo-script.md`)
1. Report the VAT issue in Teams via Intake Agent
2. Story appears on the dashboard → Triaged, rationale, Delivery path Autonomous
3. GitHub: issue assigned to Copilot → PR (5–15 min; walk through STY-1038 meanwhile)
4. Tests pass → Awaiting approval → approve & merge (human-in-the-loop for prod)
5. Deploy → Released, Teams notification, refresh portal: VAT 21%
6. Request the print feature → same autonomous path for a new feature
7. Report the login issue → routed to human: agents know their limits