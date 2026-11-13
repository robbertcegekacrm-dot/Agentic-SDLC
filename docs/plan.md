# Agentic SDLC

Status: built

## Briefing
See [docs/briefing.md](briefing.md) (verbatim source, not duplicated here to keep one source of truth).
Goal in one line: request/report → triage → autonomous build/fix → test → release, fully traceable in a
model-driven app; simple low-risk stories are delivered by agents, complex or risky ones go to a human.
No Azure resources: hosting = GitHub Pages, integration = Power Automate HTTP trigger.

## Audience and story
- Audience: business and IT decision makers, product owners and dev leads at Cegeka customers.
- Takeaway: agents can safely take over the simple, low-risk part of the backlog end to end, while every
  step stays visible and a human stays in control of production and of anything risky.
- One sentence: *"An employee reports a bug in Teams, and forty minutes later the fix is live, tested and
  traceable, without a developer touching it; the risky login bug goes straight to a human."*

## Demo setup
- Environment: https://cegekapowerstudios.crm.dynamics.com/
- Solution: `AgenticSDLC` (display name Agentic SDLC), created upfront by Robbert
- Publisher: existing Cegeka publisher, prefix `cgk`, option value prefix `76663` (read from the solution in phase 0)
- Demo company: **PowerStudios** (fictional solar panel installer, Hasselt) with its **PowerStudios Customer Portal**
  (home, quote calculator, login) hosted on GitHub Pages: https://robbertcegekacrm-dot.github.io/Agentic-SDLC/
- Language: English for UI, data and agent (LCID 1033)
- Main personas:
  - **Sanne Peeters**, Product Owner Customer Portal (dashboard user): pragmatic, data driven, wants speed
    without losing control. Approves releases.
  - **Lotte Janssens**, Customer Service Lead (reporter in Teams): direct, non technical, reports what customers hit.
  - **Tom Willems**, Senior Developer: picks up stories routed to a human.
- Key numbers (seeded, used by dashboard, agent and demo script):
  25 historical stories STY-1017…STY-1041, 6 releases 1.0.1…1.0.6, 15 released (9 autonomous = 60%),
  3 open, 5 routed to human, 6 awaiting a human (5 routed + 1 awaiting approval), 2 released this week (in 1.0.6),
  2 closed questions, average autonomous lead time 45 min vs 59 h on the human path. Next live story number: STY-1042.

## Component decisions
| Use case | Audience | Component type | Rationale | Confirm |
|---|---|---|---|---|
| Follow stories, triage outcome, delivery, releases | Product owner, dev lead | Model driven app "Agentic SDLC" | Back office use case | |
| Start page "SDLC Dashboard" | Product owner | Generative page (uploaded with `pac model genpage upload`) | Briefing; fully codeable with pac 2.14 | |
| Report an issue / request a feature, ask status | Employee | Copilot Studio agent "Intake Agent" (Teams / M365 Copilot) | Conversational, topic based | |
| Triage | System | AI prompt "SDLC Story Triage" + flow F1 ("Triage Agent") | Briefing | |
| Build, test, release | GitHub Copilot coding agent + GitHub Actions | GitHub (not Power Platform) | Briefing | |
| Integration | System | Power Automate cloud flows F1–F6 with connection references | Automation | |
| Demo target app | Customer | Vite + vanilla JS on GitHub Pages (`/app`) | Briefing; must be changeable by Copilot | |

No CONFIRM items: every component type is fixed by the briefing.

## Data model
Option values: choices start at `766630000` per choice in plan order; custom status reasons at `766630100`.
All options get the light tint from `Skills/brand.md`.

### cgk_sdlcstory – SDLC Story (key table)
Primary column `cgk_title` (Title). Ownership user.

