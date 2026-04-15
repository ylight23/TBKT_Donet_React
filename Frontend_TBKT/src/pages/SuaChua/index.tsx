// ============================================================
// Sửa chữa – Repair Management
// Gồm: Kết quả sửa chữa + Trang bị kỹ thuật sửa chữa
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
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import CommonFilter from "../../components/Filter/CommonFilter";

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import AppsIcon from '@mui/icons-material/Apps';
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

import { mockSuaChua, ISuaChua } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu kết quả sửa chữa ─────────────────────────────────────
const kqColor: Record<string, 'success' | 'warning' | 'error'> = {
  'Hoàn thành': 'success',
  'Đang sửa': 'warning',
  'Không sửa được': 'error',
};

// ── Mở rộng dữ liệu sửa chữa (mock) ─────────────────────────
const suaChuaRows = mockSuaChua.map((r, i) => ({
  ...r,
  stt: i + 1,
  tieuDe: `Sửa chữa ${r.tenDanhMuc}`,
  canCu: `Công văn ${500 + i}/CV-KT`,
  mucSuaChua: i % 2 === 0 ? 'Sửa chữa lớn' : 'Sửa chữa nhỏ',
  capSuaChua: r.loaiSuaChua, // Map từ loaiSuaChua sang cấp sửa chữa
  donViDeNghi: r.donVi,
  ngayDeNghi: r.ngayBatDau,
}));

// ── Columns ──────────────────────────────────────────────────
const columns: GridColDef[] = [
  { field: 'stt', headerName: 'STT', width: 70 },
  { field: 'tieuDe', headerName: 'Tiêu đề', width: 250 },
  { field: 'canCu', headerName: 'Căn cứ', width: 180 },
  { field: 'mucSuaChua', headerName: 'Mức sửa chữa', width: 150 },
  { field: 'capSuaChua', headerName: 'Cấp sửa chữa', width: 160 },
  { field: 'donViSuaChua', headerName: 'Đơn vị sửa chữa', width: 180 },
  { field: 'donViDeNghi', headerName: 'Đơn vị đề nghị', width: 180 },
  { field: 'ngayDeNghi', headerName: 'Ngày đề nghị', width: 140 },
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

// ── SuaChua main ─────────────────────────────────────────────
const SuaChua: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Number(searchParams.get('tab') || 0);
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterKQ, setFilterKQ] = useState('');
  const [expanded, setExpanded] = useState(false);

  // Đồng bộ tab khi URL thay đổi (click từ sidebar)
  useEffect(() => {
    const urlTab = Number(searchParams.get('tab') || 0);
    if (urlTab !== tab) setTab(urlTab);
  }, [searchParams]);

  // Cập nhật URL khi chuyển tab bằng click
  const handleTabChange = (_: unknown, newTab: number) => {
    setTab(newTab);
    setSearchParams(newTab > 0 ? { tab: String(newTab) } : {}, { replace: true });
  };

  const loaiList = useMemo(() => Array.from(new Set(suaChuaRows.map(d => d.capSuaChua))), []);
  const mucList = ['Sửa chữa lớn', 'Sửa chữa nhỏ'];

  // Tab 0: tất cả | Tab 1: đang sửa | Tab 2: kết quả
  const sourceData = useMemo(() => {
    if (tab === 1) return suaChuaRows.filter(r => r.ketQua === 'Đang sửa');
    if (tab === 2) return suaChuaRows.filter(r => r.ketQua === 'Hoàn thành');
    return suaChuaRows;
  }, [tab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sourceData.filter(r => {
      const matchSearch = !q || [r.maDanhMuc, r.tenDanhMuc, r.donVi, r.donViSuaChua, r.tieuDe].some(v => v.toLowerCase().includes(q));
      const matchLoai = !filterLoai || r.capSuaChua === filterLoai;
      const matchKQ = !filterKQ || r.mucSuaChua === filterKQ;
      return matchSearch && matchLoai && matchKQ;
    });
  }, [search, filterLoai, filterKQ, sourceData]);

  const handleClear = () => {
    setSearch('');
    setFilterLoai('');
    setFilterKQ('');
  };

  const activeFilters = useMemo(() => {
    const chips: any[] = [];
    if (filterLoai)
      chips.push({
        key: "loai",
        label: `Cấp SC: ${filterLoai}`,
        icon: <BuildIcon fontSize="small" />,
      });
    if (filterKQ)
      chips.push({
        key: "kq",
        label: `Kết quả: ${filterKQ}`,
        icon: <CheckCircleIcon fontSize="small" />,
      });
    return chips;
  }, [filterLoai, filterKQ]);

  const handleRemoveFilter = (key: string) => {
    if (key === "loai") setFilterLoai("");
    if (key === "kq") setFilterKQ("");
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(
    () => ({
      total: suaChuaRows.length,
      hoanthanh: suaChuaRows.filter((r) => r.ketQua === "Hoàn thành").length,
      dangSua: suaChuaRows.filter((r) => r.ketQua === "Đang sửa").length,
      khongSuaDuoc: suaChuaRows.filter((r) => r.ketQua === "Không sửa được")
        .length,
      tongChiPhi: suaChuaRows.reduce((s, r) => s + (r.chiPhi || 0), 0),
    }),
    []
  );

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            SỬA CHỮA TRANG BỊ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Quản lý công tác sửa chữa trang bị kỹ thuật thông tin toàn quân
          </Typography>
        </Box>
        <StatsButton activeMenu="suaChua" />
      </Stack>



      {/* Tabs */}
      <Box sx={{
        mb: 1.5,
        p: 0.5,
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        borderRadius: 2.5,
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
            icon={<AppsIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Tất cả (${suaChuaRows.length})`}
          />
          <Tab
            icon={<HourglassEmptyIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Đang sửa (${stats.dangSua})`}
          />
          <Tab
            icon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`Hoàn thành (${stats.hoanthanh})`}
          />
        </Tabs>
      </Box>

      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm phiếu SC theo mã, tên trang bị, đơn vị, đơn vị sửa chữa..."
        onExport={() => alert("[Giả lập] Xuất Excel sửa chữa")}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
        popoverTitle="Lọc nâng cao"
        popoverWidth={500}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 0.5, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
              CẤP SỬA CHỮA
            </Typography>
            <TextField
              select fullWidth size="small"
              variant="outlined"
              value={filterLoai}
              onChange={(e) => setFilterLoai(e.target.value)}
            >
              <MenuItem value=""><em>-- Tất cả cấp --</em></MenuItem>
              {loaiList.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 0.5, textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
              MỨC SỬA CHỮA
            </Typography>
            <TextField
              select fullWidth size="small"
              variant="outlined"
              value={filterKQ}
              onChange={(e) => setFilterKQ(e.target.value)}
            >
              <MenuItem value=""><em>-- Tất cả mức --</em></MenuItem>
              {mucList.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
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

export default SuaChua;
