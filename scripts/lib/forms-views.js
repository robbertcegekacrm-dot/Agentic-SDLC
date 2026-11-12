// Generic builders for main forms and views (taken from the PWN demo and made
// model independent). Views use the Power Apps grid control with colored option
// sets; choice fields on forms use the OptionSet Wrapper control.
//
// model: { tables, table(short), relName(t, c), lcid }
//   table: { short, name, label, plural, primary: { name, label, type }, columns: [{ name, label, type, targetName? }] }
// Field references in specs are logical names without the `cgk_` prefix
// ('familienaam', 'arrangement') or system names ('statuscode', 'ownerid').
const crypto = require('crypto');

const SYSTEM = ['statuscode', 'statecode', 'ownerid', 'createdon', 'modifiedon'];

const classIds = {
  text: '{4273EDBD-AC1D-40d3-9FB2-095C621B552D}', email: '{ADA2203E-B4CD-49be-9DDF-234642B43B52}', phone: '{4273EDBD-AC1D-40d3-9FB2-095C621B552D}',
  url: '{71716B6C-711E-476c-8AB8-5D11542BFB47}', memo: '{E0DECE4B-6FC8-4a8f-A065-082708572369}', choice: '{3EF39988-22BB-4f0b-BBBE-64B5A3748AEE}',
  multi: '{4AA28AB7-9C13-4F57-A73D-AD894D048B5F}', status: '{5D68B988-0661-4db2-BC3E-17598AD3BE6C}', date: '{5B773807-9FB2-42db-97C3-7A91EFF8ADFF}',
  datetime: '{5B773807-9FB2-42db-97C3-7A91EFF8ADFF}', decimal: '{C3EFE0C3-0EC6-42be-8349-CBD9079DFD8E}', money: '{533B9E00-756B-4312-95A0-DC888637AC78}',
  whole: '{C6D124CA-7EDA-4a60-AEA9-7FB8D318B68F}', bool: '{67FAC785-CD58-4f9f-ABB3-4B7DDC6ED5ED}', lookup: '{270BD3DB-D9AF-4782-9025-509E298DEC0A}',
  subgrid: '{E7A81278-8635-4d9e-8D4D-59480B391C5B}', timeline: '{06375649-c143-495e-a496-c962e5b4488e}', webresource: '{9FDF5F91-88B1-47f4-AD53-C11EFC01A01D}',
};

// Power Apps grid control with colored option sets, for all three form factors.
const gridParams = '<data-set name="Items"><ViewId>00000000-0000-0000-0000-000000000000</ViewId></data-set>'
  + '<EnableEditing static="true" type="Enum">no</EnableEditing><EnableFiltering static="true" type="Enum">yes</EnableFiltering>'
  + '<EnableSorting static="true" type="Enum">yes</EnableSorting><EnableGrouping static="true" type="Enum">yes</EnableGrouping>'
  + '<EnableMultipleSelection static="true" type="Enum">yes</EnableMultipleSelection><EnableJumpBar static="true" type="Enum">no</EnableJumpBar>'
  + '<EnableDropdownColor static="true" type="Enum">yes</EnableDropdownColor><EnableStatusIcons static="true" type="Enum">yes</EnableStatusIcons>'
  + '<NavigationTypesAllowed static="true" type="Enum">all</NavigationTypesAllowed><ReflowBehavior static="true" type="Enum">Reflow</ReflowBehavior>'
  + '<EnableStatusColumn static="true" type="Enum">yes</EnableStatusColumn>';
const gridControl = '<controlDescriptions><controlDescription><customControl id="{E7A81278-8635-4D9E-8D4D-59480B391C5B}"><parameters /></customControl>'
  + [0, 1, 2].map((ff) => `<customControl formFactor="${ff}" name="Microsoft.PowerApps.PowerAppsOneGrid"><parameters>${gridParams}</parameters></customControl>`).join('')
  + '</controlDescription></controlDescriptions>';

// Choice fields (local, multi select and Status Reason) get the OptionSet Wrapper
// control for web, phone and tablet, copied from the out of the box Enhanced quick case form.
const WRAPPER = 'MscrmControls.FieldControls.OptionSetWrapper';
const choiceTypes = ['choice', 'status'];

