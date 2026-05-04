// ============================================================
// AddTrangBiDialog – Form nhập trang bị kỹ thuật (Nhóm 1, Nhóm 2)
// Refactored: React.lazy cho tab components, TabContext/TabPanel
// thay thế manual conditionals.
// ============================================================
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import { useTheme } from '@mui/material/styles';

// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncAltOutlined';
import InventoryIcon from '@mui/icons-material/Inventory';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import HandymanIcon from '@mui/icons-material/Handyman';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StarIcon from '@mui/icons-material/Star';

import { FormDialog } from '../Dialog';
import {
  createDialogTabsSx,
  dialogActionBtnSx,
  dialogCancelBtnSx,
  dialogPrimaryBtnSx,
  dialogSaveBtnSx,
  dialogTabContentSx,
  dialogTabHeaderSx,
} from '../../styles/dialogTabStyles';
import danhMucTrangBiApi from '../../apis/danhMucTrangBiApi';
import trangBiKiThuatApi, {
  type TrangBiNhom1EditorItem,
  type TrangBiNhom2EditorItem,
} from '../../apis/trangBiKiThuatApi';
import nhomDongBoApi from '../../apis/nhomDongBoApi';
import { useMyPermissions } from '../../hooks/useMyPermissions';
import useTrangBiDialogSchema from '../../hooks/useTrangBiDialogSchema';
import useTrangBiDialogFieldSetContent from '../../hooks/useTrangBiDialogFieldSetContent';

// ── Lazy-loaded tab components ───────────────────────────────
const GeneralInfoTab = lazy(() => import('./GeneralInfoTab'));
const TechnicalFieldsTab = lazy(() => import('./TechnicalFieldsTab'));
const SyncMembersTab = lazy(() => import('./SyncMembersTab'));
const BaoQuanTab = lazy(() => import('./tabs/BaoQuanTab'));
const BaoDuongTab = lazy(() => import('./tabs/BaoDuongTab'));
const SuaChuaTab = lazy(() => import('./tabs/SuaChuaTab'));
const NiemCatTab = lazy(() => import('./tabs/NiemCatTab'));
const DieuDongTab = lazy(() => import('./tabs/DieuDongTab'));
const ChuyenCapChatLuongTab = lazy(() => import('./tabs/ChuyenCapChatLuongTab'));

// ── Tab keys (dùng string thay vì index number) ─────────────
const TAB_GENERAL = '0';
const TAB_TECHNICAL = '1';
const TAB_SYNC = '2';
const TAB_BAO_QUAN = '3';
const TAB_BAO_DUONG = '4';
const TAB_SUA_CHUA = '5';
const TAB_NIEM_CAT = '6';
const TAB_DIEU_DONG = '7';
const TAB_CHUYEN_CAP = '8';

const TAB_META = [
  { value: TAB_GENERAL, label: 'Thông tin chung', Icon: InfoOutlinedIcon },
  { value: TAB_TECHNICAL, label: 'Thông số kỹ thuật', Icon: SettingsSuggestOutlinedIcon },
  { value: TAB_SYNC, label: 'Danh sách đồng bộ', Icon: SyncOutlinedIcon },
  { value: TAB_BAO_QUAN, label: 'Bảo quản', Icon: InventoryIcon },
  { value: TAB_BAO_DUONG, label: 'Bảo dưỡng', Icon: MiscellaneousServicesIcon },
  { value: TAB_SUA_CHUA, label: 'Sửa chữa', Icon: HandymanIcon },
  { value: TAB_NIEM_CAT, label: 'Niêm cất', Icon: WarehouseIcon },
  { value: TAB_DIEU_DONG, label: 'Điều động', Icon: LocalShippingIcon },
  { value: TAB_CHUYEN_CAP, label: 'Chuyển cấp', Icon: StarIcon },
] as const;

// ── Props ───────────────────────────────────────────────────
interface AddTrangBiDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  activeMenu?: 'tbNhom1' | 'tbNhom2';
  editingRecordId?: string | null;
  readOnly?: boolean;
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

