import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import BuildIcon from '@mui/icons-material/Build';

import type {
  LocalDynamicField as DynamicField,
  LocalFormConfig as FormConfig,
  LocalFieldSet,
} from '../../types/thamSo';
import type { AppDispatch, RootState } from '../../store';
import {
  iconToName,
  nameToIcon,
} from '../../utils/thamSoUtils';
import {
  deleteDynamicField,
  deleteFieldSet,
  deleteFormConfig,
  fetchThamSoSchema,
  saveDynamicField,
  saveFieldSet,
  saveFormConfig,
} from '../../store/reducer/thamSo';

import { MainTab, FieldSet } from './types';
import PageFieldLibrary from './subComponents/PageFieldLibrary';
import PageDatasets from './subComponents/PageDatasets';
import PageFormConfig from './subComponents/PageFormConfig';
import { OfficeProvider } from '../../context/OfficeContext';

const mapStoreFieldSetToUi = (fieldSet: LocalFieldSet): FieldSet => ({
  ...fieldSet,
  icon: nameToIcon(fieldSet.icon),
});

const mapUiFieldSetToStore = (fieldSet: FieldSet): LocalFieldSet => ({
  ...fieldSet,
  icon: iconToName(fieldSet.icon),
  desc: fieldSet.desc ?? '',
});

const replaceFieldIdInFieldSets = (fieldSets: FieldSet[], oldId: string, nextId: string): FieldSet[] => (
  fieldSets.map((fieldSet) => ({
    ...fieldSet,
    fieldIds: fieldSet.fieldIds.map((fieldId) => (fieldId === oldId ? nextId : fieldId)),
  }))
);

const replaceFieldSetIdInForms = (forms: FormConfig[], oldId: string, nextId: string): FormConfig[] => (
  forms.map((form) => ({
    ...form,
    tabs: form.tabs.map((tabItem) => ({
      ...tabItem,
      setIds: tabItem.setIds.map((setId) => (setId === oldId ? nextId : setId)),
    })),
  }))
);

const AUTO_SAVE_DEBOUNCE_MS = 500;
const isTempFieldId = (id: string) => id.startsWith('field_');
const isTempFieldSetId = (id: string) => id.startsWith('set_');
const isTempFormId = (id: string) => id.startsWith('form_');

