// ============================================================
// Tình trạng kỹ thuật – Technical Status Overview
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/GridLegacy';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';

import {
  mockTrangBiNhom1,
  mockTrangBiNhom2,
  ChatLuong,
  TrangThaiTrangBi,
  ITrangBi,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

import Popover from '@mui/material/Popover';

// ── Gộp tất cả trang bị ──────────────────────────────────────
const allTrangBi: ITrangBi[] = [...mockTrangBiNhom1, ...mockTrangBiNhom2];

// ── Màu chất lượng ──────────────────────────────────────────
const clColor: Record<ChatLuong, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
};

// ── Card tóm tắt chất lượng ──────────────────────────────────
interface SummaryCardProps {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, count, total, color, icon }) => {
  const pct = Math.round((count / total) * 100);
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 4,
        border: `1px solid ${color}33`,
        bgcolor: `${color}05`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' }
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
          <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color }}>
            {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: 20 } })}
          </Box>
        </Box>
        <Box display="flex" alignItems="baseline" gap={1}>
          <Typography variant="h4" fontWeight={800} color={color}>{count}</Typography>
          <Typography variant="caption" fontWeight={700} color="text.secondary">/ {total}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>{pct}% tổng trang bị</Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6, borderRadius: 3, bgcolor: `${color}15`,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 }
          }}
        />
      </CardContent>
    </Card>
  );
};

// ── Tình trạng kỹ thuật ──────────────────────────────────────
const TinhTrangKyThuat: React.FC = () => {
  const theme = useTheme();
  const total = allTrangBi.length;
  const [search, setSearch] = useState('');
  const [filterCL, setFilterCL] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterCL) chips.push({ key: 'cl', label: `Chất lượng: ${filterCL}`, icon: <VerifiedIcon fontSize="small" /> });
    return chips;
  }, [filterCL]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'cl') setFilterCL('');
  };

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const handleClosePopover = () => setAnchorEl(null);
  const isPopoverOpen = Boolean(anchorEl);
  const popoverId = isPopoverOpen ? 'trangthai-filter-popover' : undefined;

  // Tính số lượng theo chất lượng
  const count = useMemo(() => ({
    tot: allTrangBi.filter(t => t.chatLuong === ChatLuong.Tot).length,
    kha: allTrangBi.filter(t => t.chatLuong === ChatLuong.Kha).length,
    trungBinh: allTrangBi.filter(t => t.chatLuong === ChatLuong.TrungBinh).length,
    xau: allTrangBi.filter(t => t.chatLuong === ChatLuong.Xau).length,
    hong: allTrangBi.filter(t => t.chatLuong === ChatLuong.HỏngHoc).length,
  }), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTrangBi.filter(row => {
      const matchSearch = !q || [row.maTrangBi, row.ten, row.donVi].some(v => v.toLowerCase().includes(q));
      const matchCL = !filterCL || row.chatLuong === filterCL;
      return matchSearch && matchCL;
    });
  }, [search, filterCL]);

  const handleClear = () => {
    setSearch('');
    setFilterCL('');
  };

  const activeFilterCount = activeFilters.length;

  const columns: GridColDef[] = [
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140, align: 'center', headerAlign: 'center',
      renderCell: p => <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>{p.value}</Typography>,
    },
    { field: 'ten', headerName: 'Tên trang bị', flex: 1, minWidth: 160, align: 'center', headerAlign: 'center' },
    { field: 'loai', headerName: 'Loại', width: 200, align: 'center', headerAlign: 'center' },
    { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 150, align: 'center', headerAlign: 'center' },
    {
      field: 'chatLuong', headerName: 'Chất lượng', width: 130, align: 'center', headerAlign: 'center',
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
      field: 'trangThai', headerName: 'Trạng thái', width: 150, align: 'center', headerAlign: 'center',
      renderCell: (p: GridRenderCellParams<ITrangBi, TrangThaiTrangBi>) => (
        <Chip
          label={p.value} size="small"
          color={p.value === TrangThaiTrangBi.HoatDong ? 'success' :
            p.value === TrangThaiTrangBi.SuaChua ? 'warning' : 'default'}
        />
      ),
    },
    { field: 'soLanSuaChua', headerName: 'Số lần SC', type: 'number', width: 110, align: 'center', headerAlign: 'center' },
    { field: 'nienHan', headerName: 'Niên hạn (năm)', type: 'number', width: 130, align: 'center', headerAlign: 'center' },
    { field: 'namSuDung', headerName: 'Năm sử dụng', type: 'number', width: 120, align: 'center', headerAlign: 'center' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>TÌNH TRẠNG KỸ THUẬT</Typography>
        <Typography variant="body2" color="text.secondary">
          Hệ thống giám sát và tổng hợp chất lượng trang bị kỹ thuật thông tin toàn quân
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {/* Thẻ tóm tắt */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng TỐT" count={count.tot} total={total} color={clColor[ChatLuong.Tot]} icon={<VerifiedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng KHÁ" count={count.kha} total={total} color={clColor[ChatLuong.Kha]} icon={<InfoOutlinedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng TRUNG BÌNH" count={count.trungBinh} total={total} color={clColor[ChatLuong.TrungBinh]} icon={<WarningAmberIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="Chất lượng XẤU" count={count.xau} total={total} color={clColor[ChatLuong.Xau]} icon={<ErrorOutlineIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg>
          <SummaryCard label="HỎNG HÓC" count={count.hong} total={total} color={clColor[ChatLuong.HỏngHoc]} icon={<ErrorOutlineIcon />} />
        </Grid>
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
              placeholder="Tìm kiếm mã, tên trang bị, đơn vị…"
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
              onClick={() => alert('[Giả lập] Xuất Excel tình trạng kỹ thuật')}
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
                mt: 1.5, p: 3, width: 400, borderRadius: 4,
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
              <Typography variant="h6" fontWeight={800} color="primary">Lọc kỹ thuật</Typography>
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
                  PHÂN CẤP CHẤT LƯỢNG
                </Typography>
                <TextField select fullWidth size="small" value={filterCL} onChange={e => setFilterCL(e.target.value)}>
                  <MenuItem value=""><em>-- Tất cả chất lượng --</em></MenuItem>
                  {Object.values(ChatLuong).map(cl => <MenuItem key={cl} value={cl}>{cl}</MenuItem>)}
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

export default TinhTrangKyThuat;
