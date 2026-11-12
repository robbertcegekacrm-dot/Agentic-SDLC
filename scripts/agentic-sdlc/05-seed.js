// Phase 5: demo data. Releases, 25 stories and their Agent Activity trail, with
// dates relative to the run date (release 1.0.6 always falls in the current week).
// Usage: node 05-seed.js [--reset]   (--reset deletes all demo rows first)
// Ends with the KPI check and sets the story autonumber seed to 1042.
const crypto = require('crypto');
const path = require('path');
const dv = require('./dv');
const { V, STATUS, stateOf } = require('./model');
const data = require(path.resolve(__dirname, '../../powerplatform/demo-data/stories.json'));

const RESET = process.argv.includes('--reset');
const REPO = 'https://github.com/robbertcegekacrm-dot/Agentic-SDLC';
const PORTAL = 'https://robbertcegekacrm-dot.github.io/Agentic-SDLC/';
const MIN = 60 * 1000;
const now = new Date();
const uuid = () => crypto.randomUUID();
const iso = (d) => new Date(d).toISOString();

function thisWeekDate() {
  const startOf = (dow) => { const d = new Date(now); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - dow + 7) % 7)); return d; };
  // Later of the Monday- and Sunday-based week start, so "this week" holds for both locales.
  const weekStart = new Date(Math.max(startOf(1), startOf(0)) + 60 * MIN);
  let d = new Date(Math.max(weekStart, now - 2 * 24 * 60 * MIN));
  d.setUTCHours(14, 20, 0, 0);
  if (d > now - 30 * MIN) d = new Date(Math.max(weekStart, now - 30 * MIN));
  return d;
}

async function reset() {
  for (const set of ['cgk_agentactivities', 'cgk_sdlcstories', 'cgk_releases']) {
    const idCol = { cgk_agentactivities: 'cgk_agentactivityid', cgk_sdlcstories: 'cgk_sdlcstoryid', cgk_releases: 'cgk_releaseid' }[set];
    const rows = await dv.getAll(`${set}?$select=${idCol}`);
    if (rows.length) await dv.batch(rows.map((r) => ({ method: 'DELETE', url: `${set}(${r[idCol]})` })));
    console.log(`- ${rows.length} ${set}`);
  }
}

