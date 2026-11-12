// Phase 6: connection references and cloud flows F1–F6 in the solution, created
// through the Web API (workflow rows with clientdata). Deterministic workflow ids
// make the script idempotent. Flows are created OFF: connections and turning
// them on are manual steps (docs/manual-steps.md).
// The triage prompt id is read from scripts/agentic-sdlc/prompt-id.txt (06a-prompt.js)
// or looked up by name; without it F1 gets a placeholder (manual step).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dv = require('./dv');
const { V, STATUS } = require('./model');

const OUT = path.resolve(__dirname, '../../powerplatform/flows');
const DV = 'shared_commondataserviceforapps';
const TEAMS = 'shared_teams';
const connRefs = {
  [DV]: { logical: 'cgk_sdlc_dataverse', display: 'Agentic SDLC – Dataverse' },
  [TEAMS]: { logical: 'cgk_sdlc_teams', display: 'Agentic SDLC – Microsoft Teams' },
};
const AGENT_PARAMS = {
  'GitHub owner (cgk_GitHubOwner)': 'cgk_GitHubOwner',
  'GitHub repo (cgk_GitHubRepo)': 'cgk_GitHubRepo',
  'GitHub PAT (cgk_GitHubPAT)': 'cgk_GitHubPAT',
  'Portal URL (cgk_PortalUrl)': 'cgk_PortalUrl',
};
const p = (name) => `@{parameters('${Object.keys(AGENT_PARAMS).find((k) => k.startsWith(name))}')}`;
// Expression as string interpolation: '@expr' -> '@{expr}' (kept when already interpolated).
const interp = (e) => (e.startsWith('@{') ? e : `@{${e.replace(/^@/, '')}}`);
const guidFor = (name) => {
  const h = crypto.createHash('sha1').update(`agentic-sdlc:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// ---------- action builders ----------
const host = (api, op) => ({ connectionName: api, operationId: op, apiId: `/providers/Microsoft.PowerApps/apis/${api}` });
const dvAction = (op, parameters, runAfter = {}) => ({ type: 'OpenApiConnection', inputs: { host: host(DV, op), parameters, authentication: "@parameters('$authentication')" }, runAfter });
const update = (id, item, runAfter) => dvAction('UpdateRecord', { entityName: 'cgk_sdlcstories', recordId: id, ...prefix(item) }, runAfter);
const create = (set, item, runAfter) => dvAction('CreateRecord', { entityName: set, ...prefix(item) }, runAfter);
const list = (set, params, runAfter) => dvAction('ListRecords', { entityName: set, ...params }, runAfter);
const getRow = (set, id, select, runAfter) => dvAction('GetItem', { entityName: set, recordId: id, $select: select }, runAfter);
function prefix(item) { return Object.fromEntries(Object.entries(item).map(([k, v]) => [`item/${k}`, v])); }
const after = (name, states = ['Succeeded']) => ({ [name]: states });
const logActivity = (storyIdExpr, agent, outcome, name, action, details, runAfter) => create('cgk_agentactivities', {
  cgk_name: name, cgk_action: action, cgk_agent: V.agent[agent], cgk_outcome: V.outcome[outcome], cgk_details: details,
  cgk_timestamp: '@utcNow()', 'cgk_SDLCStory@odata.bind': `cgk_sdlcstories(${interp(storyIdExpr)})`,
}, runAfter);
const respondFlow = (body, runAfter) => ({
  type: 'Response', kind: 'PowerApp', runAfter,
  inputs: { statusCode: 200, body, schema: { type: 'object', properties: Object.fromEntries(Object.keys(body).map((k) => [k, { title: k, type: 'string', 'x-ms-dynamically-added': true }])) } },
});
const childTrigger = (inputs) => ({
  type: 'Request', kind: 'Button',
  inputs: {
    schema: {
      type: 'object',
      properties: Object.fromEntries(inputs.map(([key, title]) => [key, { title, type: 'string', 'x-ms-dynamically-added': true, description: title, 'x-ms-content-hint': 'TEXT' }])),
      required: inputs.map(([k]) => k),
    },
  },
});
const runChild = (flowName, body, runAfter) => ({ type: 'Workflow', inputs: { host: { workflowReferenceName: guidFor(flowName) }, body }, runAfter });
const http = (method, uri, body, runAfter) => ({
  type: 'Http', runAfter, runtimeConfiguration: { secureData: { properties: ['inputs'] } },
  inputs: {
    method, uri,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${p('GitHub PAT')}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'agentic-sdlc-demo' },
    ...(body ? { body } : {}),
  },
});
const ghRepo = `https://api.github.com/repos/${p('GitHub owner')}/${p('GitHub repo')}`;

function wrap(definition, apis) {
  const parameters = {
    $connections: { defaultValue: {}, type: 'Object' },
    $authentication: { defaultValue: {}, type: 'SecureObject' },
  };
  const used = JSON.stringify(definition);
  for (const [name, schema] of Object.entries(AGENT_PARAMS)) {
    if (used.includes(name)) parameters[name] = { defaultValue: '', type: 'String', metadata: { schemaName: schema } };
  }
  return {
    properties: {
      connectionReferences: Object.fromEntries(apis.map((a) => [a, { runtimeSource: 'embedded', connection: { connectionReferenceLogicalName: connRefs[a].logical }, api: { name: a } }])),
      definition: { $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#', contentVersion: '1.0.0.0', parameters, ...definition },
    },
    schemaVersion: '1.0.0.0',
  };
}

// ---------- F1 – Story triage ----------
function f1(promptId) {
  const id = "@triggerOutputs()?['body/cgk_sdlcstoryid']";
  const tr = (k) => `outputs('Triage_result')?['${k}']`;
  const optionMap = Object.fromEntries(['type', 'component', 'priority', 'complexity', 'risk'].map((k) => [k, V[k]]));
  const auto = `@and(contains(createArray('Issue','Improvement','New feature'), ${tr('type')}), equals(${tr('complexity')}, 'Simple'), equals(${tr('risk')}, 'Low'), greaterOrEquals(int(${tr('confidence')}), 80))`;
  const label = (col) => `@{coalesce(triggerOutputs()?['body/_${col}_label'], triggerOutputs()?['body/${col}@OData.Community.Display.V1.FormattedValue'], '')}`;
  const triageActions = {
    Set_status_Triaging: update(id, { statuscode: STATUS.Triaging }),
    List_open_stories: list('cgk_sdlcstories', { $select: 'cgk_sdlcstoryid,cgk_title,cgk_storynumber', $filter: `statecode eq 0 and cgk_sdlcstoryid ne @{triggerOutputs()?['body/cgk_sdlcstoryid']}`, $top: 50 }, after('Set_status_Triaging')),
    Open_story_titles: { type: 'Select', runAfter: after('List_open_stories'), inputs: { from: "@outputs('List_open_stories')?['body/value']", select: "@concat(item()?['cgk_storynumber'], ' ', item()?['cgk_title'])" } },
    Run_triage_prompt: dvAction('aibuilderpredict_customprompt', {
      recordId: promptId,
      'item/requestv2/StoryType': label('cgk_type'),
      'item/requestv2/Title': "@{triggerOutputs()?['body/cgk_title']}",
      'item/requestv2/Description': "@{coalesce(triggerOutputs()?['body/cgk_description'], '')}",
      'item/requestv2/StepsToReproduce': "@{coalesce(triggerOutputs()?['body/cgk_stepstoreproduce'], '')}",
      'item/requestv2/ExpectedVsActual': "@{coalesce(triggerOutputs()?['body/cgk_expectedvsactual'], '')}",
      'item/requestv2/OpenStoryTitles': "@{join(body('Open_story_titles'), '; ')}",
    }, after('Open_story_titles')),
    Triage_result: { type: 'Compose', runAfter: after('Run_triage_prompt'), inputs: "@json(coalesce(outputs('Run_triage_prompt')?['body/responsev2/predictionOutput/structuredOutput'], outputs('Run_triage_prompt')?['body/responsev2/predictionOutput/text']))" },
    Option_values: { type: 'Compose', runAfter: after('Triage_result'), inputs: optionMap },
    Delivery_path: { type: 'Compose', runAfter: after('Option_values'), inputs: `@if(${auto.slice(1)}, 'Autonomous', 'Human')` },
    Update_story_with_triage: update(id, {
      cgk_type: `@outputs('Option_values')?['type']?[${tr('type')}]`,
      cgk_affectedcomponent: `@outputs('Option_values')?['component']?[${tr('component')}]`,
      cgk_priority: `@outputs('Option_values')?['priority']?[${tr('priority')}]`,
      cgk_complexity: `@outputs('Option_values')?['complexity']?[${tr('complexity')}]`,
      cgk_risk: `@outputs('Option_values')?['risk']?[${tr('risk')}]`,
      cgk_triageconfidence: `@int(${tr('confidence')})`,
      cgk_triagerationale: `@{${tr('rationale')}}`,
      cgk_acceptancecriteria: `@{${tr('acceptanceCriteria')}}`,
      cgk_deliverypath: `@if(equals(outputs('Delivery_path'), 'Autonomous'), ${V.deliverypath.Autonomous}, ${V.deliverypath.Human})`,
      statuscode: STATUS.Triaged,
    }, after('Delivery_path')),
    Find_duplicate: { type: 'Query', runAfter: after('Update_story_with_triage'), inputs: { from: "@outputs('List_open_stories')?['body/value']", where: `@and(not(empty(${tr('duplicateOfTitle')})), equals(toLower(item()?['cgk_title']), toLower(string(${tr('duplicateOfTitle')}))))` } },
    If_duplicate: {
      type: 'If', runAfter: after('Find_duplicate'), expression: { greater: ["@length(body('Find_duplicate'))", 0] },
      actions: { Link_duplicate: update(id, { 'cgk_PossibleDuplicateOf@odata.bind': "cgk_sdlcstories(@{first(body('Find_duplicate'))?['cgk_sdlcstoryid']})" }) },
      else: { actions: {} },
    },
    Log_triage: logActivity(id, 'Triage', 'Success', 'Triage completed', 'Run prompt SDLC Story Triage',
      `Type @{${tr('type')}}, component @{${tr('component')}}, priority @{${tr('priority')}}, complexity @{${tr('complexity')}}, risk @{${tr('risk')}}, confidence @{${tr('confidence')}}%. Delivery path: @{outputs('Delivery_path')}.\n@{${tr('rationale')}}`,
      after('If_duplicate')),
    Is_autonomous: {
      type: 'If', runAfter: after('Log_triage'), expression: { equals: ["@outputs('Delivery_path')", 'Autonomous'] },
      actions: { Send_to_GitHub: runChild('F2', { text: id }) },
      else: {
        actions: {
          Route_to_human: update(id, { statecode: 1, statuscode: STATUS['Routed to human'] }),
          Log_routed: logActivity(id, 'Human', 'Warning', 'Routed to human', 'Apply delivery rule',
            `Autonomous rule not met (needs type Issue, Improvement or New feature, complexity Simple, risk Low and confidence >= 80). Triage: @{${tr('type')}}, @{${tr('complexity')}}, risk @{${tr('risk')}}, confidence @{${tr('confidence')}}%.`, after('Route_to_human')),
        },
      },
    },
  };
  return wrap({
    triggers: {
      When_a_story_is_created: {
        type: 'OpenApiConnectionWebhook',
        inputs: {
          host: host(DV, 'SubscribeWebhookTrigger'),
          parameters: { 'subscriptionRequest/message': 1, 'subscriptionRequest/entityname': 'cgk_sdlcstory', 'subscriptionRequest/scope': 4, 'subscriptionRequest/filterexpression': 'cgk_triageconfidence eq null' },
          authentication: "@parameters('$authentication')",
        },
      },
    },
    actions: {
      Triage: { type: 'Scope', actions: triageActions, runAfter: {} },
      Log_triage_failed: logActivity(id, 'Triage', 'Failed', 'Triage failed', 'Run prompt SDLC Story Triage',
        'The triage flow failed. Check the flow run history of F1 – Story triage.', after('Triage', ['Failed', 'TimedOut'])),
    },
  }, [DV]);
}

// ---------- F2 – Send to GitHub ----------
function f2() {
  const id = "@triggerBody()?['text']";
  const s = (k) => `outputs('Get_story')?['body/${k}']`;
  const issueBody = [
    '**Story:** @{' + s('cgk_storynumber') + '}  ',
    "**Type:** @{coalesce(outputs('Get_story')?['body/_cgk_type_label'], outputs('Get_story')?['body/cgk_type@OData.Community.Display.V1.FormattedValue'])}",
    '', '## Description', '@{' + s('cgk_description') + '}',
    '', '## Triage rationale', '@{' + s('cgk_triagerationale') + '}',
    '', '## Acceptance criteria', '@{' + s('cgk_acceptancecriteria') + '}',
    '', '---', 'Include @{' + s('cgk_storynumber') + '} in the PR title. Only change files under /app.',
  ].join('\n');
  const num = "body('Create_GitHub_issue')?['number']";
  return wrap({
    triggers: { manual: childTrigger([['text', 'storyId']]) },
    actions: {
      Get_story: getRow('cgk_sdlcstories', id, 'cgk_storynumber,cgk_title,cgk_type,cgk_description,cgk_triagerationale,cgk_acceptancecriteria'),
      Create_GitHub_issue: http('POST', `${ghRepo}/issues`, { title: `[@{${s('cgk_storynumber')}}] @{${s('cgk_title')}}`, body: issueBody, labels: ['agentic-sdlc'] }, after('Get_story')),
      Assign_Copilot: http('POST', `${ghRepo}/issues/@{${num}}/assignees`, {
        assignees: ['copilot-swe-agent[bot]'],
        agent_assignment: { target_repo: `${p('GitHub owner')}/${p('GitHub repo')}`, base_branch: 'main' },
      }, after('Create_GitHub_issue')),
      Update_story: update(id, {
        cgk_githubissuenumber: `@${num}`, cgk_githubissueurl: "@body('Create_GitHub_issue')?['html_url']",
        cgk_testresult: V.testresult['Not run'], statuscode: STATUS['In development'],
      }, after('Create_GitHub_issue')),
      Copilot_assigned: {
        type: 'If', runAfter: { Assign_Copilot: ['Succeeded', 'Failed', 'TimedOut'], Update_story: ['Succeeded'] },
        expression: { and: [{ equals: ["@outputs('Assign_Copilot')?['statusCode']", 201] }, { greater: ["@length(coalesce(body('Assign_Copilot')?['assignees'], json('[]')))", 0] }] },
        actions: { Log_build: logActivity(id, 'Build', 'Success', `GitHub issue #@{${num}} created`, 'Create issue and assign Copilot', `[@{${s('cgk_storynumber')}}] assigned to the Copilot coding agent: @{body('Create_GitHub_issue')?['html_url']}`) },
        else: { actions: { Log_build_warning: logActivity(id, 'Build', 'Warning', `GitHub issue #@{${num}} created, Copilot not assigned`, 'Create issue and assign Copilot', `Copilot could not be assigned automatically (HTTP @{outputs('Assign_Copilot')?['statusCode']}). Presenter: assign the issue to Copilot in GitHub: @{body('Create_GitHub_issue')?['html_url']}`) } },
      },
      Log_github_failed: logActivity(id, 'Build', 'Failed', 'GitHub issue not created', 'Create GitHub issue', "GitHub returned @{outputs('Create_GitHub_issue')?['statusCode']}. Check the GitHub PAT environment variable.", after('Create_GitHub_issue', ['Failed', 'TimedOut'])),
      Respond: respondFlow({ issuenumber: `@{${num}}` }, { Copilot_assigned: ['Succeeded', 'Failed', 'Skipped'], Log_github_failed: ['Succeeded', 'Skipped'] }),
    },
  }, [DV]);
}

// ---------- F3 – Pipeline callback ----------
function f3() {
  const b = (k) => `triggerBody()?['${k}']`;
  const sid = "@{first(outputs('Find_story')?['body/value'])?['cgk_sdlcstoryid']}";
  const ref = "@{first(outputs('Find_story')?['body/value'])?['cgk_storynumber']}";
  const filter = `@{concat('cgk_storynumber eq ''', coalesce(${b('storyRef')}, '-'), '''', if(empty(${b('githubIssue')}), '', concat(' or cgk_githubissuenumber eq ', string(${b('githubIssue')}))))}`;
  const relId = "@{if(empty(outputs('Find_release')?['body/value']), outputs('Create_release')?['body/cgk_releaseid'], first(outputs('Find_release')?['body/value'])?['cgk_releaseid'])}";
  const cases = {
    pr_opened: {
      case: 'pr_opened',
      actions: {
        PR_update: update(sid, { cgk_pullrequesturl: `@{${b('prUrl')}}`, cgk_commitsha: `@{${b('commitSha')}}`, statuscode: STATUS.Testing, cgk_testresult: V.testresult.Running }),
        PR_log: logActivity(sid, 'Build', 'Success', 'Pull request opened', 'Open pull request', `Copilot opened @{${b('prUrl')}}. CI tests are running.`, after('PR_update')),
      },
    },
    tests_passed: {
      case: 'tests_passed',
      actions: {
        Passed_update: update(sid, { cgk_testresult: V.testresult.Passed, statuscode: STATUS['Awaiting approval'], cgk_commitsha: `@{${b('commitSha')}}` }),
        Passed_log: logActivity(sid, 'Test', 'Success', 'Tests passed', 'Run CI tests', `Vitest and Playwright smoke tests passed on @{${b('commitSha')}}. Waiting for release approval.`, after('Passed_update')),
      },
    },
    tests_failed: {
      case: 'tests_failed',
      actions: {
        Failed_update: update(sid, { cgk_testresult: V.testresult.Failed, statuscode: STATUS['In development'] }),
        Failed_log: logActivity(sid, 'Test', 'Warning', 'Tests failed', 'Run CI tests', `CI tests failed on @{${b('commitSha')}}. Back to development.`, after('Failed_update')),
      },
    },
    deployed: {
      case: 'deployed',
      actions: {
        Find_release: list('cgk_releases', { $select: 'cgk_releaseid', $filter: `cgk_version eq '@{${b('version')}}'`, $top: 1 }),
        If_new_release: {
          type: 'If', runAfter: after('Find_release'), expression: { equals: ["@length(outputs('Find_release')?['body/value'])", 0] },
          actions: {
            Create_release: create('cgk_releases', {
              cgk_name: `Release @{${b('version')}}`, cgk_version: `@{${b('version')}}`, cgk_environment: V.environment.Production,
              cgk_releasedon: '@utcNow()', cgk_deploymenturl: `@{coalesce(${b('deployUrl')}, parameters('Portal URL (cgk_PortalUrl)'))}`, cgk_commitsha: `@{${b('commitSha')}}`,
            }),
          },
          else: { actions: {} },
        },
        Release_story: update(sid, {
          'cgk_Release@odata.bind': `cgk_releases(${relId})`, statecode: 1, statuscode: STATUS.Released, cgk_resolvedon: '@utcNow()',
          cgk_leadtimemin: "@div(sub(ticks(utcNow()), ticks(first(outputs('Find_story')?['body/value'])?['createdon'])), 600000000)",
          cgk_commitsha: `@{${b('commitSha')}}`, cgk_testresult: V.testresult.Passed,
        }, after('If_new_release')),
        Release_log: logActivity(sid, 'Release', 'Success', `Deployed in release @{${b('version')}}`, 'Deploy to GitHub Pages', `Live at @{${b('deployUrl')}} (release @{${b('version')}}).`, after('Release_story')),
        Notify_reporter: runChild('F4', { text: sid, text_1: `@{${b('version')}}`, text_2: `@{coalesce(${b('deployUrl')}, parameters('Portal URL (cgk_PortalUrl)'))}` }, after('Release_log')),
      },
    },
  };
  return wrap({
    triggers: {
      manual: {
        type: 'Request', kind: 'Http',
        inputs: {
          triggerAuthenticationType: 'All', method: 'POST',
          schema: { type: 'object', properties: { storyRef: { type: 'string' }, githubIssue: {}, event: { type: 'string' }, prUrl: { type: 'string' }, commitSha: { type: 'string' }, version: { type: 'string' }, deployUrl: { type: 'string' } } },
        },
      },
    },
    actions: {
      Find_story: list('cgk_sdlcstories', { $select: 'cgk_sdlcstoryid,cgk_storynumber,createdon', $filter: filter, $top: 1 }),
      If_story_found: {
        type: 'If', runAfter: after('Find_story'), expression: { greater: ["@length(outputs('Find_story')?['body/value'])", 0] },
        actions: {
          Switch_event: { type: 'Switch', expression: `@${b('event')}`, cases, default: { actions: {} } },
          Response_ok: { type: 'Response', kind: 'Http', runAfter: after('Switch_event'), inputs: { statusCode: 200, body: { status: 'ok', story: ref, event: `@{${b('event')}}` } } },
        },
        else: { actions: { Response_not_found: { type: 'Response', kind: 'Http', inputs: { statusCode: 404, body: { status: 'story not found', storyRef: `@{${b('storyRef')}}` } } } } },
      },
    },
  }, [DV]);
}

// ---------- F4 – Notify reporter ----------
function f4() {
  const id = "@triggerBody()?['text']";
  const s = (k) => `outputs('Get_story')?['body/${k}']`;
  return wrap({
    triggers: { manual: childTrigger([['text', 'storyId'], ['text_1', 'version'], ['text_2', 'deployUrl']]) },
    actions: {
      Get_story: getRow('cgk_sdlcstories', id, 'cgk_storynumber,cgk_title,_cgk_reportedby_value'),
      Get_reporter: getRow('systemusers', `@{${s('_cgk_reportedby_value')}}`, 'internalemailaddress,firstname', after('Get_story')),
      Post_Teams_message: {
        type: 'OpenApiConnection', runAfter: after('Get_reporter'),
        inputs: {
          host: host(TEAMS, 'PostMessageToConversation'),
          parameters: {
            poster: 'Flow bot', location: 'Chat with Flow bot',
            'body/recipient': "@{outputs('Get_reporter')?['body/internalemailaddress']}",
            'body/messageBody': `<p>Hi @{outputs('Get_reporter')?['body/firstname']}, 🚀 <b>@{${s('cgk_storynumber')}}</b> "@{${s('cgk_title')}}" is live in release <b>@{triggerBody()?['text_1']}</b>: <a href="@{triggerBody()?['text_2']}">@{triggerBody()?['text_2']}</a></p>`,
          },
          authentication: "@parameters('$authentication')",
        },
      },
      Log_notified: logActivity(id, 'Release', 'Info', 'Reporter notified in Teams', 'Notify reporter', "Teams message sent to @{outputs('Get_reporter')?['body/internalemailaddress']}.", after('Post_Teams_message')),
      Log_notify_failed: logActivity(id, 'Release', 'Warning', 'Reporter not notified', 'Notify reporter', 'The Teams message could not be sent.', after('Post_Teams_message', ['Failed', 'TimedOut'])),
      Respond: respondFlow({ notified: "@{if(equals(actions('Post_Teams_message')?['status'], 'Succeeded'), 'yes', 'no')}" }, { Log_notified: ['Succeeded', 'Skipped'], Log_notify_failed: ['Succeeded', 'Skipped'] }),
    },
  }, [DV, TEAMS]);
}

// ---------- Agent flows (Copilot Studio) ----------
const skillsTrigger = (props) => ({
  type: 'Request', kind: 'Skills',
  inputs: { schema: { type: 'object', properties: Object.fromEntries(props.map(([k, d]) => [k, { type: 'string', title: k, description: d, 'x-ms-content-hint': 'TEXT', 'x-ms-dynamically-added': true }])), required: props.filter(([, , req]) => req).map(([k]) => k) } },
});
const respondAgent = (body, runAfter) => ({
  type: 'Response', kind: 'Skills', runAfter,
  inputs: { statusCode: 200, body, schema: { type: 'object', properties: Object.fromEntries(Object.keys(body).map((k) => [k, { title: k, type: 'string', 'x-ms-dynamically-added': true }])) } },
});

// F5 – Intake: create story
function f5() {
  const t = (k) => `triggerBody()?['${k}']`;
  const typeMap = JSON.stringify(V.type).replace(/"/g, "'");
  return wrap({
    triggers: {
      manual: skillsTrigger([
        ['storytype', 'New feature, Issue, Improvement or Question', true], ['title', 'Short title', true], ['description', 'What the user wants or what happened', true],
        ['steps', 'Where it happened / steps (issues)', false], ['expected', 'What was expected (issues)', false], ['userprincipalname', 'UPN of the reporter', false],
      ]),
    },
    actions: {
      Type_values: { type: 'Compose', inputs: V.type },
      Find_reporter: list('systemusers', { $select: 'systemuserid', $filter: `domainname eq '@{coalesce(${t('userprincipalname')}, '-')}'`, $top: 1 }, after('Type_values')),
      Create_story: create('cgk_sdlcstories', {
        cgk_title: `@{${t('title')}}`, cgk_description: `@{${t('description')}}`,
        cgk_stepstoreproduce: `@{coalesce(${t('steps')}, '')}`, cgk_expectedvsactual: `@{coalesce(${t('expected')}, '')}`,
        cgk_type: `@coalesce(outputs('Type_values')?[${t('storytype')}], ${V.type.Issue})`, cgk_channel: V.channel.Teams,
        'cgk_ReportedBy@odata.bind': "@{if(empty(outputs('Find_reporter')?['body/value']), null, concat('systemusers(', first(outputs('Find_reporter')?['body/value'])?['systemuserid'], ')'))}",
      }, after('Find_reporter')),
      Log_intake: logActivity("@{outputs('Create_story')?['body/cgk_sdlcstoryid']}", 'Intake', 'Info', 'Story created', 'Create SDLC story',
        `@{outputs('Create_story')?['body/cgk_storynumber']} reported via Teams by @{coalesce(${t('userprincipalname')}, 'an employee')}.`, after('Create_story')),
      Respond_to_the_agent: respondAgent({ storynumber: "@{outputs('Create_story')?['body/cgk_storynumber']}" }, after('Log_intake')),
    },
  }, [DV]);
  void typeMap;
}

// F6 – Intake: story status
function f6() {
  const raw = "trim(coalesce(triggerBody()?['storynumber'], ''))";
  const ref = `@{if(startsWith(toUpper(${raw}), 'STY-'), toUpper(${raw}), concat('STY-', ${raw}))}`;
  const r = (k) => `first(outputs('Find_story')?['body/value'])?['${k}']`;
  const lbl = (k) => `coalesce(${r(`_${k}_label`)}, ${r(`${k}@OData.Community.Display.V1.FormattedValue`)}, '')`;
  return wrap({
    triggers: { manual: skillsTrigger([['storynumber', 'Story number, e.g. STY-1038 or 1038', true]]) },
    actions: {
      Find_story: list('cgk_sdlcstories', { $select: 'cgk_storynumber,cgk_title,statuscode,cgk_deliverypath,cgk_pullrequesturl,_cgk_release_value,cgk_leadtimemin', $filter: `cgk_storynumber eq '${ref}'`, $top: 1 }),
      Respond_to_the_agent: respondAgent({
        found: "@{if(empty(outputs('Find_story')?['body/value']), 'no', 'yes')}",
        storynumber: ref,
        title: `@{${r('cgk_title')}}`,
        status: `@{${lbl('statuscode')}}`,
        deliverypath: `@{${lbl('cgk_deliverypath')}}`,
        pullrequest: `@{coalesce(${r('cgk_pullrequesturl')}, 'none yet')}`,
        release: `@{coalesce(${r('_cgk_release_value@OData.Community.Display.V1.FormattedValue')}, 'not released yet')}`,
      }, after('Find_story')),
    },
  }, [DV]);
}

const FLOWS = [
  ['F2', 'F2 – Send to GitHub', 'Creates the GitHub issue for an autonomous story and assigns it to the Copilot coding agent.', f2],
  ['F4', 'F4 – Notify reporter', 'Sends the reporter a Teams message when the story is live.', f4],
  ['F1', 'F1 – Story triage', 'Triage Agent: runs the SDLC Story Triage prompt on every new story and decides the delivery path.', f1],
  ['F3', 'F3 – Pipeline callback', 'Receives GitHub Actions events (PR opened, tests, deployed) and updates the story.', f3],
  ['F5', 'F5 – Intake create story', 'Agent flow for the Intake Agent: creates an SDLC story and returns its number.', f5],
  ['F6', 'F6 – Intake story status', 'Agent flow for the Intake Agent: returns the status of a story.', f6],
];

async function ensureConnectionReferences() {
  for (const [api, c] of Object.entries(connRefs)) {
    const ex = await dv.get(`connectionreferences?$select=connectionreferenceid&$filter=connectionreferencelogicalname eq '${c.logical}'`);
    if (ex.value.length) { console.log(`= connection reference ${c.logical}`); continue; }
    await dv.post('connectionreferences', { connectionreferencelogicalname: c.logical, connectionreferencedisplayname: c.display, connectorid: `/providers/Microsoft.PowerApps/apis/${api}` });
    console.log(`+ connection reference ${c.logical}`);
  }
}

async function promptId() {
  const f = path.join(__dirname, 'prompt-id.txt');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  const r = await dv.get("msdyn_aimodels?$select=msdyn_aimodelid&$filter=msdyn_name eq 'SDLC Story Triage'").catch(() => ({ value: [] }));
  return r.value[0]?.msdyn_aimodelid || null;
}

(async () => {
  const onlyLocal = process.argv.includes('--local');
  if (!onlyLocal) await ensureConnectionReferences();
  const pid = onlyLocal ? null : await promptId();
  if (!pid) console.log('! Prompt "SDLC Story Triage" not found: F1 gets a placeholder prompt id (manual step).');
  fs.mkdirSync(OUT, { recursive: true });
  for (const [key, name, description, build] of FLOWS) {
    const clientdata = key === 'F1' ? build(pid || '00000000-0000-0000-0000-000000000000') : build();
    const file = path.join(OUT, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify(clientdata, null, 2));
    if (onlyLocal) { console.log(`wrote ${file}`); continue; }
    const id = guidFor(key);
    const body = { name, description, category: 5, type: 1, primaryentity: 'none', clientdata: JSON.stringify(clientdata) };
    const ex = await dv.tryGet(`workflows(${id})?$select=statecode`);
    if (ex) {
      if (ex.statecode === 1) { console.log(`= ${name} is on, not overwritten (turn it off to update)`); continue; }
      await dv.patch(`workflows(${id})`, body);
      console.log(`~ ${name}`);
    } else {
      await dv.post('workflows', { workflowid: id, ...body });
      console.log(`+ ${name} (${id})`);
    }
  }
  if (!onlyLocal) fs.writeFileSync(path.join(__dirname, 'flow-ids.json'), JSON.stringify(Object.fromEntries(FLOWS.map(([k]) => [k, guidFor(k)])), null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
