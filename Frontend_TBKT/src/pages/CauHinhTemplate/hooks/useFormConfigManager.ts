import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../store';
import type { LocalDynamicField, LocalFieldSet, LocalFormConfig } from '../../../types/thamSo';
import { saveFormConfig, deleteFormConfig, fetchThamSoSchema } from '../../../store/reducer/thamSo';
import { nameToIcon } from '../../../utils/thamSoUtils';
import type { FieldSet } from '../../CauHinhThamSo/types';

const AUTO_SAVE_DEBOUNCE_MS = 600;
const isTempFormId = (id: string) => id.startsWith('form_');

const mapStoreFieldSetToUi = (fieldSet: LocalFieldSet): FieldSet => ({
  ...fieldSet,
  icon: nameToIcon(fieldSet.icon),
});

export const useFormConfigManager = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    dynamicFields: storeFields,
    fieldSets: storeFieldSets,
    formConfigs: storeForms,
    loading,
    loaded,
  } = useSelector((state: RootState) => state.thamSoReducer);

  const [forms, setForms] = useState<LocalFormConfig[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const pendingCreatesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!loaded && !loading) {
      void dispatch(fetchThamSoSchema());
    }
  }, [dispatch, loaded, loading]);

  useEffect(() => {
    setForms(storeForms);
  }, [storeForms]);

  useEffect(() => {
    if (forms.length === 0) {
      if (activeFormId !== null) setActiveFormId(null);
      return;
    }
    if (!activeFormId || !forms.some((f) => f.id === activeFormId)) {
      setActiveFormId(forms[0].id);
    }
  }, [forms, activeFormId]);

  useEffect(() => () => {
    saveTimersRef.current.forEach((tid) => window.clearTimeout(tid));
    saveTimersRef.current.clear();
  }, []);

  const fields: LocalDynamicField[] = storeFields;
  const fieldSets: FieldSet[] = useMemo(
    () => storeFieldSets.map(mapStoreFieldSetToUi),
    [storeFieldSets],
  );

  const scheduleSave = useCallback((key: string, task: () => void | Promise<void>) => {
    const old = saveTimersRef.current.get(key);
    if (old !== undefined) window.clearTimeout(old);
    const tid = window.setTimeout(() => {
      saveTimersRef.current.delete(key);
      void task();
    }, AUTO_SAVE_DEBOUNCE_MS);
    saveTimersRef.current.set(key, tid);
  }, []);

  const saveForm = useCallback(async (form: LocalFormConfig, isNew: boolean) => {
    const id = form.id;
    if (isNew) pendingCreatesRef.current.add(id);
    try {
      const response = await dispatch(saveFormConfig({ formConfig: form, isNew })).unwrap();
      if (response && isNew && response.formConfig.id !== form.id) {
        setForms((prev) => prev.map((f) => (f.id === form.id ? response.formConfig : f)));
        setActiveFormId(response.formConfig.id);
      }
    } finally {
      pendingCreatesRef.current.delete(id);
    }
  }, [dispatch]);

  const removeForm = useCallback(async (id: string) => {
    const old = saveTimersRef.current.get(id);
    if (old !== undefined) { window.clearTimeout(old); saveTimersRef.current.delete(id); }
    if (pendingCreatesRef.current.has(id)) return;
    if (isTempFormId(id) && !storeForms.some((f) => f.id === id)) return;
    await dispatch(deleteFormConfig(id)).unwrap();
  }, [dispatch, storeForms]);

  const setFormsAndPersist: React.Dispatch<React.SetStateAction<LocalFormConfig[]>> = useCallback((action) => {
    setForms((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      for (const f of next) {
        const existing = prev.find((p) => p.id === f.id);
        if (!existing) {
          void saveForm(f, true);
        } else if (JSON.stringify(existing) !== JSON.stringify(f)) {
          if (isTempFormId(f.id) && !storeForms.some((sf) => sf.id === f.id)) {
            scheduleSave(f.id, () => saveForm(f, true));
          } else {
            scheduleSave(f.id, () => saveForm(f, false));
          }
        }
      }
      for (const p of prev) {
        if (!next.find((f) => f.id === p.id)) {
          void removeForm(p.id);
        }
      }
      return next;
    });
  }, [saveForm, removeForm, scheduleSave, storeForms]);

  return {
    forms,
    fields,
    fieldSets,
    activeFormId,
    setActiveFormId,
    setForms: setFormsAndPersist,
    loading,
    loaded,
  };
};