| Column | Schema | Type | Values / notes |
|---|---|---|---|
| Story number | cgk_storynumber | Text, autonumber `STY-{SEQNUM:4}` | Seed set to 1042 after demo data |
| Type | cgk_type | Choice | New feature `#B2EEFD`, Issue `#B2DFEB`, Improvement `#D0BCD0`, Change request `#B2D0D8`, Technical debt `#D9F7FE`, Question `#D7D7D7` |
| Description | cgk_description | Multiline 4000 | |
| Steps to reproduce | cgk_stepstoreproduce | Multiline | Issues only (form script) |
| Expected vs actual | cgk_expectedvsactual | Multiline | Issues only (form script) |
| Acceptance criteria | cgk_acceptancecriteria | Multiline | Written by triage |
| Reported by | cgk_reportedby | Lookup User | |
| Channel | cgk_channel | Choice | Teams `#B2EEFD`, M365 Copilot `#B2DFEB`, Portal `#D0BCD0`, Manual `#B2D0D8` |
| Affected component | cgk_affectedcomponent | Choice | UI `#B2EEFD`, Calculation `#B2DFEB`, Data `#D0BCD0`, Integration `#B2D0D8`, Authentication `#D9F7FE` |
| Priority | cgk_priority | Choice (ordinal, ascending) | Low `#D9F7FE`, Medium `#B2DFEB`, High `#B2D0D8`, Critical `#D0BCD0` |
| Complexity | cgk_complexity | Choice | Simple `#D9F7FE`, Complex `#D0BCD0` |
| Risk | cgk_risk | Choice (ordinal, ascending) | Low `#D9F7FE`, Medium `#B2DFEB`, High `#D0BCD0` |
| Triage confidence | cgk_triageconfidence | Whole 0–100 | |
| Triage rationale | cgk_triagerationale | Multiline | |
| Delivery path | cgk_deliverypath | Choice | Autonomous `#B2EEFD`, Human `#D0BCD0` |
| Possible duplicate of | cgk_possibleduplicateof | Lookup SDLC Story | self reference |
| GitHub issue number | cgk_githubissuenumber | Whole | |
| GitHub issue URL | cgk_githubissueurl | URL | |
| Pull request URL | cgk_pullrequesturl | URL | |
| Commit SHA | cgk_commitsha | Text 64 | |
| Test result | cgk_testresult | Choice | Not run `#D7D7D7`, Running `#B2EEFD`, Passed `#B2D0D8`, Failed `#FAC9C9` |
| Release | cgk_release | Lookup Release | |
| Resolved on | cgk_resolvedon | Date and time | |
| Lead time (min) | cgk_leadtimemin | Whole | Set by F3 on release |
| Summary | cgk_summary | **Prompt column** | Manual step (not codeable) |

Status Reason:
| Value | Label | State | Color |
|---|---|---|---|
| 1 | New | Active | `#B2DFEB` |
| 766630100 | Triaging | Active | `#B2EEFD` |
| 766630101 | Triaged | Active | `#B2EEFD` |
| 766630102 | In development | Active | `#B2EEFD` |
| 766630103 | Testing | Active | `#B2EEFD` |
| 766630104 | Awaiting approval | Active | `#D0BCD0` |
| 766630105 | Released | Inactive | `#B2D0D8` |
| 766630106 | Routed to human | Inactive | `#D0BCD0` |
| 2 | Closed | Inactive | `#D7D7D7` |
State: Active `#B2EEFD`, Inactive `#D7D7D7`.

### cgk_agentactivity – Agent Activity
Primary `cgk_name`. Columns: SDLC Story `cgk_sdlcstory` (lookup, parental), Agent `cgk_agent`
(Intake `#B2EEFD`, Triage `#B2DFEB`, Build `#D0BCD0`, Test `#B2D0D8`, Release `#D9F7FE`, Human `#D7D7D7`),
Action `cgk_action` (text 200), Details `cgk_details` (multiline), Outcome `cgk_outcome`
(Success `#B2D0D8`, Warning `#D0BCD0`, Failed `#FAC9C9`, Info `#B2DFEB`), Timestamp `cgk_timestamp` (date and time).
Status: default Active (1) / Inactive (2), colored.

### cgk_release – Release
Primary `cgk_name` ("Release 1.0.7"). Columns: Version `cgk_version` (text), Environment `cgk_environment`
(Production `#B2EEFD`), Released on `cgk_releasedon` (date and time), Deployment URL `cgk_deploymenturl` (URL),
Commit SHA `cgk_commitsha` (text). Stories: 1:N via `cgk_sdlcstory.cgk_release`. Status default, colored.

### Relationships
- `cgk_sdlcstory_reportedby_systemuser` (User 1:N Story)
- `cgk_sdlcstory_possibleduplicateof` (Story 1:N Story)
- `cgk_sdlcstory_release` (Release 1:N Story)
- `cgk_agentactivity_sdlcstory` (Story 1:N Activity, parental)

