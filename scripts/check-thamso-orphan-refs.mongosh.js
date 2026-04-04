/**
 * Cross-check ThamSo references:
 * - FormConfig.Tabs.FieldSetIds -> FieldSet._id
 * - FieldSet.FieldIds -> DynamicField._id
 * - Detect legacy shadow "Id" field (should be removed, only _id is source of truth)
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/check-thamso-orphan-refs.mongosh.js
 */

const dbName = db.getName();
print(`[check-thamso-orphan-refs] database=${dbName}`);

const normalizeId = (v) => String(v ?? '').trim().toLowerCase();
const isMetaToken = (v) => normalizeId(v).startsWith('__meta:');
const isActive = { Delete: { $ne: true } };

const dynamicFields = db.DynamicField.find(isActive, { _id: 1, Id: 1 }).toArray();
const fieldSets = db.FieldSet.find(isActive, { _id: 1, Id: 1, Name: 1, FieldIds: 1 }).toArray();
const formConfigs = db.FormConfig.find(isActive, { _id: 1, Id: 1, Key: 1, Name: 1, Tabs: 1 }).toArray();

const dynamicFieldIdSet = new Set(dynamicFields.map((d) => normalizeId(d._id)));
const fieldSetIdSet = new Set(fieldSets.map((s) => normalizeId(s._id)));

const orphanFieldSetRefs = [];
const orphanFieldRefs = [];

const tabRefStats = {
  totalTabRefs: 0,
  invalidBlankTabRefs: 0,
};

for (const fc of formConfigs) {
  const tabs = Array.isArray(fc.Tabs) ? fc.Tabs : [];
  for (const tab of tabs) {
    const tabId = String(tab?._id ?? '');
    const setIds = Array.isArray(tab?.FieldSetIds) ? tab.FieldSetIds : [];
    for (const rawSetId of setIds) {
      if (isMetaToken(rawSetId)) {
        continue;
      }
      tabRefStats.totalTabRefs += 1;
      const setId = normalizeId(rawSetId);
      if (!setId) {
        tabRefStats.invalidBlankTabRefs += 1;
        orphanFieldSetRefs.push({
          formConfigId: String(fc._id),
          formConfigKey: String(fc.Key ?? ''),
          tabId,
          rawSetId: String(rawSetId ?? ''),
          reason: 'blank',
        });
        continue;
      }
      if (!fieldSetIdSet.has(setId)) {
        orphanFieldSetRefs.push({
          formConfigId: String(fc._id),
          formConfigKey: String(fc.Key ?? ''),
          tabId,
          rawSetId: String(rawSetId ?? ''),
          normalizedSetId: setId,
          reason: 'fieldset_not_found',
        });
      }
    }
  }
}

for (const fs of fieldSets) {
  const fieldIds = Array.isArray(fs.FieldIds) ? fs.FieldIds : [];
  for (const rawFieldId of fieldIds) {
    const fieldId = normalizeId(rawFieldId);
    if (!fieldId) {
      orphanFieldRefs.push({
        fieldSetId: String(fs._id),
        fieldSetName: String(fs.Name ?? ''),
        rawFieldId: String(rawFieldId ?? ''),
        reason: 'blank',
      });
      continue;
    }
    if (!dynamicFieldIdSet.has(fieldId)) {
      orphanFieldRefs.push({
        fieldSetId: String(fs._id),
        fieldSetName: String(fs.Name ?? ''),
        rawFieldId: String(rawFieldId ?? ''),
        normalizedFieldId: fieldId,
        reason: 'dynamic_field_not_found',
      });
    }
  }
}

const legacyShadow = {
  dynamicFieldHasId: db.DynamicField.countDocuments({ ...isActive, Id: { $exists: true } }),
  fieldSetHasId: db.FieldSet.countDocuments({ ...isActive, Id: { $exists: true } }),
  formConfigHasId: db.FormConfig.countDocuments({ ...isActive, Id: { $exists: true } }),
  tabHasId: db.FormConfig.countDocuments({ ...isActive, 'Tabs.Id': { $exists: true } }),
};

print('\n=== SUMMARY ===');
printjson({
  counts: {
    dynamicFields: dynamicFields.length,
    fieldSets: fieldSets.length,
    formConfigs: formConfigs.length,
  },
  tabRefs: tabRefStats,
  orphanCounts: {
    formConfigToFieldSet: orphanFieldSetRefs.length,
    fieldSetToDynamicField: orphanFieldRefs.length,
  },
  legacyShadow,
});

const SAMPLE_LIMIT = 200;

if (orphanFieldSetRefs.length > 0) {
  print('\n=== ORPHAN: FormConfig.Tabs.FieldSetIds -> FieldSet._id ===');
  printjson(orphanFieldSetRefs.slice(0, SAMPLE_LIMIT));
}

if (orphanFieldRefs.length > 0) {
  print('\n=== ORPHAN: FieldSet.FieldIds -> DynamicField._id ===');
  printjson(orphanFieldRefs.slice(0, SAMPLE_LIMIT));
}

if (orphanFieldSetRefs.length === 0 && orphanFieldRefs.length === 0) {
  print('\nNo orphan references found. Mapping by _id is consistent for active docs.');
}
