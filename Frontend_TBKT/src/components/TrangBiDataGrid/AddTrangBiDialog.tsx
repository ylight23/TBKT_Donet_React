// ============================================================
// AddTrangBiDialog – Form nhập trang bị kỹ thuật (Nhóm 1, Nhóm 2)
// Thiết kế: Tab cứng (Thông tin chung / Thông số kỹ thuật / Đồng bộ)
// Lấy dữ liệu từ ThamSo API trực tiếp – không qua FormConfig
// ============================================================
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

import { FormDialog } from '../Dialog';
import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
} from '../../types/thamSo';
import FieldInput from '../../pages/CauHinhThamSo/subComponents/FieldInput';
import {
  createDialogTabsSx,
  dialogActionBtnSx,
  dialogCancelBtnSx,
  dialogPaperSx,
  dialogPrimaryBtnSx,
  dialogSaveBtnSx,
  dialogTabContentSx,
  dialogTabHeaderSx,
} from '../../styles/dialogTabStyles';
import SyncMembersTab from './SyncMembersTab';
import TechnicalFieldsTab from './TechnicalFieldsTab';
import GeneralInfoTab from './GeneralInfoTab';
import danhMucTrangBiApi, { DANH_MUC_TRANG_BI_TREE_ENDPOINT } from '../../apis/danhMucTrangBiApi';
import trangBiKiThuatApi, {
  type TrangBiNhom1EditorItem,
  type TrangBiNhom2EditorItem,
} from '../../apis/trangBiKiThuatApi';
import thamSoApi from '../../apis/thamSoApi';
import nhomDongBoApi from '../../apis/nhomDongBoApi';

// ── Tab cứng – 3 tab cố định, không phụ thuộc FormConfig ──
const STATIC_TABS = [
  { label: 'Thông tin chung', index: 0 },
  { label: 'Thông số kỹ thuật', index: 1 },
  { label: 'Danh sách trang bị đồng bộ', index: 2 },
] as const;

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