### Environment variables
| Schema | Display | Default |
|---|---|---|
| cgk_GitHubOwner | GitHub owner | `robbertcegekacrm-dot` |
| cgk_GitHubRepo | GitHub repo | `Agentic-SDLC` |
| cgk_GitHubPAT | GitHub PAT | **none** – current value set manually, never a default |
| cgk_PortalUrl | Portal URL | `https://robbertcegekacrm-dot.github.io/Agentic-SDLC/` |

## Model driven apps
**Agentic SDLC** (`cgk_AgenticSDLC`), audience product owner and dev lead.
- Sitemap area "Agentic SDLC", group "Delivery": Dashboard (generative page, first item) · SDLC Stories ·
  Agent Activity · Releases.
- Start page: SDLC Dashboard (see Start pages).
- App setting `HeaderAndNavigationRefresh` = `2` (copied from HR Hub: app setting row linked with
  `parentappmoduleid`, setting added to the solution). No custom theme.
- Command "Approve release" on the story form: opens the Pull request URL.

## Code or canvas apps
None in Power Platform. The demo target app lives in `/app` (see briefing §6): Vite + vanilla JS
"PowerStudios Customer Portal" with Home, Quote calculator and Login pages, footer "Release x.y.z" from
`package.json` (starts at 1.0.6), Vitest + Playwright tests, and four seeded defects:
1. Quote button reads "Requets quote" (simple issue → autonomous)
2. VAT 12% instead of 21% (simple issue → autonomous)
3. No print button for the quote (simple new feature → autonomous)
4. Session expires immediately after login (complex, authentication → human)

## Start pages
**SDLC Dashboard** (generative page, Fluent UI v9, `Skills/page-style.md`):
- Header: "SDLC Dashboard", subtitle "PowerStudios Customer Portal · updated hh:mm", subtle refresh button.
- KPI tiles (each a link to a view): Open stories (All open) · Delivered autonomously % (all released stories) ·
  Avg lead time autonomous (context: human path) · Awaiting a human (Routed to human + Awaiting approval, "Attention"
  badge) · Released this week · In progress.
- Pipeline strip: count per Status Reason New → Triaging → Triaged → In development → Testing → Awaiting approval →
  Released, with Routed to human shown separately.
- Breakdown by Type (bar chart, one series) and by Delivery path (two bars).
- Live Agent Activity feed: latest 15, agent and outcome as tint badges, story number, relative time; auto refresh 30 s.
- Last 5 releases with version, date, story count and deployment link.
- Clicking a story opens the record.

## Summary pages
**SDLC Story** (key table). Summary prompt column `cgk_summary` (manual step):
> Summarize this SDLC story in 2 to 4 sentences in English for a product owner. Mention the type, what the
> problem or request is, the triage outcome (priority, complexity, risk, confidence and delivery path) and where
> it stands now (status, test result, release). Use only the information below, no assumptions.
Inputs: Title, Story number, Type, Description, Triage rationale, Priority, Complexity, Risk, Triage confidence,
Delivery path, Status Reason, Test result, Release.
Summary tab: Summary (when the column exists) · key fields left (number, title, type, reported by, channel,
component, description) · triage outcome right (priority, complexity, risk, confidence, delivery path) · latest
Agent Activity subgrid.

## Forms and views
**SDLC Story form**: header Type, Status Reason, Priority, Delivery path, Test result (OptionSet Wrapper).
Tabs: Summary · Triage (report, steps, expected vs actual, acceptance criteria, rationale, confidence, duplicate) ·
Delivery (GitHub issue, PR, commit, test result, release, resolved on, lead time) · Activity (Agent Activity subgrid,
newest first). Form library `cgk_/agenticsdlc/story.form.js`: shows Steps / Expected vs actual only for Issues,
and `approveRelease` for the command.
**Agent Activity form**: General (name, story, agent, outcome, timestamp, action, details).
**Release form**: General (name, version, environment, released on, URL, commit) + Stories subgrid.

Views (Power Apps grid, colored option sets):
| Table | View | Filter |
|---|---|---|
| Story | All open (default) | state Active |
| Story | Autonomous pipeline | Delivery path Autonomous, all states |
| Story | Routed to human | Status Reason Routed to human |
| Story | New features | Type New feature |
| Story | Issues | Type Issue |
| Story | Released this week | Status Released, Resolved on this week |
| Story | All stories | all |
| Activity | Agent Activity (default) | active, newest first |
| Release | Releases (default) | active, newest first |

