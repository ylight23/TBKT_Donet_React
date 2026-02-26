// ============================================================
// Bảo dưỡng – Maintenance Management
// ============================================================
import React, { useState, useMemo } from 'react';
import Box            from '@mui/material/Box';
import Button         from '@mui/material/Button';
import Card           from '@mui/material/Card';
import CardContent    from '@mui/material/CardContent';
import Chip           from '@mui/material/Chip';
import Divider        from '@mui/material/Divider';
import FormControl    from '@mui/material/FormControl';
import Grid           from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem       from '@mui/material/MenuItem';
import Select         from '@mui/material/Select';
import TextField      from '@mui/material/TextField';
import Typography     from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme }   from '@mui/material/styles';

import SearchIcon         from '@mui/icons-material/Search';
import FileDownloadIcon   from '@mui/icons-material/FileDownload';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import WarningAmberIcon   from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon   from '@mui/icons-material/ErrorOutline';

import { mockBaoDuong, IBaoDuong } from '../../data/mockTBData';
import { militaryColors }          from '../../theme';

// ── Màu kết quả ─────────────────────────────────────────────
const ketQuaColor: Record<string, 'success' | 'warning' | 'error'> = {
  'Đạt tiêu chuẩn':  'success',
  'Cần theo dõi':     'warning',
  'Phát hiện lỗi':    'error',
};

const BaoDuong: React.FC = () => {
  const theme = useTheme();
  const [search,    setSearch]    = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterKQ,   setFilterKQ]  = useState('');

  const loaiBDList  = useMemo(() => Array.from(new Set(mockBaoDuong.map(d => d.loaiBaoDuong))), []);
  const ketQuaList  = useMemo(() => Array.from(new Set(mockBaoDuong.map(d => d.ketQua))),      []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockBaoDuong.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donVi, r.nguoiThucHien].some(v => v.toLowerCase().includes(q));
      const matchLoai   = !filterLoai || r.loaiBaoDuong === filterLoai;
      const matchKQ     = !filterKQ   || r.ketQua       === filterKQ;
      return matchSearch && matchLoai && matchKQ;
    });
  }, [search, filterLoai, filterKQ]);

  const stats = useMemo(() => ({
    dat:        mockBaoDuong.filter(r => r.ketQua === 'Đạt tiêu chuẩn').length,
    canTheoDoi: mockBaoDuong.filter(r => r.ketQua === 'Cần theo dõi').length,
    phatHienLoi:mockBaoDuong.filter(r => r.ketQua === 'Phát hiện lỗi').length,
  }), []);

  const columns: GridColDef[] = [
    { field: 'id',            headerName: 'Mã phiếu BD',   width: 130,
      renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography> },
    { field: 'maTrangBi',     headerName: 'Mã trang bị',   width: 140 },
    { field: 'tenTrangBi',    headerName: 'Tên trang bị',  flex: 1, minWidth: 160 },
    { field: 'donVi',         headerName: 'Đơn vị',        flex: 1, minWidth: 150 },
    { field: 'loaiBaoDuong',  headerName: 'Loại bảo dưỡng', width: 160 },
    { field: 'ngayBaoDuong',  headerName: 'Ngày BD',       width: 120 },
    { field: 'nguoiThucHien', headerName: 'Người thực hiện', width: 180 },
    {
      field: 'ketQua', headerName: 'Kết quả', width: 140,
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value} color={ketQuaColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    { field: 'ghiChu', headerName: 'Ghi chú', flex: 1, minWidth: 150 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="primary.main">BẢO DƯỠNG TRANG BỊ</Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý công tác bảo dưỡng định kỳ và đột xuất trang bị kỹ thuật
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Tổng phiếu bảo dưỡng',  value: mockBaoDuong.length, color: militaryColors.darkBlue, icon: <MiscellaneousServicesIcon /> },
          { label: 'Đạt tiêu chuẩn',         value: stats.dat,          color: militaryColors.success,  icon: <CheckCircleIcon /> },
          { label: 'Cần theo dõi',            value: stats.canTheoDoi,   color: militaryColors.warning,  icon: <WarningAmberIcon /> },
          { label: 'Phát hiện lỗi',           value: stats.phatHienLoi,  color: militaryColors.error,    icon: <ErrorOutlineIcon /> },
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

      {/* Bộ lọc */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              size="small" fullWidth placeholder="Tìm kiếm mã, tên, đơn vị..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
                <MenuItem value=""><em>Loại bảo dưỡng</em></MenuItem>
                {loaiBDList.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterKQ} onChange={e => setFilterKQ(e.target.value)}>
                <MenuItem value=""><em>Kết quả</em></MenuItem>
                {ketQuaList.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained" startIcon={<FileDownloadIcon />}
              sx={{ bgcolor: militaryColors.darkBlue, '&:hover': { bgcolor: militaryColors.midBlue }, textTransform: 'none' }}
              onClick={() => alert('[Giả lập] Xuất Excel bảo dưỡng')}
            >
              Xuất Excel
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{mockBaoDuong.length}</strong> phiếu
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
            '& .MuiDataGrid-row:hover':     { bgcolor: `${militaryColors.navy}11` },
          }}
        />
      </Box>
    </Box>
  );
};

export default BaoDuong;
