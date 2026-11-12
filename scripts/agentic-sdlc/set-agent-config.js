// Scripted agent: generative orchestration off, no general knowledge, file analysis
// or semantic search (build-standards: topic based agents).
const dv = require('./dv');
const schema = process.argv[2] || 'cgk_IntakeAgent';
(async () => {
  const b = await dv.get(`bots?$select=botid,configuration&$filter=schemaname eq '${schema}'`);
  const cfg = JSON.parse(b.value[0].configuration || '{}');
  cfg.$kind = 'BotConfiguration';
  cfg.settings = { ...(cfg.settings || {}), GenerativeActionsEnabled: false };
  cfg.aISettings = { ...(cfg.aISettings || {}), $kind: 'AISettings', useModelKnowledge: false, isFileAnalysisEnabled: false, isSemanticSearchEnabled: false, optInUseLatestModels: false };
  delete cfg.recognizer; // GenerativeActionsEnabled false = classic orchestration (trigger phrases)
  await dv.patch(`bots(${b.value[0].botid})`, { configuration: JSON.stringify(cfg) });
  console.log(`~ ${schema} configuration: ${JSON.stringify(cfg)}`);
})().catch((e) => { console.error(e.message.slice(0, 800)); process.exit(1); });
