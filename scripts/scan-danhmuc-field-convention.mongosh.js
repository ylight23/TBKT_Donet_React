/*
 * Scan FormConfig / FieldSet / DynamicField for category-field convention issues.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/scan-danhmuc-field-convention.mongosh.js
 */

const isActive = { Delete: { $ne: true } };
const CANONICAL_CATEGORY_KEYS = new Set([
  'ma_danh_muc',
]);
const LEGACY_CATEGORY_KEYS = new Set([
  'ma_dinh_danh',
  'ma_danh_muc_trang_bi',
  'iddanhmuctrangbi',
  'madanhmuctrangbi',
]);
const CANONICAL_CATEGORY_NAME_KEYS = new Set([
  'ten_danh_muc',
]);
const LEGACY_CATEGORY_NAME_KEYS = new Set([
  'ten_danh_muc_trang_bi',
]);
const PARENT_KEYS = new Set([
  'id_cap_tren',
  'idcaptren',
  'ma_cap_tren',
  'macaptren',
]);
const LEGACY_NAME_KEYS = new Set([
  'ten',
  'tendanhmuc',
]);

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getTabs(formConfig) {
  return Array.isArray(formConfig?.Tabs) ? formConfig.Tabs : [];
}

function getFieldSetIds(formConfig) {
  return getTabs(formConfig).flatMap((tab) => Array.isArray(tab?.FieldSetIds) ? tab.FieldSetIds : []);
}

const dynamicFields = db.DynamicField.find(isActive, { _id: 1, Key: 1, Label: 1, Type: 1, Disabled: 1 }).toArray();
const fieldSets = db.FieldSet.find(isActive, { _id: 1, Name: 1, FieldIds: 1 }).toArray();
const formConfigs = db.FormConfig.find(isActive, { _id: 1, Key: 1, Name: 1, Tabs: 1 }).toArray();

const fieldById = new Map(dynamicFields.map((field) => [String(field._id), field]));
const fieldSetById = new Map(fieldSets.map((fieldSet) => [String(fieldSet._id), fieldSet]));

function analyzeFieldSet(fieldSet) {
  const fieldIds = Array.isArray(fieldSet?.FieldIds) ? fieldSet.FieldIds.map(String) : [];
  const fields = fieldIds.map((id) => fieldById.get(id)).filter(Boolean);
  const normalizedKeys = fields.map((field) => normalize(field.Key));

  const hasCanonicalCategoryField = normalizedKeys.some((key) => CANONICAL_CATEGORY_KEYS.has(key));
  const hasLegacyCategoryField = normalizedKeys.some((key) => LEGACY_CATEGORY_KEYS.has(key));
  const hasCategoryField = hasCanonicalCategoryField || hasLegacyCategoryField;
  const hasCanonicalCategoryNameField = normalizedKeys.some((key) => CANONICAL_CATEGORY_NAME_KEYS.has(key));
  const hasLegacyCategoryNameField = normalizedKeys.some((key) => LEGACY_CATEGORY_NAME_KEYS.has(key));
  const hasCategoryNameField = hasCanonicalCategoryNameField || hasLegacyCategoryNameField;
  const hasParentField = normalizedKeys.some((key) => PARENT_KEYS.has(key));
  const legacyNameFields = fields
    .filter((field) => LEGACY_NAME_KEYS.has(normalize(field.Key)))
    .map((field) => ({
      id: String(field._id),
      key: field.Key,
      label: field.Label || '',
    }));

  const categoryNameField = fields.find((field) =>
    CANONICAL_CATEGORY_NAME_KEYS.has(normalize(field.Key)) || LEGACY_CATEGORY_NAME_KEYS.has(normalize(field.Key)),
  );
  const parentField = fields.find((field) => PARENT_KEYS.has(normalize(field.Key)));
  const legacyCategoryFields = fields
    .filter((field) => LEGACY_CATEGORY_KEYS.has(normalize(field.Key)))
    .map((field) => ({
      id: String(field._id),
      key: field.Key,
      label: field.Label || '',
    }));
  const legacyCategoryNameFields = fields
    .filter((field) => LEGACY_CATEGORY_NAME_KEYS.has(normalize(field.Key)))
    .map((field) => ({
      id: String(field._id),
      key: field.Key,
      label: field.Label || '',
    }));

  const issues = [];
  if (hasCategoryField && !hasCategoryNameField) {
    issues.push('Thieu field ten_danh_muc');
  }
  if (hasCategoryField && !hasParentField) {
    issues.push('Thieu field id_cap_tren/ma_cap_tren');
  }
  if (legacyCategoryFields.length > 0) {
    issues.push(`Dang dung legacy category key: ${legacyCategoryFields.map((field) => field.key).join(', ')}`);
  }
  if (legacyCategoryNameFields.length > 0) {
    issues.push(`Dang dung legacy category-name key: ${legacyCategoryNameFields.map((field) => field.key).join(', ')}`);
  }
  if (legacyNameFields.length > 0) {
    issues.push(`Dang dung legacy key ten: ${legacyNameFields.map((field) => field.key).join(', ')}`);
  }
  if (categoryNameField && categoryNameField.Disabled !== true) {
    issues.push('Field ten_danh_muc chua disabled');
  }
  if (parentField && parentField.Disabled !== true) {
    issues.push('Field id_cap_tren/ma_cap_tren chua disabled');
  }

  return {
    fieldSetId: String(fieldSet._id),
    fieldSetName: fieldSet.Name || '',
    hasCategoryField,
    hasCategoryNameField,
    hasParentField,
    issues,
    fields: fields.map((field) => ({
      id: String(field._id),
      key: field.Key || '',
      label: field.Label || '',
      disabled: field.Disabled === true,
    })),
  };
}

const fieldSetReports = fieldSets
  .map(analyzeFieldSet)
  .filter((report) => report.hasCategoryField || report.issues.length > 0);

const formReports = formConfigs
  .map((formConfig) => {
    const tabs = getTabs(formConfig);
    const fieldSetIds = getFieldSetIds(formConfig).map(String);
    const relatedFieldSets = fieldSetIds.map((id) => fieldSetById.get(id)).filter(Boolean);
    const reports = relatedFieldSets.map(analyzeFieldSet).filter((report) => report.hasCategoryField || report.issues.length > 0);
    const issues = reports.flatMap((report) => report.issues);
    return {
      formConfigId: String(formConfig._id),
      formKey: formConfig.Key || '',
      formName: formConfig.Name || '',
      tabs: tabs.map((tab) => ({
        id: String(tab?._id ?? ''),
        label: String(tab?.Label ?? ''),
        fieldSetIds: Array.isArray(tab?.FieldSetIds) ? tab.FieldSetIds.map(String) : [],
      })),
      issues,
      fieldSets: reports,
    };
  })
  .filter((report) => report.fieldSets.length > 0 || normalize(report.formKey).includes('trang-bi'));

print('=== SUMMARY ===');
printjson({
  activeDynamicFields: dynamicFields.length,
  activeFieldSets: fieldSets.length,
  activeFormConfigs: formConfigs.length,
  fieldSetsWithCategoryFields: fieldSetReports.filter((report) => report.hasCategoryField).length,
  fieldSetsWithIssues: fieldSetReports.filter((report) => report.issues.length > 0).length,
  formConfigsWithIssues: formReports.filter((report) => report.issues.length > 0).length,
});

print('\n=== FIELDSET REPORTS ===');
printjson(fieldSetReports);

print('\n=== FORMCONFIG REPORTS ===');
printjson(formReports);
