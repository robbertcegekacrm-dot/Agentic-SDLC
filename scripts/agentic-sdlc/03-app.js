// Phase 3: model driven app "Agentic SDLC": app module, sitemap (Dashboard
// generative page first when its id is known), components, the refreshed
// header and navigation setting (value copied from HR Hub), the "Approve release"
// command, publish and validate. Idempotent.
// The dashboard page id is read from powerplatform/genpages/sdlc-dashboard/page-id.txt
// (written by 03b-dashboard.sh). Run 03-app.js, then 03b-dashboard.sh (which re-runs this).
const fs = require('fs');
const path = require('path');
const dv = require('./dv');
const model = require('./model');

const UNIQUE = 'cgk_AgenticSDLC';
const NAME = 'Agentic SDLC';
const PAGE_ID_FILE = path.resolve(__dirname, '../../powerplatform/genpages/sdlc-dashboard/page-id.txt');
const FORM_JS = 'cgk_/agenticsdlc/story.form.js';
const DEFAULT_ICON = '953b9fac-1e5e-e611-80d6-00155ded156f'; // standard model driven app icon web resource

function sitemapXml(pageId) {
  const t = (s) => `<Titles><Title LCID="${model.lcid}" Title="${s}" /></Titles>`;
  const dash = pageId
    ? `<SubArea Id="sub_dashboard" ResourceId="SitemapDesigner.NewSubArea" VectorIcon="/_imgs/TableIconsFluentV9/document_one_page_sparkle.svg" Icon="/_imgs/imagestrips/transparent_spacer.gif" Client="All,Outlook,OutlookLaptopClient,OutlookWorkstationClient,Web" AvailableOffline="true" PassParams="false" Sku="All,OnPremise,Live,SPLA" GenPageId="${pageId}">${t('Dashboard')}</SubArea>`
    : '';
  return '<SiteMap IntroducedVersion="7.0.0.0"><Area Id="area_sdlc" ShowGroups="true">' + t('Agentic SDLC')
    + `<Group Id="grp_delivery" IsProfile="false">${t('Delivery')}${dash}`
    + `<SubArea Id="sub_story" Entity="cgk_sdlcstory">${t('SDLC Stories')}</SubArea>`
    + `<SubArea Id="sub_activity" Entity="cgk_agentactivity">${t('Agent Activity')}</SubArea>`
    + `<SubArea Id="sub_release" Entity="cgk_release">${t('Releases')}</SubArea>`
    + '</Group></Area></SiteMap>';
}

async function ensureApp() {
  const ex = await dv.get(`appmodules?$select=appmoduleid&$filter=uniquename eq '${UNIQUE}'`);
  if (ex.value.length) { console.log(`= app ${UNIQUE}`); return ex.value[0].appmoduleid; }
  const id = (await dv.post('appmodules', {
    name: NAME, uniquename: UNIQUE, description: 'Follow SDLC stories from report to release: triage, autonomous delivery by agents and routing to humans.',
    webresourceid: DEFAULT_ICON, clienttype: 4, formfactor: 1, navigationtype: 0,
  })).__id;
  console.log(`+ app ${UNIQUE}`);
  return id;
}

async function ensureSitemap(pageId) {
  const xml = sitemapXml(pageId);
  const ex = await dv.get(`sitemaps?$select=sitemapid&$filter=sitemapnameunique eq '${UNIQUE}'`);
  if (ex.value.length) {
    await dv.patch(`sitemaps(${ex.value[0].sitemapid})`, { sitemapxml: xml });
    console.log(`~ sitemap (dashboard ${pageId ? 'included' : 'not yet uploaded'})`);
    return ex.value[0].sitemapid;
  }
  const id = (await dv.post('sitemaps', { sitemapname: NAME, sitemapnameunique: UNIQUE, sitemapxml: xml, isappaware: true })).__id;
  console.log('+ sitemap');
  return id;
}

async function addComponents(appId, sitemapId) {
  const comps = [{ '@odata.type': 'Microsoft.Dynamics.CRM.sitemap', sitemapid: sitemapId }];
  for (const t of model.tables) {
    const md = await dv.get(`EntityDefinitions(LogicalName='${t.name}')?$select=MetadataId`);
    comps.push({ '@odata.type': 'Microsoft.Dynamics.CRM.entity', entityid: md.MetadataId });
    const forms = await dv.get(`systemforms?$select=formid&$filter=objecttypecode eq '${t.name}' and type eq 2`);
    for (const f of forms.value) comps.push({ '@odata.type': 'Microsoft.Dynamics.CRM.systemform', formid: f.formid });
    const views = await dv.get(`savedqueries?$select=savedqueryid&$filter=returnedtypecode eq '${t.name}' and querytype eq 0`);
    for (const v of views.value) comps.push({ '@odata.type': 'Microsoft.Dynamics.CRM.savedquery', savedqueryid: v.savedqueryid });
  }
  await dv.post('AddAppComponents', { AppId: appId, Components: comps }, { solution: false });
  console.log(`~ app components (${comps.length})`);
}

