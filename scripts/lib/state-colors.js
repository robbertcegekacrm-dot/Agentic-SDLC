// State and Status Reason colors for all tables of a demo in one import. The Web
// API has no Color parameter for state and status options, so this builds a
// minimal temporary solution that holds, per table, only the statecode and
// statuscode attributes (no forms, views or apps). It exports and unpacks that
// solution, sets Color on every <state> and <status>, packs and imports it once,
// and removes the temporary solution again (the components stay in the main one).
// tables: [{ name, statuses: [{ value, color }] }], stateColors: { 0: hex, 1: hex }
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PAC = process.env.PAC || (process.platform === 'win32'
  ? `"${path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'PowerAppsCLI', 'pac.cmd')}"`
  : 'pac');
const pac = (args) => execSync(`${PAC} ${args}`, { stdio: 'inherit', shell: true });

async function importStateColors(dv, { tables, stateColors, tempName, outDir }) {
  const main = await dv.get(`solutions?$select=_publisherid_value&$filter=uniquename eq '${dv.cfg.solution}'`);
  const old = await dv.get(`solutions?$select=solutionid&$filter=uniquename eq '${tempName}'`);
  for (const s of old.value) await dv.del(`solutions(${s.solutionid})`, { solution: false });
  // A solution recreated right after a delete can hit a stale id; give the platform a moment.
  if (old.value.length) await dv.sleep(15000);
  await dv.post('solutions', {
    uniquename: tempName, friendlyname: `${dv.cfg.solution} colors (temporary)`, version: '1.0.0.0',
    'publisherid@odata.bind': `/publishers(${main.value[0]._publisherid_value})`,
  }, { solution: false });
  const temp = await dv.get(`solutions?$select=solutionid&$filter=uniquename eq '${tempName}'`);

  for (const t of tables) {
    const md = await dv.get(`EntityDefinitions(LogicalName='${t.name}')?$select=MetadataId`);
    await dv.post('AddSolutionComponent', {
      ComponentId: md.MetadataId, ComponentType: 1, SolutionUniqueName: tempName, AddRequiredComponents: false, DoNotIncludeSubcomponents: true,
    }, { solution: false });
    for (const a of ['statecode', 'statuscode']) {
      const am = await dv.get(`EntityDefinitions(LogicalName='${t.name}')/Attributes(LogicalName='${a}')?$select=MetadataId`);
      await dv.post('AddSolutionComponent', { ComponentId: am.MetadataId, ComponentType: 2, SolutionUniqueName: tempName, AddRequiredComponents: false }, { solution: false });
    }
  }
  const comps = await dv.getAll(`solutioncomponents?$select=componenttype&$filter=_solutionid_value eq ${temp.value[0].solutionid}`);
  const byType = comps.reduce((m, c) => { m[c.componenttype] = (m[c.componenttype] || 0) + 1; return m; }, {});
  console.log(`temporary solution components by type: ${JSON.stringify(byType)}`);
  if (Object.keys(byType).some((k) => !['1', '2'].includes(k))) throw new Error('Temporary solution contains more than tables and attributes');

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const zip = path.join(outDir, `${tempName}.zip`);
  const src = path.join(outDir, 'src');
  pac(`solution export --name ${tempName} --path "${zip}" --overwrite`);
  pac(`solution unpack --zipfile "${zip}" --folder "${src}" --packagetype Unmanaged --clobber`);
  const extra = fs.readdirSync(src).filter((d) => !['Entities', 'Other'].includes(d));
  if (extra.length) throw new Error(`Unexpected folders in minimal solution: ${extra.join(', ')}`);

  for (const t of tables) {
    const dir = fs.readdirSync(path.join(src, 'Entities')).find((d) => d.toLowerCase() === t.name);
    const entityDir = path.join(src, 'Entities', dir);
    // RibbonDiff.xml is an empty default file that every table export contains.
    const others = fs.readdirSync(entityDir).filter((x) => !['Entity.xml', 'RibbonDiff.xml'].includes(x));
    if (others.length) throw new Error(`${dir} contains ${others.join(', ')} (expected only Entity.xml and RibbonDiff.xml)`);
    const file = path.join(entityDir, 'Entity.xml');
    let xml = fs.readFileSync(file, 'utf8');
    const attrs = [...xml.matchAll(/<attribute PhysicalName="([^"]+)"/g)].map((m) => m[1].toLowerCase());
    if (attrs.some((a) => !['statecode', 'statuscode'].includes(a))) throw new Error(`${dir} contains attributes ${attrs.join(', ')}`);
    xml = xml.replace(/<state value="(\d+)"([^>]*?)>/g, (m, v, rest) => `<state value="${v}"${rest.replace(/\s*Color="[^"]*"/, '')} Color="${stateColors[v]}">`);
    xml = xml.replace(/<status value="(\d+)"([^>]*?)>/g, (m, v, rest) => {
      const s = t.statuses.find((x) => x.value === Number(v));
      return s ? `<status value="${v}"${rest.replace(/\s*Color="[^"]*"/, '')} Color="${s.color}">` : m;
    });
    fs.writeFileSync(file, xml);
    console.log(`~ colors in ${dir}/Entity.xml`);
  }
  const packed = path.join(outDir, `${tempName}_colored.zip`);
  pac(`solution pack --zipfile "${packed}" --folder "${src}" --packagetype Unmanaged`);
  pac(`solution import --path "${packed}" --async --max-async-wait-time 60`);

  await dv.del(`solutions(${temp.value[0].solutionid})`, { solution: false });
  console.log(`- temporary solution ${tempName} removed (components stay in ${dv.cfg.solution})`);
}

module.exports = { importStateColors };
