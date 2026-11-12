// Web resources: create or update from local files. Types: 1 HTML, 2 CSS, 3 JS,
// 4 XML, 5 PNG, 11 SVG. Returns the webresourceid. The solution header on the
// request adds new web resources to the demo solution.
const fs = require('fs');
const path = require('path');

const TYPES = { '.html': 1, '.htm': 1, '.css': 2, '.js': 3, '.xml': 4, '.png': 5, '.svg': 11 };

async function ensureWebResource(dv, { name, displayName, file, description }) {
  const content = fs.readFileSync(file).toString('base64');
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) throw new Error(`Unknown web resource type for ${file}`);
  const ex = await dv.get(`webresourceset?$select=webresourceid,content&$filter=name eq '${name}'`);
  if (ex.value.length) {
    const id = ex.value[0].webresourceid;
    if (ex.value[0].content !== content) { await dv.patch(`webresourceset(${id})`, { content, displayname: displayName }); console.log(`~ web resource ${name}`); }
    else console.log(`= web resource ${name}`);
    return id;
  }
  const id = (await dv.post('webresourceset', { name, displayname: displayName, description: description || displayName, webresourcetype: type, content })).__id;
  console.log(`+ web resource ${name}`);
  return id;
}

// Uploads every file below `dir`; the published name is `<prefix><relative path>`.
async function ensureWebResourceFolder(dv, dir, prefix) {
  const ids = {};
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/');
    const name = `${prefix}${rel}`;
    ids[name] = await ensureWebResource(dv, { name, displayName: name, file });
  }
  return ids;
}

module.exports = { ensureWebResource, ensureWebResourceFolder };
