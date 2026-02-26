// ============================================================
// Chuyển cấp chất lượng – Quality Level Transfer Management
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
import Tooltip        from '@mui/material/Tooltip';
import Typography     from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme }   from '@mui/material/styles';

import SearchIcon        from '@mui/icons-material/Search';
import FileDownloadIcon  from '@mui/icons-material/FileDownload';
import StarRateIcon      from '@mui/icons-material/StarRate';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';

import { mockChuyenCap, IChuyenCap, ChatLuong } from '../../data/mockTBData';
import { militaryColors }                        from '../../theme';

// ── Màu cấp chất lượng ───────────────────────────────────────
const clColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]:       '#2e7d32',
  [ChatLuong.Kha]:       '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]:       '#c62828',
  [ChatLuong.HỏngHoc]:   '#6a1b9a',
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

const ChuyenCapChatLuong: React.FC = () => {
  const theme = useTheme();
  const [search,   setSearch]   = useState('');
  const [filterCu, setFilterCu] = useState('');
  const [filterMoi,setFilterMoi]= useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockChuyenCap.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donVi, r.lyDo, r.nguoiXacNhan].some(v => v.toLowerCase().includes(q));
      const matchCu     = !filterCu  || r.capCu  === filterCu;
      const matchMoi    = !filterMoi || r.capMoi  === filterMoi;
      return matchSearch && matchCu && matchMoi;
    });
  }, [search, filterCu, filterMoi]);

  const stats = useMemo(() => ({
    total:       mockChuyenCap.length,
    tangCap:     mockChuyenCap.filter(r => getTrend(r.capCu, r.capMoi) === 'up').length,
    giamCap:     mockChuyenCap.filter(r => getTrend(r.capCu, r.capMoi) === 'down').length,
  }), []);

  const columns: GridColDef[] = [
    { field: 'id',          headerName: 'Mã phiếu CC',   width: 130,
      renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography> },
    { field: 'maTrangBi',   headerName: 'Mã trang bị',   width: 140 },
    { field: 'tenTrangBi',  headerName: 'Tên trang bị',  flex: 1, minWidth: 160 },
    { field: 'donVi',       headerName: 'Đơn vị',        flex: 1, minWidth: 150 },
    {
      field: 'capCu', headerName: 'Cấp cũ', width: 130,
      renderCell: (p: GridRenderCellParams<IChuyenCap, ChatLuong>) => (
        <Chip
          label={p.value} size="small"
          sx={{ bgcolor: `${clColor[p.value!]}22`, color: clColor[p.value!], fontWeight: 600,
                border: `1px solid ${clColor[p.value!]}55` }}
        />
      ),
    },
    {
      field: 'trend', headerName: 'Xu hướng', width: 100, sortable: false, filterable: false,
      renderCell: (p: GridRenderCellParams<IChuyenCap>) => {
        const trend = getTrend(p.row.capCu, p.row.capMoi);
        return trend === 'up' ? <TrendingUpIcon color="success" /> :
               trend === 'down' ? <TrendingDownIcon color="error" /> :
               <TrendingFlatIcon color="action" />;
      },
    },
    {
      field: 'capMoi', headerName: 'Cấp mới', width: 130,
      renderCell: (p: GridRenderCellParams<IChuyenCap, ChatLuong>) => (
        <Chip
          label={p.value} size="small"
          sx={{ bgcolor: `${clColor[p.value!]}22`, color: clColor[p.value!], fontWeight: 600,
                border: `1px solid ${clColor[p.value!]}55` }}
        />
      ),
    },
    { field: 'ngayCapNhat',  headerName: 'Ngày cập nhật', width: 140 },
    { field: 'lyDo',         headerName: 'Lý do',         flex: 1, minWidth: 200 },
    { field: 'nguoiXacNhan', headerName: 'Người xác nhận', width: 200 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="text.primary">CHUYỂN CẤP CHẤT LƯỢNG</Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý việc điều chỉnh cấp chất lượng trang bị kỹ thuật
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Tổng phiếu chuyển cấp', value: stats.total,    color: militaryColors.darkBlue, icon: <StarRateIcon /> },
          { label: 'Tăng cấp chất lượng',   value: stats.tangCap,  color: militaryColors.success,  icon: <TrendingUpIcon /> },
          { label: 'Giảm cấp chất lượng',   value: stats.giamCap,  color: militaryColors.error,    icon: <TrendingDownIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={4} md={4} key={i}>
            <Card elevation={2} sx={{ borderRadius: 2, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h4" fontWeight={700} color={c.color}>{c.value}</Typography>
                  </Box>
                  {React.cloneElement(c.icon, { sx: { fontSize: 36, color: `${c.color}88` } })}
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
              <Select displayEmpty value={filterCu} onChange={e => setFilterCu(e.target.value)}>
                <MenuItem value=""><em>Cấp cũ</em></MenuItem>
                {Object.values(ChatLuong).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} md={2}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterMoi} onChange={e => setFilterMoi(e.target.value)}>
                <MenuItem value=""><em>Cấp mới</em></MenuItem>
                {Object.values(ChatLuong).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<FileDownloadIcon />}
              sx={{ bgcolor: militaryColors.darkBlue, '&:hover': { bgcolor: militaryColors.midBlue }, textTransform: 'none' }}
              onClick={() => alert('[Giả lập] Xuất Excel chuyển cấp')}
            >
              Xuất Excel
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{mockChuyenCap.length}</strong> phiếu
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

export default ChuyenCapChatLuong;
