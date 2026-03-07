// ============================================================
// Thống kê Báo cáo – Statistics & Reports
// ============================================================
import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/GridLegacy';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ResponsivePie } from '@nivo/pie';

import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BarChartIcon from '@mui/icons-material/BarChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

import {
  thongKeTheoLoai,
  thongKeTheoDonVi,
  dashboardStats,
  phanVungDonViData,
  mockSuaChua,
  mockBaoDuong,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import CommonFilter from '../../components/Filter/CommonFilter';

// ── Màu charts ───────────────────────────────────────────────
const BAR_COLORS = ['#0D1B2A', '#415A77', '#778DA9', '#2e7d32', '#ed6c02', '#d32f2f'];

// ── Component: Biểu đồ cột tự vẽ ────────────────────────────
interface BarRow { label: string; value: number; max: number; color: string }

const SimpleBar: React.FC<{ rows: BarRow[]; unit?: string }> = ({ rows, unit = '' }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, mt: 1 }}>
    {rows.map((r, i) => (
      <Box key={i}>
        <Box display="flex" justifyContent="space-between" mb={0.3}>
          <Tooltip title={r.label} arrow>
            <Typography variant="caption" noWrap sx={{ maxWidth: 200, display: 'block' }}>
              {r.label}
            </Typography>
          </Tooltip>
          <Typography variant="caption" fontWeight={700} color={r.color}>
            {r.value}{unit}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.round((r.value / r.max) * 100)}
          sx={{
            height: 8, borderRadius: 2.5,
            bgcolor: `${r.color}22`,
            '& .MuiLinearProgress-bar': { bgcolor: r.color, borderRadius: 2.5},
          }}
        />
      </Box>
    ))}
  </Box>
);

// ── Columns thống kê theo loại ───────────────────────────────
const colsLoai: GridColDef[] = [
  { field: 'loai', headerName: 'Loại trang bị', flex: 1, minWidth: 200 },
  { field: 'soLuong', headerName: 'Tổng số lượng', width: 130, type: 'number' },
  { field: 'hoatDong', headerName: 'Hoạt động', width: 110, type: 'number' },
  { field: 'suaChua', headerName: 'Sửa chữa', width: 100, type: 'number' },
  { field: 'niemCat', headerName: 'Niêm cất', width: 100, type: 'number' },
  { field: 'thanhLy', headerName: 'Thanh lý', width: 100, type: 'number' },
  {
    field: 'tyLeHD', headerName: 'Tỷ lệ hoạt động', width: 160,
    renderCell: p => {
      const row = p.row as typeof thongKeTheoLoai[0];
      const pct = Math.round((row.hoatDong / row.soLuong) * 100);
      return (
        <Box display="flex" alignItems="center" gap={1} width="100%">
          <LinearProgress
            variant="determinate" value={pct}
            sx={{
              flex: 1, height: 8, borderRadius: 2.5,
              bgcolor: `${militaryColors.success}33`,
              '& .MuiLinearProgress-bar': { bgcolor: militaryColors.success }
            }}
          />
          <Typography variant="caption" fontWeight={700}>{pct}%</Typography>
        </Box>
      );
    },
  },
];

// ── Columns thống kê theo đơn vị ─────────────────────────────
const colsDonVi: GridColDef[] = [
  { field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 200 },
  { field: 'soLuong', headerName: 'Tổng trang bị', width: 140, type: 'number' },
  {
    field: 'tyLeHD', headerName: 'Tỷ lệ hoạt động (%)', width: 200,
    renderCell: p => {
      const pct = Math.round((p.row as typeof thongKeTheoDonVi[0]).tyLeHD * 100);
      const color = pct >= 80 ? militaryColors.success : pct >= 60 ? militaryColors.warning : militaryColors.error;
      return (
        <Box display="flex" alignItems="center" gap={1} width="100%">
          <LinearProgress
            variant="determinate" value={pct}
            sx={{
              flex: 1, height: 8, borderRadius: 2.5,
              bgcolor: `${color}33`,
              '& .MuiLinearProgress-bar': { bgcolor: color }
            }}
          />
          <Chip label={`${pct}%`} size="small"
            sx={{
              bgcolor: `${color}22`, color, fontWeight: 700, fontSize: 11,
              border: `1px solid ${color}44`
            }} />
        </Box>
      );
    },
  },
];