const CauHinhThamSo: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    dynamicFields: storeFields,
    fieldSets: storeFieldSets,
    formConfigs: storeForms,
    loading,
    syncing,
    loaded,
  } = useSelector((state: RootState) => state.thamSoReducer);
  const [tab, setTab] = useState<MainTab>('fields');
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [fieldSets, setFieldSets] = useState<FieldSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });
  const hasLoadedMessageRef = useRef(false);
  const fieldSaveTimersRef = useRef<Map<string, number>>(new Map());
  const fieldSetSaveTimersRef = useRef<Map<string, number>>(new Map());
  const formSaveTimersRef = useRef<Map<string, number>>(new Map());
  const pendingFieldCreatesRef = useRef<Set<string>>(new Set());
  const pendingFieldSetCreatesRef = useRef<Set<string>>(new Set());
  const pendingFormCreatesRef = useRef<Set<string>>(new Set());
  const queuedFieldUpdatesRef = useRef<Map<string, DynamicField>>(new Map());
  const queuedFieldSetUpdatesRef = useRef<Map<string, FieldSet>>(new Map());
  const queuedFormUpdatesRef = useRef<Map<string, FormConfig>>(new Map());
  const queuedFieldDeletesRef = useRef<Set<string>>(new Set());
  const queuedFieldSetDeletesRef = useRef<Set<string>>(new Set());
  const queuedFormDeletesRef = useRef<Set<string>>(new Set());

  const clearScheduledSave = useCallback((timers: React.MutableRefObject<Map<string, number>>, key: string) => {
    const timeoutId = timers.current.get(key);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timers.current.delete(key);
    }
  }, []);

  const scheduleSave = useCallback(
    (timers: React.MutableRefObject<Map<string, number>>, key: string, task: () => void | Promise<void>) => {
      clearScheduledSave(timers, key);
      const timeoutId = window.setTimeout(() => {
        timers.current.delete(key);
        void task();
      }, AUTO_SAVE_DEBOUNCE_MS);
      timers.current.set(key, timeoutId);
    },
    [clearScheduledSave],
  );

  useEffect(() => () => {
    [fieldSaveTimersRef, fieldSetSaveTimersRef, formSaveTimersRef].forEach((timersRef) => {
      timersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timersRef.current.clear();
    });
  }, []);

  useEffect(() => {
    if (!loaded && !loading) {
      dispatch(fetchThamSoSchema())
        .unwrap()
        .catch((error: unknown) => {
          console.error('[CauHinhThamSo] Failed to load from Redux thunk', error);
          setSnack({ open: true, message: 'Lỗi tải cấu hình từ server', severity: 'error' });
        });
    }
  }, [dispatch, loaded, loading]);

  useEffect(() => {
    setFields(storeFields);
    setFieldSets(storeFieldSets.map(mapStoreFieldSetToUi));
    setForms(storeForms);
  }, [storeFields, storeFieldSets, storeForms]);

  useEffect(() => {
    if (!loaded || hasLoadedMessageRef.current) {
      return;
    }

    hasLoadedMessageRef.current = true;
    setSnack({
      open: true,
      message: `Đã cập nhật cấu hình: ${storeFields.length} trường, ${storeFieldSets.length} bộ dữ liệu`,
      severity: 'success',
    });
  }, [loaded, storeFields.length, storeFieldSets.length]);

  useEffect(() => {
    if (fieldSets.length === 0) {
      if (activeSetId !== null) {
        setActiveSetId(null);
      }
      return;
    }

    if (!activeSetId || !fieldSets.some((set) => set.id === activeSetId)) {
      setActiveSetId(fieldSets[0].id);
    }
  }, [fieldSets, activeSetId]);

  useEffect(() => {
    if (forms.length === 0) {
      if (activeFormId !== null) {
        setActiveFormId(null);
      }
      return;
    }

    if (!activeFormId || !forms.some((form) => form.id === activeFormId)) {
      setActiveFormId(forms[0].id);
    }
  }, [forms, activeFormId]);

  // ── Persist helpers ──
  const handleSaveField = async (field: DynamicField, isNew: boolean) => {
    const currentId = field.id;

    try {
      if (isNew) {
        pendingFieldCreatesRef.current.add(currentId);
      }

      const response = await dispatch(saveDynamicField({ field, isNew })).unwrap();

      if (response && isNew && response.field.id !== field.id) {
        setFields((prev) => prev.map((item) => (item.id === field.id ? response.field : item)));
        setFieldSets((prev) => replaceFieldIdInFieldSets(prev, field.id, response.field.id));
      }

      if (isNew) {
        pendingFieldCreatesRef.current.delete(currentId);

        if (queuedFieldDeletesRef.current.has(currentId)) {
          queuedFieldDeletesRef.current.delete(currentId);
          await dispatch(deleteDynamicField(response.field.id)).unwrap();
          return;
        }

        const queuedUpdate = queuedFieldUpdatesRef.current.get(currentId);
        if (queuedUpdate) {
          queuedFieldUpdatesRef.current.delete(currentId);
          scheduleSave(fieldSaveTimersRef, response.field.id, async () => {
            await handleSaveField({ ...queuedUpdate, id: response.field.id }, false);
          });
        }
      }

      setSnack({ open: true, message: isNew ? `Đã tạo trường "${field.label}"` : `Đã lưu trường "${field.label}"`, severity: 'success' });
    } catch (err) {
      if (isNew) {
        pendingFieldCreatesRef.current.delete(currentId);
      }
      console.error('[CauHinhThamSo] saveDynamicField error', err);
      setSnack({ open: true, message: 'Lỗi lưu trường dữ liệu', severity: 'error' });
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      clearScheduledSave(fieldSaveTimersRef, id);

      if (pendingFieldCreatesRef.current.has(id)) {
        queuedFieldDeletesRef.current.add(id);
        return;
      }

      if (isTempFieldId(id) && !storeFields.some((field) => field.id === id)) {
        queuedFieldUpdatesRef.current.delete(id);
        queuedFieldDeletesRef.current.delete(id);
        return;
      }

      await dispatch(deleteDynamicField(id)).unwrap();
      setSnack({ open: true, message: 'Đã xoá trường', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteDynamicField error', err);
      setSnack({ open: true, message: 'Lỗi xoá trường dữ liệu', severity: 'error' });
    }
  };

  const handleSaveFieldSet = async (fieldSet: FieldSet, isNew: boolean) => {
    const currentId = fieldSet.id;

    try {
      if (isNew) {
        pendingFieldSetCreatesRef.current.add(currentId);
      }

      const response = await dispatch(
        saveFieldSet({
          fieldSet: mapUiFieldSetToStore(fieldSet),
          isNew,
        }),
      ).unwrap();

      if (response && isNew && response.fieldSet.id !== fieldSet.id) {
        const newItem = mapStoreFieldSetToUi(response.fieldSet);
        setFieldSets((prev) => prev.map((item) => (item.id === fieldSet.id ? newItem : item)));
        setForms((prev) => replaceFieldSetIdInForms(prev, fieldSet.id, response.fieldSet.id));
        setActiveSetId(newItem.id);
      }

      if (isNew) {
        pendingFieldSetCreatesRef.current.delete(currentId);

        if (queuedFieldSetDeletesRef.current.has(currentId)) {
          queuedFieldSetDeletesRef.current.delete(currentId);
          await dispatch(deleteFieldSet(response.fieldSet.id)).unwrap();
          return;
        }

        const queuedUpdate = queuedFieldSetUpdatesRef.current.get(currentId);
        if (queuedUpdate) {
          queuedFieldSetUpdatesRef.current.delete(currentId);
          scheduleSave(fieldSetSaveTimersRef, response.fieldSet.id, async () => {
            await handleSaveFieldSet({ ...queuedUpdate, id: response.fieldSet.id }, false);
          });
        }
      }

      setSnack({ open: true, message: isNew ? `Đã tạo bộ dữ liệu "${fieldSet.name}"` : `Đã lưu bộ dữ liệu "${fieldSet.name}"`, severity: 'success' });
    } catch (err) {
      if (isNew) {
        pendingFieldSetCreatesRef.current.delete(currentId);
      }
      console.error('[CauHinhThamSo] saveFieldSet error', err);
      setSnack({ open: true, message: 'Lỗi lưu bộ dữ liệu', severity: 'error' });
    }
  };

  const handleDeleteFieldSet = async (id: string) => {
    try {
      clearScheduledSave(fieldSetSaveTimersRef, id);

      if (pendingFieldSetCreatesRef.current.has(id)) {
        queuedFieldSetDeletesRef.current.add(id);
        return;
      }

      if (isTempFieldSetId(id) && !storeFieldSets.some((fieldSet) => fieldSet.id === id)) {
        queuedFieldSetUpdatesRef.current.delete(id);
        queuedFieldSetDeletesRef.current.delete(id);
        return;
      }

      await dispatch(deleteFieldSet(id)).unwrap();
      setSnack({ open: true, message: 'Đã xoá bộ dữ liệu', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteFieldSet error', err);
      setSnack({ open: true, message: 'Lỗi xoá bộ dữ liệu', severity: 'error' });
    }
  };

  const handleSaveFormConfig = async (form: FormConfig, isNew: boolean) => {
    const currentId = form.id;

    try {
      if (isNew) {
        pendingFormCreatesRef.current.add(currentId);
      }

      const response = await dispatch(saveFormConfig({ formConfig: form, isNew })).unwrap();
      if (response && isNew && response.formConfig.id !== form.id) {
        setForms(prev => prev.map(f => f.id === form.id ? response.formConfig : f));
        setActiveFormId(response.formConfig.id);
      }

      if (isNew) {
        pendingFormCreatesRef.current.delete(currentId);

        if (queuedFormDeletesRef.current.has(currentId)) {
          queuedFormDeletesRef.current.delete(currentId);
          await dispatch(deleteFormConfig(response.formConfig.id)).unwrap();
          return;
        }

        const queuedUpdate = queuedFormUpdatesRef.current.get(currentId);
        if (queuedUpdate) {
          queuedFormUpdatesRef.current.delete(currentId);
          scheduleSave(formSaveTimersRef, response.formConfig.id, async () => {
            await handleSaveFormConfig({ ...queuedUpdate, id: response.formConfig.id }, false);
          });
        }
      }

      if (isNew) {
        setSnack({ open: true, message: `Đã tạo cấu hình form "${form.name}"`, severity: 'success' });
      }
    } catch (err) {
      if (isNew) {
        pendingFormCreatesRef.current.delete(currentId);
      }
      console.error('[CauHinhThamSo] saveFormConfig error', err);
      setSnack({ open: true, message: 'Lỗi lưu cấu hình form', severity: 'error' });
    }
  };

  const handleDeleteFormConfig = async (id: string) => {
    try {
      clearScheduledSave(formSaveTimersRef, id);

      if (pendingFormCreatesRef.current.has(id)) {
        queuedFormDeletesRef.current.add(id);
        return;
      }

      if (isTempFormId(id) && !storeForms.some((form) => form.id === id)) {
        queuedFormUpdatesRef.current.delete(id);
        queuedFormDeletesRef.current.delete(id);
        return;
      }

      await dispatch(deleteFormConfig(id)).unwrap();
      setSnack({ open: true, message: 'Đã xoá cấu hình form', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteFormConfig error', err);
      setSnack({ open: true, message: 'Lỗi xoá cấu hình form', severity: 'error' });
    }
  };

  const setFieldsAndPersist: React.Dispatch<React.SetStateAction<DynamicField[]>> = (action) => {
    setFields((prev: DynamicField[]) => {
      const next = typeof action === 'function' ? action(prev) : action;
      for (const f of next) {
        const existing = prev.find((p: DynamicField) => p.id === f.id);
        if (!existing) {
          handleSaveField(f, true);
        } else if (JSON.stringify(existing) !== JSON.stringify(f)) {
          if (pendingFieldCreatesRef.current.has(f.id)) {
            queuedFieldUpdatesRef.current.set(f.id, f);
          } else if (isTempFieldId(f.id) && !storeFields.some((field) => field.id === f.id)) {
            scheduleSave(fieldSaveTimersRef, f.id, async () => {
              await handleSaveField(f, true);
            });
          } else {
            scheduleSave(fieldSaveTimersRef, f.id, async () => {
              await handleSaveField(f, false);
            });
          }
        }
      }
      for (const p of prev) {
        if (!next.find((f: DynamicField) => f.id === p.id)) {
          handleDeleteField(p.id);
        }
      }
      return next;
    });
  };

  const setFormsAndPersist: React.Dispatch<React.SetStateAction<FormConfig[]>> = (action) => {
    setForms((prev: FormConfig[]) => {
      const next = typeof action === 'function' ? action(prev) : action;
      for (const f of next) {
        const existing = prev.find((p: FormConfig) => p.id === f.id);
        if (!existing) {
          handleSaveFormConfig(f, true);
        } else if (JSON.stringify(existing) !== JSON.stringify(f)) {
          if (pendingFormCreatesRef.current.has(f.id)) {
            queuedFormUpdatesRef.current.set(f.id, f);
          } else if (isTempFormId(f.id) && !storeForms.some((form) => form.id === f.id)) {
            scheduleSave(formSaveTimersRef, f.id, async () => {
              await handleSaveFormConfig(f, true);
            });
          } else {
            scheduleSave(formSaveTimersRef, f.id, async () => {
              await handleSaveFormConfig(f, false);
            });
          }
        }
      }
      for (const p of prev) {
        if (!next.find((f: FormConfig) => f.id === p.id)) {
          handleDeleteFormConfig(p.id);
        }
      }
      return next;
    });
  };

  const setFieldSetsAndPersist: React.Dispatch<React.SetStateAction<FieldSet[]>> = (action) => {
    setFieldSets((prev: FieldSet[]) => {
      const next = typeof action === 'function' ? action(prev) : action;
      for (const s of next) {
        const existing = prev.find((p: FieldSet) => p.id === s.id);
        if (!existing) {
          handleSaveFieldSet(s, true);
        } else if (
          existing && (
            existing.name !== s.name ||
            existing.color !== s.color ||
            existing.desc !== s.desc ||
            iconToName(existing.icon) !== iconToName(s.icon) ||
            JSON.stringify(existing.fieldIds) !== JSON.stringify(s.fieldIds)
          )
        ) {
          if (pendingFieldSetCreatesRef.current.has(s.id)) {
            queuedFieldSetUpdatesRef.current.set(s.id, s);
          } else if (isTempFieldSetId(s.id) && !storeFieldSets.some((fieldSet) => fieldSet.id === s.id)) {
            scheduleSave(fieldSetSaveTimersRef, s.id, async () => {
              await handleSaveFieldSet(s, true);
            });
          } else {
            scheduleSave(fieldSetSaveTimersRef, s.id, async () => {
              await handleSaveFieldSet(s, false);
            });
          }
        }
      }
      for (const p of prev) {
        if (!next.find((s: FieldSet) => s.id === p.id)) {
          handleDeleteFieldSet(p.id);
        }
      }
      return next;
    });
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            CẤU HÌNH THAM SỐ NHẬP LIỆU
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cấu hình động trường dữ liệu, bộ dữ liệu và biểu mẫu trang bị — kết nối database
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip icon={<LibraryBooksIcon />} label={`${fields.length} trường`} color="primary" variant="outlined" />
          <Chip icon={<SettingsIcon />} label={`${fieldSets.length} bộ`} color="secondary" variant="outlined" />
          {(loading || syncing) && <Chip label={loading ? 'Đang tải...' : 'Đang đồng bộ...'} variant="outlined" />}
        </Stack>
      </Stack>

      <Card sx={{ mb: 1.5 }}>
        <CardContent sx={{ p: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, nextTab: MainTab) => setTab(nextTab)}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                minHeight: 38,
              },
            }}
          >
            <Tab value="fields" icon={<LibraryBooksIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản lý trường dữ liệu" />
            <Tab value="datasets" icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản lý bộ dữ liệu nhập" />
            <Tab value="equip" icon={<BuildIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản lý form nhập" />
          </Tabs>
        </CardContent>
      </Card>

      <Box
        sx={{
          height: {
            xs: 'auto',
            md: 'calc(100vh - 300px)',
          },
          minHeight: 560,
        }}
      >
        {tab === 'fields' && (
          <PageFieldLibrary
            fields={fields}
            setFields={setFieldsAndPersist}
            fieldSets={fieldSets}
            setFieldSets={setFieldSetsAndPersist}
          />
        )}
        {tab === 'datasets' && (
          <PageDatasets
            fields={fields}
            fieldSets={fieldSets}
            setFieldSets={setFieldSetsAndPersist}
            activeSetId={activeSetId}
            setActiveSetId={setActiveSetId}
          />
        )}
        {tab === 'equip' && (
          <PageFormConfig
            fields={fields}
            fieldSets={fieldSets}
            forms={forms}
            setForms={setFormsAndPersist}
            activeFormId={activeFormId}
            setActiveFormId={setActiveFormId}
          />
        )}
      </Box>

      {/* Snackbar notifications */}
      {snack.open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            minWidth: 300,
            bgcolor: snack.severity === 'success' ? '#2e7d32' : snack.severity === 'error' ? '#d32f2f' : '#0288d1',
            color: '#fff',
            borderRadius: 2.5,
            px: 2.5,
            py: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <Typography variant="body2" fontWeight={600}>{snack.message}</Typography>
          <IconButton size="small" sx={{ color: '#fff', ml: 1 }} onClick={() => setSnack((s) => ({ ...s, open: false }))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

const CauHinhThamSoWrapper: React.FC = () => (
  <OfficeProvider>
    <CauHinhThamSo />
  </OfficeProvider>
);

export default CauHinhThamSoWrapper;
