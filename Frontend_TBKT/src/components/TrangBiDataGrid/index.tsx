// ============================================================
// TrangBiDataGrid – Bảng dữ liệu trang bị kỹ thuật dùng chung
// Dùng cho cả Nhóm 1 và Nhóm 2
// ============================================================
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

// Icons
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { CommonDialog } from '../Dialog';

import { thamSoApi } from '../../api/thamSoApiWithCache';
import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
  LocalFormConfig as FormConfig,
} from '../../types/thamSo';

import { ITrangBi, TrangThaiTrangBi, ChatLuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import FilterTrangBi, { FilterTrangBiValues } from './FilterTrangBi';
import OfficeDictionary, { OfficeNode } from '../../pages/Office/subComponent/OfficeDictionary';
import { OfficeProvider } from '../../context/OfficeContext';
import StatsButton from '../Stats/StatsButton';
import FieldInput from '../../pages/CauHinhThamSo/subComponents/FieldInput';

// ── Màu trạng thái trang bị ──────────────────────────────────
const trangThaiColor: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  [TrangThaiTrangBi.HoatDong]: 'success',
  [TrangThaiTrangBi.SuaChua]: 'warning',
  [TrangThaiTrangBi.NiemCat]: 'info',
  [TrangThaiTrangBi.ChoThanhLy]: 'error',
  [TrangThaiTrangBi.DaThanhLy]: 'default',
};

// ── Màu chất lượng ───────────────────────────────────────────
const chatLuongColor: Record<string, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
};

// ── Props component ──────────────────────────────────────────
interface TrangBiDataGridProps {
  title: string;
  subtitle: string;
  data: ITrangBi[];
  activeMenu?: 'tbNhom1' | 'tbNhom2' | string;
}