## Power Automate flows
Connection references: `cgk_sdlc_dataverse` (Dataverse), `cgk_sdlc_teams` (Teams). GitHub via HTTP + PAT (no connection).
Definitions are generated by `06-flows.js` and kept in `powerplatform/flows/F1…F6.json`.
| Flow | Trigger | Steps | Tables |
|---|---|---|---|
| F1 – Story triage | Dataverse: SDLC Story created | status Triaging → list open story titles → run prompt "SDLC Story Triage" → write fields → Triaged → log Triage → decision rule → Autonomous: call F2; else Routed to human + log Human + call F4 (routed) | Story, Activity |
| F2 – Send to GitHub | Child flow (storyId) | HTTP: create GitHub issue `[STY-xxxx] title` → HTTP assign `copilot-swe-agent[bot]` with PAT env var (on failure log Warning) → store issue number/URL → In development → log Build | Story, Activity |
| F3 – Pipeline callback | HTTP request, anyone | switch on event: pr_opened / tests_passed / tests_failed / deployed (create or reuse Release, link, Released, resolved on, lead time, call F4 (released)) | Story, Activity, Release |
| F4 – Notify reporter | Child flow (storyId, event released/routed, version, url) | Teams chat from Flow bot to reporter: released → "STY-xxxx is live in release x.y.z: url"; routed → "routed to the development team, reason: triage rationale"; skipped when no reporter | Story, User |
| F5 – Intake: create story | Agent flow (Copilot Studio) | create story (type, title, description, steps, expected, channel Teams, reported by caller) → return story number | Story, Activity |
| F6 – Intake: story status | Agent flow | find story by number → return status, delivery path, PR, release | Story |

Decision rule (F1): Type in (Issue, Improvement, New feature) AND Complexity Simple AND Risk Low AND confidence ≥ 80
→ Autonomous, else Human. Question → Human.

## Agents
**Intake Agent** (`cgk_IntakeAgent`), Teams and M365 Copilot, topic based, generative orchestration off, no general
knowledge. Description and instructions: see [agent-intake.md](agent-intake.md). Topics (YAML in
`agents/intake-agent/topics/`): Conversation Start, Report an issue, Request a feature, Story status, Ask a question,
Fallback. Story creation and status lookups use agent flows F5 and F6. Status answers for seeded stories match the
demo data (e.g. STY-1038: Released in 1.0.6, autonomous, 42 min).

