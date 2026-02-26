// ============================================================
// TrangBiDataGrid – Bảng dữ liệu trang bị kỹ thuật dùng chung
// Dùng cho cả Nhóm 1 và Nhóm 2
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import Box                      from '@mui/material/Box';
import Button                   from '@mui/material/Button';
import Chip                     from '@mui/material/Chip';
import Divider                  from '@mui/material/Divider';
import FormControl              from '@mui/material/FormControl';
import Grid                     from '@mui/material/GridLegacy';
import IconButton               from '@mui/material/IconButton';
import InputAdornment           from '@mui/material/InputAdornment';
import MenuItem                 from '@mui/material/MenuItem';
import Select                   from '@mui/material/Select';
import TextField                from '@mui/material/TextField';
import Tooltip                  from '@mui/material/Tooltip';
import Typography               from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme }             from '@mui/material/styles';

// Icons
import SearchIcon               from '@mui/icons-material/Search';
import FileDownloadIcon         from '@mui/icons-material/FileDownload';
import VisibilityIcon           from '@mui/icons-material/Visibility';
import EditIcon                 from '@mui/icons-material/Edit';
import FilterAltIcon            from '@mui/icons-material/FilterAlt';
import ClearIcon                from '@mui/icons-material/Clear';

import { ITrangBi, TrangThaiTrangBi, ChatLuong, donViList } from '../../data/mockTBData';
import { militaryColors }       from '../../theme';

// ── Màu trạng thái trang bị ──────────────────────────────────
const trangThaiColor: Record<TrangThaiTrangBi, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  [TrangThaiTrangBi.HoatDong]:   'success',
  [TrangThaiTrangBi.SuaChua]:    'warning',
  [TrangThaiTrangBi.NiemCat]:    'info',
  [TrangThaiTrangBi.ChoThanhLy]: 'error',
  [TrangThaiTrangBi.DaThanhLy]:  'default',
};

// ── Màu chất lượng ───────────────────────────────────────────
const chatLuongColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]:       '#2e7d32',
  [ChatLuong.Kha]:       '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]:       '#c62828',
  [ChatLuong.HỏngHoc]:   '#6a1b9a',
};

// ── Props component ──────────────────────────────────────────
interface TrangBiDataGridProps {
  title:    string;
  subtitle: string;
  data:     ITrangBi[];
}

