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

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';

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

// ── Dynamic Form UI Helper Components ──────────────────────────
interface FieldInputProps {
  field: DynamicField;
  value: string;
  onChange: (v: string) => void;
}

const FieldInput: React.FC<FieldInputProps> = React.memo(({ field, value, onChange }) => {
  if (field.type === 'select') {
    return (
      <TextField select fullWidth size="small" value={value} onChange={(e) => onChange(e.target.value)}>
        {(field.validation.options ?? []).map((o) => (
          <MenuItem key={o} value={o}>{o}</MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <FormControlLabel
        control={<Checkbox checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : 'false')} />}
        label={field.label}
      />
    );
  }

  if (field.type === 'textarea') {
    return <TextField fullWidth multiline rows={3} size="small" value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
});

FieldInput.displayName = 'FieldInput';

interface FormFieldItemProps {
  field: DynamicField;
  value: string;
  onFieldChange: (fieldKey: string, value: string) => void;
}

const FormFieldItem: React.FC<FormFieldItemProps> = React.memo(({ field, value, onFieldChange }) => {
  const handleChange = useCallback(
    (nextValue: string) => onFieldChange(field.key, nextValue),
    [onFieldChange, field.key],
  );

  return (
    <Grid size={{ xs: 12, md: field.type === 'textarea' ? 12 : 6 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
        {field.label}{field.required ? ' *' : ''}
      </Typography>
      <FieldInput field={field} value={value} onChange={handleChange} />
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

  // Merge fields for current tab
  const tabFields = useMemo(() => {
    if (!currentTab) return [];
    const setIds = currentTab.setIds ?? [];
    return setIds
      .flatMap((setId: string) => fieldSetById.get(setId)?.fieldIds ?? [])
      .map((fieldId: string) => fieldById.get(fieldId))
      .filter((field): field is DynamicField => Boolean(field));
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={800}>Thêm trang bị mới</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary">Sử dụng bộ mẫu: <strong>{formConfig.name}</strong></Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: 600, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
            {tabs.map((t: any) => (
              <Tab key={t.id} label={t.label} sx={{ textTransform: 'none', fontWeight: 700 }} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
          <Grid container spacing={2.5}>
            {tabFields.map((f) => (
              <FormFieldItem
                key={f.id}
                field={f}
                value={formData[f.key] ?? ''}
                onFieldChange={handleFieldChange}
              />
            ))}
            {tabFields.length === 0 && (
              <Box sx={{ p: 4, width: '100%', textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Tab này chưa có trường dữ liệu nào.</Typography>
              </Box>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">Huỷ bỏ</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          sx={{ fontWeight: 700, px: 3 }}
        >
          Lưu trang bị
        </Button>
      </DialogActions>
    </Dialog>
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
