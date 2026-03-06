import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import BuildIcon from '@mui/icons-material/Build';

import { thamSoApi } from '../../api/thamSoApiWithCache';
import type {
  LocalDynamicField as DynamicField,
  LocalFormConfig as FormConfig,
} from '../../types/thamSo';
import {
  iconToName,
  nameToIcon,
} from '../../utils/thamSoUtils';

import { MainTab, FieldSet } from './types';
import PageFieldLibrary from './subComponents/PageFieldLibrary';
import PageDatasets from './subComponents/PageDatasets';
import PageFormConfig from './subComponents/PageFormConfig';
import { OfficeProvider } from '../../context/OfficeContext';

const CauHinhThamSo: React.FC = () => {
  const [tab, setTab] = useState<MainTab>('fields');
  const [fields, setFields] = useState<DynamicField[]>([]);
  const [fieldSets, setFieldSets] = useState<FieldSet[]>([]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [activeFormId, setActiveFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  // Load data from API on mount
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [apiFields, apiSets, apiForms] = await Promise.all([
          thamSoApi.getListDynamicFields().catch(() => []),
          thamSoApi.getListFieldSets().catch(() => []),
          thamSoApi.getListFormConfigs().catch(() => []),
        ]);

        if (cancelled) return;

        const finalFields = apiFields;
        const finalSets = (apiSets).map((s: any) => ({
          ...s,
          icon: typeof s.icon === 'string' ? nameToIcon(s.icon) : s.icon
        }));
        const finalForms = apiForms;

        setFields(finalFields as any);
        setFieldSets(finalSets as any);
        setForms(finalForms as any);

        if (finalSets.length > 0) setActiveSetId(finalSets[0].id);
        if (finalForms.length > 0) setActiveFormId(finalForms[0].id);

        setSnack({ open: true, message: `Đã cập nhật cấu hình: ${finalFields.length} trường, ${finalSets.length} bộ dữ liệu`, severity: 'success' });
      } catch (err) {
        console.error('[CauHinhThamSo] Failed to load from API', err);
        setSnack({ open: true, message: 'Lỗi tải cấu hình từ server', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ── Persist helpers ──
  const handleSaveField = async (field: DynamicField, isNew: boolean) => {
    try {
      const response = await thamSoApi.saveDynamicField(field as any, isNew);

      if (response && isNew) {
        setFields(prev => prev.map(f => f.id === field.id ? { ...f, id: response.id } : f));
      }

      setSnack({ open: true, message: `Đã lưu trường "${field.label}"`, severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] saveDynamicField error', err);
      setSnack({ open: true, message: 'Lỗi lưu trường dữ liệu', severity: 'error' });
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      await thamSoApi.deleteDynamicField(id);
      setSnack({ open: true, message: 'Đã xoá trường', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteDynamicField error', err);
      setSnack({ open: true, message: 'Lỗi xoá trường dữ liệu', severity: 'error' });
    }
  };

  const handleSaveFieldSet = async (fieldSet: FieldSet, isNew: boolean) => {
    try {
      const response = await thamSoApi.saveFieldSet({
        ...fieldSet,
        icon: iconToName(fieldSet.icon),
        desc: fieldSet.desc ?? '',
      } as any, isNew);

      if (response && isNew) {
        const newItem: FieldSet = {
          ...fieldSet,
          id: response.id,
          icon: fieldSet.icon
        };
        setFieldSets(prev => prev.map(s => s.id === fieldSet.id ? newItem : s));
        setActiveSetId(newItem.id);
      }

      setSnack({ open: true, message: `Đã lưu bộ dữ liệu "${fieldSet.name}"`, severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] saveFieldSet error', err);
      setSnack({ open: true, message: 'Lỗi lưu bộ dữ liệu', severity: 'error' });
    }
  };

  const handleDeleteFieldSet = async (id: string) => {
    try {
      await thamSoApi.deleteFieldSet(id);
      setSnack({ open: true, message: 'Đã xoá bộ dữ liệu', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteFieldSet error', err);
      setSnack({ open: true, message: 'Lỗi xoá bộ dữ liệu', severity: 'error' });
    }
  };

  const handleSaveFormConfig = async (form: FormConfig, isNew: boolean) => {
    try {
      const response = await thamSoApi.saveFormConfig(form as any, isNew);
      if (response && isNew) {
        setForms(prev => prev.map(f => f.id === form.id ? response : f));
        setActiveFormId(response.id);
      }
      setSnack({ open: true, message: `Đã lưu cấu hình form "${form.name}"`, severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] saveFormConfig error', err);
      setSnack({ open: true, message: 'Lỗi lưu cấu hình form', severity: 'error' });
    }
  };

  const handleDeleteFormConfig = async (id: string) => {
    try {
      await thamSoApi.deleteFormConfig(id);
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
          handleSaveField(f, false);
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
          handleSaveFormConfig(f, false);
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
          handleSaveFieldSet(s, false);
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
          {loading && <Chip label="Đang tải..." variant="outlined" />}
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
            borderRadius: 2,
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
