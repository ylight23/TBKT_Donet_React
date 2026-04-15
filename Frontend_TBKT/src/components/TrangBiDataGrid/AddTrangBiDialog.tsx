// ============================================================
// AddTrangBiDialog – Form nhập trang bị kỹ thuật (Nhóm 1, Nhóm 2)
// Thiết kế: Hiện đại, trực quan, dễ sử dụng
// Lấy dữ liệu từ FormConfig (Cấu hình tham số)
// ============================================================
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

import { FormDialog } from '../Dialog';
import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
  LocalFormConfig as FormConfig,
  LocalFormTabConfig as FormTabConfig,
} from '../../types/thamSo';
import FieldInput from '../../pages/CauHinhThamSo/subComponents/FieldInput';
import { getRealSetIds, parseTabMeta } from '../../pages/CauHinhThamSo/subComponents/formTabMeta';
import { militaryColors } from '../../theme';
import { buildByNormalizedId, normalizeId } from '../../utils/idUtils';
import danhMucTrangBiApi, { DANH_MUC_TRANG_BI_TREE_ENDPOINT } from '../../apis/danhMucTrangBiApi';
import trangBiKiThuatApi, {
  type TrangBiNhom1EditorItem,
  type TrangBiNhom2EditorItem,
} from '../../apis/trangBiKiThuatApi';
import thamSoApi from '../../apis/thamSoApi';
import { getRequiredFormKeyForMenu } from '../../utils/formConfigKeys';

// ── Props ───────────────────────────────────────────────────
interface AddTrangBiDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  activeMenu?: 'tbNhom1' | 'tbNhom2';
  editingRecordId?: string | null;
}

type TrangBiEditorRecord = TrangBiNhom1EditorItem | TrangBiNhom2EditorItem;

// ── Field Item Component ───────────────────────────────────
interface FormFieldItemProps {
  field: DynamicField;
  value: string;
  onFieldChange: (fieldKey: string, value: string) => void;
}

const FormFieldItem: React.FC<FormFieldItemProps> = React.memo(({ field, value, onFieldChange }) => {
  const handleChange = useCallback(
    (key: string, nextValue: string) => onFieldChange(key, nextValue),
    [onFieldChange],
  );
  const isWideField = field.type === 'textarea' || field.type === 'checkboxGroup';
  const shouldUseMuiLabel =
    field.type === 'text'
    || field.type === 'number'
    || field.type === 'date'
    || field.type === 'textarea'
    || field.type === 'select'
    || field.type === 'radio'
    || field.type === 'checkbox'
    || field.type === 'checkboxGroup';

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Grid size={{ xs: 12, md: isWideField ? 12 : 6 }}>
      <Box sx={{ mb: 1 }}>
        {!shouldUseMuiLabel && (
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              mb: 0.75,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.primary',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.85
            }}
          >
            {field.label}
            {field.required && (
              <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>
            )}
          </Typography>
        )}

        <Box sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fafbfc',
            borderRadius: 2.5,
            transition: 'all 0.2s ease',
            '& fieldset': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              borderWidth: '1px',
            },
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f5f6f8',
              '& fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
              },
            },
            '&.Mui-focused': {
              bgcolor: 'background.paper',
              '& fieldset': {
                borderColor: 'primary.main',
                borderWidth: '2px',
              },
              boxShadow: `0 0 0 3px ${theme.palette.primary.main}15`,
            }
          },
          '& .MuiInputBase-input': {
            py: 0.85,
            px: 1.5,
            fontSize: '0.875rem'
          },
          '& .MuiSelect-select': {
            py: 0.85,
            px: 1.5,
          }
        }}>
          <FieldInput field={field} value={value} useMuiLabel={shouldUseMuiLabel} onChange={handleChange} />
        </Box>
      </Box>
    </Grid>
  );
}, (prevProps, nextProps) => (
  prevProps.field === nextProps.field &&
  prevProps.value === nextProps.value &&
  prevProps.onFieldChange === nextProps.onFieldChange
));

FormFieldItem.displayName = 'FormFieldItem';

