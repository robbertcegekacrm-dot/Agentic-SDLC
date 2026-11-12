// Phase 1: tables, columns, local choices with colors, lookups, status reasons,
// environment variables. Idempotent; every call carries MSCRM.SolutionUniqueName.
// State and Status Reason colors are applied afterwards by 01b-state-colors.js.
const dv = require('./dv');
const model = require('./model');
const md = require('../lib/metadata').createMetadata(dv, model.choices);

(async () => {
  for (const t of model.tables) await md.ensureTable(t);
  for (const t of model.tables) {
    for (const c of t.columns.filter((x) => x.type === 'lookup')) await md.ensureLookup(t, c, c.rel);
  }
  for (const t of model.tables) await md.ensureStatuses(t);
  for (const v of model.envVars) await md.ensureEnvVar(v);
  await md.ensureTablesInSolution(model.tables);

  const missing = await md.missingColumns(model.tables);
  if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}`);
  await dv.publishEntities(model.tables.map((t) => t.name));
  console.log('Phase 1 schema done (tables published).');
})().catch((e) => { console.error(e.message); process.exit(1); });
