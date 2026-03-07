// ============================================================
// Tình trạng kỹ thuật – Technical Status Overview
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import Stack from "@mui/material/Stack";
import CommonFilter from "../../components/Filter/CommonFilter";
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import StatsButton from '../../components/Stats/StatsButton';

import {
  mockTrangBiNhom1,
  mockTrangBiNhom2,
  ChatLuong,
  TrangThaiTrangBi,
  ITrangBi,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

import Popover from '@mui/material/Popover';

// ── Gộp tất cả trang bị ──────────────────────────────────────
const allTrangBi: ITrangBi[] = [...mockTrangBiNhom1, ...mockTrangBiNhom2];

// ── Màu chất lượng ──────────────────────────────────────────
const clColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
};

// ── Card tóm tắt chất lượng ──────────────────────────────────
interface SummaryCardProps {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, count, total, color, icon }) => {
  const pct = Math.round((count / total) * 100);
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${color}33`,
        bgcolor: `${color}05`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
          <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: `${color}15`, color }}>
            {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: 20 } })}
          </Box>
        </Box>
        <Box display="flex" alignItems="baseline" gap={1}>
          <Typography variant="h4" fontWeight={800} color={color}>{count}</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">/ {total}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>{pct}% tổng trang bị</Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6, borderRadius: 2.5, bgcolor: `${color}15`,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2.5}
          }}
        />
      </CardContent>
    </Card>
  );
};

// ── Tình trạng kỹ thuật ──────────────────────────────────────
const TinhTrangKyThuat: React.FC = () => {
  const theme = useTheme();
  const total = allTrangBi.length;
  const [search, setSearch] = useState("");
  const [filterCL, setFilterCL] = useState("");

  const activeFilters = useMemo(() => {
    const chips: any[] = [];
    if (filterCL)
      chips.push({
        key: "cl",
        label: `Chất lượng: ${filterCL}`,
        icon: <VerifiedIcon fontSize="small" />,
      });
    return chips;
  }, [filterCL]);

  const handleRemoveFilter = (key: string) => {
    if (key === "cl") setFilterCL("");
  };

  // Tính số lượng theo chất lượng
  const count = useMemo(() => ({
    tot: allTrangBi.filter(t => t.chatLuong === ChatLuong.Tot).length,
    kha: allTrangBi.filter(t => t.chatLuong === ChatLuong.Kha).length,
    trungBinh: allTrangBi.filter(t => t.chatLuong === ChatLuong.TrungBinh).length,
    xau: allTrangBi.filter(t => t.chatLuong === ChatLuong.Xau).length,
    hong: allTrangBi.filter(t => t.chatLuong === ChatLuong.HỏngHoc).length,
  }), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTrangBi.filter(row => {
      const matchSearch = !q || [row.maTrangBi, row.ten, row.donVi].some(v => v.toLowerCase().includes(q));
      const matchCL = !filterCL || row.chatLuong === filterCL;
      return matchSearch && matchCL;
    });
  }, [search, filterCL]);

  const handleClear = () => {
    setSearch('');
    setFilterCL('');
  };

  const activeFilterCount = activeFilters.length;

  const columns: GridColDef[] = [
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140,
      renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>,
    },
    { field: 'ten', headerName: 'Tên trang bị', flex: 1, minWidth: 160 },
    { field: 'loai', headerName: 'Loại', width: 200 },
    { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 150 },
    {
      field: 'chatLuong', headerName: 'Chất lượng', width: 130,
      renderCell: (p: GridRenderCellParams<ITrangBi, ChatLuong>) => (
        <Chip
          label={p.value}
          size="small"
          sx={{
            bgcolor: `${clColor[p.value!]}22`, color: clColor[p.value!],
            fontWeight: 600, fontSize: 11,
            border: `1px solid ${clColor[p.value!]}55`,
          }}
        />
      ),
    },
    {
      field: 'trangThai', headerName: 'Trạng thái', width: 150,
      renderCell: (p: GridRenderCellParams<ITrangBi, TrangThaiTrangBi>) => (
        <Chip
          label={p.value} size="small"
          color={p.value === TrangThaiTrangBi.HoatDong ? 'success' :
            p.value === TrangThaiTrangBi.SuaChua ? 'warning' : 'default'}
        />
      ),
    },
    { field: 'soLanSuaChua', headerName: 'Số lần SC', type: 'number', width: 110 },
    { field: 'nienHan', headerName: 'Niên hạn (năm)', type: 'number', width: 130 },
    { field: 'namSuDung', headerName: 'Năm sử dụng', type: 'number', width: 120 },
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
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>TÌNH TRẠNG KỸ THUẬT</Typography>
          <Typography variant="body2" color="text.secondary">
            Hệ thống giám sát và tổng hợp chất lượng trang bị kỹ thuật thông tin toàn quân
          </Typography>
        </Box>
        <StatsButton activeMenu="tinhTrangKT" />
      </Stack>


      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm mã, tên trang bị, đơn vị…"
        onExport={() => alert("[Giả lập] Xuất Excel tình trạng kỹ thuật")}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
        popoverTitle="Lọc kỹ thuật"
        popoverWidth={400}
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
              PHÂN CẤP CHẤT LƯỢNG
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={filterCL}
              onChange={(e) => setFilterCL(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Tất cả chất lượng --</em>
              </MenuItem>
              {Object.values(ChatLuong).map((cl) => (
                <MenuItem key={cl} value={cl}>
                  {cl}
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

export default TinhTrangKyThuat;
