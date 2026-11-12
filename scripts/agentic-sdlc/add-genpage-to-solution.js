// Adds a generative page (by id) to the AgenticSDLC solution, using the component
// type that the page already has in the Default solution.
const dv = require('./dv');
const id = process.argv[2];
(async () => {
  const comps = await dv.get(`solutioncomponents?$select=componenttype,_solutionid_value&$filter=objectid eq ${id}`);
  if (!comps.value.length) throw new Error(`Page ${id} not found as a solution component`);
  const sol = await dv.get(`solutions?$select=solutionid&$filter=uniquename eq '${dv.cfg.solution}'`);
  if (comps.value.some((c) => c._solutionid_value === sol.value[0].solutionid)) { console.log('= page already in solution'); return; }
  await dv.addToSolution(id, comps.value[0].componenttype);
  console.log(`+ page ${id} added to ${dv.cfg.solution} (component type ${comps.value[0].componenttype})`);
})().catch((e) => { console.error(e.message); process.exit(1); });
