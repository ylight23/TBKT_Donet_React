import grpcThamSoApi from '../apis/thamSoApi';
import type { LocalDynamicField, LocalFieldSet, LocalFormConfig } from '../types/thamSo';
import { KEYS, schemaCache } from './thamSoCache';

// ============================================================
// Wrapper API có cache cho schema ThamSo
// - GET: cache-first
// - SAVE/DELETE: invalidate cache tương ứng khi thành công
// ============================================================
export const thamSoApi = {
  // ── DynamicField ──────────────────────────────────────────
  async getListDynamicFields(): Promise<LocalDynamicField[]> {
    console.log('[cache-bypass] getListDynamicFields → fetch gRPC');
    return grpcThamSoApi.getListDynamicFields();
  },

  async saveDynamicField(field: LocalDynamicField, isNew: boolean): Promise<LocalDynamicField> {
    const result = await grpcThamSoApi.saveDynamicField(field, isNew);
    schemaCache.clear(KEYS.DYNAMIC_FIELDS);
    schemaCache.clear(KEYS.FORM_CONFIGS);
    console.log('[cache] DynamicFields/FormConfigs cache invalidated after save');
    return result;
  },

  async deleteDynamicField(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.deleteDynamicField(id);
    if (result) {
      schemaCache.clear(KEYS.DYNAMIC_FIELDS);
      schemaCache.clear(KEYS.FORM_CONFIGS);
      console.log('[cache] DynamicFields/FormConfigs cache invalidated after delete');
    }
    return result;
  },

  async restoreDynamicField(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.restoreDynamicField(id);
    if (result) {
      schemaCache.clear(KEYS.DYNAMIC_FIELDS);
      schemaCache.clear(KEYS.FIELD_SETS);
      schemaCache.clear(KEYS.FORM_CONFIGS);
      console.log('[cache] DynamicFields/FieldSets/FormConfigs cache invalidated after restore');
    }
    return result;
  },

  // ── FieldSet ──────────────────────────────────────────────
  async getListFieldSets(): Promise<LocalFieldSet[]> {
    console.log('[cache-bypass] getListFieldSets → fetch gRPC');
    return grpcThamSoApi.getListFieldSets();
  },
  async saveFieldSet(fieldSet: LocalFieldSet, isNew: boolean): Promise<LocalFieldSet> {
    const result = await grpcThamSoApi.saveFieldSet(fieldSet, isNew);
    schemaCache.clear(KEYS.FIELD_SETS);
    schemaCache.clear(KEYS.FORM_CONFIGS);
    console.log('[cache] FieldSets/FormConfigs cache invalidated after save');
    return result;
  },

  async deleteFieldSet(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.deleteFieldSet(id);
    if (result) {
      schemaCache.clear(KEYS.FIELD_SETS);
      schemaCache.clear(KEYS.FORM_CONFIGS);
      console.log('[cache] FieldSets/FormConfigs cache invalidated after delete');
    }
    return result;
  },

  async restoreFieldSet(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.restoreFieldSet(id);
    if (result) {
      schemaCache.clear(KEYS.FIELD_SETS);
      schemaCache.clear(KEYS.FORM_CONFIGS);
      console.log('[cache] FieldSets/FormConfigs cache invalidated after restore');
    }
    return result;
  },

  // ── FormConfig ────────────────────────────────────────────
  async getListFormConfigs(): Promise<LocalFormConfig[]> {
    console.log('[cache-bypass] getListFormConfigs → fetch gRPC');
    return grpcThamSoApi.getListFormConfigs();
  },

  async saveFormConfig(form: LocalFormConfig, isNew: boolean): Promise<LocalFormConfig> {
    const result = await grpcThamSoApi.saveFormConfig(form, isNew);
    schemaCache.clear(KEYS.FORM_CONFIGS);
    console.log('[cache] FormConfigs cache invalidated after save');
    return result;
  },

  async deleteFormConfig(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.deleteFormConfig(id);
    if (result) {
      schemaCache.clear(KEYS.FORM_CONFIGS);
      console.log('[cache] FormConfigs cache invalidated after delete');
    }
    return result;
  },

  async restoreFormConfig(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.restoreFormConfig(id);
    if (result) {
      schemaCache.clear(KEYS.FORM_CONFIGS);
      console.log('[cache] FormConfigs cache invalidated after restore');
    }
    return result;
  },
};
