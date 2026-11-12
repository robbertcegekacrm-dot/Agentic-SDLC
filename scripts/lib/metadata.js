// Generic metadata helpers on top of dv.js: tables with their columns in one
// call, lookups, alternate keys, status reasons, environment variables and
// solution membership. Works on a declarative model:
//   table: { schema, name, label, plural, description, primary, columns, keys,
//            statuses, activities, notes, activityParty }
//   column: { type, schema, name, label, required, ... } (see attributeBody)
// choices: { <set>: [{ value, label, color }] } for local choice columns.

const MD = 'Microsoft.Dynamics.CRM.';
const req = (level = 'None') => ({ Value: level, CanBeChanged: true, ManagedPropertyLogicalName: 'canmodifyrequirementlevelsettings' });
const audit = { Value: true, CanBeChanged: true, ManagedPropertyLogicalName: 'canmodifyauditsettings' };

function createMetadata(dv, choices = {}) {
  const { label, cfg } = dv;
  const option = (o) => ({ Value: o.value, Label: label(o.label), Color: o.color });

  function attributeBody(c) {
    const base = {
      SchemaName: c.schema, DisplayName: label(c.label), Description: label(c.description || c.label),
      RequiredLevel: req(c.required ? 'ApplicationRequired' : 'None'), IsAuditEnabled: audit,
    };
    const str = (format, maxLength) => ({ '@odata.type': MD + 'StringAttributeMetadata', ...base, MaxLength: maxLength, FormatName: { Value: format } });
    switch (c.type) {
      case 'text': return { ...str('Text', c.maxLength || 100), ...(c.autonumber ? { AutoNumberFormat: c.autonumber } : {}) };
      case 'email': return str('Email', 100);
      case 'phone': return str('Phone', 50);
      case 'url': return str('Url', 200);
      case 'memo': return { '@odata.type': MD + 'MemoAttributeMetadata', ...base, MaxLength: c.maxLength || 4000, Format: 'TextArea' };
      case 'date': return { '@odata.type': MD + 'DateTimeAttributeMetadata', ...base, Format: 'DateOnly', DateTimeBehavior: { Value: 'DateOnly' } };
      case 'datetime': return { '@odata.type': MD + 'DateTimeAttributeMetadata', ...base, Format: 'DateAndTime', DateTimeBehavior: { Value: 'UserLocal' } };
      case 'decimal': return { '@odata.type': MD + 'DecimalAttributeMetadata', ...base, Precision: c.precision ?? 2, MinValue: 0, MaxValue: 1000000 };
      case 'money': return { '@odata.type': MD + 'MoneyAttributeMetadata', ...base, Precision: 2, PrecisionSource: 2, MinValue: 0, MaxValue: 1000000 };
      case 'whole': return { '@odata.type': MD + 'IntegerAttributeMetadata', ...base, Format: 'None', MinValue: c.min ?? 0, MaxValue: c.max ?? 100000 };
      case 'bool':
        return {
          '@odata.type': MD + 'BooleanAttributeMetadata', ...base, DefaultValue: !!c.default,
          OptionSet: { '@odata.type': MD + 'BooleanOptionSetMetadata', TrueOption: { Value: 1, Label: label('Ja') }, FalseOption: { Value: 0, Label: label('Nee') } },
        };
      case 'choice':
        return {
          '@odata.type': MD + 'PicklistAttributeMetadata', ...base, DefaultFormValue: -1,
          OptionSet: { '@odata.type': MD + 'OptionSetMetadata', IsGlobal: false, OptionSetType: 'Picklist', Options: choices[c.choice].map(option) },
        };
      case 'multi':
        return {
          '@odata.type': MD + 'MultiSelectPicklistAttributeMetadata', ...base, DefaultFormValue: -1,
          OptionSet: { '@odata.type': MD + 'OptionSetMetadata', IsGlobal: false, OptionSetType: 'Picklist', Options: choices[c.choice].map(option) },
        };
      default: throw new Error(`Unsupported type ${c.type}`);
    }
  }

  const primaryBody = (t) => ({
    '@odata.type': MD + 'StringAttributeMetadata', SchemaName: t.primary.schema, IsPrimaryName: true,
    MaxLength: t.primary.maxLength || 100, FormatName: { Value: 'Text' }, RequiredLevel: req('ApplicationRequired'),
    DisplayName: label(t.primary.label), Description: label(t.primary.label),
  });

  // Creates the table with its primary column and all non lookup columns in one
  // call. For an existing table, missing columns are added one by one.
  async function ensureTable(t) {
    const existing = await dv.tryGet(`EntityDefinitions(LogicalName='${t.name}')?$select=MetadataId,HasActivities,HasNotes,IsActivityParty`);
    const plain = t.columns.filter((c) => c.type !== 'lookup');
    if (!existing) {
      await dv.post('EntityDefinitions', {
        '@odata.type': MD + 'EntityMetadata', SchemaName: t.schema,
        DisplayName: label(t.label), DisplayCollectionName: label(t.plural), Description: label(t.description),
        OwnershipType: 'UserOwned', IsActivity: false, HasActivities: !!t.activities, HasNotes: !!t.notes,
        IsActivityParty: !!t.activityParty, HasEmailAddresses: plain.some((c) => c.type === 'email'), IsAuditEnabled: audit,
        Attributes: [primaryBody(t), ...plain.map(attributeBody)],
      });
      console.log(`+ table ${t.schema} with ${plain.length + 1} columns`);
      return;
    }
    const attrs = await dv.get(`EntityDefinitions(LogicalName='${t.name}')/Attributes?$select=LogicalName`);
    const have = new Set(attrs.value.map((a) => a.LogicalName));
    for (const c of plain.filter((x) => !have.has(x.name))) {
      await dv.post(`EntityDefinitions(LogicalName='${t.name}')/Attributes`, attributeBody(c));
      console.log(`+ column ${t.name}.${c.name}`);
    }
    if ((t.activities && !existing.HasActivities) || (t.notes && !existing.HasNotes) || (t.activityParty && !existing.IsActivityParty)) {
      const full = await dv.get(`EntityDefinitions(LogicalName='${t.name}')`);
      await dv.put(`EntityDefinitions(LogicalName='${t.name}')`, {
        ...full, HasActivities: !!t.activities || full.HasActivities, HasNotes: !!t.notes || full.HasNotes, IsActivityParty: !!t.activityParty || full.IsActivityParty,
      }, { headers: { 'MSCRM.MergeLabels': 'true' } });
      console.log(`~ activities, notes or activity party enabled on ${t.name}`);
    }
    if (!plain.length || have.size) console.log(`= table ${t.schema}`);
  }

  const cascades = {
    parental: { Assign: 'Cascade', Delete: 'Cascade', Merge: 'NoCascade', Reparent: 'Cascade', Share: 'Cascade', Unshare: 'Cascade' },
    restrict: { Assign: 'NoCascade', Delete: 'Restrict', Merge: 'NoCascade', Reparent: 'NoCascade', Share: 'NoCascade', Unshare: 'NoCascade' },
    referential: { Assign: 'NoCascade', Delete: 'RemoveLink', Merge: 'NoCascade', Reparent: 'NoCascade', Share: 'NoCascade', Unshare: 'NoCascade' },
  };

  async function ensureLookup(t, c, relSchema) {
    const ex = await dv.tryGet(`EntityDefinitions(LogicalName='${t.name}')/Attributes(LogicalName='${c.name}')?$select=MetadataId`);
    if (ex) return false;
    await dv.post('RelationshipDefinitions', {
      '@odata.type': MD + 'OneToManyRelationshipMetadata',
      SchemaName: relSchema, ReferencedEntity: c.targetName, ReferencingEntity: t.name, CascadeConfiguration: cascades[c.cascade || 'referential'],
      AssociatedMenuConfiguration: { Behavior: 'UseCollectionName', Group: 'Details', Order: 10000 },
      Lookup: {
        '@odata.type': MD + 'LookupAttributeMetadata', SchemaName: c.schema,
        DisplayName: label(c.label), Description: label(c.label), RequiredLevel: req(c.required ? 'ApplicationRequired' : 'None'),
      },
    });
    console.log(`+ lookup ${t.name}.${c.name} -> ${c.targetName} (${relSchema})`);
    return true;
  }

  // keys: [[displayName, [logical attribute names]]]
  async function ensureKeys(t) {
    if (!t.keys) return;
    const ex = await dv.get(`EntityDefinitions(LogicalName='${t.name}')/Keys?$select=SchemaName`);
    for (const [display, attrs] of t.keys) {
      const schema = `${t.schema}_${display}`;
      if (ex.value.some((k) => k.SchemaName.toLowerCase() === schema.toLowerCase())) continue;
      await dv.post(`EntityDefinitions(LogicalName='${t.name}')/Keys`, { SchemaName: schema, DisplayName: label(display), KeyAttributes: attrs });
      console.log(`+ key ${schema}`);
    }
  }

  async function ensureStatuses(t) {
    const md = await dv.get(`EntityDefinitions(LogicalName='${t.name}')/Attributes(LogicalName='statuscode')/Microsoft.Dynamics.CRM.StatusAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options)`);
    const have = new Map(md.OptionSet.Options.map((o) => [o.Value, o.Label.UserLocalizedLabel?.Label]));
    for (const s of t.statuses) {
      if (have.get(s.value) === s.label) continue;
      if (have.has(s.value)) {
        await dv.post('UpdateOptionValue', {
          EntityLogicalName: t.name, AttributeLogicalName: 'statuscode', Value: s.value, Label: label(s.label), MergeLabels: true, SolutionUniqueName: cfg.solution,
        }, { solution: false });
        console.log(`~ status ${t.short}: ${s.value} -> ${s.label}`);
      } else {
        await dv.post('InsertStatusValue', {
          EntityLogicalName: t.name, AttributeLogicalName: 'statuscode', Value: s.value, Label: label(s.label), StateCode: s.state, SolutionUniqueName: cfg.solution,
        }, { solution: false });
        console.log(`+ status ${t.short}: ${s.value} ${s.label} (state ${s.state})`);
      }
    }
  }

  // Environment variable definitions (String). Without `value` the definition gets
  // no default value (secrets such as a PAT: set only as current value, manually).
  async function ensureEnvVar(v) {
    const ex = await dv.get(`environmentvariabledefinitions?$select=environmentvariabledefinitionid,defaultvalue&$filter=schemaname eq '${v.schema}'`);
    if (ex.value.length) {
      const id = ex.value[0].environmentvariabledefinitionid;
      if (v.value === undefined) {
        if (ex.value[0].defaultvalue) await dv.patch(`environmentvariabledefinitions(${id})`, { defaultvalue: null });
      } else if (ex.value[0].defaultvalue !== v.value) await dv.patch(`environmentvariabledefinitions(${id})`, { defaultvalue: v.value });
      console.log(`= environment variable ${v.schema}`);
      return id;
    }
    const body = { schemaname: v.schema, displayname: v.label, description: v.description, type: 100000000 };
    if (v.value !== undefined) body.defaultvalue = v.value;
    const id = (await dv.post('environmentvariabledefinitions', body)).__id;
    console.log(`+ environment variable ${v.schema}${v.value === undefined ? ' (no default value)' : ''}`);
    return id;
  }

  async function solutionComponentIds() {
    const sol = await dv.get(`solutions?$select=solutionid&$filter=uniquename eq '${cfg.solution}'`);
    const comps = await dv.getAll(`solutioncomponents?$select=objectid&$filter=_solutionid_value eq ${sol.value[0].solutionid}`);
    return new Set(comps.map((c) => c.objectid));
  }

  async function ensureTablesInSolution(tables) {
    const ids = await solutionComponentIds();
    for (const t of tables) {
      const md = await dv.get(`EntityDefinitions(LogicalName='${t.name}')?$select=MetadataId`);
      if (!ids.has(md.MetadataId)) { await dv.addToSolution(md.MetadataId, 1, false); console.log(`  added ${t.name} to solution`); }
    }
  }

  async function missingColumns(tables) {
    const missing = [];
    for (const t of tables) {
      const attrs = await dv.get(`EntityDefinitions(LogicalName='${t.name}')/Attributes?$select=LogicalName`);
      const names = new Set(attrs.value.map((a) => a.LogicalName));
      for (const c of [t.primary, ...t.columns]) if (!names.has(c.name)) missing.push(`${t.name}.${c.name}`);
    }
    return missing;
  }

  return { attributeBody, ensureTable, ensureLookup, ensureKeys, ensureStatuses, ensureEnvVar, ensureTablesInSolution, missingColumns, solutionComponentIds };
}

module.exports = { createMetadata };
