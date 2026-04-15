// ============================================================
// Bảo dưỡng – Maintenance Management
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/GridLegacy';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BusinessIcon from '@mui/icons-material/Business';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import CommonFilter from '../../components/Filter/CommonFilter';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import Stack from '@mui/material/Stack';
import StatsButton from '../../components/Stats/StatsButton';

import { mockBaoDuong, IBaoDuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu kết quả ─────────────────────────────────────────────
const ketQuaColor: Record<string, 'success' | 'warning' | 'error'> = {
  'Đạt tiêu chuẩn': 'success',
  'Cần theo dõi': 'warning',
  'Phát hiện lỗi': 'error',
};

// ── Mở rộng dữ liệu bảo dưỡng (mock) ────────────────────────
const baoDuongRows = mockBaoDuong.map((r, i) => ({
  ...r,
  stt: i + 1,
  tenBaoDuong: `Bảo dưỡng ${r.tenDanhMuc} định kỳ`,
  canCu: `Kế hoạch ${200 + i}/KH-KT`,
  donViThucHien: r.donVi,
  nguoiPhuTrach: `Thiếu tá Lê Văn ${String.fromCharCode(65 + (i % 26))}`,
  thoiGianLap: `08:45 ${String((i % 28) + 1).padStart(2, '0')}/${String((i % 12) + 1).padStart(2, '0')}/2024`,
  noiDung: "Bảo dưỡng kỹ thuật định kỳ, kiểm tra thông số, tra dầu mỡ, hiệu chỉnh sai lệch",
  vatChat: "Dầu nhờn, bộ vệ sinh chuyên dụng, linh kiện thay thế dự phòng",
}));

const BaoDuong: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterKQ, setFilterKQ] = useState('');

  const ketQuaList = useMemo(() => Array.from(new Set(baoDuongRows.map((d) => d.ketQua))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baoDuongRows.filter((r) => {
      const matchSearch = !q || [r.maDanhMuc, r.tenDanhMuc, r.donVi, r.nguoiThucHien, r.tenBaoDuong].some(v => v.toLowerCase().includes(q));
      const matchKQ = !filterKQ || r.ketQua === filterKQ;
      return matchSearch && matchKQ;
    });
  }, [search, filterKQ]);

  const handleClear = () => {
    setSearch('');
    setFilterKQ('');
  };

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; icon: React.ReactNode }[] = [];
    if (filterKQ) chips.push({ key: 'kq', label: `Kết quả: ${filterKQ}`, icon: <CheckCircleIcon fontSize="small" /> });
    return chips;
  }, [filterKQ]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'kq') setFilterKQ('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    dat: baoDuongRows.filter((r) => r.ketQua === 'Đạt tiêu chuẩn').length,
    canTheoDoi: baoDuongRows.filter((r) => r.ketQua === 'Cần theo dõi').length,
    phatHienLoi: baoDuongRows.filter((r) => r.ketQua === 'Phát hiện lỗi').length,
  }), []);

  const columns: GridColDef[] = [
    { field: 'stt', headerName: 'STT', width: 70 },
    { field: 'tenBaoDuong', headerName: 'Tên bảo dưỡng', width: 250 },
    { field: 'canCu', headerName: 'Căn cứ', width: 180 },
    { field: 'donViThucHien', headerName: 'Đơn vị thực hiện', width: 200 },
    { field: 'ngayBaoDuong', headerName: 'Ngày bảo dưỡng', width: 140 },
    { field: 'nguoiPhuTrach', headerName: 'Người phụ trách', width: 180 },
    { field: 'nguoiThucHien', headerName: 'Người thực hiện', width: 180 },
    { field: 'thoiGianLap', headerName: 'Thời gian lập', width: 160 },
    { field: 'noiDung', headerName: 'Nội dung công việc', width: 300 },
    { field: 'vatChat', headerName: 'Vật chất bảo đảm', width: 250 },
    {
      field: 'ketQua', headerName: 'Kết quả', width: 150,
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value} color={ketQuaColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
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

  const handleApply = () => {
    // Logic applied when clicking "Áp dụng"
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            color="primary"
            sx={{ letterSpacing: '-0.02em', mb: 0.5 }}
          >
            BẢO DƯỠNG TRANG BỊ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hệ thống quản lý và giám sát công tác bảo dưỡng định kỳ trang bị kỹ thuật thông tin
          </Typography>
        </Box>
        <StatsButton activeMenu="baoDuong" />
      </Stack>



      {/* ── Filter Panel ────────────────────────────────────────── */}
      <CommonFilter
        search={search}
        onSearchChange={setSearch}
        placeholder="Tìm kiếm phiếu BD theo mã, tên trang bị, đơn vị, người thực hiện..."
        onExport={() => alert('[Giả lập] Xuất Excel bảo dưỡng')}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClear}
        popoverTitle="Lọc phiếu nâng cao"
        popoverDescription="Tinh chỉnh danh sách bảo dưỡng theo tiêu chí cụ thể"
        popoverWidth={520}
        onApply={handleApply}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
              KẾT QUẢ BẢO DƯỠNG
            </Typography>
            <TextField
              select fullWidth size="small"
              variant="outlined"
              value={filterKQ}
              onChange={e => setFilterKQ(e.target.value)}
            >
              <MenuItem value=""><em>-- Tất cả kết quả --</em></MenuItem>
              {ketQuaList.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
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

export default BaoDuong;
