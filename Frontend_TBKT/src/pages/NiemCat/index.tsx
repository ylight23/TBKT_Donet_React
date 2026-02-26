// ============================================================
// Niêm cất – Equipment Storage/Archive Management
// Gồm: Trang bị KT niêm cất + Kết quả niêm cất
// ============================================================
import React, { useState, useMemo, useEffect } from 'react';
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
import Tab            from '@mui/material/Tab';
import Tabs           from '@mui/material/Tabs';
import TextField      from '@mui/material/TextField';
import Typography     from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme }   from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';

import SearchIcon             from '@mui/icons-material/Search';
import FileDownloadIcon       from '@mui/icons-material/FileDownload';
import InventoryIcon          from '@mui/icons-material/Inventory';
import LockIcon               from '@mui/icons-material/Lock';
import WarehouseIcon          from '@mui/icons-material/Warehouse';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

import { mockNiemCat, INiemCat } from '../../data/mockTBData';
import { militaryColors }        from '../../theme';

// ── Màu trạng thái niêm cất ──────────────────────────────────
const ttColor: Record<string, 'info' | 'success' | 'warning'> = {
  'Đang niêm cất':    'info',
  'Đã xuất kho':      'success',
  'Kiểm tra định kỳ': 'warning',
};

// ── Columns ──────────────────────────────────────────────────
const columns: GridColDef[] = [
  {
    field: 'id', headerName: 'Mã phiếu NC', width: 130,
    renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography>,
  },
  { field: 'maTrangBi',   headerName: 'Mã trang bị',   width: 140 },
  { field: 'tenTrangBi',  headerName: 'Tên trang bị',  flex: 1, minWidth: 150 },
  { field: 'donVi',       headerName: 'Đơn vị',        flex: 1, minWidth: 140 },
  { field: 'khoNiemCat',  headerName: 'Kho niêm cất',  width: 150 },
  { field: 'ngayNiemCat', headerName: 'Ngày niêm cất', width: 140 },
  {
    field: 'ngayXuat', headerName: 'Ngày xuất kho', width: 140,
    renderCell: (p: GridRenderCellParams) => (
      <Typography variant="body2">{p.value ?? '—'}</Typography>
    ),
  },
  {
    field: 'trangThai', headerName: 'Trạng thái', width: 160,
    renderCell: (p: GridRenderCellParams) => (
      <Chip
        label={p.value}
        color={ttColor[p.value as string] ?? 'default'}
        size="small"
        sx={{ fontWeight: 600 }}
      />
    ),
  },
  { field: 'ghiChu', headerName: 'Ghi chú', flex: 1, minWidth: 150 },
];

// ── NiemCat main ─────────────────────────────────────────────
const NiemCat: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Number(searchParams.get('tab') || 1);
  const [tab,       setTab]       = useState(initialTab);
  const [search,    setSearch]    = useState('');
  const [filterKho, setFilterKho] = useState('');
  const [filterTT,  setFilterTT]  = useState('');

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

  const khoList = useMemo(() => Array.from(new Set(mockNiemCat.map(d => d.khoNiemCat))), []);

  // Tab 1: Trang bị đang niêm cất (chưa xuất kho)
  // Tab 2: Kết quả niêm cất (đã xuất kho)
  const sourceData: INiemCat[] = useMemo(() => {
    if (tab === 2) return mockNiemCat.filter(r => r.trangThai === 'Đã xuất kho');
    return mockNiemCat.filter(r => r.trangThai !== 'Đã xuất kho');
  }, [tab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sourceData.filter(r => {
      const matchSearch = !q
        || [r.maTrangBi, r.tenTrangBi, r.donVi, r.khoNiemCat].some(v => v.toLowerCase().includes(q));
      const matchKho = !filterKho || r.khoNiemCat === filterKho;
      const matchTT  = !filterTT  || r.trangThai  === filterTT;
      return matchSearch && matchKho && matchTT;
    });
  }, [search, filterKho, filterTT, sourceData]);

  const stats = useMemo(() => ({
    dangNiem: mockNiemCat.filter(r => r.trangThai === 'Đang niêm cất').length,
    kiemTra:  mockNiemCat.filter(r => r.trangThai === 'Kiểm tra định kỳ').length,
    daXuat:   mockNiemCat.filter(r => r.trangThai === 'Đã xuất kho').length,
    total:    mockNiemCat.length,
  }), []);

  const ttList = tab === 2
    ? ['Đã xuất kho']
    : ['Đang niêm cất', 'Kiểm tra định kỳ'];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          NIÊM CẤT TRANG BỊ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý trang bị kỹ thuật đang trong trạng thái niêm cất bảo quản
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Tổng niêm cất',    value: stats.total,    color: militaryColors.darkBlue, icon: <InventoryIcon /> },
          { label: 'Đang niêm cất',    value: stats.dangNiem, color: militaryColors.navy,     icon: <LockIcon /> },
          { label: 'Kiểm tra định kỳ', value: stats.kiemTra,  color: militaryColors.warning,  icon: <WarehouseIcon /> },
          { label: 'Đã xuất kho',      value: stats.daXuat,   color: militaryColors.success,  icon: <AssignmentTurnedInIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card elevation={2} sx={{ borderRadius: 2, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                  </Box>
                  {React.cloneElement(c.icon as React.ReactElement<{ sx?: object }>, {
                    sx: { fontSize: 32, color: `${c.color}88` },
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px 8px 0 0' }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root':      { fontWeight: 600, textTransform: 'none' },
            '& .Mui-selected':     { color: militaryColors.darkBlue },
            '& .MuiTabs-indicator':{ bgcolor: militaryColors.darkBlue },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab
            value={1}
            icon={<LockIcon fontSize="small" />}
            iconPosition="start"
            label={`Trang bị KT niêm cất (${stats.dangNiem + stats.kiemTra})`}
          />
          <Tab
            value={2}
            icon={<AssignmentTurnedInIcon fontSize="small" />}
            iconPosition="start"
            label={`Kết quả niêm cất (${stats.daXuat})`}
          />
        </Tabs>
      </Box>

      {/* Bộ lọc */}
      <Box sx={{
        bgcolor: 'background.paper', p: 2, mb: 2,
        border: `1px solid ${theme.palette.divider}`, borderTop: 0,
      }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              size="small" fullWidth
              placeholder="Tìm kiếm mã, tên, đơn vị..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterKho} onChange={e => setFilterKho(e.target.value)}>
                <MenuItem value=""><em>Tất cả kho</em></MenuItem>
                {khoList.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterTT} onChange={e => setFilterTT(e.target.value)}>
                <MenuItem value=""><em>Trạng thái</em></MenuItem>
                {ttList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              sx={{
                bgcolor: militaryColors.darkBlue,
                '&:hover': { bgcolor: militaryColors.midBlue },
                textTransform: 'none',
              }}
              onClick={() => alert('[Giả lập] Xuất Excel niêm cất')}
            >
              Xuất Excel
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{sourceData.length}</strong> bản ghi
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={r => r.id}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
          sx={{
            borderRadius: '0 0 8px 8px',
            '& .MuiDataGrid-columnHeaders': { bgcolor: militaryColors.darkBlue, color: '#fff', fontWeight: 700 },
            '& .MuiDataGrid-row:hover':     { bgcolor: `${militaryColors.navy}11` },
          }}
        />
      </Box>
    </Box>
  );
};

export default NiemCat;