// ── TrangBiDataGrid ──────────────────────────────────────────
const TrangBiDataGrid: React.FC<TrangBiDataGridProps> = ({ title, subtitle, data }) => {
  const theme = useTheme();

  // State bộ lọc
  const [search,     setSearch]     = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterTT,   setFilterTT]   = useState('');
  const [filterDV,   setFilterDV]   = useState('');

  // Lấy danh sách loại duy nhất từ data
  const loaiList = useMemo(
    () => Array.from(new Set(data.map(d => d.loai))).sort(),
    [data],
  );

  // Xóa toàn bộ bộ lọc
  const handleClearFilter = useCallback(() => {
    setSearch('');
    setFilterLoai('');
    setFilterTT('');
    setFilterDV('');
  }, []);

  // Lọc dữ liệu theo các điều kiện
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter(row => {
      const matchSearch = !q || [
        row.maTrangBi, row.ten, row.loai, row.serial, row.mac, row.donVi,
      ].some(v => v.toLowerCase().includes(q));
      const matchLoai = !filterLoai || row.loai       === filterLoai;
      const matchTT   = !filterTT   || row.trangThai  === filterTT;
      const matchDV   = !filterDV   || row.donVi      === filterDV;
      return matchSearch && matchLoai && matchTT && matchDV;
    });
  }, [data, search, filterLoai, filterTT, filterDV]);

  // Giả lập export Excel
  const handleExport = useCallback(() => {
    alert(`[Giả lập] Xuất ${filtered.length} bản ghi ra Excel`);
  }, [filtered.length]);

  // ── Định nghĩa cột DataGrid ──────────────────────────────
  const columns: GridColDef[] = [
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} color="primary">
          {p.value}
        </Typography>
      ),
    },
    { field: 'ten',   headerName: 'Tên trang bị',  flex: 1, minWidth: 160 },
    { field: 'loai',  headerName: 'Loại',           width: 190 },
    { field: 'serial',headerName: 'Serial',         width: 160 },
    {
      field: 'mac', headerName: 'MAC Address', width: 155,
      renderCell: (p) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
          {p.value}
        </Typography>
      ),
    },
    { field: 'donVi', headerName: 'Đơn vị',         flex: 1, minWidth: 160 },
    {
      field: 'trangThai', headerName: 'Trạng thái', width: 150,
      renderCell: (p: GridRenderCellParams<ITrangBi, TrangThaiTrangBi>) => (
        <Chip
          label={p.value}
          color={trangThaiColor[p.value!] ?? 'default'}
          size="small"
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: 'chatLuong', headerName: 'Chất lượng', width: 130,
      renderCell: (p: GridRenderCellParams<ITrangBi, ChatLuong>) => (
        <Chip
          label={p.value}
          size="small"
          sx={{
            bgcolor:    `${chatLuongColor[p.value!]}22`,
            color:      chatLuongColor[p.value!],
            fontWeight: 600,
            fontSize:   11,
            border:     `1px solid ${chatLuongColor[p.value!]}44`,
          }}
        />
      ),
    },
    { field: 'nienHan',    headerName: 'Niên hạn (năm)', type: 'number', width: 130 },
    {
      field: 'actions', headerName: 'Thao tác', width: 110, sortable: false, filterable: false,
      renderCell: (p: GridRenderCellParams<ITrangBi>) => (
        <Box display="flex" gap={0.5}>
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              onClick={() => alert(`Xem: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.navy }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              onClick={() => alert(`Sửa: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.warning }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const hasFilters = !!(search || filterLoai || filterTT || filterDV);

  return (
    <Box sx={{ p: 3 }}>
      {/* Tiêu đề */}
      <Box mb={2}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* ── Bộ lọc ──────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor:      'background.paper',
          borderRadius: 2,
          p:            2,
          mb:           2,
          border:       `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={1.5}>
          <FilterAltIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={600}>Bộ lọc & Tìm kiếm</Typography>
          {hasFilters && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearFilter}
              sx={{ ml: 'auto', textTransform: 'none' }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </Box>

        <Grid container spacing={1.5}>
          {/* Ô tìm kiếm */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              size="small"
              fullWidth
              placeholder="Tìm kiếm mã, tên, serial, MAC, đơn vị..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          </Grid>

          {/* Lọc theo loại */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <Select
                displayEmpty
                value={filterLoai}
                onChange={e => setFilterLoai(e.target.value)}
              >
                <MenuItem value=""><em>Tất cả loại</em></MenuItem>
                {loaiList.map(l => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Lọc theo trạng thái */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <Select
                displayEmpty
                value={filterTT}
                onChange={e => setFilterTT(e.target.value)}
              >
                <MenuItem value=""><em>Tất cả trạng thái</em></MenuItem>
                {Object.values(TrangThaiTrangBi).map(tt => (
                  <MenuItem key={tt} value={tt}>{tt}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Lọc theo đơn vị */}
          <Grid item xs={12} sm={6} md={2}>
            <FormControl size="small" fullWidth>
              <Select
                displayEmpty
                value={filterDV}
                onChange={e => setFilterDV(e.target.value)}
              >
                <MenuItem value=""><em>Tất cả đơn vị</em></MenuItem>
                {donViList.slice(0, 15).map(d => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Dòng tóm tắt kết quả */}
        <Box mt={1.2} display="flex" alignItems="center" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Hiển thị <strong>{filtered.length}</strong> / <strong>{data.length}</strong> bản ghi
          </Typography>
        </Box>
      </Box>

      {/* ── Toolbar: Export ─────────────────────────────────── */}
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          sx={{
            bgcolor: militaryColors.darkBlue,
            '&:hover': { bgcolor: militaryColors.midBlue },
            textTransform: 'none',
          }}
        >
          Xuất Excel
        </Button>
      </Box>

      {/* ── DataGrid ─────────────────────────────────────────── */}
      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={row => row.id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
          disableRowSelectionOnClick
          sx={{
            borderRadius: 2,
            '& .MuiDataGrid-columnHeaders': {
              bgcolor:    militaryColors.darkBlue,
              color:      '#ffffff',
              fontWeight: 700,
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: `${militaryColors.navy}11`,
            },
            '& .MuiDataGrid-row:nth-of-type(even)': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default TrangBiDataGrid;
