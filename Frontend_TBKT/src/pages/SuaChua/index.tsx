// ============================================================
// Sửa chữa – Repair Management
// Gồm: Kết quả sửa chữa + Trang bị kỹ thuật sửa chữa
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
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { mockSuaChua, ISuaChua } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu kết quả sửa chữa ─────────────────────────────────────
const kqColor: Record<string, 'success' | 'warning' | 'error'> = {
  'Hoàn thành': 'success',
  'Đang sửa': 'warning',
  'Không sửa được': 'error',
};

// ── Định dạng tiền ───────────────────────────────────────────
const fmtVND = (n: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// ── Columns chung ────────────────────────────────────────────
const buildColumns = (): GridColDef[] => [
  {
    field: 'id', headerName: 'Mã phiếu SC', width: 130, align: 'center', headerAlign: 'center',
    renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>
  },
  { field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center' },
  { field: 'tenTrangBi', headerName: 'Tên trang bị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
  { field: 'loai', headerName: 'Loại', width: 180, align: 'center', headerAlign: 'center' },
  { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
  { field: 'loaiSuaChua', headerName: 'Cấp sửa chữa', width: 170, align: 'center', headerAlign: 'center' },
  { field: 'donViSuaChua', headerName: 'Đơn vị SC', width: 160, align: 'center', headerAlign: 'center' },
  {
    field: 'ketQua', headerName: 'Kết quả', width: 160, align: 'center', headerAlign: 'center',
    renderCell: (p: GridRenderCellParams) => (
      <Chip label={p.value} color={kqColor[p.value] ?? 'default'} size="small" sx={{ fontWeight: 600 }} />
    ),
  },
  { field: 'ngayBatDau', headerName: 'Ngày bắt đầu', width: 130, align: 'center', headerAlign: 'center' },
  { field: 'ngayKetThuc', headerName: 'Ngày kết thúc', width: 140, align: 'center', headerAlign: 'center' },
  {
    field: 'chiPhi', headerName: 'Chi phí (VNĐ)', width: 160, type: 'number', align: 'center', headerAlign: 'center',
    renderCell: (p: GridRenderCellParams) => (
      <Typography variant="body2" fontFamily="monospace" fontSize={12}>
        {fmtVND(p.value as number)}
      </Typography>
    ),
  },
  { field: 'ghiChu', headerName: 'Ghi chú', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
];

// ── SuaChua main ─────────────────────────────────────────────
const SuaChua: React.FC = () => {
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Number(searchParams.get('tab') || 0);
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [filterLoai, setFilterLoai] = useState('');
  const [filterKQ, setFilterKQ] = useState('');
  const [expanded, setExpanded] = useState(false);

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
      const matchLoai = !filterLoai || r.loaiSuaChua === filterLoai;
      const matchKQ = !filterKQ || r.ketQua === filterKQ;
      return matchSearch && matchLoai && matchKQ;
    });
  }, [search, filterLoai, filterKQ, sourceData]);

  const handleClear = () => {
    setSearch('');
    setFilterLoai('');
    setFilterKQ('');
  };

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterLoai) chips.push({ key: 'loai', label: `Cấp SC: ${filterLoai}`, icon: <BuildIcon fontSize="small" /> });
    if (filterKQ) chips.push({ key: 'kq', label: `Kết quả: ${filterKQ}`, icon: <CheckCircleIcon fontSize="small" /> });
    return chips;
  }, [filterLoai, filterKQ]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'loai') setFilterLoai('');
    if (key === 'kq') setFilterKQ('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    total: mockSuaChua.length,
    hoanthanh: mockSuaChua.filter(r => r.ketQua === 'Hoàn thành').length,
    dangSua: mockSuaChua.filter(r => r.ketQua === 'Đang sửa').length,
    khongSuaDuoc: mockSuaChua.filter(r => r.ketQua === 'Không sửa được').length,
    tongChiPhi: mockSuaChua.reduce((s, r) => s + r.chiPhi, 0),
  }), []);

  const columns = useMemo(buildColumns, []);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'suachua-filter-popover' : undefined;

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          SỬA CHỮA TRANG BỊ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quản lý công tác sửa chữa trang bị kỹ thuật thông tin toàn quân
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2} mb={4}>
        {[
          { label: 'Tổng phiếu SC', value: stats.total, color: militaryColors.navy, icon: <BuildIcon /> },
          { label: 'Hoàn thành', value: stats.hoanthanh, color: militaryColors.success, icon: <CheckCircleIcon /> },
          { label: 'Đang sửa chữa', value: stats.dangSua, color: militaryColors.warning, icon: <HourglassEmptyIcon /> },
          { label: 'Không sửa được', value: stats.khongSuaDuoc, color: militaryColors.error, icon: <CancelIcon /> },
          {
            label: 'Tổng chi phí ước tính', value: fmtVND(stats.tongChiPhi),
            color: '#1565c0', icon: <BuildIcon />, fullWidth: true
          },
        ].map((c, i) => (
          <Grid item xs={12} sm={6} md={c.fullWidth ? 12 : 3} key={i}>
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
                    <Typography variant={c.fullWidth ? "h4" : "h5"} fontWeight={800} color={c.color} sx={{ mt: 0.5 }}>{c.value}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${c.color}15`, color: c.color }}>
                    {React.cloneElement(c.icon, { sx: { fontSize: c.fullWidth ? 36 : 28 } } as any)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
          <Tab label={`Tất cả (${mockSuaChua.length})`} />
          <Tab label={`Đang sửa (${stats.dangSua})`} />
          <Tab label={`Hoàn thành (${stats.hoanthanh})`} />
        </Tabs>
      </Box>

      {/* ── Filter Panel ────────────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          borderRadius: '0 0 16px 16px',
          border: `1px solid ${theme.palette.divider}`,
          borderTop: 0,
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
              placeholder="Tìm kiếm phiếu SC theo mã, tên trang bị, đơn vị, đơn vị sửa chữa..."
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
                  '&:hover fieldset': { borderColor: theme.palette.primary.light },
                  transition: 'all 0.2s',
                }
              }}
            />

            <Button
              variant="contained" startIcon={<FileDownloadIcon />}
              onClick={() => alert('[Giả lập] Xuất Excel sửa chữa')}
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
                  CẤP SỬA CHỮA
                </Typography>
                <TextField select fullWidth size="small" value={filterLoai} onChange={e => setFilterLoai(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả cấp --</em></MenuItem>
                  {loaiList.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  KẾT QUẢ
                </Typography>
                <TextField select fullWidth size="small" value={filterKQ} onChange={e => setFilterKQ(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả kết quả --</em></MenuItem>
                  {Object.keys(kqColor).map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
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

export default SuaChua;
