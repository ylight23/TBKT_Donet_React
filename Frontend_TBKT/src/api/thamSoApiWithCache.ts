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
    const cached = schemaCache.get<LocalDynamicField[]>(KEYS.DYNAMIC_FIELDS);
    if (cached !== null) {
      console.log('[cache] getListDynamicFields hit');
      return cached;
    }

    console.log('[cache] getListDynamicFields miss → fetch gRPC');
    const data = await grpcThamSoApi.getListDynamicFields();
    schemaCache.set(KEYS.DYNAMIC_FIELDS, data);
    return data;
  },

  async saveDynamicField(field: LocalDynamicField, isNew: boolean): Promise<LocalDynamicField> {
    const result = await grpcThamSoApi.saveDynamicField(field, isNew);
    schemaCache.clear(KEYS.DYNAMIC_FIELDS);
    console.log('[cache] DynamicFields cache invalidated after save');
    return result;
  },

  async deleteDynamicField(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.deleteDynamicField(id);
    if (result) {
      schemaCache.clear(KEYS.DYNAMIC_FIELDS);
      console.log('[cache] DynamicFields cache invalidated after delete');
    }
    return result;
  },

  // ── FieldSet ──────────────────────────────────────────────
  async getListFieldSets(): Promise<LocalFieldSet[]> {
    const cached = schemaCache.get<LocalFieldSet[]>(KEYS.FIELD_SETS);
    if (cached !== null) {
      console.log('[cache] getListFieldSets hit');
      return cached;
    }

    console.log('[cache] getListFieldSets miss → fetch gRPC');
    const data = await grpcThamSoApi.getListFieldSets();
    schemaCache.set(KEYS.FIELD_SETS, data);
    return data;
  },

  async saveFieldSet(fieldSet: LocalFieldSet, isNew: boolean): Promise<LocalFieldSet> {
    const result = await grpcThamSoApi.saveFieldSet(fieldSet, isNew);
    schemaCache.clear(KEYS.FIELD_SETS);
    console.log('[cache] FieldSets cache invalidated after save');
    return result;
  },

  async deleteFieldSet(id: string): Promise<boolean> {
    const result = await grpcThamSoApi.deleteFieldSet(id);
    if (result) {
      schemaCache.clear(KEYS.FIELD_SETS);
      console.log('[cache] FieldSets cache invalidated after delete');
    }
    return result;
  },

  // ── FormConfig ────────────────────────────────────────────
  async getListFormConfigs(): Promise<LocalFormConfig[]> {
    const cached = schemaCache.get<LocalFormConfig[]>(KEYS.FORM_CONFIGS);
    if (cached !== null) {
      console.log('[cache] getListFormConfigs hit');
      return cached;
    }

    console.log('[cache] getListFormConfigs miss → fetch gRPC');
    const data = await grpcThamSoApi.getListFormConfigs();
    schemaCache.set(KEYS.FORM_CONFIGS, data);
    return data;
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
};
