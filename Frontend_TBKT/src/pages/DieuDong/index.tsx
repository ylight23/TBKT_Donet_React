// ============================================================
// Điều động – Equipment Transfer/Mobilization Management
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

import SearchIcon           from '@mui/icons-material/Search';
import FileDownloadIcon     from '@mui/icons-material/FileDownload';
import LocalShippingIcon    from '@mui/icons-material/LocalShipping';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import PendingActionsIcon   from '@mui/icons-material/PendingActions';
import DoneAllIcon          from '@mui/icons-material/DoneAll';
import CancelIcon           from '@mui/icons-material/Cancel';

import { mockDieuDong, IDieuDong } from '../../data/mockTBData';
import { militaryColors }          from '../../theme';

// ── Màu trạng thái điều động ─────────────────────────────────
const ttColor: Record<string, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
  'Đã duyệt':     'info',
  'Chờ duyệt':    'warning',
  'Đã thực hiện': 'success',
  'Hủy':          'error',
};

const DieuDong: React.FC = () => {
  const theme = useTheme();
  const [search,  setSearch]  = useState('');
  const [filterTT, setFilterTT] = useState('');

  const ttList = useMemo(() => Array.from(new Set(mockDieuDong.map(d => d.trangThai))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockDieuDong.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donViCu, r.donViMoi, r.lyDo].some(v => v.toLowerCase().includes(q));
      const matchTT     = !filterTT || r.trangThai === filterTT;
      return matchSearch && matchTT;
    });
  }, [search, filterTT]);

  const stats = useMemo(() => ({
    total:     mockDieuDong.length,
    daDuyet:   mockDieuDong.filter(r => r.trangThai === 'Đã duyệt').length,
    choDuyet:  mockDieuDong.filter(r => r.trangThai === 'Chờ duyệt').length,
    daThucHien:mockDieuDong.filter(r => r.trangThai === 'Đã thực hiện').length,
    huy:       mockDieuDong.filter(r => r.trangThai === 'Hủy').length,
  }), []);

  const columns: GridColDef[] = [
    { field: 'id',           headerName: 'Mã phiếu ĐĐ',  width: 130,
      renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography> },
    { field: 'maTrangBi',    headerName: 'Mã trang bị',   width: 140 },
    { field: 'tenTrangBi',   headerName: 'Tên trang bị',  flex: 1, minWidth: 160 },
    { field: 'donViCu',      headerName: 'Đơn vị cũ',     flex: 1, minWidth: 150 },
    { field: 'donViMoi',     headerName: 'Đơn vị mới',    flex: 1, minWidth: 150 },
    { field: 'ngayDieuDong', headerName: 'Ngày điều động', width: 140 },
    { field: 'lyDo',         headerName: 'Lý do',         flex: 1, minWidth: 200 },
    { field: 'nguoiDuyet',   headerName: 'Người duyệt',   width: 200 },
    {
      field: 'trangThai', headerName: 'Trạng thái', width: 150,
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value} color={ttColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="text.primary">ĐIỀU ĐỘNG TRANG BỊ</Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý điều chuyển, điều động trang bị kỹ thuật giữa các đơn vị
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Tổng phiếu điều động', value: stats.total,      color: militaryColors.darkBlue, icon: <LocalShippingIcon /> },
          { label: 'Đã duyệt',            value: stats.daDuyet,     color: '#1565c0',               icon: <CheckCircleIcon /> },
          { label: 'Chờ duyệt',           value: stats.choDuyet,    color: militaryColors.warning,  icon: <PendingActionsIcon /> },
          { label: 'Đã thực hiện',        value: stats.daThucHien,  color: militaryColors.success,  icon: <DoneAllIcon /> },
          { label: 'Hủy bỏ',             value: stats.huy,          color: militaryColors.error,    icon: <CancelIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md key={i}>
            <Card elevation={2} sx={{ borderRadius: 2, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                  </Box>
                  {React.cloneElement(c.icon, { sx: { fontSize: 28, color: `${c.color}88` } })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bộ lọc */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={6} md={5}>
            <TextField
              size="small" fullWidth
              placeholder="Tìm kiếm mã, tên, đơn vị, lý do..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterTT} onChange={e => setFilterTT(e.target.value)}>
                <MenuItem value=""><em>Tất cả trạng thái</em></MenuItem>
                {ttList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<FileDownloadIcon />}
              sx={{ bgcolor: militaryColors.darkBlue, '&:hover': { bgcolor: militaryColors.midBlue }, textTransform: 'none' }}
              onClick={() => alert('[Giả lập] Xuất Excel điều động')}
            >
              Xuất Excel
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{mockDieuDong.length}</strong> phiếu
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

export default DieuDong;