// ── Suspense fallback cho tab content ───────────────────────
const TabSkeleton: React.FC<{ height?: number | string }> = ({ height = 320 }) => (
  <Stack spacing={1.5} sx={{ px: 0.5, pt: 1, minHeight: height }}>
    {[1, 2, 3].map((i) => (
      <Skeleton
        key={i}
        variant="rectangular"
        height={i === 1 ? 72 : 52}
        sx={{ borderRadius: 2.5, opacity: 0.4 }}
      />
    ))}
  </Stack>
);

// ── Main Dialog Component ───────────────────────────────────
const AddTrangBiDialog: React.FC<AddTrangBiDialogProps> = ({
  open,
  onClose,
  onSaved,
  activeMenu,
  editingRecordId,
  readOnly = false,
}) => {
  const isEditMode = Boolean(editingRecordId);
  const dialogMode = readOnly ? 'info' : (isEditMode ? 'edit' : 'add');
  const { canCnAction } = useMyPermissions();
  const dialogTitle = isEditMode ? 'Chỉnh sửa trang bị kỹ thuật' : 'Thêm trang bị kỹ thuật mới';
  const dialogIcon = readOnly ? <VisibilityIcon /> : (isEditMode ? <EditIcon /> : <AddIcon />);
  const saveButtonLabel = isEditMode ? 'Cập nhật trang bị' : 'Lưu trang bị';

  // Tab state – dùng string key thay vì number
  const [activeTab, setActiveTab] = useState<string>(TAB_GENERAL);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const selectedCategoryCode = useMemo(
    () => formData.ma_danh_muc ?? '',
    [formData],
  );
  const [danhMucError] = useState('');


  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [editorRecord, setEditorRecord] = useState<TrangBiEditorRecord | null>(null);

  // Sync members state
  const [syncMembers, setSyncMembers] = useState<SyncEquipmentItem[]>([]);
  const [syncSearchText, setSyncSearchText] = useState('');
  const [syncSearchResults, setSyncSearchResults] = useState<SyncEquipmentItem[]>([]);
  const [syncSearchLoading, setSyncSearchLoading] = useState(false);
  const [syncSearchError, setSyncSearchError] = useState('');
  const [syncGroupLoading, setSyncGroupLoading] = useState(false);
  const [syncGroupMeta, setSyncGroupMeta] = useState<SyncGroupMeta | null>(null);

  const categoryFieldKey = 'ma_danh_muc';
  const categoryNameFieldKey = 'ten_danh_muc';

  const {
    fieldSetsByKey,
    allFields,
    schemaLoading,
    schemaError,
    technicalFieldSets,
    technicalLoading,
    technicalError,
  } = useTrangBiDialogSchema({
    open,
    selectedCategoryCode,
  });

  const schemaReadyForEditor = useMemo(
    () => !schemaLoading && (allFields.length > 0 || Boolean(schemaError)),
    [allFields.length, schemaError, schemaLoading],
  );

  // ── Log side panel state ────────────────────────────────────
  // TrangBi editor record (extract name for log tabs)
  const trangBiNameForLogs = useMemo(() => {
    const nameField = allFields.find(f =>
      f.key.toLowerCase().includes('sohieu') ||
      f.key.toLowerCase().includes('name') ||
      f.key.toLowerCase().includes('ten')
    );
    return nameField ? formData[nameField.key] : undefined;
  }, [allFields, formData]);

  // The actual TrangBi ID — available after record is loaded or after GeneralInfo save
  const trangBiIdForLogs = useMemo((): string => {
    return editingRecordId ?? (editorRecord as unknown as { id?: string })?.id ?? '';
  }, [editingRecordId, editorRecord]);

  // ── Reset log panel state khi dialog đóng ──────────────────
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';


  // ── Reset form khi dialog mở ─────────────────────────────────
  useLayoutEffect(() => {
    if (open) {
      setActiveTab(TAB_GENERAL);
      setFormData({});
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
    }
  }, [open]);

  // ── Resolve field keys (case-insensitive) ───────────────────
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
    return allFields.find((f) => f.key.toLowerCase() === 'id_nhom_dong_bo')?.key;
  }, [allFields]);

  const syncStatusFieldKey = useMemo(() => {
    return allFields.find((f) => f.key.toLowerCase() === 'trang_thai_dong_bo')?.key;
  }, [allFields]);

  const resolvedCategoryNameKey = useMemo(() => {
    const found = allFields.find((f) => f.key.toLowerCase() === categoryNameFieldKey.toLowerCase());
    return found?.key ?? categoryNameFieldKey;
  }, [allFields, categoryNameFieldKey]);

  const managementUnitFieldKey = useMemo(() => {
    return allFields.find((f) => f.key.toLowerCase() === 'don_vi_quan_ly')?.key;
  }, [allFields]);

  const operatingUnitFieldKey = useMemo(() => {
    return allFields.find((f) => f.key.toLowerCase() === 'don_vi')?.key;
  }, [allFields]);

  // ── Nạp record để sửa ───────────────────────────────────────
  useEffect(() => {
    if (!open || !isEditMode || !editingRecordId || !activeMenu) return;
    if (!schemaReadyForEditor) return;

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
        setRecordError(String((err as Error)?.message || 'Không thể tải chi tiết trang bị'));
      })
      .finally(() => {
        if (!cancelled) setRecordLoading(false);
      });

    return () => { cancelled = true; };
  }, [
    open,
    isEditMode,
    editingRecordId,
    activeMenu,
    schemaReadyForEditor,
    categoryFieldKey,
    parentFieldKey,
    specializationFieldKey,
    nganhFieldKey,
    syncGroupFieldKey,
    syncStatusFieldKey,
    resolvedCategoryNameKey,
  ]);



  const {
    generalTabContent,
    technicalTabContent,
    syncTabContent,
  } = useTrangBiDialogFieldSetContent({
    fieldSetsByKey,
    technicalFieldSets,
    categoryFieldKey,
    resolvedCategoryNameKey,
    parentFieldKey,
    specializationFieldKey,
    nganhFieldKey,
  });

  const toReadOnlyFieldSetContent = useCallback(<T extends { fields: Array<{ disabled?: boolean }> }>(items: T[]): T[] => {
    if (!readOnly) return items;
    return items.map((item) => ({
      ...item,
      fields: item.fields.map((field) => ({ ...field, disabled: true })),
    }));
  }, [readOnly]);

  const readonlyGeneralTabContent = useMemo(
    () => toReadOnlyFieldSetContent(generalTabContent),
    [generalTabContent, toReadOnlyFieldSetContent],
  );
  const readonlyTechnicalTabContent = useMemo(
    () => toReadOnlyFieldSetContent(technicalTabContent),
    [technicalTabContent, toReadOnlyFieldSetContent],
  );
  const readonlySyncTabContent = useMemo(
    () => toReadOnlyFieldSetContent(syncTabContent),
    [syncTabContent, toReadOnlyFieldSetContent],
  );

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

  // ── Sync members loading ─────────────────────────────────────
  useEffect(() => {
    if (activeTab !== TAB_SYNC) return;
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
        setSyncSearchError(String((error as Error)?.message || 'Không thể tải thành viên đồng bộ'));
        setSyncGroupMeta(null);
        setSyncMembers([]);
      })
      .finally(() => {
        if (!cancelled) setSyncGroupLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeTab, currentEquipmentId, open, selectedSyncGroupId, syncGroupFieldKey]);

  useEffect(() => {
    if (!open || activeTab !== TAB_SYNC) return;

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
            setSyncSearchError(String((error as Error)?.message || 'Không thể tìm trang bị đồng bộ'));
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
  }, [currentEquipmentId, activeTab, open, syncSearchText]);

  // ── Handlers ───────────────────────────────────────────────
  const canAttachToCurrentGroup = useCallback((item: SyncEquipmentItem): boolean => {
    if (!item.idNhomDongBo) return true;
    if (!selectedSyncGroupId) return false;
    return item.idNhomDongBo === selectedSyncGroupId;
  }, [selectedSyncGroupId]);

  const handleAddSyncMember = useCallback((item: SyncEquipmentItem) => {
    if (readOnly) return;
    if (!canAttachToCurrentGroup(item)) {
      setSyncSearchError('Trang bị đã thuộc nhóm đồng bộ khác, không thể thêm vào nhóm hiện tại.');
      return;
    }
    const key = buildSyncEquipmentKey(item);
    if (selectedSyncMemberKeys.has(key)) return;

    setSyncMembers((prev) => [...prev, item]);
    if (syncStatusFieldKey) {
      setFormData((prev) => ({ ...prev, [syncStatusFieldKey]: 'true' }));
    }
  }, [canAttachToCurrentGroup, readOnly, selectedSyncMemberKeys, syncStatusFieldKey]);

  const handleRemoveSyncMember = useCallback((item: SyncEquipmentItem) => {
    if (readOnly) return;
    const key = buildSyncEquipmentKey(item);
    setSyncMembers((prev) => prev.filter((entry) => buildSyncEquipmentKey(entry) !== key));
  }, [readOnly]);

  const syncParentCategoryFields = useCallback(async (selectedCategoryId: string) => {
    try {
      const normalizedCategoryId = String(selectedCategoryId ?? '').trim();
      const selectedCategoryNode = normalizedCategoryId
        ? await danhMucTrangBiApi.getTreeItem(normalizedCategoryId)
        : null;

      if (!selectedCategoryNode) return;

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
    if (readOnly) return;
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
  }, [categoryFieldKey, readOnly, syncGroupFieldKey, syncParentCategoryFields, syncStatusFieldKey]);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    startTransition(() => {
      setActiveTab(newValue);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    const maDinhDanh = (formData[categoryFieldKey] ?? '').trim();

    if (!maDinhDanh) {
      setSaveError('Vui lòng chọn mã danh mục trang bị trước khi lưu.');
      return;
    }

    const cnId = (formData[specializationFieldKey] ?? '').trim();
    const cnAction = editorRecord?.id ? 'edit' : 'add';
    if (cnId && !canCnAction(cnAction, cnId)) {
      setSaveError(`Bạn không có quyền ${cnAction === 'edit' ? 'chỉnh sửa' : 'thêm'} trang bị thuộc chuyên ngành này.`);
      return;
    }

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
          throw new Error('Không xác định được id trang bị sau khi lưu.');
        }

        const finalGroupId = idNhomDongBo ?? selectedSyncGroupId;
        let finalTenNhom = syncGroupMeta?.tenNhom ?? `Nhóm đồng bộ ${currentEquipmentName || currentEquipmentCode || currentId}`;
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
          throw new Error('Chưa xác định được đơn vị quản lý để cập nhật nhóm đồng bộ.');
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
    readOnly,
  ]);

  // ── Log panel helpers ────────────────────────────────────────
  // ── Navigation helpers ──────────────────────────────────────
  const isFirstTab = activeTab === TAB_GENERAL;
  const isLastTab = activeTab === TAB_CHUYEN_CAP;

  const handlePreviousTab = useCallback(() => {
    if (!isFirstTab) {
      const currentIdx = TAB_META.findIndex((t) => t.value === activeTab);
      startTransition(() => {
        setActiveTab(TAB_META[currentIdx - 1].value);
      });
    }
  }, [activeTab, isFirstTab]);

  const handleNextTab = useCallback(() => {
    if (!isLastTab) {
      const currentIdx = TAB_META.findIndex((t) => t.value === activeTab);
      startTransition(() => {
        setActiveTab(TAB_META[currentIdx + 1].value);
      });
    }
  }, [activeTab, isLastTab]);

  const setColorAccent = '#1a6ab0';

  // ── Loading state ───────────────────────────────────────────
  const isBaseFormLoading = schemaLoading || (isEditMode && (recordLoading || !editorRecord));

  const FORM_WIDTH = 1280;
  const DIALOG_HEIGHT = 900;
  const dialogWidthCss = `min(${FORM_WIDTH}px, calc(100vw - 32px))`;
  const dialogHeightCss = `min(${DIALOG_HEIGHT}px, calc(100vh - 64px))`;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      mode={dialogMode}
      maxWidth={false}
      fullWidth={false}
      title={readOnly ? 'Xem chi tiết trang bị kỹ thuật' : dialogTitle}
      icon={dialogIcon}
      onConfirm={handleSave}
      confirmText={saveButtonLabel}
      contentPadding={0}
      sx={{
        width: dialogWidthCss,
        maxWidth: dialogWidthCss,
        minWidth: dialogWidthCss,
        height: dialogHeightCss,
        minHeight: dialogHeightCss,
        maxHeight: dialogHeightCss,
        transition: 'none',
      }}
      contentSx={{
        overflow: 'hidden',
        p: 0,
        m: 0,
        display: 'flex',
        flex: '1 1 auto',
        minHeight: 0,
        height: '100%',
      }}
      showConfirm={false}
      showCancel={false}
      customActions={(
        <>
          <Button
            variant="outlined"
            onClick={handlePreviousTab}
            disabled={isFirstTab || isBaseFormLoading}
            sx={dialogActionBtnSx}
          >
            ← Quay lại
          </Button>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={onClose}
              disabled={saving}
              sx={dialogCancelBtnSx}
            >
              Hủy
            </Button>

            {!isLastTab && (
                <Button
                  variant="contained"
                  onClick={handleNextTab}
                  disabled={isBaseFormLoading}
                  sx={dialogPrimaryBtnSx(setColorAccent)}
                >
                  Tiếp tục →
                </Button>
            )}

            {!readOnly && (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || isBaseFormLoading}
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
      {/* ── Flex wrapper: form area + side panel ─────────────── */}
      <Box sx={{ display: 'flex', flex: '1 1 auto', minHeight: 0, height: '100%', overflow: 'hidden', width: '100%' }}>

        {/* ── Main form area ─────────────────────────────────── */}
        <Box
          sx={{
            width: '100%',
            maxWidth: FORM_WIDTH,
            minWidth: 0,
            flexShrink: 0,
            height: '100%',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'hidden',
            overflowX: 'hidden',
          }}
        >
          {(schemaError || recordError || danhMucError || technicalError || saveError) && (
            <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: 'grid', gap: 1 }}>
              {schemaError && (
                <Alert severity="warning">{schemaError}</Alert>
              )}
              {recordError && (
                <Alert severity="error" onClose={() => setRecordError('')}>{recordError}</Alert>
              )}
              {danhMucError && (
                <Alert severity="warning">Không tải được danh mục trang bị: {danhMucError}</Alert>
              )}
              {technicalError && (
                <Alert severity="warning">Không tải được thông số kỹ thuật: {technicalError}</Alert>
              )}
              {saveError && (
                <Alert severity="error" onClose={() => setSaveError('')}>{saveError}</Alert>
              )}
            </Box>
          )}

          {/* Tab bar */}
          <Box
            sx={{
              ...dialogTabHeaderSx(isDark),
              position: 'relative',
              top: 'auto',
              flex: '1 1 auto',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <TabContext value={activeTab}>
              <Box sx={{ borderBottom: 0, display: 'flex', alignItems: 'stretch' }}>
                <TabList
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={createDialogTabsSx(isDark, setColorAccent)}
                >
                  {TAB_META.map(({ value, label, Icon }) => {
                    const badgeCount = value === TAB_SYNC ? syncMembers.length : 0;

                    return (
                      <Tab
                        key={value}
                        value={value}
                        label={(
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Icon sx={{ fontSize: 15 }} />
                            <Typography
                              variant="inherit"
                              sx={{ fontSize: '0.82rem' }}
                            >
                              {label}
                            </Typography>
                            {value === TAB_SYNC && badgeCount > 0 && (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 18,
                                  height: 18,
                                  px: 0.6,
                                  borderRadius: '3px',
                                  bgcolor: 'success.main',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  lineHeight: 1,
                                }}
                              >
                                {badgeCount}
                              </Box>
                            )}
                          </Box>
                        )}
                      />
                    );
                  })}
                </TabList>
              </Box>

              {/* Tab Content area */}
              <Box
                sx={{
                  ...dialogTabContentSx(isDark),
                  flex: '1 1 auto',
                  minHeight: 0,
                  height: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                }}
              >
                {isBaseFormLoading && <TabSkeleton />}

                {!isBaseFormLoading && activeTab === TAB_GENERAL && (
                  <Suspense fallback={<TabSkeleton />}>
                    <GeneralInfoTab
                      generalTabContent={readonlyGeneralTabContent}
                      formData={formData}
                      onFieldChange={handleFieldChange}
                    />
                  </Suspense>
                )}

                {!isBaseFormLoading && activeTab === TAB_TECHNICAL && (
                  <Suspense fallback={<TabSkeleton />}>
                    <TechnicalFieldsTab
                      technicalTabContent={readonlyTechnicalTabContent}
                      technicalLoading={technicalLoading}
                      technicalError={technicalError}
                      selectedCategoryCode={selectedCategoryCode}
                      formData={formData}
                      onFieldChange={handleFieldChange}
                    />
                  </Suspense>
                )}

                {!isBaseFormLoading && activeTab === TAB_SYNC && (
                  <Suspense fallback={<TabSkeleton />}>
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
                      dynamicFieldSets={readonlySyncTabContent}
                      formData={formData}
                      onFieldChange={handleFieldChange}
                      readOnly={readOnly}
                    />
                  </Suspense>
                )}

                {activeTab === TAB_BAO_QUAN && (
                  <Suspense fallback={<TabSkeleton />}>
                    <BaoQuanTab
                      trangBiId={trangBiIdForLogs}
                      trangBiName={trangBiNameForLogs}
                      onOpenLogPanel={() => {}}
                      refreshKey={0}
                    />
                  </Suspense>
                )}

                {activeTab === TAB_BAO_DUONG && (
                  <Suspense fallback={<TabSkeleton />}>
                    <BaoDuongTab
                      trangBiId={trangBiIdForLogs}
                      trangBiName={trangBiNameForLogs}
                      onOpenLogPanel={() => {}}
                      refreshKey={0}
                    />
                  </Suspense>
                )}

                {activeTab === TAB_SUA_CHUA && (
                  <Suspense fallback={<TabSkeleton />}>
                    <SuaChuaTab
                      trangBiId={trangBiIdForLogs}
                      trangBiName={trangBiNameForLogs}
                      onOpenLogPanel={() => {}}
                      refreshKey={0}
                    />
                  </Suspense>
                )}

                {activeTab === TAB_NIEM_CAT && (
                  <Suspense fallback={<TabSkeleton />}>
                    <NiemCatTab
                      trangBiId={trangBiIdForLogs}
                      trangBiName={trangBiNameForLogs}
                      onOpenLogPanel={() => {}}
                      refreshKey={0}
                    />
                  </Suspense>
                )}

                {activeTab === TAB_DIEU_DONG && (
                  <Suspense fallback={<TabSkeleton />}>
                    <DieuDongTab
                      trangBiId={trangBiIdForLogs}
                      trangBiName={trangBiNameForLogs}
                      onOpenLogPanel={() => {}}
                      refreshKey={0}
                    />
                  </Suspense>
                )}

                {activeTab === TAB_CHUYEN_CAP && (
                  <Suspense fallback={<TabSkeleton />}>
                    <ChuyenCapChatLuongTab
                      trangBiId={trangBiIdForLogs}
                      trangBiNhom={currentEquipmentNhom}
                      trangBiName={trangBiNameForLogs}
                      refreshKey={0}
                    />
                  </Suspense>
                )}
              </Box>
            </TabContext>
          </Box>
        </Box>

        {/* ── Side panel (only mounted when open) ───────────────── */}
      </Box>
    </FormDialog>
  );
};

export default AddTrangBiDialog;