interface SyncGroupMeta {
  id: string;
  tenNhom: string;
  idDonVi: string;
  parameters: Record<string, string>;
  expectedVersion?: number;
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
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [danhMucError] = useState('');
  // ── Schema nạp từ ThamSo API trực tiếp ────────────────────
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
  const [syncMembers, setSyncMembers] = useState<SyncEquipmentItem[]>([]);
  const [syncSearchText, setSyncSearchText] = useState('');
  const [syncSearchResults, setSyncSearchResults] = useState<SyncEquipmentItem[]>([]);
  const [syncSearchLoading, setSyncSearchLoading] = useState(false);
  const [syncSearchError, setSyncSearchError] = useState('');
  const [syncGroupLoading, setSyncGroupLoading] = useState(false);
  const [syncGroupMeta, setSyncGroupMeta] = useState<SyncGroupMeta | null>(null);
  const technicalFetchRef = useRef(0); // để tránh race condition khi chọn nhanh nhiều danh mục
  const categoryFieldKey = 'ma_danh_muc';
  const categoryNameFieldKey = 'ten_danh_muc';

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Nạp FieldSet và DynamicField trực tiếp từ ThamSo API khi dialog mở
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSchemaLoading(true);
    setSchemaError('');
    Promise.all([
      thamSoApi.getListFieldSets(),
      thamSoApi.getListDynamicFields(),
    ])
      .then(([fieldSets, fields]) => {
        if (cancelled) return;
        setAllFieldSets(fieldSets);
        setAllFields(fields);
      })
      .catch((err) => {
        if (cancelled) return;
        setSchemaError((err as Error)?.message || 'Không thể tải cấu hình trường dữ liệu.');
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  // Reset form khi dialog mở
  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setFormData({});
      setTechnicalFieldSets([]);
      setTechnicalLoading(false);
      setTechnicalError('');
      setSaving(false);
      setSaveError('');
      setRecordLoading(false);
      setRecordError('');
      setEditorRecord(null);
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

  const selectedCategoryCode = useMemo(
    () => formData[categoryFieldKey] ?? '',
    [categoryFieldKey, formData],
  );

  // Nạp FieldSet kỹ thuật khi đổi mã danh mục (tab Thông số kỹ thuật)
  useEffect(() => {
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
        if (technicalFetchRef.current !== fetchId) return;
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
  }, [selectedCategoryCode]);

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

  // Tab 0: Thông tin chung – tất cả FieldSet không gắn maDanhMucTrangBi
  const generalTabContent = useMemo(() => (
    allFieldSets
      .filter((fs) => !fs.maDanhMucTrangBi?.length)
      .map((fs) => ({ fieldSet: fs, fields: applyFieldOverrides(fs.fields ?? []) }))
  ), [allFieldSets, applyFieldOverrides]);

  // Tab 1: Thông số kỹ thuật – FieldSet từ danhMucTrangBiApi theo mã danh mục
  const technicalTabContent = useMemo(() => (
    technicalFieldSets.map((fs) => ({ fieldSet: fs, fields: applyFieldOverrides(fs.fields ?? []) }))
  ), [technicalFieldSets, applyFieldOverrides]);

  // currentTabContent – chỉ cần cho tab 0 (Thông tin chung); tab 1 và 2 tự quản lý
  const currentTabContent = generalTabContent;

  const isSyncTab = activeTab === 2;

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
    if (!open || !isSyncTab) return;

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
  }, [currentEquipmentId, isSyncTab, open, syncSearchText]);

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
    setActiveTab((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNextTab = useCallback(() => {
    setActiveTab((prev) => Math.min(prev + 1, 2));
  }, []);

  const isAtStart = activeTab === 0;
  const isAtEnd = activeTab === 2;

  if (schemaLoading || (isEditMode && (recordLoading || !editorRecord))) {
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
            : <Alert severity="warning">{schemaError || 'Không tải được dữ liệu biểu mẫu.'}</Alert>}
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
      sx={dialogPaperSx}
      contentSx={{ overflow: 'hidden' }}
      showConfirm={false}
      showCancel={false}
      customActions={(
        <>
          <Button
            variant="outlined"
            onClick={handlePreviousTab}
            disabled={isAtStart}
            sx={dialogActionBtnSx}
          >
            ← Quay lại
          </Button>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={dialogCancelBtnSx}
            >
              Hủy
            </Button>

            {!isAtEnd ? (
              <Button
                variant="contained"
                onClick={handleNextTab}
                sx={dialogPrimaryBtnSx()}
              >
                Tiếp tục →
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                sx={dialogSaveBtnSx}
              >
                {saving ? 'Đang lưu...' : 'Lưu trang bị'}
              </Button>
            )}
          </Stack>
        </>
      )}
    >
      {(schemaError || recordError || danhMucError || technicalError || saveError) && (
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
        </Box>
      )}

      {/* Tabs - 3 tab cố định */}
      <Box sx={dialogTabHeaderSx(isDark)}>
        <Box>
        {/* ── Root tabs ────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={createDialogTabsSx(isDark)}
        >
          {STATIC_TABS.map(({ label, index }) => {
            const isActive = activeTab === index;
            const count = index === 2 ? syncMembers.length : 0;
            return (
              <Tab
                key={index}
                value={index}
                label={(
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography
                      variant="inherit"
                      sx={{ fontWeight: isActive ? 700 : 500, fontSize: '0.82rem' }}
                    >
                      {label}
                    </Typography>
                    {index === 2 && count > 0 && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 18,
                          height: 18,
                          px: 0.6,
                          borderRadius: '9px',
                          bgcolor: isActive ? 'rgba(255,255,255,0.25)' : 'success.main',
                          color: '#fff',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        {count}
                      </Box>
                    )}
                  </Box>
                )}
              />
            );
          })}
        </Tabs>
        </Box>
      </Box>

      {/* Tab Content - FieldSets từ ThamSo API */}
      <Box sx={dialogTabContentSx(isDark)}>
        <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
          <Box>
          {isSyncTab && (
            <SyncMembersTab
              syncSearchText={syncSearchText}
              onSearchTextChange={setSyncSearchText}
              syncSearchResults={syncSearchResults}
              syncSearchLoading={syncSearchLoading}
              syncSearchError={syncSearchError}
              onClearSearchError={() => setSyncSearchError('')}
              syncGroupLoading={syncGroupLoading}
              syncGroupMeta={syncGroupMeta}
              syncMembers={syncMembers}
              selectedSyncMemberKeys={selectedSyncMemberKeys}
              onAdd={handleAddSyncMember}
              onRemove={handleRemoveSyncMember}
              canAttachToCurrentGroup={canAttachToCurrentGroup}
              buildKey={buildSyncEquipmentKey}
            />
          )}
          {/* Tab 1: Thông số kỹ thuật */}
          {activeTab === 1 && (
            <TechnicalFieldsTab
              technicalTabContent={technicalTabContent}
              technicalLoading={technicalLoading}
              technicalError={technicalError}
              selectedCategoryCode={selectedCategoryCode}
              formData={formData}
              onFieldChange={handleFieldChange}
              setColors={setColors}
            />
          )}
          {/* Tab 0: Thông tin chung */}
          {activeTab === 0 && (
            <GeneralInfoTab
              generalTabContent={currentTabContent}
              formData={formData}
              onFieldChange={handleFieldChange}
              setColors={setColors}
            />
          )}
          </Box>
        </Box>
      </Box>
    </FormDialog>
  );
};

export default AddTrangBiDialog;