## Demo data
- 6 releases 1.0.1–1.0.6 (1.0.6 always within the current week, relative to the seed run date).
- 25 stories STY-1017…STY-1041, all types and statuses (see `powerplatform/demo-data/stories.json`).
- 2–7 Agent Activity rows per story (141), STY-1038 "Wrong date format on invoice page" with the full trail
  Intake → Triage → Build (issue #31, PR #32) → Test → Human approval → Release 1.0.6 (42 min).
- Autonumber seed set to 1042 afterwards. `--reset` deletes and recreates the demo rows.

## Screenshots
Not taken by the build (build-standards: never take screenshots). For the deck: SDLC Dashboard; Story STY-1038
summary and activity tab; Autonomous pipeline view; GitHub issue assigned to Copilot; portal before/after VAT fix.

## Run phases
0 Verify environment, publisher and solution (`00-verify.js`)
1 Tables, columns, choices with colors, status reasons, env vars, state colors (`01-schema.js`, `01b-state-colors.js`)
2 Forms, views, grid control, form script (`02-forms-views.js`); summary prompt column → manual
3 Model driven app, sitemap, nav setting, command, generative page (`03-app.js`, `03b-dashboard.sh`)
4 Demo target app `/app` and GitHub workflows (no Power Platform app)
5 Demo data (`05-seed.js [--reset]`) and KPI check
6 Connection references, AI prompt, flows F1–F6 (`06-flows.js`)
7 Intake Agent (`07-agent.sh`)
8 Export, unpack to `powerplatform/solution`, docs (manual steps, demo script), commit

## Assumptions
- English is the demo language (briefing and portal are English).
- Status Reason values 1 and 2 are relabeled to New and Closed instead of new 0100 values, so a new record
  defaults to New without a solution XML change; the other reasons start at 766630100.
- "Routed to human" stays an Inactive reason as in the briefing; the dashboard still counts it under "Awaiting a human".
- Priority and Risk use ascending values (Low first) so flows can compare them.
- "Issues only" fields are shown and hidden with a small form script instead of a business rule (business rules are
  not codeable through the Web API).
- "Approve release" is a modern command (appaction) on the story form that runs JavaScript; it checks the status and
  opens the PR URL (Power Fx visibility needs a component library, so the check happens on click).
- Copilot assignment uses `copilot-swe-agent[bot]`, the assignee login GitHub documents for the REST API.
- Historical GitHub issue and PR links in seeded data are illustrative and do not exist in the repo.
- Reported by on seeded stories is the demo user (the only real user); personas are named in the text.
- The generative page is built and uploaded with `pac model genpage upload` (codeable in pac 2.14), so the HTML web
  resource fallback is not needed.
- GitHub issue creation and Copilot assignment both use the GitHub REST API over HTTP with the PAT environment variable
  (HTTP actions marked secure) instead of the GitHub connector: deterministic, one connection less. The existing
  GitHub connection is not used.
- F1 only triggers on stories without a triage confidence (`cgk_triageconfidence eq null`), so seeded and re-seeded
  stories are never re-triaged.
- Intake Agent story creation and status use agent flows F5 and F6 (topic based agent, no generative Dataverse tool).
  Reported by = the Teams user found by UPN (`System.User.PrincipalName`).
- The Intake Agent is created from code (briefing said manual): template extracted from an existing simple agent,
  `pac copilot create` in the solution, clone, overlay of `agents/intake-agent`, `pac copilot push`; classic
  orchestration set on the bot configuration. Publishing stays manual (needs F5/F6 on).
- The AI prompt is created by code (`06a-prompt.js`): model on the GPT prompt template, trained configuration, run
  configuration, `PublishAIConfiguration`; prompt text read from `powerplatform/prompts/sdlc-story-triage.md`.
- Flows are created off. Updates of an existing flow are validated against connections and environment variable
  values (missing until the manual steps), so `06-flows.js` deletes and recreates a flow (same id) in that case.
- `systemuser` is in the solution only as a shell (no subcomponents) because of the Reported by lookup; no
  customization of the standard table.
- The solution `AgenticSDLC` was created during the run on request (empty unmanaged solution, Cegeka publisher).
- Option texts in generative page pills use the next darker brand color where the base color fails WCAG AA on its tint.
- Teams notification (F4) is a Flow bot chat to the reporter.
- Seed dates are relative to the run date; `05-seed.js --reset` before every demo.
- Copilot is told (copilot-instructions.md) not to touch `/scripts`, `/agents`, `/powerplatform`, `/docs`, `/Skills`,
  `/.github` and `/app/scripts` (the pristine seed copies used by the reset script).

## Open issues
1. Agent publish returned 409 Conflict (most likely because agent flows F5/F6 are still off) → manual step 6.
2. Not testable before the manual steps: flow runs (connections, PAT), Copilot assignment over the REST API, the
   F3 callback from GitHub Actions and the Teams notification → smoke test in manual step 8.
3. Web API login uses device code (build-standards); reusing pac's token cache was refused as credential access.

## Run log
| Phase | Result |
|---|---|
| 0 Verify | solution created on request; publisher Cegeka `cgk` / 76663 verified |
| 1 Schema | 3 tables, 22+6+6 columns, 4 lookups, 9 story status reasons, 4 env vars (PAT without default); colors on all options, state and status read back |
| 2 Forms, views | 3 default + 8 demo views (grid control, colored options), 3 forms with OptionSet Wrapper, related subgrids, form script; summary column pending (manual) |
| 3 App | app `cgk_AgenticSDLC`, ValidateApp OK (sitemap warning only), HeaderAndNavigationRefresh = 2 read back, Approve release command, SDLC Dashboard generative page uploaded, in solution, first in sitemap |
| 4 `/app` + workflows | `npm run build` OK, Vitest 6/6, Playwright 3/3 with seeded defects |
| 5 Demo data | 6 releases, 25 stories, 141 activities; KPI check: open 3, released 15, autonomous 60%, lead 45 min vs 59 h, awaiting human 6, routed 5, released this week 2; autonumber seed 1042 |
| 6 Prompt + flows | prompt SDLC Story Triage published by code and in solution; connection references + F1–F6 created (off) |
| 7 Agent | Intake Agent created in solution, 15 topics + instructions pushed, classic orchestration; publish 409 → manual |
| 8 Export | solution exported and unpacked to `powerplatform/solution`; no PAT value or token found |
