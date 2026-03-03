// ============================================================
// Bảo quản – Equipment Preservation Management
// ============================================================
import React, { useState, useMemo } from 'react';
import CommonFilter from "../../components/Filter/CommonFilter";
import Box from "@mui/material/Box";
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import StatsButton from '../../components/Stats/StatsButton';

import {
  mockTrangBiNhom1,
  mockTrangBiNhom2,
  TrangThaiTrangBi,
  ChatLuong,
  ITrangBi,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// Chỉ hiện trang bị cần bảo quản (hoạt động + niêm cất)
const baoQuanData: ITrangBi[] = [
  ...mockTrangBiNhom1,
  ...mockTrangBiNhom2,
].filter(t =>
  t.trangThai === TrangThaiTrangBi.HoatDong ||
  t.trangThai === TrangThaiTrangBi.NiemCat,
);

// ── Lịch bảo quản định kỳ (mock) ────────────────────────────
const kyBaoQuan = ['Hàng tuần', 'Hàng tháng', '3 tháng', '6 tháng', 'Hàng năm'];
const baoQuanRows = baoQuanData.map((tb, i) => ({
  ...tb,
  stt: i + 1,
  tenBaoQuan: `Bảo quản ${tb.ten} định kỳ`,
  canCu: `Kế hoạch ${100 + i}/KH-KT`,
  donViThucHien: tb.donVi,
  ngayBaoQuan: `${2024 + Math.floor(i / 20)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  nguoiPhuTrach: `Thiếu úy Trần Văn ${String.fromCharCode(65 + (i % 26))}`,
  nguoiThucHien: `Binh nhất Nguyễn Văn ${String.fromCharCode(70 + (i % 20))}`,
  thoiGianLap: `10:30 ${String((i % 28) + 1).padStart(2, '0')}/${String((i % 12) + 1).padStart(2, '0')}/2024`,
  noiDung: "Vệ sinh thiết bị, kiểm tra các đầu nối, đo đạc thông số kỹ thuật",
  vatChat: "Bộ dụng cụ kỹ thuật, cồn 90 độ, giẻ sạch, đồng hồ vạn năng",
  ketQua: i % 4 === 0 ? 'Cần kiểm tra' : i % 4 === 1 ? 'Đạt yêu cầu' : i % 4 === 2 ? 'Vừa thực hiện' : 'Chưa kiểm tra',
}));

const BaoQuan: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterTT, setFilterTT] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baoQuanRows.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.ten, r.donVi, r.nguoiPhuTrach, r.tenBaoQuan].some(v => v.toLowerCase().includes(q));
      const matchTT = !filterTT || r.ketQua === filterTT;
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
        label: `Kết quả: ${filterTT}`,
        icon: <CheckCircleIcon fontSize="small" />,
      });
    return chips;
  }, [filterTT]);

  const handleRemoveFilter = (key: string) => {
    if (key === "tt") setFilterTT("");
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(
    () => ({
      datYeuCau: baoQuanRows.filter((r) => r.ketQua === "Đạt yêu cầu")
        .length,
      canKiemTra: baoQuanRows.filter((r) => r.ketQua === "Cần kiểm tra")
        .length,
      chuaKiemTra: baoQuanRows.filter((r) => r.ketQua === "Chưa kiểm tra")
        .length,
    }),
    []
  );

  const columns: GridColDef[] = [
    { field: 'stt', headerName: 'STT', width: 70 },
    { field: 'tenBaoQuan', headerName: 'Tên bảo quản', width: 250 },
    { field: 'canCu', headerName: 'Căn cứ', width: 180 },
    { field: 'donViThucHien', headerName: 'Đơn vị thực hiện', width: 180 },
    { field: 'ngayBaoQuan', headerName: 'Ngày bảo quản', width: 130 },
    { field: 'nguoiPhuTrach', headerName: 'Người phụ trách', width: 180 },
    { field: 'nguoiThucHien', headerName: 'Người thực hiện', width: 180 },
    { field: 'thoiGianLap', headerName: 'Thời gian lập', width: 160 },
    { field: 'noiDung', headerName: 'Nội dung công việc', width: 280 },
    { field: 'vatChat', headerName: 'Vật chất bảo đảm', width: 250 },
    {
      field: 'ketQua', headerName: 'Kết quả', width: 140,
      renderCell: (p: GridRenderCellParams) => {
        const color =
          p.value === 'Đạt yêu cầu' ? 'success' :
            p.value === 'Cần kiểm tra' ? 'warning' :
              p.value === 'Vừa thực hiện' ? 'info' : 'default';
        return <Chip label={p.value} color={color} size="small" sx={{ fontWeight: 600 }} />;
      },
    },
    {
      field: 'actions', headerName: 'Thao tác', width: 150, sortable: false, filterable: false,
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
            BẢO QUẢN TRANG BỊ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hệ thống giám sát và quản lý công tác bảo quản kỹ thuật định kỳ cho toàn quân
          </Typography>
        </Box>
        <StatsButton activeMenu="baoQuan" />
      </Stack>



      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm mã, tên trang bị, đơn vị, người phụ trách…"
        onExport={() => alert("[Giả lập] Xuất Excel bảo quản")}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
      >
        <Grid container spacing={2}>
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
              KẾT QUẢ BẢO QUẢN
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
                <em>-- Tất cả kết quả --</em>
              </MenuItem>
              {[
                "Đạt yêu cầu",
                "Cần kiểm tra",
                "Vừa thực hiện",
                "Chưa kiểm tra",
              ].map((t) => (
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

export default BaoQuan;
