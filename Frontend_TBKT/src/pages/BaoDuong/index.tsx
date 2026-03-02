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
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';


import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { mockBaoDuong, IBaoDuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu kết quả ─────────────────────────────────────────────
const ketQuaColor: Record<string, 'success' | 'warning' | 'error'> = {
  'Đạt tiêu chuẩn': 'success',
  'Cần theo dõi': 'warning',
  'Phát hiện lỗi': 'error',
};

const BaoDuong: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterKQ, setFilterKQ] = useState('');
  const [expanded, setExpanded] = useState(false);

  const loaiBDList = useMemo(() => Array.from(new Set(mockBaoDuong.map((d: { loaiBaoDuong: any; }) => d.loaiBaoDuong))), []);
  const ketQuaList = useMemo(() => Array.from(new Set(mockBaoDuong.map((d: { ketQua: any; }) => d.ketQua))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockBaoDuong.filter((r) => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donVi, r.nguoiThucHien].some(v => v.toLowerCase().includes(q));
      const matchLoai = !filterLoai || r.loaiBaoDuong === filterLoai;
      const matchKQ = !filterKQ || r.ketQua === filterKQ;
      return matchSearch && matchLoai && matchKQ;
    });
  }, [search, filterLoai, filterKQ]);

  const handleClear = () => {
    setSearch('');
    setFilterLoai('');
    setFilterKQ('');
  };

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; icon: React.ReactNode }[] = [];
    if (filterLoai) chips.push({ key: 'loai', label: `Loại: ${filterLoai}`, icon: <MiscellaneousServicesIcon fontSize="small" /> });
    if (filterKQ) chips.push({ key: 'kq', label: `Kết quả: ${filterKQ}`, icon: <CheckCircleIcon fontSize="small" /> });
    return chips;
  }, [filterLoai, filterKQ]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'loai') setFilterLoai('');
    if (key === 'kq') setFilterKQ('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    dat: mockBaoDuong.filter((r) => r.ketQua === 'Đạt tiêu chuẩn').length,
    canTheoDoi: mockBaoDuong.filter((r) => r.ketQua === 'Cần theo dõi').length,
    phatHienLoi: mockBaoDuong.filter((r) => r.ketQua === 'Phát hiện lỗi').length,
  }), []);

  const columns: GridColDef[] = [
    {
      field: 'id', headerName: 'Mã phiếu BD', width: 130, align: 'center', headerAlign: 'center',
      renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>
    },
    { field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center' },
    { field: 'tenTrangBi', headerName: 'Tên trang bị', flex: 1, minWidth: 160, align: 'center', headerAlign: 'center' },
    { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
    { field: 'loaiBaoDuong', headerName: 'Loại bảo dưỡng', width: 160, align: 'center', headerAlign: 'center' },
    { field: 'ngayBaoDuong', headerName: 'Ngày BD', width: 120, align: 'center', headerAlign: 'center' },
    { field: 'nguoiThucHien', headerName: 'Người thực hiện', width: 180, align: 'center', headerAlign: 'center' },
    {
      field: 'ketQua', headerName: 'Kết quả', width: 140, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value} color={ketQuaColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
    { field: 'ghiChu', headerName: 'Ghi chú', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
  ];

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'baoduong-filter-popover' : undefined;

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
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
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Tổng phiếu bảo dưỡng', value: mockBaoDuong.length, color: militaryColors.navy, icon: <MiscellaneousServicesIcon /> },
          { label: 'Đạt tiêu chuẩn', value: stats.dat, color: militaryColors.success, icon: <CheckCircleIcon /> },
          { label: 'Cần theo dõi', value: stats.canTheoDoi, color: militaryColors.warning, icon: <WarningAmberIcon /> },
          { label: 'Phát hiện lỗi', value: stats.phatHienLoi, color: militaryColors.error, icon: <ErrorOutlineIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                '&:after': {
                  content: '""', position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: c.color
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</Typography>
                    <Typography variant="h4" fontWeight={800} color={c.color} sx={{ mt: 0.5 }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${c.color}15`, color: c.color }}>
                    {React.cloneElement(c.icon, { sx: { fontSize: 32 } } as any)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filter Panel ────────────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: theme.palette.primary.light,
            boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.06)',
          }
        }}
      >
        <CardContent sx={{ p: '12px 16px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Tìm kiếm phiếu BD theo mã, tên trang bị, đơn vị, người thực hiện..."
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {search && (
                        <IconButton size="small" onClick={() => setSearch('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )}
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
                      <Tooltip title="Bộ lọc nâng cao">
                        <Button
                          size="small"
                          onClick={handleOpenPopover}
                          variant="text"
                          color={activeFilterCount > 0 ? "primary" : "inherit"}
                          startIcon={<FilterAltIcon fontSize="small" />}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            borderRadius: 2,
                            px: 1.5,
                            minWidth: 'auto',
                            position: 'relative',
                            bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}15` : 'transparent',
                            '&:hover': {
                              bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}25` : theme.palette.action.hover
                            }
                          }}
                        >
                          Nhấn bộ lọc tìm kiếm
                          {activeFilterCount > 0 && (
                            <Box sx={{
                              position: 'absolute', top: 4, right: 4,
                              width: 6, height: 6, bgcolor: 'error.main',
                              borderRadius: '50%', border: `2px solid ${theme.palette.background.paper}`
                            }} />
                          )}
                        </Button>
                      </Tooltip>
                    </Stack>
                  </InputAdornment>
                )
              }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: theme.palette.primary.light },
                  '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  transition: 'all 0.2s',
                }
              }}
            />

            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={() => alert('[Giả lập] Xuất Excel bảo dưỡng')}
              sx={{
                borderRadius: 3, px: 3.5, height: 40,
                textTransform: 'none', fontWeight: 700,
                boxShadow: `0 4px 14px ${theme.palette.primary.main}44`,
                '&:hover': { boxShadow: `0 6px 20px ${theme.palette.primary.main}66` }
              }}
            >
              Xuất Excel
            </Button>
          </Box>

          {activeFilters.length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {activeFilters.map((f) => (
                <Chip
                  key={f.key}
                  icon={React.cloneElement(f.icon as React.ReactElement<any>, { sx: { fontSize: '14px !important' } })}
                  label={f.label}
                  size="small"
                  variant="outlined"
                  onDelete={() => handleRemoveFilter(f.key)}
                  sx={{ borderRadius: 1.5, fontWeight: 600, height: 24, fontSize: '0.75rem' }}
                />
              ))}
              <Button
                variant="text"
                size="small"
                onClick={handleClear}
                sx={{ ml: 0.5, textTransform: 'none', fontWeight: 700, p: 0, height: 24, minWidth: 'auto', fontSize: '0.75rem' }}
              >
                Xóa tất cả
              </Button>
            </Box>
          )}

          <Popover
            id={id}
            open={open}
            anchorEl={anchorEl}
            onClose={handleClosePopover}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1.5,
                p: 3,
                width: 520,
                borderRadius: 4,
                boxShadow: theme.palette.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.7)' : '0 16px 48px rgba(0,0,0,0.15)',
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'visible',
                '&:before': {
                  content: '""',
                  position: 'absolute', top: 0, right: 24,
                  width: 12, height: 12, bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                }
              }
            }}
          >
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="primary" sx={{ lineHeight: 1 }}>
                  Lọc phiếu nâng cao
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tinh chỉnh danh sách bảo dưỡng theo tiêu chí cụ thể
                </Typography>
              </Box>
              <Chip
                label={`Đã chọn ${activeFilterCount}`}
                size="small" color="primary" variant="filled"
                sx={{ fontWeight: 700, visibility: activeFilterCount > 0 ? 'visible' : 'hidden', borderRadius: 1.5 }}
              />
            </Box>

            {activeFilters.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                {activeFilters.map((f) => (
                  <Chip
                    key={f.key}
                    label={f.label}
                    size="small"
                    onDelete={() => handleRemoveFilter(f.key)}
                    sx={{ borderRadius: 1, height: 22, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            )}

            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  LOẠI BẢO DƯỠNG
                </Typography>
                <TextField
                  select fullWidth size="small"
                  value={filterLoai}
                  onChange={e => setFilterLoai(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value=""><em>-- Tất cả loại --</em></MenuItem>
                  {loaiBDList.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  KẾT QUẢ KIỂM TRA
                </Typography>
                <TextField
                  select fullWidth size="small"
                  value={filterKQ}
                  onChange={e => setFilterKQ(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value=""><em>-- Tất cả kết quả --</em></MenuItem>
                  {ketQuaList.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  ĐƠN VỊ CÔNG TÁC
                </Typography>
                <TextField
                  fullWidth size="small"
                  placeholder="Chọn đơn vị công tác..."
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><BusinessIcon fontSize="small" color="action" /></InputAdornment>,
                    sx: { borderRadius: 2 }
                  }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined" color="inherit" onClick={handleClear}
                sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3 }}
              >
                Thiết lập lại
              </Button>
              <Button
                variant="contained" color="primary" onClick={handleClosePopover}
                sx={{ borderRadius: 1.5, px: 5, textTransform: 'none', fontWeight: 700 }}
              >
                Áp dụng
              </Button>
            </Box>
          </Popover>
        </CardContent>
      </Card>

      <Box
        sx={{
          height: {
            xs: 500,
            sm: 550,
            md: 'calc(100vh - 350px)', // Co giãn theo chiều cao màn hình cho máy tính xách tay 12-14 inch
          },
          minHeight: 450,
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: 0,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={r => r.id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
        // density, rowHeight, columnHeaderHeight, disableRowSelectionOnClick được lấy từ theme.ts
        />
      </Box>
    </Box>
  );
};

export default BaoDuong;
