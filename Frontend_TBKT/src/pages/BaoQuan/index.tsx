// ============================================================
// Bảo quản – Equipment Preservation Management
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import {
  mockTrangBiNhom1,
  mockTrangBiNhom2,
  TrangThaiTrangBi,
  ChatLuong,
  ITrangBi,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// Chỉ hiện trang bị cần bảo quản (hoạt động + niêm cất)
const baoQuanData: ITrangBi[] = [
  ...mockTrangBiNhom1,
  ...mockTrangBiNhom2,
].filter(t =>
  t.trangThai === TrangThaiTrangBi.HoatDong ||
  t.trangThai === TrangThaiTrangBi.NiemCat,
);

// ── Lịch bảo quản định kỳ (mock) ────────────────────────────
const kyBaoQuan = ['Hàng tuần', 'Hàng tháng', '3 tháng', '6 tháng', 'Hàng năm'];
const baoQuanRows = baoQuanData.map((tb, i) => ({
  ...tb,
  kyBaoQuan: kyBaoQuan[i % kyBaoQuan.length],
  ngayBaoQuan: `${2024 + Math.floor(i / 20)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  nguoiPhuTrach: `Thiếu úy Trần Văn ${String.fromCharCode(65 + (i % 26))}`,
  tinhTrangBQ: i % 4 === 0 ? 'Cần kiểm tra' : i % 4 === 1 ? 'Đạt yêu cầu' : i % 4 === 2 ? 'Vừa thực hiện' : 'Chưa kiểm tra',
}));

const BaoQuan: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filterKy, setFilterKy] = useState('');
  const [filterTT, setFilterTT] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return baoQuanRows.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.ten, r.donVi, r.nguoiPhuTrach].some(v => v.toLowerCase().includes(q));
      const matchKy = !filterKy || r.kyBaoQuan === filterKy;
      const matchTT = !filterTT || r.tinhTrangBQ === filterTT;
      return matchSearch && matchKy && matchTT;
    });
  }, [search, filterKy, filterTT]);

  const handleClear = () => {
    setSearch('');
    setFilterKy('');
    setFilterTT('');
  };

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterKy) chips.push({ key: 'ky', label: `Kỳ: ${filterKy}`, icon: <InventoryIcon fontSize="small" /> });
    if (filterTT) chips.push({ key: 'tt', label: `Trạng thái: ${filterTT}`, icon: <CheckCircleIcon fontSize="small" /> });
    return chips;
  }, [filterKy, filterTT]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'ky') setFilterKy('');
    if (key === 'tt') setFilterTT('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    datYeuCau: baoQuanRows.filter(r => r.tinhTrangBQ === 'Đạt yêu cầu').length,
    canKiemTra: baoQuanRows.filter(r => r.tinhTrangBQ === 'Cần kiểm tra').length,
    chuaKiemTra: baoQuanRows.filter(r => r.tinhTrangBQ === 'Chưa kiểm tra').length,
  }), []);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'baoquan-filter-popover' : undefined;

  const columns: GridColDef[] = [
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center',
      renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>
    },
    { field: 'ten', headerName: 'Tên trang bị', flex: 1, minWidth: 160, align: 'center', headerAlign: 'center' },
    { field: 'loai', headerName: 'Loại', width: 180, align: 'center', headerAlign: 'center' },
    { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
    { field: 'kyBaoQuan', headerName: 'Kỳ bảo quản', width: 130, align: 'center', headerAlign: 'center' },
    { field: 'ngayBaoQuan', headerName: 'Ngày bảo quản', width: 140, align: 'center', headerAlign: 'center' },
    { field: 'nguoiPhuTrach', headerName: 'Người phụ trách', width: 200, align: 'center', headerAlign: 'center' },
    {
      field: 'tinhTrangBQ', headerName: 'Tình trạng', width: 160, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams) => {
        const color =
          p.value === 'Đạt yêu cầu' ? 'success' :
            p.value === 'Cần kiểm tra' ? 'warning' :
              p.value === 'Chưa kiểm tra' ? 'error' : 'info';
        return <Chip label={p.value} color={color as any} size="small" sx={{ fontWeight: 600 }} />;
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          BẢO QUẢN TRANG BỊ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hệ thống giám sát và quản lý công tác bảo quản kỹ thuật định kỳ cho toàn quân
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Tổng cần bảo quản', value: baoQuanRows.length, color: militaryColors.navy, icon: <InventoryIcon /> },
          { label: 'Đạt yêu cầu', value: stats.datYeuCau, color: militaryColors.success, icon: <CheckCircleIcon /> },
          { label: 'Cần kiểm tra', value: stats.canKiemTra, color: militaryColors.warning, icon: <WarningAmberIcon /> },
          { label: 'Chưa kiểm tra', value: stats.chuaKiemTra, color: militaryColors.error, icon: <WarningAmberIcon /> },
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
              fullWidth size="small"
              placeholder="Tìm kiếm mã, tên trang bị, đơn vị, người phụ trách…"
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
              onClick={() => alert('[Giả lập] Xuất Excel bảo quản')}
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
                  KỲ BẢO QUẢN
                </Typography>
                <TextField select fullWidth size="small" value={filterKy} onChange={e => setFilterKy(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả kỳ --</em></MenuItem>
                  {kyBaoQuan.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  TÌNH TRẠNG BẢO QUẢN
                </Typography>
                <TextField select fullWidth size="small" value={filterTT} onChange={e => setFilterTT(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả tình trạng --</em></MenuItem>
                  {['Đạt yêu cầu', 'Cần kiểm tra', 'Vừa thực hiện', 'Chưa kiểm tra'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
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

export default BaoQuan;
