// Declarative data model of the Agentic SDLC demo (see docs/plan.md, Data model).
// Choices start at 766630000 per choice in plan order; custom status reasons at 766630100.
const cfg = require('./config');

const P = cfg.optionPrefix * 10000; // 766630000
const opts = (list) => list.map(([label, color], i) => ({ value: P + i, label, color }));

// Light tints from Skills/brand.md
const T = { seaBlue: '#B2DFEB', cegekaBlue: '#B2EEFD', purple: '#D0BCD0', darkBlue: '#B2D0D8', red: '#FAC9C9', grey: '#D7D7D7', sky: '#D9F7FE' };

const choices = {
  type: opts([['New feature', T.cegekaBlue], ['Issue', T.seaBlue], ['Improvement', T.purple], ['Change request', T.darkBlue], ['Technical debt', T.sky], ['Question', T.grey]]),
  channel: opts([['Teams', T.cegekaBlue], ['M365 Copilot', T.seaBlue], ['Portal', T.purple], ['Manual', T.darkBlue]]),
  component: opts([['UI', T.cegekaBlue], ['Calculation', T.seaBlue], ['Data', T.purple], ['Integration', T.darkBlue], ['Authentication', T.sky]]),
  priority: opts([['Low', T.sky], ['Medium', T.seaBlue], ['High', T.darkBlue], ['Critical', T.purple]]),
  complexity: opts([['Simple', T.sky], ['Complex', T.purple]]),
  risk: opts([['Low', T.sky], ['Medium', T.seaBlue], ['High', T.purple]]),
  deliverypath: opts([['Autonomous', T.cegekaBlue], ['Human', T.purple]]),
  testresult: opts([['Not run', T.grey], ['Running', T.cegekaBlue], ['Passed', T.darkBlue], ['Failed', T.red]]),
  agent: opts([['Intake', T.cegekaBlue], ['Triage', T.seaBlue], ['Build', T.purple], ['Test', T.darkBlue], ['Release', T.sky], ['Human', T.grey]]),
  outcome: opts([['Success', T.darkBlue], ['Warning', T.purple], ['Failed', T.red], ['Info', T.seaBlue]]),
  environment: opts([['Production', T.cegekaBlue]]),
};

// Value lookup by label: V.type['Issue'] -> 766630001
const V = Object.fromEntries(Object.entries(choices).map(([k, list]) => [k, Object.fromEntries(list.map((o) => [o.label, o.value]))]));

const S = P + 100; // 766630100
const STATUS = {
  New: 1, Triaging: S, Triaged: S + 1, 'In development': S + 2, Testing: S + 3, 'Awaiting approval': S + 4,
  Released: S + 5, 'Routed to human': S + 6, Closed: 2,
};
const stateOf = (code) => ([STATUS.Released, STATUS['Routed to human'], STATUS.Closed].includes(code) ? 1 : 0);

const col = (schema, label, type, extra = {}) => ({ schema, name: schema.toLowerCase(), label, type, ...extra });

