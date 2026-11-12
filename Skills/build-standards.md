# Build standards

These rules apply to every demo built from this repository. They win over anything a plan leaves unspecified.

## Environment, auth and working style
- Default environment: https://cegekapowerstudios.crm.dynamics.com/ unless the plan says otherwise.
- Everything runs inside the devcontainer or Codespace. No installs that need local admin rights.
- PAC auth: `pac auth create --deviceCode --environment <url>`.
- Web API scripts: Node with `@azure/msal-node` device code flow, public client id `51f81489-12ee-4a9e-aaae-a2591f45987d`, scope `<envUrl>/.default`. Cache tokens in `.token-cache.json` and keep it in `.gitignore`.
- Publisher: the existing **Cegeka** publisher (prefix `cgk`, option value prefix 76663). Robbert creates the solution with this publisher upfront; read the prefix from the solution's publisher. Never create a publisher and never ask which one to use.
- Every metadata call sends `MSCRM.SolutionUniqueName: <SolutionName>` so components land in the solution.
- All scripts are idempotent and live in `scripts/<demo-name>/`. Prefer Dataverse Web API scripts over hand written solution XML; fall back to editing the unpacked solution XML and re-importing only when the Web API does not expose a setting.
- No permission questions and no confirmation questions while building. Decide, log the decision, continue.

## Component type rules
- **Admin and back office use cases** (HR department, case handling, approvals, configuration): model driven app.
- **End user use cases** (an employee booking leave, a customer checking an order, a field worker logging something): a Power Apps code app (React and Vite, deployed with the `pac code` commands) by default, or a canvas app when the experience is simple forms on mobile. Example: the HR department works in the model driven app, employees book leave in the custom app.
- **Canvas apps** are built with the Canvas Authoring MCP server in two runs. Before run 1 Robbert creates the blank app in the solution with coauthoring on. Run 1 writes the screens as `.pa.yaml` and ends with the list of tables to add as data sources. Robbert adds them in Studio, then run 2 compiles and fixes the app.
- **Conversational use cases**: Copilot Studio agent. Topic based and fully scripted unless the plan says otherwise.
- **Automation**: Power Automate cloud flows in the solution, using connection references.
- When a use case could reasonably be two of these, mark it `CONFIRM` in the plan (see the skill). Other candidate types the user may pick: GitHub based agent, Power Pages site, custom page.

## Data model
- For a generic status, always use the standard **Status Reason** (`statuscode`) column with custom values. Do not create a custom "Status" choice column. Map each reason to the correct State (Active or Inactive).
- Every choice column gets a **color on every option**, including the standard State (`statecode`) and Status Reason (`statuscode`) columns. Always use the **light tint** from `references/brand.md`, never the full brand color.
- Picklist and global choice colors: set the `Color` property on create via the Web API.
- State and Status Reason: insert all status reasons for all tables in one script run. Their colors cannot be set through the Web API, so set them in **one import at the end of phase 1, for all tables together**, using a minimal solution: add each table with "do not include subcomponents" and only its `statecode` and `statuscode` attributes, export, set `Color`, import. Never export or import full tables, forms, views or apps just for colors.
- Option values are explicit and predictable: choices start at `<option prefix>0000` in the order of the plan, status reasons at `<option prefix>0100`. Ordinal choices (risk, priority) get ascending values so flows can compare them.
- Global choices get a unique display name that no other choice or column in the solution uses (e.g. "CIS Risico", not "Risico"), so canvas apps and flows can refer to them by name without workarounds.
- Local choices unless a choice is shared across tables.

## Efficiency
- Reuse and extend the shared helpers in `scripts/lib/` (auth, metadata, choices and colors, batch, publish, seed reset) instead of writing new ones per demo. Add a helper there when a new demo needs a generic function.
- Create a table with its columns in one call where the Web API allows it. Publish once at the end of each phase, not after every change.
- Seed data with `$batch` requests (up to 1000 operations per batch), not record by record.
- Do not read `solutions/`, other demos or git history unless a step needs a specific pattern from them.
- After phase 2, build independent parts (generative pages, code or canvas app source, seed scripts) in parallel subagents.
- Run each verification once (the KPI check after seeding). No extra reruns to prove something works.
- Do not try things that are known not to be codeable. Log them straight away as a manual step: prompt columns, adding data sources to a canvas app, the canvas "Can be used offline" setting, and anything behind an interactive Microsoft login.
- Never take screenshots and never use browser automation.

## Model driven apps
- App setting **Header and navigation refresh** (`HeaderAndNavigationRefresh`) is always set to Yes. Copy the exact value and the way it is stored (app setting linked to the app via `parentappmoduleid`, setting added to the solution) from the HR demo app, which shows the refreshed navigation correctly. Publish the app afterwards, then read the setting back and log it.
- Use the standard modern look. **No custom theme**: do not set `CustomThemeDefinition`, a navbar color or a theme web resource. Brand colors show up in the start pages, option colors and pages, not in the app shell.
- **Start page**: every app opens on a custom overview page with the most relevant insights and information for that audience (KPI tiles, short lists, what needs attention). Preferred: a custom page. Practical fallback that is fully codeable: an HTML web resource styled per the brand, reading data with `Xrm.WebApi`, set as the first item in the sitemap. Every page inside the app follows `references/page-style.md`.
- Generative pages that write data: pass date and date-time columns to the data API as JavaScript `Date` objects (date-only as local midnight), never as strings. Lookups as `_<column>_value` with `/<entityset>(id)`. Before upload, test every create and update path once against the environment with a small script and delete the test records.

## Views
- All views use the **Power Apps grid control** at table level, with **colored option sets enabled**.
- Every table gets the default active view with explicit columns and widths, plus the demo views named in the plan.

## Forms and summaries
- One main form per table with logical tabs and sections and related subgrids where obvious.
- Every choice field on a form, including Status Reason and fields in the header, uses the **OptionSet Wrapper** control for web, phone and tablet, so the option colors show on the form. Set it in the form XML as a custom control on the field; take the exact control name from a form where it is already set, or set it on one field in the form designer and read it back.
- Subgrids always show **related records only** (filtered on the relationship), never all records of the table.
- For key and important tables (marked as key in the plan):
  - Add a **summary column**: a prompt column (AI prompt) that summarizes the key information of the record in two to four sentences in the language of the demo.
  - Add a **summary page**: the first tab of the main form is "Samenvatting" (or "Summary"), showing the summary column on top, followed by the key fields and the most important related records. Use a custom page instead if that gives a clearly better result.
  - Prompt columns cannot be created via the Web API. Do not try: log them as a manual step with the exact prompt text and the input columns.

## Agents
- Even fully scripted, topic based agents always get a **description** and **instructions** filled in, matching their persona and scope.
- Turn off generative orchestration and general knowledge for scripted agents unless the plan says otherwise. No knowledge sources, tools or actions unless the plan asks for them.
- Topics use trigger phrases, message nodes, fixed choice questions and adaptive cards for visual impact. Cards use brand colors.
- Write topics as YAML in `agents/<agent-name>/topics/`. Push them through the Copilot Studio VS Code extension or the Web API; if that fails, log paste steps as a manual step.
- Agent answers use exactly the same facts and numbers as the seeded demo data.

## Demo data
- Realistic, internally consistent data in the language of the demo, built around one main persona per audience.
- Seed scripts support `--reset`.

## Styling
- Stay close to the Cegeka brand guide for all colors, accents and fonts. See `references/brand.md`.