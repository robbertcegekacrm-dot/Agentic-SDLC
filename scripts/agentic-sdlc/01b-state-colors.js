// Phase 1 (end): State and Status Reason colors for all tables in one import,
// via a minimal temporary solution (statecode + statuscode only).
const path = require('path');
const dv = require('./dv');
const model = require('./model');
const { importStateColors } = require('../lib/state-colors');

(async () => {
  await importStateColors(dv, {
    tables: model.tables.map((t) => ({ name: t.name, statuses: t.statuses })),
    stateColors: model.stateColors,
    tempName: 'AgenticSDLCColors',
    outDir: path.resolve(__dirname, '..', '..', 'out', 'state-colors'),
  });
  await dv.publishAll();
  // Read back one status color to log it.
  const r = await dv.get("EntityDefinitions(LogicalName='cgk_sdlcstory')/Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)");
  for (const o of r.OptionSet.Options) console.log(`  ${o.Value} ${o.Label.UserLocalizedLabel?.Label} ${o.Color}`);
})().catch((e) => { console.error(e.message); process.exit(1); });
