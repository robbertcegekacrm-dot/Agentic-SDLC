// Phase 2: views (Power Apps grid with colored option sets), main forms with
// OptionSet Wrapper on every choice, related-only subgrids, story form script.
// Re-run after the manual "Summary" prompt column exists: it is then placed on
// top of the Summary tab automatically.
const path = require('path');
const fs = require('fs');
const dv = require('./dv');
const model = require('./model');
const { createFormsViews } = require('../lib/forms-views');
const { ensureWebResource } = require('../lib/webresources');

const fv = createFormsViews(dv, model);
const { cond, inList } = fv;
const { V, STATUS } = model;
const FORM_JS = 'cgk_/agenticsdlc/story.form.js';

const storyCols = [['storynumber', 110], ['title', 280], ['type', 130], ['statuscode', 140], ['priority', 100], ['deliverypath', 120], ['testresult', 110], ['createdon', 140]];

const defaultViews = {
  story: { name: 'All open', cols: storyCols, sort: ['createdon', true] },
  activity: { name: 'Agent Activity', cols: [['timestamp', 150], ['name', 240], ['sdlcstory', 220], ['agent', 100], ['outcome', 100], ['action', 260]], sort: ['timestamp', true] },
  release: { name: 'Releases', cols: [['name', 180], ['version', 90], ['environment', 120], ['releasedon', 150], ['deploymenturl', 300], ['commitsha', 120]], sort: ['releasedon', true] },
};

const releasedCols = [['storynumber', 110], ['title', 280], ['type', 130], ['deliverypath', 120], ['release', 140], ['resolvedon', 140], ['leadtimemin', 110]];
const demoViews = [
  { t: 'story', name: 'Autonomous pipeline', state: 'all', filter: cond('deliverypath', 'eq', V.deliverypath.Autonomous), sort: ['modifiedon', true] },
  { t: 'story', name: 'Routed to human', state: 'all', filter: cond('statuscode', 'eq', STATUS['Routed to human']), cols: [['storynumber', 110], ['title', 280], ['type', 130], ['priority', 100], ['complexity', 100], ['risk', 90], ['triageconfidence', 90], ['createdon', 140]] },
  { t: 'story', name: 'New features', state: 'all', filter: cond('type', 'eq', V.type['New feature']) },
  { t: 'story', name: 'Issues', state: 'all', filter: cond('type', 'eq', V.type.Issue) },
  { t: 'story', name: 'Released this week', state: 'all', filter: cond('statuscode', 'eq', STATUS.Released) + cond('resolvedon', 'this-week'), cols: releasedCols, sort: ['resolvedon', true] },
  { t: 'story', name: 'All stories', state: 'all' },
  { t: 'story', name: 'Awaiting a human', state: 'all', filter: inList('statuscode', [STATUS['Awaiting approval'], STATUS['Routed to human']]) },
  { t: 'story', name: 'Released', state: 'all', filter: cond('statuscode', 'eq', STATUS.Released), cols: releasedCols, sort: ['resolvedon', true] },
];

(async () => {
  const otcs = {};
  for (const t of model.tables) otcs[t.short] = (await dv.get(`EntityDefinitions(LogicalName='${t.name}')?$select=ObjectTypeCode`)).ObjectTypeCode;
  const views = await fv.ensureViews(defaultViews, demoViews, otcs);

  // Summary prompt column (manual step) goes on top of the Summary tab once it exists.
  const story = model.table('story');
  const summary = await dv.tryGet("EntityDefinitions(LogicalName='cgk_sdlcstory')/Attributes(LogicalName='cgk_summary')?$select=LogicalName");
  if (summary && !story.columns.some((c) => c.name === 'cgk_summary')) story.columns.push({ schema: 'cgk_Summary', name: 'cgk_summary', label: 'Summary', type: 'memo' });
  console.log(summary ? 'Summary column found: added to the Summary tab' : 'Summary column not found yet (manual step): Summary tab without it');

  await ensureWebResource(dv, { name: FORM_JS, displayName: 'SDLC Story form script', file: path.resolve(__dirname, '../../powerplatform/webresources/story.form.js') });
  const wr = await dv.get(`webresourceset?$select=webresourceid&$filter=name eq '${FORM_JS}'`);

  const activitySubgrid = (id, rows) => ({ name: `sec_${id}`, label: 'Agent Activity', subgrid: { id, t: 'activity', via: 'sdlcstory', label: 'Agent Activity', rows } });
  const forms = {
    story: {
      header: ['type', 'statuscode', 'priority', 'deliverypath', 'testresult'],
      libraries: [FORM_JS],
      events: [
        { name: 'onload', functionName: 'CgkSdlc.Story.onLoad', library: FORM_JS },
        { name: 'onchange', attribute: 'type', functionName: 'CgkSdlc.Story.onTypeChange', library: FORM_JS },
      ],
      tabs: [
        {
          name: 'tab_summary', label: 'Summary',
          columns: [
            [
              ...(summary ? [{ name: 'sec_summary', label: 'Summary', fields: ['!summary'] }] : []),
              { name: 'sec_story', label: 'Story', fields: ['storynumber', 'title', 'type', 'reportedby', 'channel', 'affectedcomponent', 'description'] },
            ],
            [
              { name: 'sec_triage_outcome', label: 'Triage outcome', fields: ['priority', 'complexity', 'risk', 'triageconfidence', 'deliverypath', 'statuscode'] },
              activitySubgrid('activity_summary', 6),
            ],
          ],
        },
        {
          name: 'tab_triage', label: 'Triage',
          columns: [
            [{ name: 'sec_report', label: 'Report', fields: ['description', 'stepstoreproduce', 'expectedvsactual'] }],
            [{ name: 'sec_triage', label: 'Triage', fields: ['acceptancecriteria', 'triagerationale', 'triageconfidence', 'possibleduplicateof'] }],
          ],
        },
        {
          name: 'tab_delivery', label: 'Delivery',
          columns: [
            [{ name: 'sec_github', label: 'GitHub', fields: ['githubissuenumber', 'githubissueurl', 'pullrequesturl', 'commitsha', 'testresult'] }],
            [{ name: 'sec_release', label: 'Release', fields: ['release', 'resolvedon', 'leadtimemin'] }],
          ],
        },
        { name: 'tab_activity', label: 'Activity', columns: [[activitySubgrid('activity_all', 14)]] },
      ],
    },
    activity: {
      header: ['agent', 'outcome', 'timestamp'],
      tabs: [{
        name: 'tab_general', label: 'General',
        columns: [[{ name: 'sec_general', label: 'Activity', fields: ['name', 'sdlcstory', 'agent', 'outcome', 'timestamp', 'action'] }], [{ name: 'sec_details', label: 'Details', fields: ['details'] }]],
      }],
    },
    release: {
      header: ['version', 'environment', 'releasedon'],
      tabs: [{
        name: 'tab_general', label: 'General',
        columns: [
          [{ name: 'sec_general', label: 'Release', fields: ['name', 'version', 'environment', 'releasedon', 'deploymenturl', 'commitsha'] }],
          [{ name: 'sec_stories', label: 'Stories', subgrid: { id: 'stories', t: 'story', via: 'release', view: 'All stories', label: 'SDLC Stories', rows: 10 } }],
        ],
      }],
    },
  };
  await fv.ensureForms(forms, views);
  void wr;

  fs.writeFileSync(path.join(__dirname, 'views.json'), JSON.stringify(views, null, 2));
  await dv.publishAll();
  console.log('Phase 2 done. View ids written to scripts/agentic-sdlc/views.json');
})().catch((e) => { console.error(e.message); process.exit(1); });
