// ============================================================
// Chuyển cấp chất lượng – Quality Level Transfer Management
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import CommonFilter from "../../components/Filter/CommonFilter";
import StatsButton from '../../components/Stats/StatsButton';

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import StarRateIcon from '@mui/icons-material/StarRate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';

import { mockChuyenCap, IChuyenCap, ChatLuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu cấp chất lượng ───────────────────────────────────────
const clColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
};

const capOrder = [ChatLuong.Tot, ChatLuong.Kha, ChatLuong.TrungBinh, ChatLuong.Xau, ChatLuong.HỏngHoc];

// Xác định hướng chuyển cấp: tăng / giảm / bằng
const getTrend = (capCu: ChatLuong, capMoi: ChatLuong): 'up' | 'down' | 'flat' => {
  const icu = capOrder.indexOf(capCu);
  const imoi = capOrder.indexOf(capMoi);
  if (imoi < icu) return 'up';
  if (imoi > icu) return 'down';
  return 'flat';
};

// ── Mở rộng dữ liệu chuyển cấp (mock) ────────────────────────
const chuyenCapRows = mockChuyenCap.map((r, i) => ({
  ...r,
  stt: i + 1,
  ten: r.tenDanhMuc,
  soMenhLenh: `ML/${2400 + i}/QĐ-Kỹ thuật`,
  canCu: `Biên bản giám định số ${100 + i}`,
  thoiGian: r.ngayCapNhat,
}));

const ChuyenCapChatLuong: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterCu, setFilterCu] = useState('');
  const [filterMoi, setFilterMoi] = useState('');

  const activeFilters = useMemo(() => {
    const chips: any[] = [];
    if (filterCu)
      chips.push({
        key: "cu",
        label: `Cấp cũ: ${filterCu}`,
        icon: <StarRateIcon fontSize="small" />,
      });
    if (filterMoi)
      chips.push({
        key: "moi",
        label: `Cấp mới: ${filterMoi}`,
        icon: <TrendingUpIcon fontSize="small" />,
      });
    return chips;
  }, [filterCu, filterMoi]);

  const handleRemoveFilter = (key: string) => {
    if (key === "cu") setFilterCu("");
    if (key === "moi") setFilterMoi("");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return chuyenCapRows.filter((r) => {
      const matchSearch =
        !q ||
        [r.ten, r.donVi, r.lyDo, r.nguoiXacNhan, r.soMenhLenh, r.canCu].some((v) =>
          v?.toLowerCase().includes(q)
        );
      const matchCu = !filterCu || r.capCu === filterCu;
      const matchMoi = !filterMoi || r.capMoi === filterMoi;
      return matchSearch && matchCu && matchMoi;
    });
  }, [search, filterCu, filterMoi]);

  const handleClear = () => {
    setSearch("");
    setFilterCu("");
    setFilterMoi("");
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(
    () => ({
      total: chuyenCapRows.length,
      tangCap: chuyenCapRows.filter(
        (r) => getTrend(r.capCu, r.capMoi) === "up"
      ).length,
      giamCap: chuyenCapRows.filter(
        (r) => getTrend(r.capCu, r.capMoi) === "down"
      ).length,
    }),
    []
  );

  const columns: GridColDef[] = [
    { field: 'stt', headerName: 'STT', width: 70 },
    { field: 'ten', headerName: 'Tên', width: 220 },
    {
      field: 'capChatLuong', headerName: 'Cấp chất lượng', width: 250,
      renderCell: (p: GridRenderCellParams<any>) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={p.row.capCu} size="small"
            sx={{
              bgcolor: `${clColor[p.row.capCu as ChatLuong]}15`, color: clColor[p.row.capCu as ChatLuong],
              fontWeight: 700, border: `1px solid ${clColor[p.row.capCu as ChatLuong]}33`
            }}
          />
          <TrendingFlatIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
          <Chip
            label={p.row.capMoi} size="small"
            sx={{
              bgcolor: `${clColor[p.row.capMoi as ChatLuong]}15`, color: clColor[p.row.capMoi as ChatLuong],
              fontWeight: 700, border: `1px solid ${clColor[p.row.capMoi as ChatLuong]}33`
            }}
          />
        </Box>
      ),
    },
    { field: 'donVi', headerName: 'Đơn vị', width: 180 },
    { field: 'thoiGian', headerName: 'Thời gian', width: 140 },
    { field: 'soMenhLenh', headerName: 'Số mệnh lệnh', width: 180 },
    { field: 'canCu', headerName: 'Căn cứ', width: 220 },
    { field: 'lyDo', headerName: 'Ghi chú', flex: 1, minWidth: 200 },
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

  // Imports check: need Edit, Print, Delete, Visibility icons

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            CHUYỂN CẤP CHẤT LƯỢNG
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hệ thống theo dõi và quản lý việc điều chỉnh phân cấp chất lượng trang bị kỹ thuật thông tin
          </Typography>
        </Box>
        <StatsButton activeMenu="chuyenCap" />
      </Stack>



      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm mã, tên trang bị, đơn vị, người xác nhận…"
        onExport={() => alert("[Giả lập] Xuất Excel chuyển cấp")}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
      >
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
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
              CẤP CHẤT LƯỢNG CŨ
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={filterCu}
              onChange={(e) => setFilterCu(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Tất cả cấp --</em>
              </MenuItem>
              {Object.values(ChatLuong).map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
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
              CẤP CHẤT LƯỢNG MỚI
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={filterMoi}
              onChange={(e) => setFilterMoi(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Tất cả cấp --</em>
              </MenuItem>
              {Object.values(ChatLuong).map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
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

export default ChuyenCapChatLuong;
