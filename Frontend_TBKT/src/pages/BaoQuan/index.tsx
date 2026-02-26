// ============================================================
// Bảo quản – Equipment Preservation Management
// ============================================================
import React, { useState, useMemo } from 'react';
import Box            from '@mui/material/Box';
import Button         from '@mui/material/Button';
import Card           from '@mui/material/Card';
import CardContent    from '@mui/material/CardContent';
import Chip           from '@mui/material/Chip';
import Divider        from '@mui/material/Divider';
import Grid           from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import TextField      from '@mui/material/TextField';
import Typography     from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme }   from '@mui/material/styles';

import SearchIcon         from '@mui/icons-material/Search';
import FileDownloadIcon   from '@mui/icons-material/FileDownload';
import InventoryIcon      from '@mui/icons-material/Inventory';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';

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
  kyBaoQuan:   kyBaoQuan[i % kyBaoQuan.length],
  ngayBaoQuan: `${2024 + Math.floor(i / 20)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  nguoiPhuTrach: `Thiếu úy Trần Văn ${String.fromCharCode(65 + (i % 26))}`,
  tinhTrangBQ: i % 4 === 0 ? 'Cần kiểm tra' : i % 4 === 1 ? 'Đạt yêu cầu' : i % 4 === 2 ? 'Vừa thực hiện' : 'Chưa kiểm tra',
}));

const BaoQuan: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? baoQuanRows
      : baoQuanRows.filter(r =>
          [r.maTrangBi, r.ten, r.donVi, r.nguoiPhuTrach].some(v => v.toLowerCase().includes(q)));
  }, [search]);

  const stats = useMemo(() => ({
    datYeuCau:    baoQuanRows.filter(r => r.tinhTrangBQ === 'Đạt yêu cầu').length,
    canKiemTra:   baoQuanRows.filter(r => r.tinhTrangBQ === 'Cần kiểm tra').length,
    chuaKiemTra:  baoQuanRows.filter(r => r.tinhTrangBQ === 'Chưa kiểm tra').length,
  }), []);

  const columns: GridColDef[] = [
    { field: 'maTrangBi',     headerName: 'Mã trang bị',   width: 140,
      renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography> },
    { field: 'ten',           headerName: 'Tên trang bị',  flex: 1, minWidth: 160 },
    { field: 'loai',          headerName: 'Loại',          width: 180 },
    { field: 'donVi',         headerName: 'Đơn vị',        flex: 1, minWidth: 150 },
    { field: 'kyBaoQuan',     headerName: 'Kỳ bảo quản',   width: 130 },
    { field: 'ngayBaoQuan',   headerName: 'Ngày bảo quản', width: 140 },
    { field: 'nguoiPhuTrach', headerName: 'Người phụ trách', width: 200 },
    {
      field: 'tinhTrangBQ', headerName: 'Tình trạng', width: 160,
      renderCell: (p: GridRenderCellParams) => {
        const color =
          p.value === 'Đạt yêu cầu'   ? 'success' :
          p.value === 'Cần kiểm tra'   ? 'warning' :
          p.value === 'Chưa kiểm tra'  ? 'error'   : 'info';
        return <Chip label={p.value} color={color as any} size="small" sx={{ fontWeight: 600 }} />;
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="primary.main">BẢO QUẢN TRANG BỊ</Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý công tác bảo quản định kỳ trang bị kỹ thuật
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Tổng cần bảo quản', value: baoQuanRows.length, color: militaryColors.darkBlue, icon: <InventoryIcon /> },
          { label: 'Đạt yêu cầu',       value: stats.datYeuCau,   color: militaryColors.success,  icon: <CheckCircleIcon /> },
          { label: 'Cần kiểm tra',       value: stats.canKiemTra,  color: militaryColors.warning,  icon: <WarningAmberIcon /> },
          { label: 'Chưa kiểm tra',      value: stats.chuaKiemTra, color: militaryColors.error,    icon: <WarningAmberIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card elevation={2} sx={{ borderRadius: 2, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                  </Box>
                  {React.cloneElement(c.icon, { sx: { fontSize: 32, color: `${c.color}88` } })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter + Export */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              size="small" fullWidth placeholder="Tìm kiếm..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={7} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<FileDownloadIcon />}
              sx={{ bgcolor: militaryColors.darkBlue, '&:hover': { bgcolor: militaryColors.midBlue }, textTransform: 'none' }}
              onClick={() => alert('[Giả lập] Xuất Excel bảo quản')}
            >
              Xuất Excel
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{baoQuanRows.length}</strong> bản ghi
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={filtered} columns={columns} getRowId={r => r.id}
          pageSizeOptions={[10, 25, 50]} disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
          sx={{
            borderRadius: 2,
            '& .MuiDataGrid-columnHeaders': { bgcolor: militaryColors.darkBlue, color: '#fff', fontWeight: 700 },
            '& .MuiDataGrid-row:hover': { bgcolor: `${militaryColors.navy}11` },
          }}
        />
      </Box>
    </Box>
  );
};

export default BaoQuan;
