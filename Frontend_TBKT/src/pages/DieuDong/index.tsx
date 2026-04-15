// ============================================================
// Điều động – Equipment Transfer/Mobilization Management
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import CommonFilter from "../../components/Filter/CommonFilter";

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import StatsButton from '../../components/Stats/StatsButton';

import { mockDieuDong, IDieuDong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu trạng thái điều động ─────────────────────────────────
const ttColor: Record<string, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
  'Đã duyệt': 'info',
  'Chờ duyệt': 'warning',
  'Đã thực hiện': 'success',
  'Hủy': 'error',
};

// ── Mở rộng dữ liệu điều động (mock) ────────────────────────
const dieuDongRows = mockDieuDong.map((r, i) => ({
  ...r,
  stt: i + 1,
  tieuDe: `Điều động ${r.tenDanhMuc}`,
  canCu: `Lệnh ${400 + i}/L-ĐĐ`,
  thoiGian: r.ngayDieuDong,
  thuTruong: r.nguoiDuyet,
  donViGiao: r.donViCu,
  nguoiGiao: `Thượng tá Nguyễn Văn ${String.fromCharCode(65 + (i % 26))}`,
  donViNhan: r.donViMoi,
  nguoiNhan: `Thiếu tá Trần Minh ${String.fromCharCode(88 - (i % 26))}`,
  ghiChu: "Điều động phục vụ nhiệm vụ đột xuất",
}));

const DieuDong: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterTT, setFilterTT] = useState('');

  const ttList = useMemo(() => Array.from(new Set(dieuDongRows.map(d => d.trangThai))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return dieuDongRows.filter(r => {
      const matchSearch = !q || [r.maDanhMuc, r.tenDanhMuc, r.donViGiao, r.donViNhan, r.lyDo, r.tieuDe, r.canCu].some(v => v?.toLowerCase().includes(q));
      const matchTT = !filterTT || r.trangThai === filterTT;
      return matchSearch && matchTT;
    });
  }, [search, filterTT]);

  const handleClear = () => {
    setSearch('');
    setFilterTT('');
  };

  const activeFilters = useMemo(() => {
    const chips: any[] = [];
    if (filterTT)
      chips.push({
        key: "tt",
        label: `Trạng thái: ${filterTT}`,
        icon: <PendingActionsIcon fontSize="small" />,
      });
    return chips;
  }, [filterTT]);

  const handleRemoveFilter = (key: string) => {
    if (key === "tt") setFilterTT("");
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(
    () => ({
      total: dieuDongRows.length,
      daDuyet: dieuDongRows.filter((r) => r.trangThai === "Đã duyệt").length,
      choDuyet: dieuDongRows.filter((r) => r.trangThai === "Chờ duyệt").length,
      daThucHien: dieuDongRows.filter((r) => r.trangThai === "Đã thực hiện")
        .length,
      huy: dieuDongRows.filter((r) => r.trangThai === "Hủy").length,
    }),
    []
  );

  const columns: GridColDef[] = [
    { field: 'stt', headerName: 'STT', width: 70 },
    { field: 'tieuDe', headerName: 'Tiêu đề', width: 250 },
    { field: 'canCu', headerName: 'Căn cứ', width: 180 },
    {
      field: 'trangThai', headerName: 'Trạng thái điều động', width: 180,
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value} color={ttColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    { field: 'thoiGian', headerName: 'Thời gian', width: 140 },
    { field: 'thuTruong', headerName: 'Thủ trưởng', width: 180 },
    { field: 'donViGiao', headerName: 'Đơn vị giao', width: 180 },
    { field: 'nguoiGiao', headerName: 'Người giao', width: 180 },
    { field: 'donViNhan', headerName: 'Đơn vị nhận', width: 180 },
    { field: 'nguoiNhan', headerName: 'Người nhận', width: 180 },
    { field: 'ghiChu', headerName: 'Ghi chú', flex: 1, minWidth: 200 },
    {
      field: 'actions', headerName: 'Thao tác', width: 160, sortable: false, filterable: false,
      renderCell: (p: GridRenderCellParams) => (
        <Box display="flex" gap={0.5} justifyContent="center" width="100%">
          <Tooltip title="Xem chi tiết">
            <IconButton size="small" sx={{ color: militaryColors.navy }}><VisibilityIcon fontSize="inherit" /></IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton size="small" sx={{ color: militaryColors.warning }}><EditIcon fontSize="inherit" /></IconButton>
          </Tooltip>
          <Tooltip title="In chi tiết">
            <IconButton size="small" sx={{ color: militaryColors.success }}><PrintIcon fontSize="inherit" /></IconButton>
          </Tooltip>
          <Tooltip title="Xóa">
            <IconButton size="small" sx={{ color: militaryColors.error }}><DeleteIcon fontSize="inherit" /></IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            ĐIỀU ĐỘNG TRANG BỊ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý điều chuyển và điều động trang bị kỹ thuật thông tin giữa các đơn vị toàn quân
          </Typography>
        </Box>
        <StatsButton activeMenu="dieuDong" />
      </Stack>



      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm mã, tên, đơn vị, lý do..."
        onExport={() => alert("[Giả lập] Xuất Excel điều động")}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <Typography
              variant="caption"
              fontWeight={700}
              color="text.secondary"
              sx={{
                display: "block",
                mb: 0.5,
                ml: 0.5,
                textTransform: "uppercase",
                fontSize: "0.65rem",
                letterSpacing: "0.05em",
              }}
            >
              TRẠNG THÁI HỒ SƠ
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              variant="outlined"
              value={filterTT}
              onChange={(e) => setFilterTT(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Tất cả trạng thái --</em>
              </MenuItem>
              {ttList.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </CommonFilter>


      <DataGrid
        rows={filtered}
        columns={columns}
        getRowId={(r) => r.id}
        sx={{
          height: {
            xs: 500,
            sm: 550,
            md: "calc(100vh - 350px)",
          },
          minHeight: 450,
          width: "100%",
        }}
      />
    </Box>
  );
};

export default DieuDong;
