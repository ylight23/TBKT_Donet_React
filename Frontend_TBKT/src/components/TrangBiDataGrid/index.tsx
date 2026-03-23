// ============================================================
// TrangBiDataGrid – Bảng dữ liệu trang bị kỹ thuật dùng chung
// Dùng cho cả Nhóm 1 và Nhóm 2
// ============================================================
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';

// Icons
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';

import type {
  LocalDynamicField as DynamicField,
  LocalFieldSet as FieldSet,
  LocalFormConfig as FormConfig,
} from '../../types/thamSo';
import type { AppDispatch, RootState } from '../../store';
import { fetchThamSoSchema } from '../../store/reducer/thamSo';

import { ITrangBi, TrangThaiTrangBi, ChatLuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import FilterTrangBi, { FilterTrangBiValues } from './FilterTrangBi';
import OfficeDictionary, { OfficeNode } from '../../pages/Office/subComponent/OfficeDictionary';
import { OfficeProvider } from '../../context/OfficeContext';
import StatsButton from '../Stats/StatsButton';
import AddTrangBiDialog from './AddTrangBiDialog';
import LazyDataGrid from '../LazyDataGrid';
import { getRequiredFormKeyForMenu, getStableFormConfigKey } from '../../utils/formConfigKeys';

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

const isTrangBiGroupMenu = (value?: string): value is 'tbNhom1' | 'tbNhom2' => (
  value === 'tbNhom1' || value === 'tbNhom2'
);

// ── TrangBiDataGrid ──────────────────────────────────────────
const TrangBiDataGrid: React.FC<TrangBiDataGridProps> = ({ title, subtitle, data, activeMenu }) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const activeMenuForDialog = isTrangBiGroupMenu(activeMenu) ? activeMenu : undefined;
  const {
    dynamicFields: allFields,
    fieldSets: allFieldSets,
    formConfigs: allForms,
    loaded: thamSoLoaded,
    loading: thamSoLoading,
  } = useSelector((state: RootState) => state.thamSoReducer);

  // State bộ lọc nâng cao
  const [filterValues, setFilterValues] = useState<FilterTrangBiValues | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);

  // States for Dynamic Form
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => {
    if (!thamSoLoaded && !thamSoLoading) {
      dispatch(fetchThamSoSchema());
    }
  }, [dispatch, thamSoLoaded, thamSoLoading]);

  // Determine which form to use
  const activeForm = useMemo(() => {
    if (!activeMenuForDialog) return null;
    const targetName = activeMenuForDialog === 'tbNhom1' ? 'Trang bị Nhóm 1' : 'Trang bị Nhóm 2';
    const requiredKey = getRequiredFormKeyForMenu(activeMenuForDialog);
    const found = allForms.find((f) => getStableFormConfigKey(f) === requiredKey);
    return found || null;
  }, [allForms, activeMenuForDialog]);

  const isSchemaReady = allFields.length > 0 && allFieldSets.length > 0 && allForms.length > 0;
  const formConfigError = useMemo(() => {
    if (!activeMenuForDialog) return '';
    if (!thamSoLoaded && thamSoLoading) return '';
    if (!isSchemaReady) return 'Schema dong chua san sang. Vui long tai xong DynamicField, FieldSet va FormConfig.';
    if (!activeForm) {
      const targetName = activeMenuForDialog === 'tbNhom1' ? 'Trang bị Nhóm 1' : 'Trang bị Nhóm 2';
      const requiredKey = getRequiredFormKeyForMenu(activeMenuForDialog);
      return `Khong tim thay FormConfig co key "${requiredKey}" cho menu hien tai. Da tat fallback de tranh nhap sai cau hinh.`;
    }
    return '';
  }, [activeForm, activeMenuForDialog, isSchemaReady, thamSoLoaded, thamSoLoading]);

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
      const matchSearch = !q || [
        row.maTrangBi, row.ten, row.loai, row.serial, row.mac, row.donVi,
      ].some(v => v && v.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (donVi && !row.donVi.toLowerCase().includes(donVi.toLowerCase())) return false;
      if (maTrangBi && !row.maTrangBi.toLowerCase().includes(maTrangBi.toLowerCase())) return false;
      if (tenTrangBi && !row.ten.toLowerCase().includes(tenTrangBi.toLowerCase())) return false;
      if (capChatLuong && row.chatLuong !== capChatLuong) return false;
      if (tinhTrangSuDung && row.trangThai !== tinhTrangSuDung) return false;
      if (soHieu && row.serial && !row.serial.toLowerCase().includes(soHieu.toLowerCase())) return false;

      const r = row as any;
      if (nhom && r.nhom !== nhom) return false;
      if (phanNganh && r.phanNganh !== phanNganh) return false;
      if (tinhTrangKyThuat && r.tinhTrangKyThuat !== tinhTrangKyThuat) return false;
      if (donViQuanLy && r.donViQuanLy !== donViQuanLy) return false;
      if (namSanXuat && r.namSanXuat !== Number(namSanXuat)) return false;
      if (namSuDung && r.namSuDung !== Number(namSuDung)) return false;

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
                disabled={thamSoLoading || !isSchemaReady || Boolean(formConfigError)}
                sx={{
                  bgcolor: militaryColors.navy,
                  '&:hover': { bgcolor: militaryColors.navy, filter: 'brightness(1.1)' },
                  '&.Mui-disabled': {
                    bgcolor: `${militaryColors.navy}66`,
                    color: 'rgba(255,255,255,0.8)',
                  },
                  textTransform: 'none', fontWeight: 700, px: 3, height: 40,
                }}
              >
                {thamSoLoading ? 'Đang tải biểu mẫu...' : 'Thêm trang bị'}
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

          {formConfigError && (
            <Alert severity="warning">
              {formConfigError}
            </Alert>
          )}

          {/* Dynamic Add Dialog */}
          <AddTrangBiDialog
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            formConfig={activeForm}
            allFields={allFields}
            allFieldSets={allFieldSets}
            activeMenu={activeMenuForDialog}
            configError={formConfigError}
          />

          {/* ── Bộ lọc nâng cao ─────────────────────────────────── */}
          <FilterTrangBi onSearch={handleSearch} onClear={handleClearFilter} />

          {/* ── DataGrid Container ───────────────────────────────── */}
          <LazyDataGrid
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            fallbackRows={8}
            fallbackCols={8}
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