// ── Thống kê Báo cáo ─────────────────────────────────────────
const ThongKeBaoCao: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeFilters = useMemo(() => {
    const chips = [];
    if (filterUnit) {
      const units: Record<string, string> = { '1': 'Lữ đoàn 1', '2': 'Lữ đoàn 2' };
      chips.push({ key: 'unit', label: `Đơn vị: ${units[filterUnit] || filterUnit}`, icon: <BusinessIcon fontSize="small" /> });
    }
    if (filterGroup) {
      const groups: Record<string, string> = { '1': 'Thông tin', '2': 'Khí tài' };
      chips.push({ key: 'group', label: `Nhóm: ${groups[filterGroup] || filterGroup}`, icon: <FilterAltIcon fontSize="small" /> });
    }
    if (startDate) chips.push({ key: 'start', label: `Từ: ${startDate}`, icon: <CalendarTodayIcon fontSize="small" /> });
    if (endDate) chips.push({ key: 'end', label: `Đến: ${endDate}`, icon: <CalendarTodayIcon fontSize="small" /> });
    return chips;
  }, [filterUnit, filterGroup, startDate, endDate]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'unit') setFilterUnit('');
    if (key === 'group') setFilterGroup('');
    if (key === 'start') setStartDate('');
    if (key === 'end') setEndDate('');
  };

  const handleClearFilters = () => {
    setFilterUnit('');
    setFilterGroup('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const maxSL = Math.max(...thongKeTheoLoai.map(r => r.soLuong));
  const maxDV = Math.max(...thongKeTheoDonVi.map(r => r.soLuong));

  const pieData = phanVungDonViData.map((d, i) => ({
    ...d, color: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const loaiRows = thongKeTheoLoai.map((r, i) => ({ ...r, id: i + 1 }));
  const dvRows = thongKeTheoDonVi.map((r, i) => ({ ...r, id: i + 1 }));

  const summaryItems = [
    { label: 'Tổng trang bị', value: dashboardStats.tongSoLuong, color: militaryColors.deepOlive },
    { label: 'Hoạt động', value: dashboardStats.dangHoatDong, color: militaryColors.success },
    { label: 'Sửa chữa', value: dashboardStats.suaChua, color: militaryColors.warning },
    { label: 'Niêm cất', value: dashboardStats.niemCat, color: militaryColors.navy },
    { label: 'Chờ thanh lý', value: dashboardStats.choThanhLy, color: '#f57c00' },
    { label: 'Đã thanh lý', value: dashboardStats.daThanhLy, color: militaryColors.error },
    { label: 'Hệ số kỹ thuật', value: `${(dashboardStats.heSoKyThuat * 100).toFixed(1)}%`, color: '#1565c0' },
    { label: 'Tổng phiếu SC', value: mockSuaChua.length, color: '#6a1b9a' },
    { label: 'Tổng phiếu BD', value: mockBaoDuong.length, color: '#00695c' },
  ];

  return (
    <Box sx={{ p: 1.5 }}>
      <Box mb={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              THỐNG KÊ BÁO CÁO
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phân tích và tổng hợp số liệu trang bị kỹ thuật thông tin toàn quân
            </Typography>
          </Box>
          <Box display="flex" gap={1.5}>
            <Button
              variant="outlined" startIcon={<PrintIcon />} size="medium"
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}
              onClick={() => alert('[Giả lập] In báo cáo')}
            >In</Button>
            <Button
              variant="outlined" startIcon={<PictureAsPdfIcon />} size="medium"
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600, color: militaryColors.error }}
              onClick={() => alert('[Giả lập] Xuất PDF')}
            >PDF</Button>
            <Button
              variant="contained" startIcon={<FileDownloadIcon />} size="medium"
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: militaryColors.deepOlive }}
              onClick={() => alert('[Giả lập] Xuất Excel')}
            >Excel</Button>
          </Box>
        </Box>

      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={1.5}>
        {summaryItems.map((s, i) => (
          <Grid item xs={6} sm={3} md={3} lg key={i}>
            <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase' }}>{s.label}</Typography>
                <Typography variant="h5" fontWeight={800} color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter Panel */}
      <CommonFilter
        search={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Tìm kiếm nhanh trong thống kê..."
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearFilters}
        popoverTitle="Bộ lọc nâng cao"
        popoverDescription="Tinh chỉnh báo cáo theo đơn vị, nhóm và khoảng thời gian"
        popoverWidth={500}
        onApply={() => undefined}
        endActions={(
          <Button variant="contained" startIcon={<BarChartIcon />} sx={{ borderRadius: 2.5, px: 3, height: 40 }} onClick={() => alert('Cập nhật báo cáo')}>
            Cập nhật
          </Button>
        )}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" fontWeight={700}>ĐƠN VỊ</Typography>
            <TextField select fullWidth size="small" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="1">Lữ đoàn 1</MenuItem>
              <MenuItem value="2">Lữ đoàn 2</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" fontWeight={700}>NHÓM</Typography>
            <TextField select fullWidth size="small" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="1">Thông tin</MenuItem>
              <MenuItem value="2">Khí tài</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" fontWeight={700}>TỪ NGÀY</Typography>
            <TextField type="date" fullWidth size="small" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" fontWeight={700}>ĐẾN NGÀY</Typography>
            <TextField type="date" fullWidth size="small" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Grid>
        </Grid>
      </CommonFilter>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Theo loại" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Theo đơn vị" sx={{ textTransform: 'none', fontWeight: 700 }} />
          <Tab label="Phân bổ" sx={{ textTransform: 'none', fontWeight: 700 }} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box>
        {tab === 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Thống kê theo chủng loại</Typography>
              <Box display="flex" gap={1}>
                <IconButton size="small" onClick={() => setView('chart')} color={view === 'chart' ? "primary" : "default"}><BarChartIcon /></IconButton>
                <IconButton size="small" onClick={() => setView('table')} color={view === 'table' ? "primary" : "default"}><TableChartIcon /></IconButton>
              </Box>
            </Box>
            {view === 'chart' ? (
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={700} mb={1}>Số lượng trang bị</Typography>
                  <SimpleBar rows={thongKeTheoLoai.map((r, i) => ({ label: r.loai, value: r.soLuong, max: maxSL, color: BAR_COLORS[i % BAR_COLORS.length] }))} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={700} mb={1}>Tỷ lệ hoạt động (%)</Typography>
                  <SimpleBar unit="%" rows={thongKeTheoLoai.map(r => ({ label: r.loai, value: Math.round((r.hoatDong / r.soLuong) * 100), max: 100, color: militaryColors.success }))} />
                </Grid>
              </Grid>
            ) : (
              <DataGrid
                rows={loaiRows}
                columns={colsLoai}
                getRowId={(r) => r.id}
                sx={{
                  height: {
                    xs: 400,
                    sm: 450,
                    md: "calc(100vh - 450px)",
                  },
                  minHeight: 350,
                  width: "100%",
                }}
              />
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Thống kê theo đơn vị</Typography>
              <Box display="flex" gap={1}>
                <IconButton size="small" onClick={() => setView('chart')} color={view === 'chart' ? "primary" : "default"}><BarChartIcon /></IconButton>
                <IconButton size="small" onClick={() => setView('table')} color={view === 'table' ? "primary" : "default"}><TableChartIcon /></IconButton>
              </Box>
            </Box>
            {view === 'chart' ? (
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={700} mb={1}>Số lượng trang bị</Typography>
                  <SimpleBar rows={thongKeTheoDonVi.map((r, i) => ({ label: r.donVi, value: r.soLuong, max: maxDV, color: BAR_COLORS[i % BAR_COLORS.length] }))} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={700} mb={1}>Tỷ lệ hoạt động (%)</Typography>
                  <SimpleBar unit="%" rows={thongKeTheoDonVi.map(r => ({ label: r.donVi, value: Math.round(r.tyLeHD * 100), max: 100, color: militaryColors.success }))} />
                </Grid>
              </Grid>
            ) : (
              <DataGrid
                rows={dvRows}
                columns={colsDonVi}
                getRowId={(r) => r.id}
                sx={{
                  height: {
                    xs: 400,
                    sm: 450,
                    md: "calc(100vh - 450px)",
                  },
                  minHeight: 350,
                  width: "100%",
                }}
              />
            )}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ height: 450 }}>
            <ResponsivePie
              data={pieData}
              margin={{ top: 40, right: 150, bottom: 40, left: 20 }}
              innerRadius={0.5}
              padAngle={1.5}
              cornerRadius={4}
              colors={{ datum: 'data.color' }}
              arcLabelsTextColor="#ffffff"
              arcLinkLabelsTextColor={isDark ? '#e0e0e0' : '#333333'}
              legends={[{
                anchor: 'right', direction: 'column',
                translateX: 140, itemWidth: 100, itemHeight: 20,
                itemTextColor: isDark ? '#ccc' : '#444', symbolSize: 12, symbolShape: 'circle'
              }]}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ThongKeBaoCao;
