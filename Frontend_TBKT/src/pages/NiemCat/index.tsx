// ============================================================
// Niêm cất – Equipment Storage/Archive Management
// Gồm: Trang bị KT niêm cất + Kết quả niêm cất
// ============================================================
import React, { useState, useMemo, useEffect } from 'react';
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
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InventoryIcon from '@mui/icons-material/Inventory';
import LockIcon from '@mui/icons-material/Lock';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { mockNiemCat, INiemCat } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu trạng thái niêm cất ──────────────────────────────────
const ttColor: Record<string, 'info' | 'success' | 'warning'> = {
  'Đang niêm cất': 'info',
  'Đã xuất kho': 'success',
  'Kiểm tra định kỳ': 'warning',
};

// ── Columns ──────────────────────────────────────────────────
const columns: GridColDef[] = [
  {
    field: 'id', headerName: 'Mã phiếu NC', width: 130, align: 'center', headerAlign: 'center',
    renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>,
  },
  { field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center' },
  { field: 'tenTrangBi', headerName: 'Tên trang bị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
  { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 140, align: 'center', headerAlign: 'center' },
  { field: 'khoNiemCat', headerName: 'Kho niêm cất', width: 150, align: 'center', headerAlign: 'center' },
  { field: 'ngayNiemCat', headerName: 'Ngày niêm cất', width: 140, align: 'center', headerAlign: 'center' },
  {
    field: 'ngayXuat', headerName: 'Ngày xuất kho', width: 140, align: 'center', headerAlign: 'center',
    renderCell: (p: GridRenderCellParams) => (
      <Typography variant="body2">{p.value ?? '—'}</Typography>
    ),
  },
  {
    field: 'trangThai', headerName: 'Trạng thái', width: 160, align: 'center', headerAlign: 'center',
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
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [filterKho, setFilterKho] = useState('');
  const [filterTT, setFilterTT] = useState('');
  const [expanded, setExpanded] = useState(false);

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
      const matchTT = !filterTT || r.trangThai === filterTT;
      return matchSearch && matchKho && matchTT;
    });
  }, [search, filterKho, filterTT, sourceData]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterKho) chips.push({ key: 'kho', label: `Kho: ${filterKho}`, icon: <WarehouseIcon fontSize="small" /> });
    if (filterTT) chips.push({ key: 'tt', label: `Trạng thái: ${filterTT}`, icon: <LockIcon fontSize="small" /> });
    return chips;
  }, [filterKho, filterTT]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'kho') setFilterKho('');
    if (key === 'tt') setFilterTT('');
  };

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'niemcat-filter-popover' : undefined;

  const handleClear = () => {
    setSearch('');
    setFilterKho('');
    setFilterTT('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    dangNiem: mockNiemCat.filter(r => r.trangThai === 'Đang niêm cất').length,
    kiemTra: mockNiemCat.filter(r => r.trangThai === 'Kiểm tra định kỳ').length,
    daXuat: mockNiemCat.filter(r => r.trangThai === 'Đã xuất kho').length,
    total: mockNiemCat.length,
  }), []);

  const ttList = tab === 2
    ? ['Đã xuất kho']
    : ['Đang niêm cất', 'Kiểm tra định kỳ'];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          NIÊM CẤT TRANG BỊ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hệ thống giám sát và quản lý trạng thái niêm cất bảo quản trang bị kỹ thuật thông tin toàn quân
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Tổng niêm cất', value: stats.total, color: militaryColors.navy, icon: <InventoryIcon /> },
          { label: 'Đang niêm cất', value: stats.dangNiem, color: militaryColors.deepOlive, icon: <LockIcon /> },
          { label: 'Kiểm tra định kỳ', value: stats.kiemTra, color: militaryColors.warning, icon: <WarehouseIcon /> },
          { label: 'Đã xuất kho', value: stats.daXuat, color: militaryColors.success, icon: <AssignmentTurnedInIcon /> },
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
                '&:after': { content: '""', position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', bgcolor: c.color }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</Typography>
                    <Typography variant="h4" fontWeight={800} color={c.color} sx={{ mt: 0.5 }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${c.color}15`, color: c.color }}>
                    {React.cloneElement(c.icon as any, { sx: { fontSize: 32 } })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: '16px 16px 0 0', overflow: 'hidden', border: `1px solid ${theme.palette.divider}`, borderBottom: 0 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{
            px: 2,
            pt: 1,
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48, fontSize: '0.95rem' },
            '& .Mui-selected': { color: theme.palette.primary.main },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
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

      {/* ── Filter Panel ────────────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: '0 0 16px 16px',
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
              placeholder="Tìm kiếm mã, tên trang bị, đơn vị, kho niêm cất…"
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
              onClick={() => alert('[Giả lập] Xuất Excel niêm cất')}
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
                mt: 1.5, p: 3, width: 500, borderRadius: 4,
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
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  KHO NIÊM CẤT
                </Typography>
                <TextField select fullWidth size="small" value={filterKho} onChange={e => setFilterKho(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả kho --</em></MenuItem>
                  {khoList.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  TRẠNG THÁI NIÊM CẤT
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
          mt: 1
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

export default NiemCat;