function createFormsViews(dv, model) {
  const lc = model.lcid;
  const g = () => `{${crypto.randomUUID()}}`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const f = (x) => (SYSTEM.includes(x) ? x : `cgk_${x}`);
  const lbl = (s) => `<labels><label description="${esc(s)}" languagecode="${lc}" /></labels>`;

  // ---------- Views ----------
  const cond = (attr, op, value) => `<condition attribute="${f(attr)}" operator="${op}"${value !== undefined ? ` value="${value}"` : ''} />`;
  const inList = (attr, values) => `<condition attribute="${f(attr)}" operator="in">${values.map((v) => `<value>${v}</value>`).join('')}</condition>`;
  const colName = (c) => (c.includes('.') ? `${c.split('.')[0]}.${f(c.split('.')[1])}` : f(c));

  function fetchXml(t, v) {
    const [sattr, desc] = v.sort;
    const own = v.cols.filter(([c]) => !c.includes('.'));
    const state = v.state === undefined ? 0 : v.state;
    const tb = model.table(t);
    return `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="${v.link ? 'true' : 'false'}"><entity name="${tb.name}">`
      + `<attribute name="${tb.name}id" />${own.map(([c]) => `<attribute name="${f(c)}" />`).join('')}`
      + `<order attribute="${f(sattr)}" descending="${desc}" />`
      + `<filter type="and">${state === 'all' ? '' : cond('statecode', 'eq', state)}${v.filter || ''}</filter>${v.link || ''}</entity></fetch>`;
  }

  function layoutXml(t, otc, cols) {
    const tb = model.table(t);
    return `<grid name="resultset" object="${otc}" jump="${tb.primary.name}" select="1" icon="1" preview="1"><row name="result" id="${tb.name}id">`
      + cols.map(([c, w]) => `<cell name="${colName(c)}" width="${w}" />`).join('') + `</row>${gridControl}</grid>`;
  }

  // defaultViews: { short: { name, cols: [[field, width]], sort: [field, desc], filter? } }
  // demoViews: [{ t, name, cols?, sort?, filter?, state?, link? }]
  async function ensureViews(defaultViews, demoViews, otcs) {
    const ids = {};
    for (const [t, v] of Object.entries(defaultViews)) {
      const tb = model.table(t);
      const views = await dv.get(`savedqueries?$select=savedqueryid&$filter=returnedtypecode eq '${tb.name}' and querytype eq 0 and isdefault eq true`);
      const id = views.value[0].savedqueryid;
      await dv.patch(`savedqueries(${id})`, { name: v.name, fetchxml: fetchXml(t, v), layoutxml: layoutXml(t, otcs[t], v.cols) });
      ids[`${t}:default`] = id;
      console.log(`~ default view ${tb.name}: ${v.name}`);
      // Quick find and lookup views get the same grid control and columns.
      const other = await dv.get(`savedqueries?$select=savedqueryid,querytype&$filter=returnedtypecode eq '${tb.name}' and (querytype eq 4 or querytype eq 64)`);
      for (const o of other.value) await dv.patch(`savedqueries(${o.savedqueryid})`, { layoutxml: layoutXml(t, otcs[t], v.cols.slice(0, 5)) });
    }
    for (const d of demoViews) {
      const v = { ...d, cols: d.cols || defaultViews[d.t].cols, sort: d.sort || defaultViews[d.t].sort };
      const tb = model.table(v.t);
      const body = { name: v.name, returnedtypecode: tb.name, querytype: 0, fetchxml: fetchXml(v.t, v), layoutxml: layoutXml(v.t, otcs[v.t], v.cols) };
      const ex = await dv.get(`savedqueries?$select=savedqueryid&$filter=returnedtypecode eq '${tb.name}' and name eq '${v.name.replace(/'/g, "''")}'`);
      if (ex.value.length) {
        await dv.patch(`savedqueries(${ex.value[0].savedqueryid})`, body);
        ids[`${v.t}:${v.name}`] = ex.value[0].savedqueryid;
        console.log(`~ view ${v.name}`);
      } else {
        ids[`${v.t}:${v.name}`] = (await dv.post('savedqueries', body)).__id;
        console.log(`+ view ${v.name}`);
      }
    }
    return ids;
  }

  // ---------- Forms ----------
  function column(t, name) {
    if (name === 'statuscode') return { name, label: 'Status', type: 'status' };
    if (name === 'ownerid') return { name, label: 'Eigenaar', type: 'lookup' };
    const tb = model.table(t);
    const full = f(name);
    if (full === tb.primary.name) return { ...tb.primary, type: 'text' };
    const c = tb.columns.find((x) => x.name === full);
    if (!c) throw new Error(`Unknown column ${t}.${name}`);
    return c;
  }

  const wrapperDescription = (uniqueId, c) => `<controlDescription forControl="${uniqueId}">`
    + `<customControl id="${classIds[c.type]}"><parameters><datafieldname>${c.name}</datafieldname></parameters></customControl>`
    + [0, 1, 2].map((ff) => `<customControl formFactor="${ff}" name="${WRAPPER}"><parameters><boundProperty type="OptionSet">${c.name}</boundProperty></parameters></customControl>`).join('')
    + '</controlDescription>';

  // A field name starting with "!" is read only, "^" hides the label.
  function fieldCell(t, raw, prefixId, ctx) {
    const flags = raw.match(/^[!^]*/)[0];
    const readOnly = flags.includes('!');
    const noLabel = flags.includes('^');
    const c = column(t, raw.slice(flags.length));
    let unique = '';
    if (choiceTypes.includes(c.type)) {
      const uid = g();
      unique = ` uniqueid="${uid}"`;
      ctx.descriptions.push(wrapperDescription(uid, c));
    }
    return `<cell id="${g()}" showlabel="${noLabel ? 'false' : 'true'}">${lbl(c.label)}<control id="${prefixId}${c.name}" classid="${classIds[c.type]}" datafieldname="${c.name}" disabled="${readOnly}"${unique} /></cell>`;
  }

  // Subgrids always filter on the relationship (related records only).
  function subgridRows(sg, ctx) {
    const target = model.table(sg.t);
    const lookupCol = target.columns.find((c) => c.name === f(sg.via));
    const rel = model.relName(target, lookupCol);
    ctx.subgrids.push({ rel, referenced: ctx.tableName, target: target.name, attr: lookupCol.name, id: sg.id });
    const viewId = ctx.views[`${sg.t}:${sg.view || 'default'}`];
    if (!viewId) throw new Error(`No view ${sg.t}:${sg.view}`);
    const rows = sg.rows || 6;
    const params = `<parameters><ViewId>{${viewId}}</ViewId><IsUserView>false</IsUserView><RelationshipName>${rel}</RelationshipName>`
      + `<TargetEntityType>${target.name}</TargetEntityType><AutoExpand>Fixed</AutoExpand><EnableQuickFind>false</EnableQuickFind>`
      + '<EnableViewPicker>false</EnableViewPicker><ViewIds /><EnableJumpBar>false</EnableJumpBar><ChartGridMode>Grid</ChartGridMode>'
      + `<VisualizationId /><IsUserChart>false</IsUserChart><EnableChartPicker>false</EnableChartPicker><RecordsPerPage>${sg.perPage || rows - 1}</RecordsPerPage></parameters>`;
    const cell = `<cell id="${g()}" showlabel="true" rowspan="${rows}" colspan="1" auto="false">${lbl(sg.label || target.plural)}`
      + `<control id="sg_${sg.id}" classid="${classIds.subgrid}" indicationOfSubgrid="true">${params}</control></cell>`;
    return `<row>${cell}</row>` + '<row />'.repeat(rows - 1);
  }

  const timelineRows = () => `<row><cell id="${g()}" showlabel="false" rowspan="14" colspan="1" auto="false">${lbl('Tijdlijn')}`
    + `<control id="notescontrol" classid="${classIds.timeline}"><parameters><DefaultTabId>ActivitiesTab</DefaultTabId></parameters></control></cell></row>` + '<row />'.repeat(13);

  // Web resource control (HTML), full width.
  const webResourceRows = (w) => `<row><cell id="${g()}" showlabel="false" rowspan="${w.rows || 24}" colspan="1" auto="false">${lbl(w.label)}`
    + `<control id="WebResource_${w.id}" classid="${classIds.webresource}"><parameters><Url>${w.name}</Url><PassParameters>true</PassParameters>`
    + '<ShowOnMobileClient>false</ShowOnMobileClient><Security>false</Security><Scrolling>auto</Scrolling><Border>false</Border>'
    + `<WebResourceId>{${w.webresourceid}}</WebResourceId></parameters></control></cell></row>` + '<row />'.repeat((w.rows || 24) - 1);

  function section(t, s, ctx) {
    let rows;
    let cols = 1;
    if (s.subgrid) rows = subgridRows(s.subgrid, ctx);
    else if (s.timeline) rows = timelineRows();
    else if (s.webresource) rows = webResourceRows(s.webresource);
    else if (s.two) {
      cols = 2;
      rows = '';
      for (let i = 0; i < s.fields.length; i += 2) rows += `<row>${s.fields.slice(i, i + 2).map((x) => fieldCell(t, x, '', ctx)).join('')}</row>`;
    } else rows = (s.fields || []).map((x) => `<row>${fieldCell(t, x, '', ctx)}</row>`).join('');
    const showLabel = s.subgrid || s.timeline || s.webresource ? 'false' : 'true';
    return `<section name="${s.name}" id="${g()}" showlabel="${showLabel}" showbar="false" IsUserDefined="0" columns="${cols === 2 ? '11' : '1'}" labelwidth="140" celllabelalignment="Left" celllabelposition="Left">`
      + `${lbl(s.label)}<rows>${rows}</rows></section>`;
  }

  // spec: { header: [fields], tabs: [{ label, columns: [[sections]] }], libraries: [name],
  //         events: [{ name: 'onload'|'onchange'|'onsave', attribute?, functionName, library }] }
  function formXml(t, spec, views) {
    const ctx = { views, descriptions: [], subgrids: [], tableName: model.table(t).name };
    const tabs = spec.tabs.map((tab, i) => {
      const cols = tab.columns.map((sections) => `<column width="${Math.floor(100 / tab.columns.length)}%"><sections>${sections.map((s) => section(t, s, ctx)).join('')}</sections></column>`).join('');
      return `<tab name="${tab.name || `tab_${i}`}" id="${g()}" IsUserDefined="0" locklevel="0" showlabel="true" expanded="true">${lbl(tab.label)}<columns>${cols}</columns></tab>`;
    }).join('');
    const header = `<header id="${g()}" celllabelposition="Top" columns="1111" labelwidth="115" celllabelalignment="Left"><rows><row>`
      + spec.header.map((x) => fieldCell(t, x, 'header_', ctx)).join('') + '</row></rows></header>';
    const byEvent = {};
    for (const e of spec.events || []) (byEvent[`${e.name}|${e.attribute || ''}`] ||= []).push(e);
    const events = Object.keys(byEvent).length ? `<events>${Object.entries(byEvent).map(([k, hs]) => {
      const [name, attribute] = k.split('|');
      return `<event name="${name}" application="false" active="false"${attribute ? ` attribute="${f(attribute)}"` : ''}><Handlers>`
        + hs.map((h) => `<Handler functionName="${h.functionName}" libraryName="${h.library}" handlerUniqueId="${g()}" enabled="true" parameters="" passExecutionContext="true" />`).join('')
        + '</Handlers></event>';
    }).join('')}</events>` : '';
    const libs = spec.libraries?.length ? `<formLibraries>${spec.libraries.map((l) => `<Library name="${l}" libraryUniqueId="${g()}" />`).join('')}</formLibraries>` : '';
    return { xml: `<form><tabs>${tabs}</tabs>${events}${header}<controlDescriptions>${ctx.descriptions.join('')}</controlDescriptions>${libs}</form>`, subgrids: ctx.subgrids };
  }

  // Overwrites the main form of every table in `forms` after checking that each
  // subgrid relationship links the form table to the subgrid table via the lookup.
  async function ensureForms(forms, views) {
    for (const [t, spec] of Object.entries(forms)) {
      const tb = model.table(t);
      const { xml, subgrids } = formXml(t, spec, views);
      for (const s of subgrids) {
        const rel = await dv.get(`RelationshipDefinitions(SchemaName='${s.rel}')/Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata?$select=ReferencedEntity,ReferencingEntity,ReferencingAttribute`);
        if (rel.ReferencedEntity !== s.referenced || rel.ReferencingEntity !== s.target || rel.ReferencingAttribute !== s.attr) {
          throw new Error(`Subgrid ${s.id} on ${t}: relationship ${s.rel} does not link ${s.referenced} to ${s.target}.${s.attr}`);
        }
      }
      const r = await dv.get(`systemforms?$select=formid,name&$filter=objecttypecode eq '${tb.name}' and type eq 2`);
      if (!r.value.length) throw new Error(`No main form found for ${tb.name}`);
      await dv.patch(`systemforms(${r.value[0].formid})`, { name: tb.label, formxml: xml });
      console.log(`~ form ${tb.name} (${subgrids.length} subgrids)`);
    }
  }

  return { f, cond, inList, fetchXml, layoutXml, ensureViews, formXml, ensureForms, column };
}

module.exports = { createFormsViews, classIds, gridControl, WRAPPER };
