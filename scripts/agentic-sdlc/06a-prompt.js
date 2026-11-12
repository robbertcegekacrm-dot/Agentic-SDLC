// Phase 6a: AI prompt "SDLC Story Triage" (AI Builder GPT dynamic prompt) through the
// Web API: model on the GPT prompt template, training configuration with the prompt
// definition, Train, then PublishAIConfiguration on the resulting run configuration.
// Prompt text and inputs come from powerplatform/prompts/sdlc-story-triage.md.
// Writes the model id to prompt-id.txt (used by 06-flows.js). Idempotent: skips when published.
const fs = require('fs');
const path = require('path');
const dv = require('./dv');

const NAME = 'SDLC Story Triage';
const TEMPLATE = 'edfdb190-3791-45d8-9a6c-8f90a37c278a'; // GPT dynamic prompt
const INPUTS = ['StoryType', 'Title', 'Description', 'StepsToReproduce', 'ExpectedVsActual', 'OpenStoryTitles'];
const md = fs.readFileSync(path.resolve(__dirname, '../../powerplatform/prompts/sdlc-story-triage.md'), 'utf8');
const text = md.split('## Prompt text')[1].split('```')[1].replace(/^\n/, '').trimEnd();

function promptParts() {
  const parts = [];
  const re = new RegExp(`\\{(${INPUTS.join('|')})\\}`, 'g');
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: 'literal', text: text.slice(last, m.index) });
    parts.push({ type: 'inputVariable', id: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'literal', text: text.slice(last) });
  return parts;
}

const config = {
  version: 'GptDynamicPrompt-2',
  prompt: promptParts(),
  definitions: {
    inputs: INPUTS.map((id) => ({ id, text: id, type: 'text', quickTestValue: '' })),
    formulas: [], data: [], output: { formats: ['text'] },
  },
  modelParameters: { modelType: 'gpt-41-mini', gptParameters: { temperature: 0 } },
  settings: { recordRetrievalLimit: 30, shouldPreserveRecordLinks: null, runtime: null },
  code: '', signature: '',
};

(async () => {
  const ex = await dv.get(`msdyn_aimodels?$select=msdyn_aimodelid,statecode,_msdyn_activerunconfigurationid_value&$filter=msdyn_name eq '${NAME}'`);
  let modelId = ex.value[0]?.msdyn_aimodelid;
  if (modelId && ex.value[0]._msdyn_activerunconfigurationid_value) {
    console.log(`= prompt ${NAME} (${modelId}) already published`);
    const sc = await dv.get(`solutioncomponents?$select=componenttype&$filter=objectid eq ${modelId}`);
    if (sc.value.length) await dv.addToSolution(modelId, sc.value[0].componenttype, true).catch((e) => console.log(`  add to solution: ${e.status}`));
    fs.writeFileSync(path.join(__dirname, 'prompt-id.txt'), modelId);
    return;
  }
  if (!modelId) {
    modelId = (await dv.post('msdyn_aimodels', { msdyn_name: NAME, 'msdyn_TemplateId@odata.bind': `/msdyn_aitemplates(${TEMPLATE})` })).__id;
    console.log(`+ AI model ${NAME} (${modelId})`);
  }
  // Reuse a trained configuration from an earlier run, else create and train one.
  const trained = await dv.get(`msdyn_aiconfigurations?$select=msdyn_aiconfigurationid,statuscode&$filter=_msdyn_aimodelid_value eq ${modelId} and msdyn_type eq 190690000`);
  let train = trained.value[0]?.msdyn_aiconfigurationid;
  if (!train) {
    train = (await dv.post('msdyn_aiconfigurations', {
      msdyn_name: `${modelId}_Training`, msdyn_type: 190690000, msdyn_customconfiguration: JSON.stringify(config),
      'msdyn_AIModelId@odata.bind': `/msdyn_aimodels(${modelId})`,
    })).__id;
    console.log(`+ training configuration ${train}`);
  }
  if (trained.value[0]?.statuscode !== 6) {
    await dv.post(`msdyn_aiconfigurations(${train})/Microsoft.Dynamics.CRM.Train`, { version: '1.0' }, { solution: false });
    for (let i = 0; i < 30; i++) {
      await dv.sleep(4000);
      if ((await dv.get(`msdyn_aiconfigurations(${train})?$select=statuscode`)).statuscode === 6) break;
    }
    console.log('  trained');
  }
  // Run configuration pointing to the trained configuration, then publish it (activates the model).
  const runs = await dv.get(`msdyn_aiconfigurations?$select=msdyn_aiconfigurationid&$filter=_msdyn_aimodelid_value eq ${modelId} and msdyn_type eq 190690001`);
  let run = runs.value[0]?.msdyn_aiconfigurationid;
  if (!run) {
    run = (await dv.post('msdyn_aiconfigurations', {
      msdyn_name: `${modelId}_Run`, msdyn_type: 190690001, msdyn_customconfiguration: JSON.stringify(config),
      'msdyn_AIModelId@odata.bind': `/msdyn_aimodels(${modelId})`,
      'msdyn_TrainedModelAIConfigurationPareId@odata.bind': `/msdyn_aiconfigurations(${train})`,
    })).__id;
    console.log(`+ run configuration ${run}`);
  }
  await dv.post(`msdyn_aiconfigurations(${run})/Microsoft.Dynamics.CRM.PublishAIConfiguration`, { version: '1.0' }, { solution: false });
  for (let i = 0; i < 30; i++) {
    await dv.sleep(5000);
    const m = await dv.get(`msdyn_aimodels(${modelId})?$select=_msdyn_activerunconfigurationid_value,statecode`);
    if (m._msdyn_activerunconfigurationid_value) { console.log(`  published (state ${m.statecode})`); break; }
  }
  // Add to the solution with the component type the model has in the Default solution.
  const sc = await dv.get(`solutioncomponents?$select=componenttype&$filter=objectid eq ${modelId}`);
  if (sc.value.length) await dv.addToSolution(modelId, sc.value[0].componenttype, true).catch((e) => console.log(`  add to solution: ${e.status}`));
  fs.writeFileSync(path.join(__dirname, 'prompt-id.txt'), modelId);
  console.log(`Prompt ${NAME} ready: ${modelId}`);
})().catch((e) => { console.error(e.message.slice(0, 1500)); process.exit(1); });