const tables = [
  {
    short: 'story', schema: 'cgk_SDLCStory', name: 'cgk_sdlcstory', set: 'cgk_sdlcstories', label: 'SDLC Story', plural: 'SDLC Stories',
    description: 'A feature request, issue or other story that flows through the agentic SDLC.',
    primary: { schema: 'cgk_Title', name: 'cgk_title', label: 'Title', maxLength: 200 },
    notes: true,
    columns: [
      col('cgk_StoryNumber', 'Story number', 'text', { autonumber: 'STY-{SEQNUM:4}', maxLength: 20 }),
      col('cgk_Type', 'Type', 'choice', { choice: 'type' }),
      col('cgk_Description', 'Description', 'memo'),
      col('cgk_StepsToReproduce', 'Steps to reproduce', 'memo'),
      col('cgk_ExpectedVsActual', 'Expected vs actual', 'memo'),
      col('cgk_AcceptanceCriteria', 'Acceptance criteria', 'memo'),
      col('cgk_ReportedBy', 'Reported by', 'lookup', { targetName: 'systemuser', rel: 'cgk_sdlcstory_reportedby_systemuser' }),
      col('cgk_Channel', 'Channel', 'choice', { choice: 'channel' }),
      col('cgk_AffectedComponent', 'Affected component', 'choice', { choice: 'component' }),
      col('cgk_Priority', 'Priority', 'choice', { choice: 'priority' }),
      col('cgk_Complexity', 'Complexity', 'choice', { choice: 'complexity' }),
      col('cgk_Risk', 'Risk', 'choice', { choice: 'risk' }),
      col('cgk_TriageConfidence', 'Triage confidence', 'whole', { min: 0, max: 100 }),
      col('cgk_TriageRationale', 'Triage rationale', 'memo'),
      col('cgk_DeliveryPath', 'Delivery path', 'choice', { choice: 'deliverypath' }),
      col('cgk_PossibleDuplicateOf', 'Possible duplicate of', 'lookup', { targetName: 'cgk_sdlcstory', rel: 'cgk_sdlcstory_possibleduplicateof' }),
      col('cgk_GitHubIssueNumber', 'GitHub issue number', 'whole', { max: 1000000 }),
      col('cgk_GitHubIssueUrl', 'GitHub issue URL', 'url'),
      col('cgk_PullRequestUrl', 'Pull request URL', 'url'),
      col('cgk_CommitSha', 'Commit SHA', 'text', { maxLength: 64 }),
      col('cgk_TestResult', 'Test result', 'choice', { choice: 'testresult' }),
      col('cgk_Release', 'Release', 'lookup', { targetName: 'cgk_release', rel: 'cgk_sdlcstory_release' }),
      col('cgk_ResolvedOn', 'Resolved on', 'datetime'),
      col('cgk_LeadTimeMin', 'Lead time (min)', 'whole', { max: 1000000 }),
    ],
    statuses: [
      { value: STATUS.New, label: 'New', state: 0, color: T.seaBlue },
      { value: STATUS.Triaging, label: 'Triaging', state: 0, color: T.cegekaBlue },
      { value: STATUS.Triaged, label: 'Triaged', state: 0, color: T.cegekaBlue },
      { value: STATUS['In development'], label: 'In development', state: 0, color: T.cegekaBlue },
      { value: STATUS.Testing, label: 'Testing', state: 0, color: T.cegekaBlue },
      { value: STATUS['Awaiting approval'], label: 'Awaiting approval', state: 0, color: T.purple },
      { value: STATUS.Released, label: 'Released', state: 1, color: T.darkBlue },
      { value: STATUS['Routed to human'], label: 'Routed to human', state: 1, color: T.purple },
      { value: STATUS.Closed, label: 'Closed', state: 1, color: T.grey },
    ],
  },
  {
    short: 'activity', schema: 'cgk_AgentActivity', name: 'cgk_agentactivity', set: 'cgk_agentactivities', label: 'Agent Activity', plural: 'Agent Activities',
    description: 'Log entry of an agent or human step on an SDLC story.',
    primary: { schema: 'cgk_Name', name: 'cgk_name', label: 'Name', maxLength: 200 },
    columns: [
      col('cgk_SDLCStory', 'SDLC Story', 'lookup', { targetName: 'cgk_sdlcstory', rel: 'cgk_agentactivity_sdlcstory', cascade: 'parental' }),
      col('cgk_Agent', 'Agent', 'choice', { choice: 'agent' }),
      col('cgk_Action', 'Action', 'text', { maxLength: 200 }),
      col('cgk_Details', 'Details', 'memo'),
      col('cgk_Outcome', 'Outcome', 'choice', { choice: 'outcome' }),
      col('cgk_Timestamp', 'Timestamp', 'datetime'),
    ],
    statuses: [{ value: 1, label: 'Active', state: 0, color: T.cegekaBlue }, { value: 2, label: 'Inactive', state: 1, color: T.grey }],
  },
  {
    short: 'release', schema: 'cgk_Release', name: 'cgk_release', set: 'cgk_releases', label: 'Release', plural: 'Releases',
    description: 'A production release of the PowerStudios Customer Portal.',
    primary: { schema: 'cgk_Name', name: 'cgk_name', label: 'Name', maxLength: 100 },
    columns: [
      col('cgk_Version', 'Version', 'text', { maxLength: 20 }),
      col('cgk_Environment', 'Environment', 'choice', { choice: 'environment' }),
      col('cgk_ReleasedOn', 'Released on', 'datetime'),
      col('cgk_DeploymentUrl', 'Deployment URL', 'url'),
      col('cgk_CommitSha', 'Commit SHA', 'text', { maxLength: 64 }),
    ],
    statuses: [{ value: 1, label: 'Active', state: 0, color: T.cegekaBlue }, { value: 2, label: 'Inactive', state: 1, color: T.grey }],
  },
];

const table = (short) => tables.find((t) => t.short === short || t.name === short);
const relName = (t, c) => c.rel;

const envVars = [
  { schema: 'cgk_GitHubOwner', label: 'GitHub owner', description: 'Owner (user or org) of the GitHub repository.', value: 'robbertcegekacrm-dot' },
  { schema: 'cgk_GitHubRepo', label: 'GitHub repo', description: 'Name of the GitHub repository.', value: 'Agentic-SDLC' },
  { schema: 'cgk_GitHubPAT', label: 'GitHub PAT', description: 'Fine-grained GitHub PAT. Set only as current value in the environment, never as default value.' },
  { schema: 'cgk_PortalUrl', label: 'Portal URL', description: 'URL of the PowerStudios Customer Portal on GitHub Pages.', value: 'https://robbertcegekacrm-dot.github.io/Agentic-SDLC/' },
];

const stateColors = { 0: T.cegekaBlue, 1: T.grey };

module.exports = { choices, V, STATUS, stateOf, tables, table, relName, envVars, stateColors, lcid: cfg.lcid, T };
