// ============================================================
// AddTrangBiDialog – Form nhập trang bị kỹ thuật (Nhóm 1, Nhóm 2)
// Thiết kế: Hiện đại, trực quan, dễ sử dụng
// Lấy dữ liệu từ FormConfig (Cấu hình tham số)
// ============================================================
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import AddLinkIcon from '@mui/icons-material/AddLink';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
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
import thamSoApi, { invalidateRuntimeFormSchemaCache } from '../../apis/thamSoApi';
import { getRequiredFormKeyForMenu } from '../../utils/formConfigKeys';
import nhomDongBoApi from '../../apis/nhomDongBoApi';

const normalizeSyncTabToken = (label?: string): string => String(label ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u0111\u0110]/g, 'd')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const isSyncTabLabel = (label?: string): boolean => {
  const normalized = normalizeSyncTabToken(label);

  return normalized === 'danh sach trang bi dong bo'
    || normalized === 'nhom dong bo'
    || normalized === 'bo dong bo'
    || normalized === 'dong bo'
    || normalized === 'trang bi dong bo';
};

const normalizeDisplayTabLabel = (label?: string): string => {
  const raw = String(label ?? '').trim();
  if (!raw) return '';

  const normalized = normalizeSyncTabToken(raw);

  if (
    normalized === 'danh sach trang bi dong bo'
    || normalized === 'nhom dong bo'
    || normalized === 'bo dong bo'
    || normalized === 'dong bo'
    || normalized === 'trang bi dong bo'
  ) {
    return 'Danh s\u00E1ch trang b\u1ECB \u0111\u1ED3ng b\u1ED9';
  }

  if (
    normalized === 'danh sach trang bi dong bo'
    || normalized === 'nhom dong bo'
    || normalized === 'bo dong bo'
    || normalized === 'dong bo'
    || normalized === 'trang bi dong bo'
  ) {
    return 'Danh sách trang bị đồng bộ';
  }

  if (
    normalized === 'danh sach trang bi dong bo'
    || normalized === 'nhom dong bo'
    || normalized === 'bo dong bo'
    || normalized === 'dong bo'
    || normalized === 'trang bi dong bo'
  ) {
    return 'Danh sách trang bị đồng bộ';
  }

  return raw;
};

// ── Props ───────────────────────────────────────────────────
interface AddTrangBiDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  activeMenu?: 'tbNhom1' | 'tbNhom2';
  editingRecordId?: string | null;
}

type TrangBiEditorRecord = TrangBiNhom1EditorItem | TrangBiNhom2EditorItem;

interface SyncEquipmentItem {
  id: string;
  nhom: 1 | 2;
  maDanhMuc: string;
  tenDanhMuc: string;
  soHieu: string;
  idNhomDongBo?: string;
}

const buildSyncEquipmentKey = (item: Pick<SyncEquipmentItem, 'id' | 'nhom'>): string =>
  `${item.nhom}:${item.id}`;

const mapTrangBiSyncItem = (
  nhom: 1 | 2,
  item: Awaited<ReturnType<typeof trangBiKiThuatApi.getListTrangBiNhom1>>[number]
    | Awaited<ReturnType<typeof trangBiKiThuatApi.getListTrangBiNhom2>>[number],
): SyncEquipmentItem => ({
  id: String(item.id ?? '').trim(),
  nhom,
  maDanhMuc: String(item.maDanhMuc ?? '').trim(),
  tenDanhMuc: String(item.tenDanhMuc ?? '').trim(),
  soHieu: String(item.soHieu ?? '').trim(),
  idNhomDongBo: item.idNhomDongBo ? String(item.idNhomDongBo).trim() : undefined,
});

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
  renderVersion?: number;
}

