// ============================================================
// Tình trạng kỹ thuật – Technical Status Overview
// ============================================================
import React, { useState, useMemo } from 'react';
import Box               from '@mui/material/Box';
import Card              from '@mui/material/Card';
import CardContent       from '@mui/material/CardContent';
import Chip              from '@mui/material/Chip';
import Divider           from '@mui/material/Divider';
import FormControl       from '@mui/material/FormControl';
import Grid              from '@mui/material/GridLegacy';
import InputAdornment    from '@mui/material/InputAdornment';
import LinearProgress    from '@mui/material/LinearProgress';
import MenuItem          from '@mui/material/MenuItem';
import Select            from '@mui/material/Select';
import TextField         from '@mui/material/TextField';
import Typography        from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme }      from '@mui/material/styles';

import SearchIcon        from '@mui/icons-material/Search';
import VerifiedIcon      from '@mui/icons-material/Verified';
import WarningAmberIcon  from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon  from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon  from '@mui/icons-material/InfoOutlined';

import {
  mockTrangBiNhom1,
  mockTrangBiNhom2,
  ChatLuong,
  TrangThaiTrangBi,
  ITrangBi,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Gộp tất cả trang bị ──────────────────────────────────────
const allTrangBi: ITrangBi[] = [...mockTrangBiNhom1, ...mockTrangBiNhom2];

// ── Màu chất lượng ──────────────────────────────────────────
const clColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]:       '#2e7d32',
  [ChatLuong.Kha]:       '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]:       '#c62828',
  [ChatLuong.HỏngHoc]:   '#6a1b9a',
};

// ── Card tóm tắt chất lượng ──────────────────────────────────
interface SummaryCardProps {
  label:    string;
  count:    number;
  total:    number;
  color:    string;
  icon:     React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, count, total, color, icon }) => {
  const pct = Math.round((count / total) * 100);
  return (
    <Card elevation={2} sx={{ borderRadius: 2, borderLeft: `5px solid ${color}` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { color, fontSize: 22 } })}
        </Box>
        <Typography variant="h5" fontWeight={700} color={color}>{count}</Typography>
        <Typography variant="caption" color="text.secondary">{pct}% tổng trang bị</Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: `${color}22`,
            '& .MuiLinearProgress-bar': { bgcolor: color } }}
        />
      </CardContent>
    </Card>
  );
};

// ── Tình trạng kỹ thuật ──────────────────────────────────────
const TinhTrangKyThuat: React.FC = () => {
  const theme   = useTheme();
  const total   = allTrangBi.length;
  const [search, setSearch] = useState('');
  const [filterCL, setFilterCL] = useState('');

  // Tính số lượng theo chất lượng
  const count = useMemo(() => ({
    tot:       allTrangBi.filter(t => t.chatLuong === ChatLuong.Tot).length,
    kha:       allTrangBi.filter(t => t.chatLuong === ChatLuong.Kha).length,
    trungBinh: allTrangBi.filter(t => t.chatLuong === ChatLuong.TrungBinh).length,
    xau:       allTrangBi.filter(t => t.chatLuong === ChatLuong.Xau).length,
    hong:      allTrangBi.filter(t => t.chatLuong === ChatLuong.HỏngHoc).length,
  }), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTrangBi.filter(row => {
      const matchSearch = !q || [row.maTrangBi, row.ten, row.donVi].some(v => v.toLowerCase().includes(q));
      const matchCL     = !filterCL || row.chatLuong === filterCL;
      return matchSearch && matchCL;
    });
  }, [search, filterCL]);

  const columns: GridColDef[] = [
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140,
      renderCell: p => <Typography variant="body2" fontWeight={600} color="primary">{p.value}</Typography>,
    },
    { field: 'ten',   headerName: 'Tên trang bị', flex: 1, minWidth: 160 },
    { field: 'loai',  headerName: 'Loại',          width: 200 },
    { field: 'donVi', headerName: 'Đơn vị',        flex: 1, minWidth: 150 },
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
                 p.value === TrangThaiTrangBi.SuaChua  ? 'warning' : 'default'}
        />
      ),
    },
    { field: 'soLanSuaChua', headerName: 'Số lần SC', type: 'number', width: 110 },
    { field: 'nienHan',      headerName: 'Niên hạn (năm)', type: 'number', width: 130 },
    { field: 'namSuDung',    headerName: 'Năm sử dụng',    type: 'number', width: 120 },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="primary.main">TÌNH TRẠNG KỸ THUẬT</Typography>
        <Typography variant="body2" color="text.secondary">
          Tổng hợp chất lượng trang bị kỹ thuật theo cấp độ
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Thẻ tóm tắt */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng TỐT"      count={count.tot}       total={total} color={clColor[ChatLuong.Tot]}       icon={<VerifiedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng KHÁ"      count={count.kha}       total={total} color={clColor[ChatLuong.Kha]}       icon={<InfoOutlinedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng TRUNG BÌNH" count={count.trungBinh} total={total} color={clColor[ChatLuong.TrungBinh]} icon={<WarningAmberIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng XẤU"      count={count.xau}       total={total} color={clColor[ChatLuong.Xau]}       icon={<ErrorOutlineIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="HỎNG HÓC"            count={count.hong}      total={total} color={clColor[ChatLuong.HỏngHoc]}   icon={<ErrorOutlineIcon />} />
        </Grid>
      </Grid>

      {/* Filter */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 2, mb: 2, border: `1px solid ${theme.palette.divider}` }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={8} md={6}>
            <TextField
              size="small" fullWidth
              placeholder="Tìm kiếm mã, tên, đơn vị..."
              value={search} onChange={e => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <FormControl size="small" fullWidth>
              <Select displayEmpty value={filterCL} onChange={e => setFilterCL(e.target.value)}>
                <MenuItem value=""><em>Tất cả chất lượng</em></MenuItem>
                {Object.values(ChatLuong).map(cl => <MenuItem key={cl} value={cl}>{cl}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Hiển thị <strong>{filtered.length}</strong> / <strong>{total}</strong> bản ghi
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* DataGrid */}
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

export default TinhTrangKyThuat;