// ── FormFieldItem: dùng FieldInput từ CauHinhThamSo ──────────
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

  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Grid size={{ xs: 12, md: field.type === 'textarea' ? 12 : 6 }}>
      <Box sx={{ mb: 1, px: 0.5 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'text.primary',
            fontSize: '0.875rem',
            opacity: 0.9
          }}
        >
          {field.label}
          {field.required && <Box component="span" sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
        </Typography>

        <Box sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f9fafb',
            borderRadius: 1.5,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            },
            '&:hover': {
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f3f4f6',
              '& fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
              },
            },
            '&.Mui-focused': {
              bgcolor: 'background.paper',
              '& fieldset': {
                borderColor: 'primary.main',
                borderWidth: '2px',
              },
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}20`,
            }
          },
          '& .MuiInputBase-input': {
            py: 1.25,
            px: 1.5,
            fontSize: '0.9rem'
          }
        }}>
          <FieldInput field={field} value={value} onChange={handleChange} />
        </Box>
      </Box>
    </Grid>
  );
}, (prevProps, nextProps) => (
  prevProps.field === nextProps.field
  && prevProps.value === nextProps.value
  && prevProps.onFieldChange === nextProps.onFieldChange
));

FormFieldItem.displayName = 'FormFieldItem';

// ── AddTrangBiDialog ───────────────────────────────────────────
interface AddTrangBiDialogProps {
  open: boolean;
  onClose: () => void;
  formConfig: FormConfig | null;
  allFieldSets: FieldSet[];
  allFields: DynamicField[];
}

const AddTrangBiDialog: React.FC<AddTrangBiDialogProps> = ({ open, onClose, formConfig, allFieldSets, allFields }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setActiveTab(0);
      setFormData({});
    }
  }, [open, formConfig?.id]);

  const fieldSetById = useMemo(
    () => new Map(allFieldSets.map((set) => [set.id, set])),
    [allFieldSets],
  );

  const fieldById = useMemo(
    () => new Map(allFields.map((field) => [field.id, field])),
    [allFields],
  );

  const tabs = useMemo(() => formConfig?.tabs ?? [], [formConfig]);
  const currentTab = tabs[activeTab];

  // Group fields by FieldSet for current tab
  const fieldGroups = useMemo(() => {
    if (!currentTab) return [];
    const setIds = currentTab.setIds ?? [];

    // Priority for sorting fields: Simple inputs -> Selects -> Textareas
    const typePriority: Record<string, number> = {
      number: 1,
      text: 1,
      date: 1,
      select: 2,
      textarea: 3
    };

    return setIds.map(setId => {
      const set = fieldSetById.get(setId);
      if (!set) return null;
      const fields = (set.fieldIds ?? [])
        .map((fid: string) => fieldById.get(fid))
        .filter((f): f is DynamicField => Boolean(f))
        .sort((a, b) => {
          const pA = typePriority[a.type] || 99;
          const pB = typePriority[b.type] || 99;
          return pA - pB;
        });
      return { set, fields };
    }).filter((group): group is { set: FieldSet; fields: DynamicField[] } => group !== null);
  }, [currentTab, fieldSetById, fieldById]);

  const handleFieldChange = useCallback((fieldKey: string, value: string) => {
    setFormData((prev) => {
      if (prev[fieldKey] === value) return prev;
      return { ...prev, [fieldKey]: value };
    });
  }, []);

  const handleSave = useCallback(() => {
    console.log('Add Equipment:', formData);
    alert('Lưu thành công! (Giả lập)');
    onClose();
  }, [formData, onClose]);

  if (!formConfig) {
    return null;
  }

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      mode="add"
      maxWidth="lg"
      title="Thêm trang bị kỹ thuật mới"
      subtitle={`Sử dụng cấu hình biểu mẫu: ${formConfig.name}`}
      icon={<AddIcon />}
      onConfirm={handleSave}
      confirmText="Lưu trang bị"
      contentPadding={0}
      sx={{ '& .MuiDialog-paper': { height: '85vh' } }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', zIndex: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            minHeight: 56,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              minHeight: 56,
              fontSize: '0.925rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                color: 'primary.main',
              }
            }
          }}
        >
          {tabs.map((t: any, index: number) => (
            <Tab
              key={t.id}
              label={
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    bgcolor: activeTab === index ? 'primary.main' : 'action.selected',
                    color: activeTab === index ? '#fff' : 'text.secondary',
                    transition: 'all 0.2s ease',
                    fontWeight: 800
                  }}>
                    {index + 1}
                  </Box>
                  <Typography variant="inherit">{t.label}</Typography>
                </Stack>
              }
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 4, flex: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
        {fieldGroups.map((group, index) => (
          <Box key={group.set.id} sx={{ mb: index === fieldGroups.length - 1 ? 0 : 5 }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Box sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: `${group.set.color}15`,
                color: group.set.color,
                display: 'flex',
                fontSize: 22,
                border: `1px solid ${group.set.color}30`
              }}>
                {React.isValidElement(group.set.icon)
                  ? React.cloneElement(group.set.icon as React.ReactElement<any>, { sx: { fontSize: 'inherit' } })
                  : group.set.icon
                }
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', letterSpacing: '-0.01em' }}>
                  {group.set.name}
                </Typography>
                {group.set.desc && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, opacity: 0.7 }}>
                    {group.set.desc}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Grid container spacing={2}>
              {group.fields.map((f) => (
                <FormFieldItem
                  key={f.id}
                  field={f}
                  value={formData[f.key] ?? ''}
                  onFieldChange={handleFieldChange}
                />
              ))}
            </Grid>
            {index < fieldGroups.length - 1 && (
              <Divider sx={{ mt: 5, opacity: 0.4 }} />
            )}
          </Box>
        ))}

        {fieldGroups.length === 0 && (
          <Stack sx={{ py: 10, alignItems: 'center', textAlign: 'center' }}>
            <DynamicFormIcon sx={{ fontSize: 64, mb: 2, color: 'text.disabled', opacity: 0.2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={700}>Trống</Typography>
            <Typography variant="body2" color="text.disabled">Tab này chưa có trường dữ liệu được cấu hình.</Typography>
          </Stack>
        )}
      </Box>
    </CommonDialog>
  );
};

// ── TrangBiDataGrid ──────────────────────────────────────────
const TrangBiDataGrid: React.FC<TrangBiDataGridProps> = ({ title, subtitle, data, activeMenu }) => {
  const theme = useTheme();

  // State bộ lọc nâng cao
  const [filterValues, setFilterValues] = useState<FilterTrangBiValues | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);

  // States for Dynamic Form
  const [openAdd, setOpenAdd] = useState(false);
  const [allFields, setAllFields] = useState<DynamicField[]>([]); // (SEED_FIELDS)
  const [allFieldSets, setAllFieldSets] = useState<FieldSet[]>([]); // (SEED_SETS)
  const [allForms, setAllForms] = useState<FormConfig[]>([]); // (SEED_FORMS)

  // Load configs on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const [f, s, fc] = await Promise.all([
          thamSoApi.getListDynamicFields(),
          thamSoApi.getListFieldSets(),
          thamSoApi.getListFormConfigs(),
        ]);
        setAllFields(f); // (f.length ? f : SEED_FIELDS)
        setAllFieldSets(s); // (s.length ? s : SEED_SETS)
        setAllForms(fc); // (fc.length ? fc : SEED_FORMS)
      } catch (err) {
        console.error('Failed to load thamSo configs', err);
        // setAllFields(SEED_FIELDS);
        // setAllFieldSets(SEED_SETS);
        // setAllForms(SEED_FORMS);
      }
    };
    load();
  }, []);

  // Determine which form to use
  const activeForm = useMemo(() => {
    if (!activeMenu) return allForms[0] || null;
    const targetName = activeMenu === 'tbNhom1' ? 'Trang bị Nhóm 1' : 'Trang bị Nhóm 2';
    const found = allForms.find(f => f.name === targetName);
    return found || allForms[0] || null;
  }, [allForms, activeMenu]);

  // Xóa toàn bộ bộ lọc
  const handleClearFilter = useCallback(() => {
    setFilterValues(null);
  }, []);

  const handleSearch = useCallback((values: FilterTrangBiValues) => {
    setFilterValues(values);
  }, []);

  // Lọc dữ liệu theo các điều kiện
  const filtered = useMemo(() => {
    if (!filterValues) return data;

    const {
      fullTextSearch,
      donVi,
      maTrangBi,
      tenTrangBi,
      capChatLuong,
      tinhTrangSuDung,
      soHieu,
      nhom,
      phanNganh,
      tinhTrangKyThuat,
      donViQuanLy,
      namSanXuat,
      namSuDung
    } = filterValues;

    const q = fullTextSearch.toLowerCase();

    return data.filter(row => {
      // 1. Tìm kiếm tổng hợp (Full text từ ô tìm kiếm nhanh)
      const matchSearch = !q || [
        row.maTrangBi, row.ten, row.loai, row.serial, row.mac, row.donVi,
      ].some(v => v && v.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Lọc chi tiết (Advanced filters)
      if (donVi && !row.donVi.toLowerCase().includes(donVi.toLowerCase())) return false;
      if (maTrangBi && !row.maTrangBi.toLowerCase().includes(maTrangBi.toLowerCase())) return false;
      if (tenTrangBi && !row.ten.toLowerCase().includes(tenTrangBi.toLowerCase())) return false;
      if (capChatLuong && row.chatLuong !== capChatLuong) return false;
      if (tinhTrangSuDung && row.trangThai !== tinhTrangSuDung) return false;
      if (soHieu && row.serial && !row.serial.toLowerCase().includes(soHieu.toLowerCase())) return false;

      // Các trường nâng cao (nếu mock data có hoặc ép kiểu để check)
      const r = row as any;
      if (nhom && r.nhom !== nhom) return false;
      if (phanNganh && r.phanNganh !== phanNganh) return false;
      if (tinhTrangKyThuat && r.tinhTrangKyThuat !== tinhTrangKyThuat) return false;
      if (donViQuanLy && r.donViQuanLy !== donViQuanLy) return false;
      if (namSanXuat && r.namSanXuat !== Number(namSanXuat)) return false;
      if (namSuDung && r.namSuDung !== Number(namSuDung)) return false;

      // 3. Lọc theo đơn vị từ Dictionary
      if (selectedOffice) {
        const officeName = selectedOffice.ten || selectedOffice.tenDayDu || "";
        if (!row.donVi.toLowerCase().includes(officeName.toLowerCase())) return false;
      }

      return true;
    });
  }, [data, filterValues, selectedOffice]);

  // Giả lập export Excel
  const handleExport = useCallback(() => {
    alert(`[Giả lập] Xuất ${filtered.length} bản ghi ra Excel`);
  }, [filtered.length]);

  // ── Định nghĩa cột DataGrid ──────────────────────────────
  const columns: GridColDef[] = [
    {
      field: 'stt',
      headerName: 'STT',
      width: 60,
      renderCell: (p) => {
        const index = p.api.getAllRowIds().indexOf(p.id);
        return <Typography variant="body2">{index + 1}</Typography>;
      },
    },
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>
          {p.value}
        </Typography>
      ),
    },
    {
      field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 160,
    },
    { field: 'phanNganh', headerName: 'Phân ngành', width: 150 },
    { field: 'donViQuanLy', headerName: 'Đơn vị quản lý', width: 180 },
    {
      field: 'trangThai', headerName: 'Tình trạng sử dụng', width: 160,
      renderCell: (p: GridRenderCellParams<ITrangBi, TrangThaiTrangBi>) => (
        <Chip
          label={p.value}
          color={trangThaiColor[p.value!] ?? 'default'}
          size="small"
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    { field: 'tinhTrangKyThuat', headerName: 'Tình trạng kỹ thuật', width: 160 },
    {
      field: 'chatLuong', headerName: 'Cấp chất lượng', width: 140,
      renderCell: (p: GridRenderCellParams<ITrangBi, ChatLuong>) => (
        <Chip
          label={p.value}
          size="small"
          sx={{
            bgcolor: `${chatLuongColor[p.value!]}22`,
            color: chatLuongColor[p.value!],
            fontWeight: 600,
            fontSize: 11,
            border: `1px solid ${chatLuongColor[p.value!]}44`,
          }}
        />
      ),
    },
    { field: 'serial', headerName: 'Số hiệu', width: 140 },
    { field: 'namSanXuat', headerName: 'Năm sản xuất', width: 120, type: 'number' },
    { field: 'namSuDung', headerName: 'Năm sử dụng', width: 120, type: 'number' },
    { field: 'nienHanSuDung', headerName: 'Niên hạn sử dụng', width: 150, type: 'number' },
    { field: 'nuocSanXuat', headerName: 'Nước sản xuất', width: 140 },
    { field: 'hangSanXuat', headerName: 'Hãng sản xuất', width: 150 },
    { field: 'loai', headerName: 'Loại trang bị', width: 150 },
    {
      field: 'actions', headerName: 'Thao tác', width: 160, sortable: false, filterable: false,
      renderCell: (p: GridRenderCellParams<ITrangBi>) => (
        <Stack direction="row" spacing={0.5} justifyContent="center" width="100%">
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              onClick={() => alert(`Xem: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.navy }}
            >
              <VisibilityIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              onClick={() => alert(`Sửa: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.warning }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="In chi tiết">
            <IconButton
              size="small"
              onClick={() => alert(`In: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.success }}
            >
              <PrintIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa trang bị">
            <IconButton
              size="small"
              onClick={() => alert(`Xóa: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.error }}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <OfficeProvider>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '270px 1fr',
        height: 'calc(100vh - 120px)',
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}>
        {/* Sidebar: Office Dictionary */}
        <Box component="aside" sx={{
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          height: '100%'
        }}>
          <OfficeDictionary onSelect={setSelectedOffice} selectedOffice={selectedOffice} />
        </Box>

        {/* Main Content: DataGrid */}
        <Stack
          component="section"
          spacing={1}
          sx={{
            pt: { xs: 1.5, sm: 2, md: 2 },
            px: { xs: 1.5, sm: 2, md: 2 },
            pb: 0,
            overflow: 'hidden',
            height: '100%'
          }}
        >
          {/* Header Section */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
            flexWrap="wrap"
            gap={2}
          >
            <Stack spacing={0.25}>
              <Typography
                variant="h4"
                fontWeight={800}
                color="primary"
                sx={{ letterSpacing: '-0.02em' }}
              >
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                {subtitle} • Hiển thị <strong>{filtered.length}</strong> / <strong>{data.length}</strong> bản ghi
                {selectedOffice && (
                  <> • Đang chọn: <strong>{selectedOffice.ten}</strong></>
                )}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              {activeMenu && <StatsButton activeMenu={activeMenu} />}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenAdd(true)}
                sx={{
                  bgcolor: militaryColors.navy,
                  '&:hover': { bgcolor: militaryColors.navy, filter: 'brightness(1.1)' },
                  textTransform: 'none', fontWeight: 700, px: 3, height: 40,
                }}
              >
                Thêm trang bị
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                sx={{
                  bgcolor: militaryColors.deepOlive,
                  '&:hover': { bgcolor: militaryColors.midOlive },
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  height: 40,
                  boxShadow: `0 4px 12px ${militaryColors.deepOlive}44`
                }}
              >
                Xuất Excel
              </Button>
            </Stack>
          </Stack>

          {/* Dynamic Add Dialog */}
          <AddTrangBiDialog
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            formConfig={activeForm}
            allFields={allFields}
            allFieldSets={allFieldSets}
          />

          {/* ── Bộ lọc nâng cao ─────────────────────────────────── */}
          <FilterTrangBi onSearch={handleSearch} onClear={handleClearFilter} />

          {/* ── DataGrid Container ───────────────────────────────── */}
          <DataGrid
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            sx={{
              flex: 1,
              minHeight: 450,
              width: "100%",
            }}
          />
        </Stack>
      </Box>
    </OfficeProvider>
  );
};

export default TrangBiDataGrid;
