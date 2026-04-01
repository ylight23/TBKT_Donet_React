import type { LocalDynamicField, LocalFieldSet, LocalFormConfig } from '../../types/thamSo';
import { getRealSetIds } from '../CauHinhThamSo/subComponents/formTabMeta';

export const parsePayloadObject = (raw?: string): Record<string, unknown> => {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
};

export const getValueByKey = (source: Record<string, unknown>, key: string): string => {
  const value = source[key];
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('value' in (value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>).value;
      return nested == null ? '' : String(nested);
    }
    return '';
  }
  return String(value);
};

export const resolveFieldsFromForm = (
  formConfig: LocalFormConfig,
  fieldSets: LocalFieldSet[],
  allFields: LocalDynamicField[],
): LocalDynamicField[] => {
  const fieldSetMap = new Map(fieldSets.map((set) => [set.id, set]));
  const fieldSetMapLower = new Map(fieldSets.map((set) => [set.id.toLowerCase(), set]));
  const fieldMap = new Map(allFields.map((field) => [field.id, field]));
  const fieldMapLower = new Map(allFields.map((field) => [field.id.toLowerCase(), field]));
  const fieldByKey = new Map(allFields.map((field) => [field.key.toLowerCase(), field]));
  const ordered: LocalDynamicField[] = [];
  const seen = new Set<string>();

  const appendSetFields = (set?: LocalFieldSet): void => {
    if (!set) return;
    const fieldsFromSet = (set.fields && set.fields.length > 0)
      ? set.fields
      : (set.fieldIds ?? [])
        .map((id) => {
          const trimmed = String(id || '').trim();
          if (!trimmed) return undefined;
          return (
            fieldMap.get(trimmed) ||
            fieldMapLower.get(trimmed.toLowerCase()) ||
            fieldByKey.get(trimmed.toLowerCase())
          );
        })
        .filter(Boolean) as LocalDynamicField[];

    fieldsFromSet.forEach((f) => {
      if (!f?.id || seen.has(f.id)) return;
      seen.add(f.id);
      ordered.push(f);
    });
  };

  formConfig.tabs.forEach((tab) => {
    const setIds = Array.from(new Set(getRealSetIds(tab)));
    const tabInlineSets = Array.isArray(tab.fieldSets) ? tab.fieldSets : [];
    const inlineSetMap = new Map(tabInlineSets.map((set) => [set.id, set]));
    const inlineSetMapLower = new Map(tabInlineSets.map((set) => [set.id.toLowerCase(), set]));

    setIds.forEach((setId) => {
      const globalSet = fieldSetMap.get(setId) || fieldSetMapLower.get(setId.toLowerCase());
      const inlineSet = inlineSetMap.get(setId) || inlineSetMapLower.get(setId.toLowerCase());
      const inlineScore = (inlineSet?.fields?.length ?? 0) + (inlineSet?.fieldIds?.length ?? 0);
      const globalScore = (globalSet?.fields?.length ?? 0) + (globalSet?.fieldIds?.length ?? 0);
      appendSetFields(inlineScore >= globalScore ? inlineSet ?? globalSet : globalSet ?? inlineSet);
    });

    tabInlineSets.forEach((set) => {
      appendSetFields(set);
    });
  });

  return ordered;
};

export const resolveTabGroupsFromForm = (
  formConfig: LocalFormConfig,
  fieldSets: LocalFieldSet[],
  allFields: LocalDynamicField[],
): Array<{ id: string; label: string; fields: LocalDynamicField[] }> => {
  const fieldSetMap = new Map(fieldSets.map((set) => [set.id, set]));
  const fieldSetMapLower = new Map(fieldSets.map((set) => [set.id.toLowerCase(), set]));
  const fieldMap = new Map(allFields.map((field) => [field.id, field]));
  const fieldMapLower = new Map(allFields.map((field) => [field.id.toLowerCase(), field]));
  const fieldByKey = new Map(allFields.map((field) => [field.key.toLowerCase(), field]));

  return formConfig.tabs.map((tab, tabIndex) => {
    const ordered: LocalDynamicField[] = [];
    const seen = new Set<string>();
    const setIds = Array.from(new Set(getRealSetIds(tab)));
    const inlineSets = Array.isArray(tab.fieldSets) ? tab.fieldSets : [];
    const inlineSetMap = new Map(inlineSets.map((set) => [set.id, set]));
    const inlineSetMapLower = new Map(inlineSets.map((set) => [set.id.toLowerCase(), set]));

    const appendSetFields = (set?: LocalFieldSet): void => {
      if (!set) return;
      const fieldsFromSet = (set.fields && set.fields.length > 0)
        ? set.fields
        : (set.fieldIds ?? [])
          .map((id) => {
            const trimmed = String(id || '').trim();
            if (!trimmed) return undefined;
            return (
              fieldMap.get(trimmed) ||
              fieldMapLower.get(trimmed.toLowerCase()) ||
              fieldByKey.get(trimmed.toLowerCase())
            );
          })
          .filter(Boolean) as LocalDynamicField[];

      fieldsFromSet.forEach((f) => {
        if (!f?.id || seen.has(f.id)) return;
        seen.add(f.id);
        ordered.push(f);
      });
    };

    setIds.forEach((setId) => {
      const globalSet = fieldSetMap.get(setId) || fieldSetMapLower.get(setId.toLowerCase());
      const inlineSet = inlineSetMap.get(setId) || inlineSetMapLower.get(setId.toLowerCase());
      const inlineScore = (inlineSet?.fields?.length ?? 0) + (inlineSet?.fieldIds?.length ?? 0);
      const globalScore = (globalSet?.fields?.length ?? 0) + (globalSet?.fieldIds?.length ?? 0);
      appendSetFields(inlineScore >= globalScore ? inlineSet ?? globalSet : globalSet ?? inlineSet);
    });

    inlineSets.forEach((set) => appendSetFields(set));

    return {
      id: tab.id || `tab_${tabIndex + 1}`,
      label: tab.label || `Tab ${tabIndex + 1}`,
      fields: ordered,
    };
  });
};

export const buildFallbackFields = (
  baseColumns: Array<{ key: string; name: string }>,
  sourceFields: Array<{ key: string; label?: string }>,
): LocalDynamicField[] => {
  const fromColumns = (baseColumns ?? [])
    .map((col, index) => {
      const key = (col.key || '').trim();
      if (!key) return null;
      return {
        id: `fallback_col_${index}_${key}`,
        key,
        label: (col.name || key).trim() || key,
        type: 'text',
        required: false,
        validation: {},
      } as LocalDynamicField;
    })
    .filter(Boolean) as LocalDynamicField[];

  if (fromColumns.length > 0) return fromColumns;

  return (sourceFields ?? [])
    .map((field, index) => {
      const key = (field.key || '').trim();
      if (!key) return null;
      return {
        id: `fallback_src_${index}_${key}`,
        key,
        label: (field.label || key).trim() || key,
        type: 'text',
        required: false,
        validation: {},
      } as LocalDynamicField;
    })
    .filter(Boolean) as LocalDynamicField[];
};

