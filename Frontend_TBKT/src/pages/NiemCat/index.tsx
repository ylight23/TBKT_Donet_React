// ============================================================
// Niêm cất – Equipment Storage/Archive Management
// Gồm: Trang bị KT niêm cất + Kết quả niêm cất
// ============================================================
import React, { useState, useMemo, useEffect } from 'react';
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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import StatsButton from '../../components/Stats/StatsButton';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import CommonFilter from "../../components/Filter/CommonFilter";

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InventoryIcon from '@mui/icons-material/Inventory';
import LockIcon from '@mui/icons-material/Lock';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { mockNiemCat, INiemCat } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu kết quả niêm cất ──────────────────────────────────────
const ketQuaColor: Record<string, 'success' | 'warning' | 'info'> = {
  'Đạt yêu cầu': 'success',
  'Cần bổ sung': 'warning',
  'Đang thực hiện': 'info',
};

// ── Mở rộng dữ liệu niêm cất (mock) ──────────────────────────
const niemCatRows = mockNiemCat.map((r, i) => ({
  ...r,
  stt: i + 1,
  ten: r.tenTrangBi,
  loaiDeNghi: i % 2 === 0 ? 'Niêm cất dài hạn' : 'Niêm cất ngắn hạn',
  loaiNiemCat: i % 2 === 0 ? 'Niêm cất khô' : 'Niêm cất ẩm',
  donViThucHien: r.donVi,
  nguoiThucHien: `Trung úy Lê Quang ${String.fromCharCode(72 + (i % 18))}`,
  canCu: `Quyết định ${300 + i}/QĐ-KT`,
  ketQua: i % 3 === 0 ? 'Đạt yêu cầu' : i % 3 === 1 ? 'Cần bổ sung' : 'Đang thực hiện',
}));

// ── Columns ──────────────────────────────────────────────────
const columns: GridColDef[] = [
  { field: 'stt', headerName: 'STT', width: 70 },
  { field: 'ten', headerName: 'Tên', width: 220 },
  { field: 'loaiDeNghi', headerName: 'Loại đề nghị Niêm cất', width: 200 },
  { field: 'loaiNiemCat', headerName: 'Loại niêm cất', width: 160 },
  { field: 'donViThucHien', headerName: 'Đơn vị thực hiện', width: 180 },
  { field: 'nguoiThucHien', headerName: 'Người thực hiện', width: 180 },
  { field: 'ngayNiemCat', headerName: 'Ngày niêm cất', width: 140 },
  { field: 'canCu', headerName: 'Căn cứ', width: 180 },
  {
    field: 'ketQua', headerName: 'Kết quả', width: 160,
    renderCell: (p: GridRenderCellParams) => (
      <Chip
        label={p.value}
        color={ketQuaColor[p.value as string] ?? 'default'}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    ),
  },
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

// ── NiemCat main ─────────────────────────────────────────────
const NiemCat: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Number(searchParams.get('tab') || 1);
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterKQ, setFilterKQ] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Đồng bộ tab khi URL thay đổi (click từ sidebar)
  useEffect(() => {
    const urlTab = Number(searchParams.get('tab') || 1);
    if (urlTab !== tab) setTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (_: unknown, newTab: number) => {
    setTab(newTab);
    setSearchParams({ tab: String(newTab) }, { replace: true });
  };

  const loaiList = useMemo(() => Array.from(new Set(niemCatRows.map(d => d.loaiNiemCat))), []);
  const ketQuaOptions = ['Đạt yêu cầu', 'Cần bổ sung', 'Đang thực hiện'];

  // Tab 1: Trang bị KT niêm cất (tất cả)
  // Tab 2: Kết quả niêm cất (tất cả hồ sơ)
  const sourceData = useMemo(() => {
    return niemCatRows;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sourceData.filter(r => {
      const matchSearch = !q
        || [r.ten, r.loaiDeNghi, r.donViThucHien, r.nguoiThucHien, r.canCu].some(v => v?.toLowerCase().includes(q));
      const matchLoai = !filterLoai || r.loaiNiemCat === filterLoai;
      const matchKQ = !filterKQ || r.ketQua === filterKQ;
      return matchSearch && matchLoai && matchKQ;
    });
  }, [search, filterLoai, filterKQ, sourceData]);

  const activeFilters = useMemo(() => {
    const chips: any[] = [];
    if (filterLoai)
      chips.push({
        key: "loai",
        label: `Loại: ${filterLoai}`,
        icon: <InventoryIcon fontSize="small" />,
      });
    if (filterKQ)
      chips.push({
        key: "kq",
        label: `Kết quả: ${filterKQ}`,
        icon: <AssignmentTurnedInIcon fontSize="small" />,
      });
    return chips;
  }, [filterLoai, filterKQ]);

  const handleRemoveFilter = (key: string) => {
    if (key === "loai") setFilterLoai("");
    if (key === "kq") setFilterKQ("");
  };


  const handleClear = () => {
    setSearch('');
    setFilterLoai('');
    setFilterKQ('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    datYeuCau: niemCatRows.filter(r => r.ketQua === 'Đạt yêu cầu').length,
    canBoSung: niemCatRows.filter(r => r.ketQua === 'Cần bổ sung').length,
    dangThucHien: niemCatRows.filter(r => r.ketQua === 'Đang thực hiện').length,
    total: niemCatRows.length,
  }), []);


  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            NIÊM CẤT TRANG BỊ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hệ thống giám sát và quản lý trạng thái niêm cất bảo quản trang bị kỹ thuật thông tin toàn quân
          </Typography>
        </Box>
        <StatsButton activeMenu="niemCat" />
      </Stack>



      {/* Tabs */}
      <Box sx={{
        mb: 1.5,
        p: 0.5,
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        borderRadius: 3,
        display: 'inline-flex'
      }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{
            minHeight: 40,
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              minHeight: 40,
              borderRadius: 2.5,
              px: 3,
              color: 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&.Mui-selected': {
                color: '#fff',
                bgcolor: 'primary.main',
                boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
              },
              '&:hover': {
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              }
            }
          }}
        >
          <Tab
            value={1}
            icon={<LockIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Trang bị KT niêm cất (${stats.total})`}
          />
          <Tab
            value={2}
            icon={<AssignmentTurnedInIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Kết quả niêm cất (${stats.datYeuCau})`}
          />
        </Tabs>
      </Box>

      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm mã, tên trang bị, đơn vị, kho niêm cất…"
        onExport={() => alert("[Giả lập] Xuất Excel niêm cất")}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 0.5, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
              LOẠI NIÊM CẤT
            </Typography>
            <TextField
              select fullWidth size="small"
              variant="outlined"
              value={filterLoai}
              onChange={(e) => setFilterLoai(e.target.value)}
            >
              <MenuItem value=""><em>-- Tất cả loại --</em></MenuItem>
              {loaiList.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 0.5, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
              KẾT QUẢ NIÊM CẤT
            </Typography>
            <TextField
              select fullWidth size="small"
              variant="outlined"
              value={filterKQ}
              onChange={(e) => setFilterKQ(e.target.value)}
            >
              <MenuItem value=""><em>-- Tất cả kết quả --</em></MenuItem>
              {ketQuaOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
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
          mt: 1,
        }}
      />
    </Box>
  );
};

export default NiemCat;