// ── FieldSet Group Component ────────────────────────────────
interface FieldSetGroupProps {
  fieldSet: FieldSet;
  fields: DynamicField[];
  formData: Record<string, string>;
  onFieldChange: (fieldKey: string, value: string) => void;
  color: string;
}

const FieldSetGroup: React.FC<FieldSetGroupProps> = ({
  fieldSet,
  fields,
  formData,
  onFieldChange,
  color,
}) => {
  return (
    <Box
      sx={{
        mb: 2,
        pt: 0.75,
      }}
    >
      <Grid container spacing={1.5}>
        {fields.map((field) => (
          <FormFieldItem
            key={field.id}
            field={field}
            value={formData[field.key] ?? ''}
            onFieldChange={onFieldChange}
          />
        ))}
      </Grid>
    </Box>
  );
};

// ── Main Dialog Component ───────────────────────────────────
const AddTrangBiDialog: React.FC<AddTrangBiDialogProps> = ({
  open,
  onClose,
  onSaved,
  activeMenu,
  editingRecordId,
}) => {
  const isEditMode = Boolean(editingRecordId);
  const dialogMode = isEditMode ? 'edit' : 'add';
  const dialogTitle = isEditMode ? 'Chinh sua trang bi ky thuat' : 'Them trang bi ky thuat moi';
  const dialogIcon = isEditMode ? <EditIcon /> : <AddIcon />;
  const saveButtonLabel = isEditMode ? 'Cap nhat trang bi' : 'Luu trang bi';
  const [activeTab, setActiveTab] = useState(0);
  const [activeChildTabByParent, setActiveChildTabByParent] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [danhMucError] = useState('');
  // ── Schema nạp từ API ──────────────────────────────────────
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [allFieldSets, setAllFieldSets] = useState<FieldSet[]>([]);
  const [allFields, setAllFields] = useState<DynamicField[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  // ── Thông số kỹ thuật theo danh mục ───────────────────────
  const [technicalFieldSets, setTechnicalFieldSets] = useState<FieldSet[]>([]);
  const [technicalLoading, setTechnicalLoading] = useState(false);
  const [technicalError, setTechnicalError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [editorRecord, setEditorRecord] = useState<TrangBiEditorRecord | null>(null);
  const technicalFetchRef = useRef(0); // để tránh race condition khi chọn nhanh nhiều danh mục
  const categoryFieldKey = 'ma_danh_muc';
  const categoryNameFieldKey = 'ten_danh_muc';

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Nạp schema form config từ API khi dialog mở
  useEffect(() => {
    if (!open || !activeMenu) return;
    const formKey = getRequiredFormKeyForMenu(activeMenu);
    if (!formKey) {
      setSchemaError('Không xác định được form cho menu hiện tại.');
      return;
    }
    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');
    thamSoApi.getRuntimeFormSchema(formKey, activeMenu)
      .then((schema) => {
        if (cancelled) return;
        setFormConfig(schema.formConfig);
        setAllFieldSets(schema.fieldSets);
        setAllFields(schema.fields);
        if (!schema.formConfig) {
          setSchemaError(`Không tìm thấy FormConfig key "${formKey}". Vui lòng kiểm tra cấu hình tham số.`);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setSchemaError((err as Error)?.message || 'Không thể tải cấu hình biểu mẫu.');
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, activeMenu]);

  // Reset form khi dialog mở
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setActiveChildTabByParent({});
      setFormData({});
      setTechnicalFieldSets([]);
      setTechnicalLoading(false);
      setTechnicalError('');
      setSaving(false);
      setSaveError('');
      setRecordLoading(false);
      setRecordError('');
      setEditorRecord(null);
      technicalFetchRef.current += 1;
    }
  }, [open]);

  // Resolve actual field keys from allFields (case-insensitive) to handle
  // DB field key casing differences (e.g. "IDCapTren" vs "IdCapTren")
  const parentFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'idcaptren');
    return found?.key ?? 'IdCapTren';
  }, [allFields]);
  const specializationFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'idchuyennganhkt');
    return found?.key ?? 'IdChuyenNganhKT';
  }, [allFields]);
  const nganhFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'idnganh');
    return found?.key ?? 'IdNganh';
  }, [allFields]);
  const resolvedCategoryNameKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === categoryNameFieldKey.toLowerCase());
    return found?.key ?? categoryNameFieldKey;
  }, [allFields, categoryNameFieldKey]);

  useEffect(() => {
    if (!open || !isEditMode || !editingRecordId || !activeMenu || schemaLoading) {
      return;
    }

    let cancelled = false;
    setRecordLoading(true);
    setRecordError('');

    const loadEditorRecord = activeMenu === 'tbNhom2'
      ? trangBiKiThuatApi.getTrangBiNhom2
      : trangBiKiThuatApi.getTrangBiNhom1;

    loadEditorRecord(editingRecordId)
      .then((record) => {
        if (cancelled) return;

        const nextFormData: Record<string, string> = {
          ...record.parameters,
          [categoryFieldKey]: record.maDanhMuc ?? '',
          [parentFieldKey]: record.idCapTren ?? '',
          [specializationFieldKey]: record.idChuyenNganhKt ?? '',
          [nganhFieldKey]: record.idNganh ?? '',
          [resolvedCategoryNameKey]: record.tenDanhMuc ?? '',
        };

        setEditorRecord(record);
        setFormData(nextFormData);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[AddTrangBiDialog] loadEditRecord error', err);
        setRecordError(String((err as Error)?.message || 'Khong the tai chi tiet trang bi'));
      })
      .finally(() => {
        if (!cancelled) setRecordLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    open,
    isEditMode,
    editingRecordId,
    activeMenu,
    schemaLoading,
    categoryFieldKey,
    parentFieldKey,
    specializationFieldKey,
    nganhFieldKey,
    resolvedCategoryNameKey,
  ]);

  // Create lookup maps
  const fieldSetById = useMemo(
    () => buildByNormalizedId(allFieldSets),
    [allFieldSets],
  );

  // Build parent-child structure from tab metadata
  const tabStructure = useMemo(() => {
    const tabs = formConfig?.tabs ?? [];
    const roots = tabs.filter((tab) => !parseTabMeta(tab).parentTabId);
    const childrenByParent = tabs.reduce<Record<string, FormTabConfig[]>>((acc, tab) => {
      const parentId = parseTabMeta(tab).parentTabId;
      if (parentId) {
        if (!acc[parentId]) acc[parentId] = [];
        acc[parentId].push(tab);
      }
      return acc;
    }, {});
    return { roots, childrenByParent };
  }, [formConfig]);

  const selectedCategoryCode = useMemo(
    () => formData[categoryFieldKey] ?? '',
    [categoryFieldKey, formData],
  );

  // Form có trường mã danh mục → hỗ trợ nạp fieldSet động theo danh mục
  const hasDynamicTabs = useMemo(
    () => allFields.some((f) => f.key === categoryFieldKey),
    [allFields, categoryFieldKey],
  );

  // ── Gọi API nạp FieldSet kỹ thuật khi đổi mã danh mục ──
  useEffect(() => {
    if (!hasDynamicTabs) return;

    const maDanhMuc = String(selectedCategoryCode ?? '').trim();
    if (!maDanhMuc) {
      setTechnicalFieldSets([]);
      setTechnicalError('');
      return;
    }

    const fetchId = ++technicalFetchRef.current;
    setTechnicalLoading(true);
    setTechnicalError('');

    danhMucTrangBiApi.getFieldSetsByMaDanhMuc(maDanhMuc)
      .then((fieldSets) => {
        if (technicalFetchRef.current !== fetchId) return; // bỏ qua nếu đã chọn danh mục khác
        setTechnicalFieldSets(fieldSets);
      })
      .catch((err) => {
        if (technicalFetchRef.current !== fetchId) return;
        console.error('[AddTrangBiDialog] fetchTechnicalFieldSets error', err);
        setTechnicalError(String(err?.message || 'Khong tai duoc thong so ky thuat'));
      })
      .finally(() => {
        if (technicalFetchRef.current === fetchId) {
          setTechnicalLoading(false);
        }
      });
  }, [hasDynamicTabs, selectedCategoryCode]);

  const rootTabs = tabStructure.roots;
  const currentRootTab = rootTabs[activeTab];
  const currentRootMeta = currentRootTab ? parseTabMeta(currentRootTab) : null;
  const rawRootChildren = currentRootTab ? (tabStructure.childrenByParent[currentRootTab.id] || []) : [];
  const currentRootChildren = useMemo(() => {
    if (!currentRootTab) return [];
    if (currentRootMeta?.tabType !== 'sync-group') return rawRootChildren;
    return rawRootChildren.filter((child) => {
      const normalizedSelected = String(selectedCategoryCode ?? '').trim().toUpperCase();
      const normalizedSync = String(parseTabMeta(child).syncCategory ?? '').trim().toUpperCase();

      if (!normalizedSync) return true;
      if (!normalizedSelected) return false;

      return normalizedSelected === normalizedSync
        || normalizedSelected.startsWith(normalizedSync)
        || normalizedSync.startsWith(normalizedSelected);
    });
  }, [currentRootMeta?.tabType, currentRootTab, rawRootChildren, selectedCategoryCode]);

  const activeChildTabIndex = currentRootTab
    ? Math.min(activeChildTabByParent[currentRootTab.id] ?? 0, Math.max(currentRootChildren.length - 1, 0))
    : 0;

  const effectiveTab = useMemo(() => {
    if (!currentRootTab) return null;
    if (currentRootMeta?.tabType === 'sync-group' && currentRootChildren.length > 0) {
      return currentRootChildren[activeChildTabIndex] ?? currentRootChildren[0] ?? currentRootTab;
    }
    return currentRootTab;
  }, [currentRootTab, currentRootMeta, currentRootChildren, activeChildTabIndex]);

  // Tab động: không chứa trường mã danh mục → hiển thị fieldSet kỹ thuật theo danh mục
  const isDynamicTab = useMemo(() => {
    if (!effectiveTab) return false;
    return !getRealSetIds(effectiveTab).some((setId) => {
      const fs = fieldSetById.get(normalizeId(setId));
      return fs?.fields?.some((f) => f.key === categoryFieldKey);
    });
  }, [effectiveTab, fieldSetById, categoryFieldKey]);

  const applyFieldOverrides = useCallback((fields: DynamicField[]): DynamicField[] => {
    return fields.map((field) => {
      if (
        field.key === parentFieldKey
        || field.key === specializationFieldKey
        || field.key === nganhFieldKey
        || field.key === resolvedCategoryNameKey
      ) {
        return { ...field, disabled: true };
      }
      if (field.key === categoryFieldKey) {
        return {
          ...field,
          type: 'select',
          validation: {
            ...field.validation,
            dataSource: 'api',
            apiUrl: DANH_MUC_TRANG_BI_TREE_ENDPOINT,
            displayType: 'tree',
          },
        };
      }
      return { ...field };
    });
  }, [categoryFieldKey, resolvedCategoryNameKey, parentFieldKey, specializationFieldKey, nganhFieldKey]);

  const resolveFieldSetItems = useCallback((setIds: string[]) => {
    return Array.from(new Set(setIds))
      .map((setId) => {
        const fieldSet = fieldSetById.get(normalizeId(setId));
        if (!fieldSet) return null;
        return { fieldSet, fields: applyFieldOverrides(fieldSet.fields ?? []) };
      })
      .filter((item): item is { fieldSet: FieldSet; fields: DynamicField[] } => item !== null);
  }, [applyFieldOverrides, fieldSetById]);

  // Get fieldSets and fields for current tab
  const currentTabContent = useMemo(() => {
    if (!effectiveTab) return [];

    const staticItems = resolveFieldSetItems(getRealSetIds(effectiveTab));

    if (isDynamicTab && technicalFieldSets.length > 0) {
      const dynamicItems = technicalFieldSets.map((fs) => ({
        fieldSet: fs,
        fields: applyFieldOverrides(fs.fields ?? []),
      }));
      return [...staticItems, ...dynamicItems];
    }

    return staticItems;
  }, [effectiveTab, isDynamicTab, applyFieldOverrides, resolveFieldSetItems, technicalFieldSets]);

  const missingFieldSetIds = useMemo(() => {
    if (!effectiveTab || isDynamicTab) return [];

    return Array.from(new Set(
      getRealSetIds(effectiveTab)
        .filter((setId) => !fieldSetById.has(normalizeId(setId))),
    ));
  }, [effectiveTab, fieldSetById, isDynamicTab]);

  const missingFieldRefs = useMemo(() => {
    return currentTabContent.flatMap(({ fieldSet }) => {
      const fieldMap = new Set((fieldSet.fields ?? []).map((field) => field.id));
      return fieldSet.fieldIds
        .filter((fieldId) => !fieldMap.has(fieldId))
        .map((fieldId) => `${fieldSet.name}:${fieldId}`);
    });
  }, [currentTabContent]);
  const hasParentField = useMemo(
    () => allFields.some((field) => field.key === parentFieldKey),
    [allFields, parentFieldKey],
  );
  const hasSpecializationField = useMemo(
    () => allFields.some((field) => field.key === specializationFieldKey),
    [allFields, specializationFieldKey],
  );
  const hasNganhField = useMemo(
    () => allFields.some((field) => field.key === nganhFieldKey),
    [allFields, nganhFieldKey],
  );
  const hasCategoryNameField = useMemo(
    () => allFields.some((field) => field.key === resolvedCategoryNameKey),
    [allFields, resolvedCategoryNameKey],
  );

  const syncParentCategoryFields = useCallback(async (selectedCategoryId: string) => {
    try {
      const normalizedCategoryId = String(selectedCategoryId ?? '').trim();
      const selectedCategoryNode = normalizedCategoryId
        ? await danhMucTrangBiApi.getTreeItem(normalizedCategoryId)
        : null;

      if (!selectedCategoryNode) {
        return;
      }

      const parentCode = String(selectedCategoryNode.idCapTren ?? '').trim();
      const categoryName = String(selectedCategoryNode.ten ?? '').trim();
      const cnId = String(selectedCategoryNode.idChuyenNganhKt ?? '').trim();
      const nganhValue = String(selectedCategoryNode.idNganh ?? '').trim();

      setFormData((prev) => {
        let changed = false;
        const next = { ...prev };

        if (hasParentField && (prev[parentFieldKey] ?? '') !== parentCode) {
          next[parentFieldKey] = parentCode;
          changed = true;
        }

        if (hasCategoryNameField && (prev[resolvedCategoryNameKey] ?? '') !== categoryName) {
          next[resolvedCategoryNameKey] = categoryName;
          changed = true;
        }

        if (hasSpecializationField && (prev[specializationFieldKey] ?? '') !== cnId) {
          next[specializationFieldKey] = cnId;
          changed = true;
        }

        if (hasNganhField && (prev[nganhFieldKey] ?? '') !== nganhValue) {
          next[nganhFieldKey] = nganhValue;
          changed = true;
        }

        return changed ? next : prev;
      });
    } catch (error) {
      console.error('[AddTrangBiDialog] syncParentCategoryFields error', error);
    }
  }, [
    resolvedCategoryNameKey,
    hasCategoryNameField,
    hasParentField,
    hasSpecializationField,
    hasNganhField,
    parentFieldKey,
    specializationFieldKey,
    nganhFieldKey,
  ]);

  const handleFieldChange = useCallback((fieldKey: string, value: string) => {
    setFormData((prev) => {
      if (prev[fieldKey] === value) return prev;
      return { ...prev, [fieldKey]: value };
    });

    if (fieldKey === categoryFieldKey) {
      void syncParentCategoryFields(value);
    }
  }, [categoryFieldKey, syncParentCategoryFields]);

  const handleSave = useCallback(async () => {
    const maDinhDanh = (formData[categoryFieldKey] ?? '').trim();

    if (!maDinhDanh) {
      setSaveError('Vui lòng chọn mã danh mục trang bị trước khi lưu.');
      return;
    }

    // Collect core field keys to exclude from parameters
    const coreKeys = new Set([
      categoryFieldKey,
      parentFieldKey,
      specializationFieldKey,
      nganhFieldKey,
      resolvedCategoryNameKey,
    ]);
    const parameters: Record<string, string> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!coreKeys.has(key) && value.trim()) {
        parameters[key] = value;
      }
    }

    setSaving(true);
    setSaveError('');
    try {
      const saveTrangBi = activeMenu === 'tbNhom2'
        ? trangBiKiThuatApi.saveTrangBiNhom2
        : trangBiKiThuatApi.saveTrangBiNhom1;
      await saveTrangBi(
        {
          id: editorRecord?.id || undefined,
          maDanhMuc: maDinhDanh,
          parameters,
          expectedVersion: editorRecord?.version,
        },
      );
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('[AddTrangBiDialog] saveTrangBi error', err);
      setSaveError(String((err as Error)?.message || 'Lưu trang bị thất bại'));
    } finally {
      setSaving(false);
    }
  }, [
    activeMenu,
    formData,
    categoryFieldKey,
    resolvedCategoryNameKey,
    parentFieldKey,
    specializationFieldKey,
    nganhFieldKey,
    editorRecord,
    onSaved,
    onClose,
  ]);

  const handlePreviousTab = useCallback(() => {
    if (!currentRootTab || !currentRootMeta) return;

    if (currentRootMeta.tabType === 'sync-group' && currentRootChildren.length > 0 && activeChildTabIndex > 0) {
      setActiveChildTabByParent((prev) => ({
        ...prev,
        [currentRootTab.id]: activeChildTabIndex - 1,
      }));
      return;
    }

    if (activeTab <= 0) return;

    const prevRootIndex = activeTab - 1;
    const prevRoot = rootTabs[prevRootIndex];
    if (!prevRoot) {
      setActiveTab(prevRootIndex);
      return;
    }

    const prevRootMeta = parseTabMeta(prevRoot);
    const prevChildren = tabStructure.childrenByParent[prevRoot.id] || [];

    setActiveTab(prevRootIndex);

    if (prevRootMeta.tabType === 'sync-group' && prevChildren.length > 0) {
      setActiveChildTabByParent((prev) => ({
        ...prev,
        [prevRoot.id]: prevChildren.length - 1,
      }));
    }
  }, [activeChildTabIndex, activeTab, currentRootChildren, currentRootMeta, currentRootTab, rootTabs, tabStructure]);

  const handleNextTab = useCallback(() => {
    if (!currentRootTab || !currentRootMeta) return;

    if (currentRootMeta.tabType === 'sync-group' && currentRootChildren.length > 0 && activeChildTabIndex < currentRootChildren.length - 1) {
      setActiveChildTabByParent((prev) => ({
        ...prev,
        [currentRootTab.id]: activeChildTabIndex + 1,
      }));
      return;
    }

    setActiveTab((prev) => Math.min(prev + 1, Math.max(rootTabs.length - 1, 0)));
  }, [activeChildTabIndex, currentRootChildren, currentRootMeta, currentRootTab, rootTabs.length]);

  useEffect(() => {
    if (rootTabs.length === 0) {
      if (activeTab !== 0) setActiveTab(0);
      return;
    }
    if (activeTab > rootTabs.length - 1) {
      setActiveTab(rootTabs.length - 1);
    }
  }, [activeTab, rootTabs.length]);

  const isAtStart = activeTab === 0 && !(currentRootMeta?.tabType === 'sync-group' && activeChildTabIndex > 0);
  const isAtEnd = activeTab >= rootTabs.length - 1
    && !(currentRootMeta?.tabType === 'sync-group' && currentRootChildren.length > 0 && activeChildTabIndex < currentRootChildren.length - 1);

  if (schemaLoading || !formConfig || (isEditMode && (recordLoading || !editorRecord))) {
    return (
      <FormDialog
        open={open}
        onClose={onClose}
        mode={dialogMode}
        icon={dialogIcon}
        maxWidth="sm"
        title="Nhập trang bị kỹ thuật"
        contentPadding={0}
        showConfirm={false}
        showCancel={false}
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          {recordError && !schemaLoading && !recordLoading && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {recordError}
            </Alert>
          )}
          {(schemaLoading || recordLoading)
            ? <CircularProgress size={32} />
            : <Alert severity="warning">{schemaError || 'Không tìm thấy cấu hình biểu mẫu cho menu hiện tại.'}</Alert>}
        </Box>
      </FormDialog>
    );
  }

  // Default colors for field sets
  const setColors = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      mode={dialogMode}
      maxWidth="md"
      title={dialogTitle}
      icon={dialogIcon}
      onConfirm={handleSave}
      confirmText={saveButtonLabel}
      contentPadding={0}
      sx={{
        '& .MuiDialog-paper': {
          width: 'min(820px, calc(100vw - 32px))',
          maxHeight: '90vh',
          height: 'auto',
        },
      }}
      contentSx={{ overflow: 'hidden' }}
      showConfirm={false}
      showCancel={false}
      customActions={(
        <>
          <Button
            variant="outlined"
            onClick={handlePreviousTab}
            disabled={isAtStart}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 2.25,
              py: 0.65,
              minWidth: 0,
              fontSize: 13,
            }}
          >
            ← Quay lại
          </Button>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 2.25,
                py: 0.65,
                minWidth: 0,
                fontSize: 13,
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  bgcolor: 'error.main',
                  color: '#fff',
                }
              }}
            >
              Hủy
            </Button>

            {!isAtEnd ? (
              <Button
                variant="contained"
                onClick={handleNextTab}
                sx={{
                  bgcolor: militaryColors.navy,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 2.75,
                  py: 0.65,
                  minWidth: 0,
                  fontSize: 13,
                  '&:hover': {
                    bgcolor: militaryColors.navy,
                    filter: 'brightness(1.1)',
                  }
                }}
              >
                Tiếp tục →
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                sx={{
                  bgcolor: 'success.main',
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 2.75,
                  py: 0.65,
                  minWidth: 0,
                  fontSize: 13,
                  '&:hover': {
                    bgcolor: 'success.dark',
                  }
                }}
              >
                {saving ? 'Đang lưu...' : 'Lưu trang bị'}
              </Button>
            )}
          </Stack>
        </>
      )}
    >
      {(schemaError || recordError || danhMucError || technicalError || saveError || missingFieldSetIds.length > 0 || missingFieldRefs.length > 0) && (
        <Box sx={{
          px: 2.5,
          pt: 2,
          pb: 1.5,
          display: 'grid',
          gap: 1,
        }}>
          {schemaError && (
            <Alert severity="warning">
              {schemaError}
            </Alert>
          )}
          {recordError && (
            <Alert severity="error" onClose={() => setRecordError('')}>
              {recordError}
            </Alert>
          )}
          {danhMucError && (
            <Alert severity="warning">
              Không tải được danh mục trang bị: {danhMucError}
            </Alert>
          )}
          {technicalError && (
            <Alert severity="warning">
              Không tải được thông số kỹ thuật: {technicalError}
            </Alert>
          )}
          {saveError && (
            <Alert severity="error" onClose={() => setSaveError('')}>
              {saveError}
            </Alert>
          )}
          {missingFieldSetIds.length > 0 && (
            <Alert severity="warning">
              Tab hiện tại đang tham chiếu fieldset không tồn tại: {missingFieldSetIds.join(', ')}.
            </Alert>
          )}
          {missingFieldRefs.length > 0 && (
              <Alert severity="warning">
              FieldSet hiện tại đang thiếu field active: {missingFieldRefs.join(', ')}.
            </Alert>
          )}
        </Box>
      )}

      {/* Tabs - Lấy từ formConfig */}
      <Box sx={{
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider',
      }}>
        {/* ── Root tabs ────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1.5,
            minHeight: 40,
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.5,
              px: 2,
              mx: 0.25,
              borderTopLeftRadius: 1,
              borderTopRightRadius: 1,
              border: 1,
              borderBottom: 0,
              borderColor: 'transparent',
              transition: 'all 0.15s ease',
              '&.Mui-selected': {
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : militaryColors.navy + '08',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider',
                color: militaryColors.navy,
              },
              '&:not(.Mui-selected):hover': {
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              },
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              bgcolor: militaryColors.navy,
            },
          }}
        >
          {rootTabs.map((tab, index) => {
            const isActive = activeTab === index;
            const meta = parseTabMeta(tab);
            const childCount = (tabStructure.childrenByParent[tab.id] || []).length;

            return (
              <Tab
                key={`${tab.id}-${index}`}
                value={index}
                label={
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography
                      variant="inherit"
                      sx={{
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.82rem',
                      }}
                    >
                      {tab.label}
                    </Typography>
                    {meta.tabType === 'sync-group' && childCount > 0 && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 20,
                          height: 18,
                          px: 0.5,
                          borderRadius: 1,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: isActive
                            ? (isDark ? 'rgba(255,255,255,0.12)' : militaryColors.navy + '18')
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'grey.200'),
                          color: isActive ? militaryColors.navy : 'text.secondary',
                        }}
                      >
                        {childCount}
                      </Box>
                    )}
                  </Stack>
                }
              />
            );
          })}
        </Tabs>

        {/* ── Child tabs (sync-group) ──────────────────────── */}
        {currentRootMeta?.tabType === 'sync-group' && currentRootChildren.length > 0 && currentRootTab && (
          <Box sx={{
            borderTop: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'divider',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50',
          }}>
            <Tabs
              value={activeChildTabIndex}
              onChange={(_, v) => {
                setActiveChildTabByParent((prev) => ({
                  ...prev,
                  [currentRootTab.id]: v,
                }));
              }}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 2,
                minHeight: 32,
                '& .MuiTab-root': {
                  minHeight: 32,
                  py: 0.25,
                  px: 1.5,
                  mx: 0.25,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'transparent',
                  transition: 'all 0.15s ease',
                  '&.Mui-selected': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'divider',
                    boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
                  },
                  '&:not(.Mui-selected):hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  },
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
              }}
            >
              {currentRootChildren.map((child, index) => (
                <Tab
                  key={`${child.id}-${index}`}
                  value={index}
                  label={child.label}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.76rem',
                    fontWeight: activeChildTabIndex === index ? 700 : 500,
                    color: activeChildTabIndex === index ? 'text.primary' : 'text.secondary',
                  }}
                />
              ))}
            </Tabs>
          </Box>
        )}
      </Box>

      {/* Tab Content - Hiển thị theo FieldSets từ formConfig */}
      <Box sx={{
        px: 2.5,
        py: 2,
        flex: 1,
        overflowY: 'auto',
        bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'grey.50',
        minHeight: 280,
      }}>
        <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
          {/* Field Sets - Lấy từ formConfig hoặc API */}
          {currentTabContent.length > 0 ? (
            <>
              {currentTabContent.map((item, index) => (
                <FieldSetGroup
                  key={`${item.fieldSet.id}-${index}`}
                  fieldSet={item.fieldSet}
                  fields={item.fields}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                  color={item.fieldSet.color || setColors[index % setColors.length]}
                />
              ))}
              {technicalLoading && isDynamicTab && (
                <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
                  <CircularProgress size={20} sx={{ mb: 1 }} />
                  <Typography variant="body2">Đang tải thêm thông số kỹ thuật...</Typography>
                </Box>
              )}
            </>
          ) : technicalLoading && isDynamicTab ? (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              <CircularProgress size={28} sx={{ mb: 2 }} />
              <Typography variant="body2" fontWeight={600}>
                Đang tải thông số kỹ thuật...
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              py: 8,
              textAlign: 'center',
              color: 'text.secondary',
            }}>
              <Typography variant="body1" fontWeight={600}>
                Chưa có trường dữ liệu được cấu hình
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                {isDynamicTab
                  ? (selectedCategoryCode
                    ? `Chưa có thông số kỹ thuật được cấu hình cho mã danh mục "${selectedCategoryCode}".`
                    : 'Hãy chọn mã danh mục trang bị ở tab "Thông tin chung" để nạp thông số kỹ thuật tương ứng.')
                  : currentRootMeta?.tabType === 'sync-group'
                  ? (selectedCategoryCode
                    ? `Chưa có bộ dữ liệu chi tiết nào được cấu hình cho mã danh mục "${selectedCategoryCode}".`
                    : 'Hãy chọn mã danh mục trang bị ở tab "Thông tin chung" để nạp tab chi tiết tương ứng.')
                  : 'Vui lòng cấu hình form trong phần "Cấu hình tham số"'}
              </Typography>
            </Box>
          )}

        </Box>
      </Box>
    </FormDialog>
  );
};

export default AddTrangBiDialog;