// HeaderAndNavigationRefresh: copy value and storage pattern from HR Hub.
async function ensureNavSetting(appId) {
  const def = await dv.get("settingdefinitions?$select=settingdefinitionid,uniquename&$filter=uniquename eq 'HeaderAndNavigationRefresh'");
  const defId = def.value[0].settingdefinitionid;
  const hr = await dv.get(`appsettings?$select=value,uniquename&$filter=_settingdefinitionid_value eq ${defId} and parentappmoduleid/uniquename eq 'cgk_HRHub'`)
    .catch(() => ({ value: [] }));
  const value = hr.value[0]?.value || '2';
  console.log(`  HR Hub HeaderAndNavigationRefresh = ${value} (uniquename ${hr.value[0]?.uniquename || 'n/a'})`);
  const ex = await dv.get(`appsettings?$select=appsettingid,value&$filter=_settingdefinitionid_value eq ${defId} and _parentappmoduleid_value eq ${appId}`);
  let id;
  if (ex.value.length) {
    id = ex.value[0].appsettingid;
    if (ex.value[0].value !== value) await dv.patch(`appsettings(${id})`, { value });
  } else {
    id = (await dv.post('appsettings', {
      uniquename: `${UNIQUE}_HeaderAndNavigationRefresh`, value,
      'settingdefinitionid@odata.bind': `/settingdefinitions(${defId})`, 'parentappmoduleid@odata.bind': `/appmodules(${appId})`,
    })).__id;
  }
  // appsetting component type is resolved from the component definitions.
  const type = await componentType('appsetting');
  if (type) await dv.addToSolution(id, type).catch((e) => console.log(`  (appsetting already in solution or not addable: ${e.status})`));
  return value;
}

async function componentType(entityName) {
  const r = await dv.get(`solutioncomponentdefinitions?$select=solutioncomponenttype&$filter=primaryentityname eq '${entityName}'`).catch(() => ({ value: [] }));
  return r.value[0]?.solutioncomponenttype;
}

// "Approve release" modern command on the story form (JavaScript). Enum values are
// copied from an existing JavaScript command in the environment.
async function ensureCommand(appId) {
  const uname = 'cgk_sdlcstory_approverelease';
  const sample = await dv.get('appactions?$select=onclickeventtype,location,context,visibilitytype,onclickeventjavascriptparameters&$filter=onclickeventjavascriptfunctionname ne null and location eq 0&$top=1');
  if (!sample.value.length) throw new Error('No JavaScript command found to copy enum values from');
  const s = sample.value[0];
  const md = await dv.get("EntityDefinitions(LogicalName='cgk_sdlcstory')?$select=MetadataId");
  const wr = await dv.get(`webresourceset?$select=webresourceid&$filter=name eq '${FORM_JS}'`);
  const body = {
    uniquename: uname, name: 'Approve release', buttonlabeltext: 'Approve release', buttontooltiptitle: 'Approve release',
    buttontooltipdescription: 'Opens the pull request so you can approve and merge it (stories awaiting approval).',
    fonticon: 'CheckmarkCircle', sequence: 10, location: s.location, context: s.context, onclickeventtype: s.onclickeventtype,
    onclickeventjavascriptfunctionname: 'CgkSdlc.Story.approveRelease', onclickeventjavascriptparameters: '[{"type":5,"value":"PrimaryControl"}]',
    'onclickeventjavascriptwebresourceid@odata.bind': `/webresourceset(${wr.value[0].webresourceid})`,
    'contextentity@odata.bind': `/entities(${md.MetadataId})`, 'appmoduleid@odata.bind': `/appmodules(${appId})`,
  };
  const ex = await dv.get(`appactions?$select=appactionid&$filter=uniquename eq '${uname}'`);
  if (ex.value.length) { await dv.patch(`appactions(${ex.value[0].appactionid})`, body); console.log('~ command Approve release'); } else { await dv.post('appactions', body); console.log('+ command Approve release'); }
}

(async () => {
  const pageId = fs.existsSync(PAGE_ID_FILE) ? fs.readFileSync(PAGE_ID_FILE, 'utf8').trim() : null;
  const appId = await ensureApp();
  const sitemapId = await ensureSitemap(pageId);
  await addComponents(appId, sitemapId);
  const nav = await ensureNavSetting(appId);
  try { await ensureCommand(appId); } catch (e) { console.log(`! command Approve release failed: ${e.message.slice(0, 300)}`); process.exitCode = 2; }

  await dv.post('PublishXml', { ParameterXml: `<importexportxml><appmodules><appmodule>${appId}</appmodule></appmodules><sitemaps><sitemap>${sitemapId}</sitemap></sitemaps></importexportxml>` }, { solution: false, retries: 10 });
  const v = await dv.get(`ValidateApp(AppModuleId=${appId})`);
  console.log(`ValidateApp: ${v.AppValidationResponse?.ValidationSuccess} ${JSON.stringify(v.AppValidationResponse?.ValidationIssueList || []).slice(0, 500)}`);
  const back = await dv.get(`appsettings?$select=value&$filter=_parentappmoduleid_value eq ${appId}`);
  console.log(`HeaderAndNavigationRefresh read back: ${back.value.map((x) => x.value).join(',')} (expected ${nav})`);
  fs.writeFileSync(path.join(__dirname, 'app-id.txt'), appId);
  console.log(`Phase 3 app done: ${dv.cfg.envUrl}/main.aspx?appid=${appId}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
