// ============================================================
// Điều động – Equipment Transfer/Mobilization Management
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
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { mockDieuDong, IDieuDong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu trạng thái điều động ─────────────────────────────────
const ttColor: Record<string, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
  'Đã duyệt': 'info',
  'Chờ duyệt': 'warning',
  'Đã thực hiện': 'success',
  'Hủy': 'error',
};

const DieuDong: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterTT, setFilterTT] = useState('');
  const [expanded, setExpanded] = useState(false);

  const ttList = useMemo(() => Array.from(new Set(mockDieuDong.map(d => d.trangThai))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockDieuDong.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donViCu, r.donViMoi, r.lyDo].some(v => v.toLowerCase().includes(q));
      const matchTT = !filterTT || r.trangThai === filterTT;
      return matchSearch && matchTT;
    });
  }, [search, filterTT]);

  const handleClear = () => {
    setSearch('');
    setFilterTT('');
  };

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterTT) chips.push({ key: 'tt', label: `Trạng thái: ${filterTT}`, icon: <PendingActionsIcon fontSize="small" /> });
    return chips;
  }, [filterTT]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'tt') setFilterTT('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    total: mockDieuDong.length,
    daDuyet: mockDieuDong.filter(r => r.trangThai === 'Đã duyệt').length,
    choDuyet: mockDieuDong.filter(r => r.trangThai === 'Chờ duyệt').length,
    daThucHien: mockDieuDong.filter(r => r.trangThai === 'Đã thực hiện').length,
    huy: mockDieuDong.filter(r => r.trangThai === 'Hủy').length,
  }), []);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'dieudong-filter-popover' : undefined;

  const columns: GridColDef[] = [
    {
      field: 'id', headerName: 'Mã phiếu ĐĐ', width: 130, align: 'center', headerAlign: 'center',
      renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>
    },
    { field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center' },
    { field: 'tenTrangBi', headerName: 'Tên trang bị', flex: 1, minWidth: 160, align: 'center', headerAlign: 'center' },
    { field: 'donViCu', headerName: 'Đơn vị cũ', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
    { field: 'donViMoi', headerName: 'Đơn vị mới', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
    { field: 'ngayDieuDong', headerName: 'Ngày điều động', width: 140, align: 'center', headerAlign: 'center' },
    { field: 'lyDo', headerName: 'Lý do', flex: 1, minWidth: 200, align: 'center', headerAlign: 'center' },
    { field: 'nguoiDuyet', headerName: 'Người duyệt', width: 200, align: 'center', headerAlign: 'center' },
    {
      field: 'trangThai', headerName: 'Trạng thái', width: 150, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams) => (
        <Chip label={p.value} color={ttColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          ĐIỀU ĐỘNG TRANG BỊ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý điều chuyển và điều động trang bị kỹ thuật thông tin giữa các đơn vị toàn quân
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={4}>
        {[
          { label: 'Tổng phiếu điều động', value: stats.total, color: militaryColors.navy, icon: <LocalShippingIcon /> },
          { label: 'Đã duyệt', value: stats.daDuyet, color: '#1565c0', icon: <CheckCircleIcon /> },
          { label: 'Chờ duyệt', value: stats.choDuyet, color: militaryColors.warning, icon: <PendingActionsIcon /> },
          { label: 'Đã thực hiện', value: stats.daThucHien, color: militaryColors.success, icon: <DoneAllIcon /> },
          { label: 'Hủy bỏ', value: stats.huy, color: militaryColors.error, icon: <CancelIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md key={i}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 4,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff',
                position: 'relative',
                overflow: 'hidden',
                '&:after': { content: '""', position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: c.color }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</Typography>
                    <Typography variant="h5" fontWeight={800} color={c.color} sx={{ mt: 0.5 }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${c.color}15`, color: c.color }}>
                    {React.cloneElement(c.icon, { sx: { fontSize: 24 } } as any)}
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
              fullWidth size="small"
              placeholder="Tìm kiếm mã, tên, đơn vị, lý do..."
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon color="action" fontSize="small" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {search && (
                        <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                      )}
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5, height: 20 }} />
                      <Tooltip title="Bộ lọc nâng cao">
                        <Button
                          size="small" onClick={handleOpenPopover}
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
                              bgcolor: activeFilterCount > 0 ? `${theme.palette.primary.main}25` : 'action.hover',
                            }
                          }}
                        >
                          Nhấn bộ lọc tìm kiếm
                          {activeFilterCount > 0 && (
                            <Box sx={{
                              position: 'absolute', top: 4, right: 4,
                              width: 6, height: 6, bgcolor: 'error.main',
                              borderRadius: '50%', border: `1px solid ${theme.palette.background.paper}`
                            }} />
                          )}
                        </Button>
                      </Tooltip>
                    </Stack>
                  </InputAdornment>
                ),
                sx: { borderRadius: 3 }
              }}
              sx={{
                flex: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
                  '& fieldset': { borderColor: 'transparent' },
                  transition: 'all 0.2s',
                }
              }}
            />

            <Button
              variant="contained" startIcon={<FileDownloadIcon />}
              onClick={() => alert('[Giả lập] Xuất Excel điều động')}
              sx={{
                borderRadius: 3, px: 3.5, height: 40,
                textTransform: 'none', fontWeight: 700,
                boxShadow: `0 4px 14px ${theme.palette.primary.main}44`
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
                variant="text" size="small" onClick={handleClear}
                sx={{ ml: 0.5, textTransform: 'none', fontWeight: 700, p: 0, height: 24, minWidth: 'auto', fontSize: '0.75rem' }}
              >
                Xóa tất cả
              </Button>
            </Box>
          )}

          <Popover
            id={popoverId} open={isPopoverOpen} anchorEl={anchorEl} onClose={handleClosePopover}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1.5, p: 3, width: 450, borderRadius: 4,
                boxShadow: theme.palette.mode === 'dark' ? '0 16px 48px rgba(0,0,0,0.7)' : '0 16px 48px rgba(0,0,0,0.15)',
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'visible',
                '&:before': {
                  content: '""', position: 'absolute', top: 0, right: 24,
                  width: 12, height: 12, bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  borderTop: `1px solid ${theme.palette.divider}`,
                  borderLeft: `1px solid ${theme.palette.divider}`,
                }
              }
            }}
          >
            <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={800} color="primary">Lọc nâng cao</Typography>
              <Chip label={`Đã chọn ${activeFilters.length}`} size="small" color="primary" sx={{ fontWeight: 700, visibility: activeFilters.length > 0 ? 'visible' : 'hidden' }} />
            </Box>

            {activeFilters.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, bgcolor: 'action.hover', borderRadius: 2 }}>
                {activeFilters.map((f) => (
                  <Chip
                    key={f.key} label={f.label} size="small"
                    onDelete={() => handleRemoveFilter(f.key)}
                    sx={{ borderRadius: 1, height: 22, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            )}

            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  TRẠNG THÁI HỒ SƠ
                </Typography>
                <TextField select fullWidth size="small" value={filterTT} onChange={e => setFilterTT(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả trạng thái --</em></MenuItem>
                  {ttList.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, pt: 2, borderTop: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
              <Button variant="outlined" color="inherit" onClick={handleClear} sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, px: 3 }}>
                Thiết lập lại
              </Button>
              <Button variant="contained" color="primary" onClick={handleClosePopover} sx={{ borderRadius: 1.5, px: 5, textTransform: 'none', fontWeight: 700 }}>
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

export default DieuDong;
