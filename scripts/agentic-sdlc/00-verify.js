// Phase 0: verify environment, solution and publisher. Never creates either.
const dv = require('./dv');
(async () => {
  const who = await dv.get('WhoAmI');
  console.log('user', who.UserId);
  const s = await dv.get(`solutions?$select=solutionid,uniquename,friendlyname,version&$expand=publisherid($select=uniquename,friendlyname,customizationprefix,customizationoptionvalueprefix)&$filter=uniquename eq '${dv.cfg.solution}'`);
  if (!s.value.length) throw new Error(`Solution ${dv.cfg.solution} not found`);
  const p = s.value[0].publisherid;
  console.log(`solution ${s.value[0].uniquename} (${s.value[0].friendlyname}) v${s.value[0].version}`);
  console.log(`publisher ${p.uniquename} (${p.friendlyname}) prefix ${p.customizationprefix} option prefix ${p.customizationoptionvalueprefix}`);
  if (p.customizationprefix !== dv.cfg.prefix || p.customizationoptionvalueprefix !== dv.cfg.optionPrefix) throw new Error('Prefix mismatch with config.js');
  console.log('OK');
})().catch((e) => { console.error(e.message); process.exit(1); });
