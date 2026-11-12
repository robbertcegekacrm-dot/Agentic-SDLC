// Adds a Copilot Studio agent (bot) and its required components to the AgenticSDLC solution.
const dv = require('./dv');
const schema = process.argv[2];
(async () => {
  const bot = await dv.get(`bots?$select=botid,name&$filter=schemaname eq '${schema}'`);
  if (!bot.value.length) throw new Error(`Agent ${schema} not found`);
  const def = await dv.get("solutioncomponentdefinitions?$select=solutioncomponenttype&$filter=primaryentityname eq 'bot'");
  await dv.addToSolution(bot.value[0].botid, def.value[0].solutioncomponenttype, true);
  console.log(`+ agent ${bot.value[0].name} (${bot.value[0].botid}) with required components in ${dv.cfg.solution}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
