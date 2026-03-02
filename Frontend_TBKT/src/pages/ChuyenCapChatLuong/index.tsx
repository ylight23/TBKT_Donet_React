// ============================================================
// Chuyển cấp chất lượng – Quality Level Transfer Management
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
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import StarRateIcon from '@mui/icons-material/StarRate';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

import { mockChuyenCap, IChuyenCap, ChatLuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';

// ── Màu cấp chất lượng ───────────────────────────────────────
const clColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
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
  const [search, setSearch] = useState('');
  const [filterCu, setFilterCu] = useState('');
  const [filterMoi, setFilterMoi] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterCu) chips.push({ key: 'cu', label: `Cấp cũ: ${filterCu}`, icon: <StarRateIcon fontSize="small" /> });
    if (filterMoi) chips.push({ key: 'moi', label: `Cấp mới: ${filterMoi}`, icon: <TrendingUpIcon fontSize="small" /> });
    return chips;
  }, [filterCu, filterMoi]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'cu') setFilterCu('');
    if (key === 'moi') setFilterMoi('');
  };

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClosePopover = () => setAnchorEl(null);
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'chuyencap-filter-popover' : undefined;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockChuyenCap.filter(r => {
      const matchSearch = !q || [r.maTrangBi, r.tenTrangBi, r.donVi, r.lyDo, r.nguoiXacNhan].some(v => v.toLowerCase().includes(q));
      const matchCu = !filterCu || r.capCu === filterCu;
      const matchMoi = !filterMoi || r.capMoi === filterMoi;
      return matchSearch && matchCu && matchMoi;
    });
  }, [search, filterCu, filterMoi]);

  const handleClear = () => {
    setSearch('');
    setFilterCu('');
    setFilterMoi('');
  };

  const activeFilterCount = activeFilters.length;

  const stats = useMemo(() => ({
    total: mockChuyenCap.length,
    tangCap: mockChuyenCap.filter(r => getTrend(r.capCu, r.capMoi) === 'up').length,
    giamCap: mockChuyenCap.filter(r => getTrend(r.capCu, r.capMoi) === 'down').length,
  }), []);

  const columns: GridColDef[] = [
    {
      field: 'id', headerName: 'Mã phiếu CC', width: 130, align: 'center', headerAlign: 'center',
      renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>
    },
    { field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center' },
    { field: 'tenTrangBi', headerName: 'Tên trang bị', flex: 1, minWidth: 160, align: 'center', headerAlign: 'center' },
    { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
    {
      field: 'capCu', headerName: 'Cấp cũ', width: 130, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams<IChuyenCap, ChatLuong>) => (
        <Chip
          label={p.value} size="small"
          sx={{
            bgcolor: `${clColor[p.value!]}22`, color: clColor[p.value!], fontWeight: 600,
            border: `1px solid ${clColor[p.value!]}55`
          }}
        />
      ),
    },
    {
      field: 'trend', headerName: 'Xu hướng', width: 100, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams<IChuyenCap>) => {
        const trend = getTrend(p.row.capCu, p.row.capMoi);
        return trend === 'up' ? <TrendingUpIcon color="success" /> :
          trend === 'down' ? <TrendingDownIcon color="error" /> :
            <TrendingFlatIcon color="action" />;
      },
    },
    {
      field: 'capMoi', headerName: 'Cấp mới', width: 130, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams<IChuyenCap, ChatLuong>) => (
        <Chip
          label={p.value} size="small"
          sx={{
            bgcolor: `${clColor[p.value!]}22`, color: clColor[p.value!], fontWeight: 600,
            border: `1px solid ${clColor[p.value!]}55`
          }}
        />
      ),
    },
    { field: 'ngayCapNhat', headerName: 'Ngày cập nhật', width: 140, align: 'center', headerAlign: 'center' },
    { field: 'lyDo', headerName: 'Lý do', flex: 1, minWidth: 200, align: 'center', headerAlign: 'center' },
    { field: 'nguoiXacNhan', headerName: 'Người xác nhận', width: 200, align: 'center', headerAlign: 'center' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
          CHUYỂN CẤP CHẤT LƯỢNG
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hệ thống theo dõi và quản lý việc điều chỉnh phân cấp chất lượng trang bị kỹ thuật thông tin
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ thống kê */}
      <Grid container spacing={2.5} mb={4}>
        {[
          { label: 'Tổng phiếu chuyển cấp', value: stats.total, color: militaryColors.navy, icon: <StarRateIcon /> },
          { label: 'Tăng cấp chất lượng', value: stats.tangCap, color: militaryColors.success, icon: <TrendingUpIcon /> },
          { label: 'Giảm cấp chất lượng', value: stats.giamCap, color: militaryColors.error, icon: <TrendingDownIcon /> },
        ].map((c, i) => (
          <Grid item xs={12} sm={4} md={4} key={i}>
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
              placeholder="Tìm kiếm mã, tên trang bị, đơn vị, người xác nhận…"
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
              onClick={() => alert('[Giả lập] Xuất Excel chuyển cấp')}
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
                  CẤP CHẤT LƯỢNG CŨ
                </Typography>
                <TextField select fullWidth size="small" value={filterCu} onChange={e => setFilterCu(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả cấp --</em></MenuItem>
                  {Object.values(ChatLuong).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 0.5, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  CẤP CHẤT LƯỢNG MỚI
                </Typography>
                <TextField select fullWidth size="small" value={filterMoi} onChange={e => setFilterMoi(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả cấp --</em></MenuItem>
                  {Object.values(ChatLuong).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
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

export default ChuyenCapChatLuong;
