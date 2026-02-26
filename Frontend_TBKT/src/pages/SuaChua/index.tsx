// ============================================================
// Sửa chữa – Repair Management
// Gồm: Kết quả sửa chữa + Trang bị kỹ thuật sửa chữa
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

import SearchIcon       from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import BuildIcon          from '@mui/icons-material/Build';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon         from '@mui/icons-material/Cancel';

import { mockSuaChua, ISuaChua } from '../../data/mockTBData';
import { militaryColors }        from '../../theme';

// ── Màu kết quả sửa chữa ─────────────────────────────────────
const kqColor: Record<string, 'success' | 'warning' | 'error'> = {
  'Hoàn thành':          'success',
  'Đang sửa':            'warning',
  'Không sửa được':      'error',
};

// ── Định dạng tiền ───────────────────────────────────────────
const fmtVND = (n: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// ── Columns chung ────────────────────────────────────────────
const buildColumns = (): GridColDef[] => [
  { field: 'id',          headerName: 'Mã phiếu SC',   width: 130,
    renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography> },
  { field: 'maTrangBi',   headerName: 'Mã trang bị',   width: 140 },
  { field: 'tenTrangBi',  headerName: 'Tên trang bị',  flex: 1, minWidth: 150 },
  { field: 'loai',        headerName: 'Loại',          width: 180 },
  { field: 'donVi',       headerName: 'Đơn vị',        flex: 1, minWidth: 150 },
  { field: 'loaiSuaChua', headerName: 'Cấp sửa chữa',  width: 170 },
  { field: 'donViSuaChua',headerName: 'Đơn vị SC',     width: 160 },
  {
    field: 'ketQua', headerName: 'Kết quả', width: 160,
    renderCell: (p: GridRenderCellParams) => (
      <Chip label={p.value} color={kqColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
    ),
  },
  { field: 'ngayBatDau',  headerName: 'Ngày bắt đầu',  width: 130 },
  { field: 'ngayKetThuc', headerName: 'Ngày kết thúc', width: 140 },
  {
    field: 'chiPhi', headerName: 'Chi phí (VNĐ)', width: 160, type: 'number',
    renderCell: (p: GridRenderCellParams) => (
      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
        {fmtVND(p.value as number)}
      </Typography>
    ),
  },
  { field: 'ghiChu', headerName: 'Ghi chú', flex: 1, minWidth: 150 },
];

// ── SuaChua main ─────────────────────────────────────────────
const SuaChua: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Number(searchParams.get('tab') || 0);
  const [tab,       setTab]       = useState(initialTab);
  const [search,    setSearch]    = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterKQ,   setFilterKQ]  = useState('');

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

  const loaiList = useMemo(() => Array.from(new Set(mockSuaChua.map(d => d.loaiSuaChua))), []);

  // Tab 0: tất cả | Tab 1: đang sửa | Tab 2: kết quả
  const sourceData: ISuaChua[] = useMemo(() => {
    if (tab === 1) return mockSuaChua.filter(r => r.ketQua === 'Đang sửa');
    if (tab === 2) return mockSuaChua.filter(r => r.ketQua === 'Hoàn thành');
    return mockSuaChua;
  }, [tab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sourceData.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donVi, r.donViSuaChua].some(v => v.toLowerCase().includes(q));
      const matchLoai   = !filterLoai || r.loaiSuaChua === filterLoai;
      const matchKQ     = !filterKQ   || r.ketQua      === filterKQ;
      return matchSearch && matchLoai && matchKQ;
    });
  }, [search, filterLoai, filterKQ, sourceData]);

  const stats = useMemo(() => ({
    total:      mockSuaChua.length,
    hoanthanh:  mockSuaChua.filter(r => r.ketQua === 'Hoàn thành').length,
    dangSua:    mockSuaChua.filter(r => r.ketQua === 'Đang sửa').length,
    khongSuaDuoc: mockSuaChua.filter(r => r.ketQua === 'Không sửa được').length,
    tongChiPhi: mockSuaChua.reduce((s, r) => s + r.chiPhi, 0),
  }), []);

  const columns = useMemo(buildColumns, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="primary.main">SỬA CHỮA TRANG BỊ</Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý công tác sửa chữa trang bị kỹ thuật các cấp
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Tổng phiếu SC',      value: stats.total,      color: militaryColors.darkBlue, icon: <BuildIcon /> },
          { label: 'Hoàn thành',          value: stats.hoanthanh,  color: militaryColors.success,  icon: <CheckCircleIcon /> },
          { label: 'Đang sửa chữa',       value: stats.dangSua,    color: militaryColors.warning,  icon: <HourglassEmptyIcon /> },
          { label: 'Không sửa được',      value: stats.khongSuaDuoc, color: militaryColors.error,  icon: <CancelIcon /> },
          { label: 'Tổng chi phí ước tính', value: fmtVND(stats.tongChiPhi),
            color: '#1565c0', icon: <BuildIcon />, fullWidth: true },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={c.fullWidth ? 12 : 3} key={i}>
            {c.fullWidth ? (
              <Card elevation={2} sx={{ borderRadius: 2, borderLeft: `5px solid ${c.color}` }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                      <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                    </Box>
                    {React.cloneElement(c.icon, { sx: { fontSize: 28, color: `${c.color}88` } })}
                  </Box>
                </CardContent>
              </Card>
            ) : (
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
            )}
          </Grid>
        ))}
      </Grid>

      {/* Tabs: Trang bị SC / Đang sửa / Kết quả */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px 8px 0 0', mb: 0 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
            '& .Mui-selected': { color: militaryColors.darkBlue },
            '& .MuiTabs-indicator': { bgcolor: militaryColors.darkBlue },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab label={`Tất cả (${mockSuaChua.length})`} />
          <Tab label={`Trang bị đang sửa chữa (${stats.dangSua})`} />
          <Tab label={`Kết quả sửa chữa (${stats.hoanthanh})`} />
        </Tabs>
      </Box>

      {/* Bộ lọc */}
      <Box sx={{ bgcolor: 'background.paper', p: 2, mb: 2, border: `1px solid ${theme.palette.divider}`, borderTop: 0 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              size="small" fullWidth
              placeholder="Tìm kiếm mã, tên, đơn vị..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
                <MenuItem value=""><em>Cấp sửa chữa</em></MenuItem>
                {loaiList.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterKQ} onChange={e => setFilterKQ(e.target.value)}>
                <MenuItem value=""><em>Kết quả</em></MenuItem>
                {Object.keys(kqColor).map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<FileDownloadIcon />}
              sx={{ bgcolor: militaryColors.darkBlue, '&:hover': { bgcolor: militaryColors.midBlue }, textTransform: 'none' }}
              onClick={() => alert('[Giả lập] Xuất Excel sửa chữa')}
            >
              Xuất Excel
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{sourceData.length}</strong> phiếu
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
            borderRadius: '0 0 8px 8px',
            '& .MuiDataGrid-columnHeaders': { bgcolor: militaryColors.darkBlue, color: '#fff', fontWeight: 700 },
            '& .MuiDataGrid-row:hover':     { bgcolor: `${militaryColors.navy}11` },
          }}
        />
      </Box>
    </Box>
  );
};

export default SuaChua;