(async () => {
  const me = (await dv.get('WhoAmI')).UserId;
  const existing = await dv.get('cgk_sdlcstories?$select=cgk_sdlcstoryid&$top=1');
  if (existing.value.length && !RESET) { console.log('Demo data already present. Use --reset to recreate it.'); return; }
  if (RESET) await reset();

  // ---------- Releases ----------
  const rel = {};
  for (const r of data.releases) {
    const d = r.daysAgo === 'thisWeek' ? thisWeekDate() : new Date(now - r.daysAgo * 24 * 60 * MIN);
    if (r.daysAgo !== 'thisWeek') d.setUTCHours(14, 20, 0, 0);
    rel[r.version] = { id: uuid(), date: d, ...r };
  }
  const ops = data.releases.map((r) => ({
    method: 'POST', url: 'cgk_releases',
    body: {
      cgk_releaseid: rel[r.version].id, cgk_name: `Release ${r.version}`, cgk_version: r.version, cgk_environment: V.environment.Production,
      cgk_releasedon: iso(rel[r.version].date), cgk_deploymenturl: PORTAL, cgk_commitsha: r.sha, overriddencreatedon: iso(rel[r.version].date),
    },
  }));

  // ---------- Stories and activities ----------
  const acts = [];
  const statusUpdates = [];
  const act = (story, at, agent, name, action, outcome, details) => acts.push({
    method: 'POST', url: 'cgk_agentactivities',
    body: {
      cgk_name: name, cgk_action: action, cgk_agent: V.agent[agent], cgk_outcome: V.outcome[outcome], cgk_details: details,
      cgk_timestamp: iso(at), overriddencreatedon: iso(at), 'cgk_SDLCStory@odata.bind': `/cgk_sdlcstories(${story.id})`,
    },
  });

  for (const s of data.stories) {
    s.id = uuid();
    const r = s.release && rel[s.release];
    const created = r ? new Date(r.date - s.lead * MIN)
      : new Date(now - (s.hoursAgo ? s.hoursAgo * 60 : (s.daysAgo || 1) * 24 * 60) * MIN);
    const ref = `STY-${s.n}`;
    const body = {
      cgk_sdlcstoryid: s.id, cgk_title: s.title, cgk_storynumber: ref, cgk_type: V.type[s.type], cgk_description: s.description,
      cgk_channel: V.channel[s.channel], cgk_affectedcomponent: V.component[s.component], cgk_priority: V.priority[s.priority],
      cgk_complexity: V.complexity[s.complexity], cgk_risk: V.risk[s.risk], cgk_triageconfidence: s.confidence,
      cgk_triagerationale: s.rationale, cgk_acceptancecriteria: s.criteria || null, cgk_deliverypath: V.deliverypath[s.path],
      cgk_testresult: V.testresult[s.test], overriddencreatedon: iso(created), 'cgk_ReportedBy@odata.bind': `/systemusers(${me})`,
    };
    if (s.steps) body.cgk_stepstoreproduce = s.steps;
    if (s.expected) body.cgk_expectedvsactual = s.expected;
    if (s.issue) Object.assign(body, { cgk_githubissuenumber: s.issue, cgk_githubissueurl: `${REPO}/issues/${s.issue}` });
    if (s.issue && ['Testing', 'Awaiting approval', 'Released'].includes(s.status)) body.cgk_pullrequesturl = `${REPO}/pull/${s.issue + 1}`;
    if (r) {
      Object.assign(body, {
        'cgk_Release@odata.bind': `/cgk_releases(${r.id})`, cgk_resolvedon: iso(r.date), cgk_leadtimemin: s.lead, cgk_commitsha: r.sha,
      });
    }
    ops.push({ method: 'POST', url: 'cgk_sdlcstories', body });
    const code = STATUS[s.status];
    if (code !== STATUS.New) statusUpdates.push({ method: 'PATCH', url: `cgk_sdlcstories(${s.id})`, body: { statecode: stateOf(code), statuscode: code } });

    // Activity trail
    const L = s.lead || 60;
    const t = (m) => new Date(+created + m * MIN);
    act(s, t(0), 'Intake', 'Story created', 'Create SDLC story', 'Info', `${ref} reported via ${s.channel} by Lotte Janssens (Customer Service).`);
    act(s, t(1), 'Triage', 'Triage completed', 'Run prompt SDLC Story Triage', 'Success',
      `Type ${s.type}, component ${s.component}, priority ${s.priority}, complexity ${s.complexity}, risk ${s.risk}, confidence ${s.confidence}%. Delivery path: ${s.path}.\n${s.rationale}`);
    if (s.path === 'Human') {
      if (s.type === 'Question') {
        act(s, t(2), 'Intake', 'Question answered', 'Answer in Teams', 'Info', `${s.rationale}`);
        continue;
      }
      const why = [];
      if (!['Issue', 'Improvement', 'New feature'].includes(s.type)) why.push(`type ${s.type} is not in the autonomous scope`);
      if (s.complexity !== 'Simple') why.push(`complexity ${s.complexity}`);
      if (s.risk !== 'Low') why.push(`risk ${s.risk}`);
      if (s.confidence < 80) why.push(`confidence ${s.confidence}% < 80%`);
      act(s, t(2), 'Human', 'Routed to human', 'Apply delivery rule', 'Warning', `Autonomous rule not met: ${why.join(', ') || 'policy'}. Assigned to the development team.`);
      if (r) {
        act(s, t(Math.min(120, L * 0.1)), 'Human', 'Picked up by developer', 'Assign', 'Info', 'Tom Willems (Senior Developer) picked up the story.');
        act(s, t(L - 40), 'Test', 'Tests passed', 'Run CI tests', 'Success', 'Vitest and Playwright smoke tests passed.');
        act(s, t(L - 10), 'Human', 'Release approved', 'Approve and merge', 'Success', 'Reviewed and merged by Tom Willems, approved by Sanne Peeters.');
        act(s, t(L), 'Release', `Deployed in release ${s.release}`, 'Deploy to GitHub Pages', 'Success', `Live at ${PORTAL} (release ${s.release}).`);
      }
      continue;
    }
    // Autonomous path
    act(s, t(2), 'Build', `GitHub issue #${s.issue} created`, 'Create issue and assign Copilot', 'Success', `[${ref}] ${s.title} assigned to the Copilot coding agent.`);
    if (s.status === 'In development') continue;
    const prAt = r ? L * 0.55 : 25;
    act(s, t(prAt), 'Build', `Pull request #${s.issue + 1} opened`, 'Open pull request', 'Success', `Copilot opened PR #${s.issue + 1} "${ref}: ${s.title}".`);
    if (s.status === 'Testing') { act(s, t(prAt + 1), 'Test', 'Tests running', 'Run CI tests', 'Info', 'Vitest and Playwright smoke tests started.'); continue; }
    if (s.failedOnce) {
      act(s, t(prAt + 3), 'Test', 'Tests failed', 'Run CI tests', 'Warning', '1 of 15 unit tests failed: instalment for 24 months. Copilot pushed a fix.');
      act(s, t(L * 0.75), 'Test', 'Tests passed', 'Run CI tests', 'Success', 'Vitest 15 passed, Playwright smoke 3 passed.');
    } else act(s, t(r ? L * 0.7 : prAt + 6), 'Test', 'Tests passed', 'Run CI tests', 'Success', 'Vitest 14 passed, Playwright smoke 3 passed.');
    if (s.status === 'Awaiting approval') { act(s, t(prAt + 7), 'Human', 'Awaiting release approval', 'Request approval', 'Info', 'Waiting for the product owner to approve and merge.'); continue; }
    act(s, t(L * 0.9), 'Human', 'Release approved', 'Approve and merge', 'Success', 'Approved and merged by Sanne Peeters (Product Owner).');
    act(s, t(L), 'Release', `Deployed in release ${s.release}`, 'Deploy to GitHub Pages', 'Success', `Live at ${PORTAL} (release ${s.release}). Lead time ${L} min.`);
  }

  console.log(`Creating ${data.releases.length} releases, ${data.stories.length} stories, ${acts.length} activities...`);
  await dv.batch(ops);
  await dv.batch(statusUpdates);
  await dv.batch(acts);

  // Next live story gets STY-1042.
  await dv.post('SetAutoNumberSeed', { EntityName: 'cgk_sdlcstory', AttributeName: 'cgk_storynumber', Value: 1042 }, { solution: false });
  console.log('Autonumber seed set to 1042');

  // ---------- KPI check (once) ----------
  const stories = await dv.getAll('cgk_sdlcstories?$select=statecode,statuscode,cgk_deliverypath,cgk_leadtimemin,cgk_resolvedon');
  const released = stories.filter((x) => x.statuscode === STATUS.Released);
  const auto = released.filter((x) => x.cgk_deliverypath === V.deliverypath.Autonomous);
  const human = released.filter((x) => x.cgk_deliverypath === V.deliverypath.Human);
  const avg = (l) => Math.round(l.reduce((a, x) => a + x.cgk_leadtimemin, 0) / (l.length || 1));
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const kpi = {
    stories: stories.length,
    open: stories.filter((x) => x.statecode === 0).length,
    released: released.length,
    autonomousPct: Math.round((auto.length / released.length) * 100),
    avgLeadAutonomousMin: avg(auto),
    avgLeadHumanHours: Math.round(avg(human) / 60),
    awaitingHuman: stories.filter((x) => [STATUS['Awaiting approval'], STATUS['Routed to human']].includes(x.statuscode)).length,
    routedToHuman: stories.filter((x) => x.statuscode === STATUS['Routed to human']).length,
    releasedThisWeek: released.filter((x) => new Date(x.cgk_resolvedon) >= monday).length,
    activities: (await dv.getAll('cgk_agentactivities?$select=cgk_agentactivityid')).length,
  };
  console.log('KPI check:', JSON.stringify(kpi));
})().catch((e) => { console.error(e.message); process.exit(1); });