const FieldSetGroup: React.FC<FieldSetGroupProps> = ({
  fieldSet,
  fields,
  formData,
  onFieldChange,
  color,
  renderVersion = 0,
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
            key={`${field.id}-${renderVersion}`}
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
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [syncMembers, setSyncMembers] = useState<SyncEquipmentItem[]>([]);
  const [syncSearchText, setSyncSearchText] = useState('');
  const [syncSearchResults, setSyncSearchResults] = useState<SyncEquipmentItem[]>([]);
  const [syncSearchLoading, setSyncSearchLoading] = useState(false);
  const [syncSearchError, setSyncSearchError] = useState('');
  const [syncGroupLoading, setSyncGroupLoading] = useState(false);
  const [syncGroupMeta, setSyncGroupMeta] = useState<{
    id: string;
    tenNhom: string;
    idDonVi: string;
    parameters: Record<string, string>;
    expectedVersion?: number;
  } | null>(null);
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
    invalidateRuntimeFormSchemaCache(formKey, activeMenu);
    thamSoApi.getRuntimeFormSchema(formKey, activeMenu, { forceRefresh: true })
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
      setSyncPanelOpen(false);
      setSyncMembers([]);
      setSyncSearchText('');
      setSyncSearchResults([]);
      setSyncSearchLoading(false);
      setSyncSearchError('');
      setSyncGroupLoading(false);
      setSyncGroupMeta(null);
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
  const syncGroupFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'id_nhom_dong_bo');
    return found?.key;
  }, [allFields]);
  const syncStatusFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'trang_thai_dong_bo');
    return found?.key;
  }, [allFields]);
  const resolvedCategoryNameKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === categoryNameFieldKey.toLowerCase());
    return found?.key ?? categoryNameFieldKey;
  }, [allFields, categoryNameFieldKey]);
  const managementUnitFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'don_vi_quan_ly');
    return found?.key;
  }, [allFields]);
  const operatingUnitFieldKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === 'don_vi');
    return found?.key;
  }, [allFields]);

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
        if (syncGroupFieldKey) {
          nextFormData[syncGroupFieldKey] = record.idNhomDongBo ?? '';
        }
        if (syncStatusFieldKey) {
          nextFormData[syncStatusFieldKey] = String(Boolean(record.trangThaiDongBo));
        }

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
    syncGroupFieldKey,
    syncStatusFieldKey,
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
  const rawCurrentTabContent = useMemo(() => {
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

  const isSyncMembershipTabByLabel = useMemo(() => (
    isSyncTabLabel(effectiveTab?.label)
    || isSyncTabLabel(currentRootTab?.label)
  ), [currentRootTab?.label, effectiveTab?.label]);

  const isSyncMembershipTab = useMemo(() => (
    isSyncMembershipTabByLabel
    || rawCurrentTabContent.some(({ fields }) =>
      fields.some((field) => {
        const normalized = field.key.toLowerCase();
        return normalized === 'id_nhom_dong_bo' || normalized === 'trang_thai_dong_bo';
      }))
  ), [isSyncMembershipTabByLabel, rawCurrentTabContent]);

  const currentTabContent = useMemo(() => {
    if (!isSyncMembershipTab) {
      return rawCurrentTabContent;
    }

    return rawCurrentTabContent
      .map((item) => ({
        ...item,
        fields: item.fields.filter((field) => {
          const normalized = field.key.toLowerCase();
          return normalized !== 'id_nhom_dong_bo' && normalized !== 'trang_thai_dong_bo';
        }),
      }))
      .filter((item) => item.fields.length > 0);
  }, [isSyncMembershipTab, rawCurrentTabContent]);

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
  const currentEquipmentId = useMemo(() => String(editorRecord?.id ?? '').trim(), [editorRecord?.id]);
  const selectedSyncGroupId = useMemo(() => {
    if (!syncGroupFieldKey) return '';
    return String(formData[syncGroupFieldKey] ?? '').trim();
  }, [formData, syncGroupFieldKey]);
  const currentEquipmentNhom = useMemo(
    () => (activeMenu === 'tbNhom2' ? 2 : 1) as 1 | 2,
    [activeMenu],
  );
  const currentEquipmentName = useMemo(
    () => String(formData[resolvedCategoryNameKey] ?? editorRecord?.tenDanhMuc ?? '').trim(),
    [editorRecord?.tenDanhMuc, formData, resolvedCategoryNameKey],
  );
  const currentEquipmentCode = useMemo(
    () => String(formData[categoryFieldKey] ?? editorRecord?.maDanhMuc ?? '').trim(),
    [categoryFieldKey, editorRecord?.maDanhMuc, formData],
  );
  const selectedSyncMemberKeys = useMemo(
    () => new Set(syncMembers.map((item) => buildSyncEquipmentKey(item))),
    [syncMembers],
  );
  const suggestedSyncOfficeId = useMemo(() => {
    const primaryValue = managementUnitFieldKey ? formData[managementUnitFieldKey] : undefined;
    const fallbackValue = operatingUnitFieldKey ? formData[operatingUnitFieldKey] : undefined;
    return String(primaryValue ?? fallbackValue ?? '').trim();
  }, [formData, managementUnitFieldKey, operatingUnitFieldKey]);

  useEffect(() => {
    if (!open || !syncGroupFieldKey) return;

    if (!selectedSyncGroupId) {
      setSyncGroupMeta(null);
      setSyncMembers([]);
      return;
    }

    let cancelled = false;
    setSyncGroupLoading(true);
    setSyncSearchError('');

    nhomDongBoApi.getNhomDongBo(selectedSyncGroupId)
      .then((res) => {
        if (cancelled) return;
        setSyncGroupMeta({
          id: selectedSyncGroupId,
          tenNhom: String(res.item.tenNhom ?? '').trim(),
          idDonVi: String(res.item.idDonVi ?? '').trim(),
          parameters: res.item.parameters ?? {},
          expectedVersion: typeof res.item.version === 'number' ? res.item.version : undefined,
        });

        const mappedMembers = (res.thanhVien ?? [])
          .map((member) => ({
            id: String(member.id ?? '').trim(),
            nhom: (Number(member.nhom) === 2 ? 2 : 1) as 1 | 2,
            maDanhMuc: String(member.maDanhMuc ?? '').trim(),
            tenDanhMuc: String(member.tenDanhMuc ?? '').trim(),
            soHieu: String(member.soHieu ?? '').trim(),
            idNhomDongBo: selectedSyncGroupId,
          }))
          .filter((member) => member.id && member.id !== currentEquipmentId);

        setSyncMembers(mappedMembers);
      })
      .catch((error) => {
        if (cancelled) return;
        setSyncSearchError(String((error as Error)?.message || 'Khong the tai thanh vien dong bo'));
        setSyncGroupMeta(null);
        setSyncMembers([]);
      })
      .finally(() => {
        if (!cancelled) setSyncGroupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentEquipmentId, open, selectedSyncGroupId, syncGroupFieldKey]);

  useEffect(() => {
    if (!open || !isSyncMembershipTab) return;

    const query = syncSearchText.trim();
    if (query.length < 2) {
      setSyncSearchResults([]);
      setSyncSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSyncSearchLoading(true);
      setSyncSearchError('');

      Promise.all([
        trangBiKiThuatApi.getListTrangBiNhom1({ searchText: query }),
        trangBiKiThuatApi.getListTrangBiNhom2({ searchText: query }),
      ])
        .then(([nhom1, nhom2]) => {
          if (cancelled) return;
          const merged = [
            ...nhom1.map((item) => mapTrangBiSyncItem(1, item)),
            ...nhom2.map((item) => mapTrangBiSyncItem(2, item)),
          ].filter((item) => item.id && item.id !== currentEquipmentId);
          setSyncSearchResults(merged);
        })
        .catch((error) => {
          if (!cancelled) {
            setSyncSearchError(String((error as Error)?.message || 'Khong the tim trang bi dong bo'));
            setSyncSearchResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) setSyncSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [currentEquipmentId, isSyncMembershipTab, open, syncSearchText]);

  const canAttachToCurrentGroup = useCallback((item: SyncEquipmentItem): boolean => {
    if (!item.idNhomDongBo) return true;
    if (!selectedSyncGroupId) return false;
    return item.idNhomDongBo === selectedSyncGroupId;
  }, [selectedSyncGroupId]);

  const handleAddSyncMember = useCallback((item: SyncEquipmentItem) => {
    if (!canAttachToCurrentGroup(item)) {
      setSyncSearchError('Trang bi da thuoc nhom dong bo khac, khong the them vao nhom hien tai.');
      return;
    }

    const key = buildSyncEquipmentKey(item);
    if (selectedSyncMemberKeys.has(key)) return;

    setSyncMembers((prev) => [...prev, item]);
    if (syncStatusFieldKey) {
      setFormData((prev) => ({ ...prev, [syncStatusFieldKey]: 'true' }));
    }
  }, [canAttachToCurrentGroup, selectedSyncMemberKeys, syncStatusFieldKey]);

  const handleRemoveSyncMember = useCallback((item: SyncEquipmentItem) => {
    const key = buildSyncEquipmentKey(item);
    setSyncMembers((prev) => prev.filter((entry) => buildSyncEquipmentKey(entry) !== key));
  }, []);

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
      const next = { ...prev, [fieldKey]: value };

      if (syncGroupFieldKey && syncStatusFieldKey && fieldKey === syncGroupFieldKey) {
        next[syncStatusFieldKey] = value.trim() ? 'true' : 'false';
      }

      if (syncGroupFieldKey && syncStatusFieldKey && fieldKey === syncStatusFieldKey && value !== 'true') {
        next[syncGroupFieldKey] = '';
      }

      return next;
    });

    if (fieldKey === categoryFieldKey) {
      void syncParentCategoryFields(value);
    }
    if (syncStatusFieldKey && fieldKey === syncStatusFieldKey && value !== 'true') {
      setSyncMembers([]);
      setSyncGroupMeta(null);
    }
  }, [categoryFieldKey, syncGroupFieldKey, syncParentCategoryFields, syncStatusFieldKey]);

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
      syncGroupFieldKey,
      syncStatusFieldKey,
    ]);
    const parameters: Record<string, string> = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!coreKeys.has(key) && value.trim()) {
        parameters[key] = value;
      }
    }

    const hasSyncStatusField = Boolean(syncStatusFieldKey);
    const hasSyncGroupField = Boolean(syncGroupFieldKey);
    const rawTrangThaiDongBo = hasSyncStatusField
      ? formData[syncStatusFieldKey!] === 'true'
      : undefined;
    const rawIdNhomDongBo = hasSyncGroupField
      ? ((formData[syncGroupFieldKey!] ?? '').trim() || undefined)
      : undefined;
    const shouldManageSyncMembers = syncMembers.length > 0;
    const idNhomDongBo = shouldManageSyncMembers && !rawIdNhomDongBo
      ? undefined
      : rawIdNhomDongBo;
    const trangThaiDongBo = shouldManageSyncMembers
      ? (idNhomDongBo ? true : undefined)
      : rawTrangThaiDongBo;

    if (rawTrangThaiDongBo && !rawIdNhomDongBo && !shouldManageSyncMembers) {
      setSaveError('Vui lòng chọn nhóm đồng bộ khi đánh dấu trạng thái đồng bộ.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const saveTrangBi = activeMenu === 'tbNhom2'
        ? trangBiKiThuatApi.saveTrangBiNhom2
        : trangBiKiThuatApi.saveTrangBiNhom1;
      const saveResult = await saveTrangBi(
        {
          id: editorRecord?.id || undefined,
          maDanhMuc: maDinhDanh,
          parameters,
          expectedVersion: editorRecord?.version,
          idNhomDongBo,
          trangThaiDongBo,
        },
      );

      if (shouldManageSyncMembers) {
        const currentId = String(saveResult.id ?? editorRecord?.id ?? '').trim();
        if (!currentId) {
          throw new Error('Khong xac dinh duoc id trang bi sau khi luu.');
        }

        const finalGroupId = idNhomDongBo ?? selectedSyncGroupId;
        let finalTenNhom = syncGroupMeta?.tenNhom ?? `Nhom dong bo ${currentEquipmentName || currentEquipmentCode || currentId}`;
        let finalIdDonVi = syncGroupMeta?.idDonVi ?? suggestedSyncOfficeId;
        let finalParameters = syncGroupMeta?.parameters ?? {};
        let finalExpectedVersion = syncGroupMeta?.expectedVersion;

        if (finalGroupId) {
          const currentGroup = await nhomDongBoApi.getNhomDongBo(finalGroupId);
          finalTenNhom = String(currentGroup.item.tenNhom ?? '').trim() || finalTenNhom;
          finalIdDonVi = String(currentGroup.item.idDonVi ?? '').trim() || finalIdDonVi;
          finalParameters = currentGroup.item.parameters ?? finalParameters;
          finalExpectedVersion = typeof currentGroup.item.version === 'number'
            ? currentGroup.item.version
            : finalExpectedVersion;
        }

        if (!finalIdDonVi) {
          throw new Error('Chua xac dinh duoc don vi quan ly de cap nhat nhom dong bo.');
        }

        const refs = new Map<string, { id: string; nhom: number }>();
        refs.set(buildSyncEquipmentKey({ id: currentId, nhom: currentEquipmentNhom }), {
          id: currentId,
          nhom: currentEquipmentNhom,
        });
        syncMembers.forEach((item) => {
          refs.set(buildSyncEquipmentKey(item), {
            id: item.id,
            nhom: item.nhom,
          });
        });

        await nhomDongBoApi.saveNhomDongBo({
          id: finalGroupId || undefined,
          tenNhom: finalTenNhom,
          idDonVi: finalIdDonVi,
          dsTrangBi: Array.from(refs.values()),
          parameters: finalParameters,
          expectedVersion: finalExpectedVersion,
        });
      }

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
    syncGroupFieldKey,
    syncStatusFieldKey,
    editorRecord,
    selectedSyncGroupId,
    syncGroupMeta?.expectedVersion,
    syncGroupMeta?.idDonVi,
    syncGroupMeta?.parameters,
    syncGroupMeta?.tenNhom,
    syncMembers,
    suggestedSyncOfficeId,
    currentEquipmentCode,
    currentEquipmentName,
    currentEquipmentNhom,
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
                      {normalizeDisplayTabLabel(tab.label)}
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
                  label={normalizeDisplayTabLabel(child.label)}
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
          {isSyncMembershipTab && (
            <>
              <Paper
                variant="outlined"
                sx={{
                  mb: syncPanelOpen ? 1.25 : 2,
                  p: 1.75,
                  borderRadius: 2.5,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider',
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1.25}
                  alignItems={{ md: 'center' }}
                  justifyContent="space-between"
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Danh sach trang bi dong bo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      Them trang bi dong bo ngay trong dialog hien tai.
                    </Typography>
                    {!syncPanelOpen && syncMembers.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        Da chon {syncMembers.length} trang bi dong bo. Bam nut de mo lai panel va chinh sua danh sach.
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      color={syncMembers.length > 0 ? 'success' : 'default'}
                      label={`Da chon ${syncMembers.length} trang bi`}
                    />
                    {syncPanelOpen && (
                      <Button variant="text" color="inherit" onClick={() => setSyncPanelOpen(false)}>
                        Thu gon
                      </Button>
                    )}
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSyncPanelOpen(true)}>
                      + Them trang bi dong bo
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {syncPanelOpen && (
            <Paper
              variant="outlined"
              sx={{
                mb: 2,
                p: 1.75,
                borderRadius: 2.5,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'divider',
                bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
              }}
            >
              <Stack spacing={1.25}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Danh sách trang bị đồng bộ
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      Chon cac trang bi can dong bo voi ban ghi dang nhap, he thong se cap nhat nhom dong bo khi luu trang bi.
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={syncMembers.length > 0 ? 'success' : 'default'}
                    label={`Da chon ${syncMembers.length} trang bi`}
                  />
                </Stack>

                {syncGroupMeta && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Dang thao tac tren nhom dong bo: {syncGroupMeta.tenNhom || syncGroupMeta.id}
                  </Alert>
                )}

                {syncSearchError && (
                  <Alert severity="warning" onClose={() => setSyncSearchError('')}>
                    {syncSearchError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  size="small"
                  value={syncSearchText}
                  onChange={(event) => setSyncSearchText(event.target.value)}
                  placeholder="Tim trang bi theo ten danh muc, ma danh muc, so hieu..."
                  slotProps={{
                    input: {
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, opacity: 0.7 }} />,
                    },
                  }}
                />

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 68 }}>Nhom</TableCell>
                        <TableCell>Ten danh muc</TableCell>
                        <TableCell>So hieu</TableCell>
                        <TableCell align="right" sx={{ width: 120 }}>Tac vu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(syncSearchLoading || syncGroupLoading) && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Stack direction="row" spacing={1} alignItems="center" py={0.75}>
                              <CircularProgress size={16} />
                              <Typography variant="body2" color="text.secondary">
                                Dang tai danh sach trang bi...
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}

                      {!syncSearchLoading && !syncGroupLoading && syncSearchText.trim().length < 2 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" py={0.75}>
                              Nhap toi thieu 2 ky tu de tim trang bi dong bo.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                      {!syncSearchLoading && !syncGroupLoading && syncSearchText.trim().length >= 2 && syncSearchResults.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" py={0.75}>
                              Khong tim thay trang bi phu hop.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                      {!syncSearchLoading && !syncGroupLoading && syncSearchResults.map((item) => {
                        const key = buildSyncEquipmentKey(item);
                        const alreadySelected = selectedSyncMemberKeys.has(key);
                        const blockedByOtherGroup = Boolean(item.idNhomDongBo) && !canAttachToCurrentGroup(item);

                        return (
                          <TableRow key={key} hover>
                            <TableCell>{item.nhom}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {item.tenDanhMuc || item.maDanhMuc || item.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.maDanhMuc || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>{item.soHieu || '-'}</TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                startIcon={<AddLinkIcon fontSize="small" />}
                                onClick={() => handleAddSyncMember(item)}
                                disabled={alreadySelected || blockedByOtherGroup}
                              >
                                {blockedByOtherGroup ? 'Da thuoc nhom khac' : alreadySelected ? 'Da chon' : 'Them'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>

                <Typography variant="subtitle2" fontWeight={700}>
                  Thanh vien dong bo da chon ({syncMembers.length})
                </Typography>

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 68 }}>Nhom</TableCell>
                        <TableCell>Ten danh muc</TableCell>
                        <TableCell>So hieu</TableCell>
                        <TableCell align="right" sx={{ width: 84 }}>Tac vu</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" py={0.75}>
                              Chua co trang bi dong bo nao duoc them.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                      {syncMembers.map((item) => (
                        <TableRow key={buildSyncEquipmentKey(item)} hover>
                          <TableCell>{item.nhom}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.tenDanhMuc || item.maDanhMuc || item.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.maDanhMuc || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{item.soHieu || '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" color="error" onClick={() => handleRemoveSyncMember(item)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Stack>
            </Paper>
              )}
            </>
          )}
          {/* Field Sets - Lấy từ formConfig hoặc API */}
          {currentTabContent.length > 0 || isSyncMembershipTab ? (
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
