// ============================================================
// Thống kê Báo cáo – Statistics & Reports
// ============================================================
import React, { useState }   from 'react';
import Box                   from '@mui/material/Box';
import Button                from '@mui/material/Button';
import Card                  from '@mui/material/Card';
import CardContent           from '@mui/material/CardContent';
import Chip                  from '@mui/material/Chip';
import Divider               from '@mui/material/Divider';
import Grid                  from '@mui/material/GridLegacy';
import LinearProgress        from '@mui/material/LinearProgress';
import Tab                   from '@mui/material/Tab';
import Tabs                  from '@mui/material/Tabs';
import Tooltip               from '@mui/material/Tooltip';
import Typography            from '@mui/material/Typography';
import { useTheme }          from '@mui/material/styles';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { ResponsivePie }     from '@nivo/pie';

import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PrintIcon        from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import BarChartIcon     from '@mui/icons-material/BarChart';
import TableChartIcon   from '@mui/icons-material/TableChart';

import {
  thongKeTheoLoai,
  thongKeTheoDonVi,
  dashboardStats,
  phanVungDonViData,
  mockSuaChua,
  mockBaoDuong,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

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
            height: 8, borderRadius: 4,
            bgcolor: `${r.color}22`,
            '& .MuiLinearProgress-bar': { bgcolor: r.color, borderRadius: 4 },
          }}
        />
      </Box>
    ))}
  </Box>
);

// ── Columns thống kê theo loại ───────────────────────────────
const colsLoai: GridColDef[] = [
  { field: 'loai',     headerName: 'Loại trang bị',   flex: 1, minWidth: 200 },
  { field: 'soLuong',  headerName: 'Tổng số lượng',  width: 130, type: 'number' },
  { field: 'hoatDong', headerName: 'Hoạt động',       width: 110, type: 'number' },
  { field: 'suaChua',  headerName: 'Sửa chữa',        width: 100, type: 'number' },
  { field: 'niemCat',  headerName: 'Niêm cất',        width: 100, type: 'number' },
  { field: 'thanhLy',  headerName: 'Thanh lý',        width: 100, type: 'number' },
  {
    field: 'tyLeHD', headerName: 'Tỷ lệ hoạt động', width: 160,
    renderCell: p => {
      const row  = p.row as typeof thongKeTheoLoai[0];
      const pct  = Math.round((row.hoatDong / row.soLuong) * 100);
      return (
        <Box display="flex" alignItems="center" gap={1} width="100%">
          <LinearProgress
            variant="determinate" value={pct}
            sx={{ flex: 1, height: 8, borderRadius: 4,
              bgcolor: `${militaryColors.success}33`,
              '& .MuiLinearProgress-bar': { bgcolor: militaryColors.success } }}
          />
          <Typography variant="caption" fontWeight={700}>{pct}%</Typography>
        </Box>
      );
    },
  },
];

// ── Columns thống kê theo đơn vị ─────────────────────────────
const colsDonVi: GridColDef[] = [
  { field: 'donVi',   headerName: 'Đơn vị',          flex: 1, minWidth: 200 },
  { field: 'soLuong', headerName: 'Tổng trang bị',   width: 140, type: 'number' },
  {
    field: 'tyLeHD', headerName: 'Tỷ lệ hoạt động (%)', width: 200,
    renderCell: p => {
      const pct = Math.round((p.row as typeof thongKeTheoDonVi[0]).tyLeHD * 100);
      const color = pct >= 80 ? militaryColors.success : pct >= 60 ? militaryColors.warning : militaryColors.error;
      return (
        <Box display="flex" alignItems="center" gap={1} width="100%">
          <LinearProgress
            variant="determinate" value={pct}
            sx={{ flex: 1, height: 8, borderRadius: 4,
              bgcolor: `${color}33`,
              '& .MuiLinearProgress-bar': { bgcolor: color } }}
          />
          <Chip label={`${pct}%`} size="small"
            sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: 11,
                  border: `1px solid ${color}44` }} />
        </Box>
      );
    },
  },
];

// ── Thống kê Báo cáo ─────────────────────────────────────────
const ThongKeBaoCao: React.FC = () => {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab,  setTab]  = useState(0);
  const [view, setView] = useState<'chart' | 'table'>('chart');

  const maxSL = Math.max(...thongKeTheoLoai.map(r => r.soLuong));
  const maxDV = Math.max(...thongKeTheoDonVi.map(r => r.soLuong));

  const pieData = phanVungDonViData.map((d, i) => ({
    ...d, color: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const loaiRows = thongKeTheoLoai.map((r, i) => ({ ...r, id: i + 1 }));
  const dvRows   = thongKeTheoDonVi.map((r, i) => ({ ...r, id: i + 1 }));

  const summaryItems = [
    { label: 'Tổng trang bị',    value: dashboardStats.tongSoLuong,                      color: militaryColors.darkBlue },
    { label: 'Hoạt động',        value: dashboardStats.dangHoatDong,                      color: militaryColors.success  },
    { label: 'Sửa chữa',         value: dashboardStats.suaChua,                           color: militaryColors.warning  },
    { label: 'Niêm cất',         value: dashboardStats.niemCat,                           color: militaryColors.navy     },
    { label: 'Chờ thanh lý',     value: dashboardStats.choThanhLy,                        color: '#f57c00'               },
    { label: 'Đã thanh lý',      value: dashboardStats.daThanhLy,                         color: militaryColors.error    },
    { label: 'Hệ số kỹ thuật',   value: `${(dashboardStats.heSoKyThuat * 100).toFixed(1)}%`, color: '#1565c0'           },
    { label: 'Tổng phiếu SC',    value: mockSuaChua.length,                               color: '#6a1b9a'               },
    { label: 'Tổng phiếu BD',    value: mockBaoDuong.length,                              color: '#00695c'               },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">THỐNG KÊ BÁO CÁO</Typography>
            <Typography variant="body2" color="text.secondary">
              Tổng hợp số liệu thống kê trang bị kỹ thuật theo nhiều tiêu chí
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button variant="outlined" startIcon={<PrintIcon />} size="small"
              sx={{ textTransform: 'none' }}
              onClick={() => alert('[Giả lập] In báo cáo')}
            >
              In
            </Button>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} size="small"
              sx={{ textTransform: 'none', color: militaryColors.error, borderColor: militaryColors.error }}
              onClick={() => alert('[Giả lập] Xuất PDF')}
            >
              PDF
            </Button>
            <Button variant="contained" startIcon={<FileDownloadIcon />} size="small"
              sx={{ textTransform: 'none', bgcolor: militaryColors.darkBlue, '&:hover': { bgcolor: militaryColors.midBlue } }}
              onClick={() => alert('[Giả lập] Xuất Excel')}
            >
              Excel
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* Tổng quan nhanh */}
      <Grid container spacing={1.5} mb={3}>
        {summaryItems.map((s, i) => (
          <Grid item xs={6} sm={4} md={3} lg key={i}>
            <Card elevation={1} sx={{ borderRadius: 2, borderLeft: `4px solid ${s.color}`, py: 0.5 }}>
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="caption" color="text.secondary" display="block">{s.label}</Typography>
                <Typography variant="h6" fontWeight={700} color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px 8px 0 0' }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
            '& .Mui-selected': { color: militaryColors.darkBlue },
            '& .MuiTabs-indicator': { bgcolor: militaryColors.darkBlue },
            borderBottom: 1, borderColor: 'divider',
          }}
        >
          <Tab label="Thống kê theo loại" />
          <Tab label="Thống kê theo đơn vị" />
          <Tab label="Biểu đồ phân bổ" />
        </Tabs>
      </Box>

      {/* Nội dung tab */}
      <Box sx={{ bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, borderTop: 0, borderRadius: '0 0 8px 8px', p: 2 }}>
        {/* Tab 0: Theo loại */}
        {tab === 0 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                Thống kê trang bị theo từng loại
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  size="small" variant={view === 'chart' ? 'contained' : 'outlined'}
                  startIcon={<BarChartIcon />}
                  onClick={() => setView('chart')}
                  sx={{ textTransform: 'none', ...(view === 'chart' ? { bgcolor: militaryColors.darkBlue } : {}) }}
                >
                  Biểu đồ
                </Button>
                <Button
                  size="small" variant={view === 'table' ? 'contained' : 'outlined'}
                  startIcon={<TableChartIcon />}
                  onClick={() => setView('table')}
                  sx={{ textTransform: 'none', ...(view === 'table' ? { bgcolor: militaryColors.darkBlue } : {}) }}
                >
                  Bảng
                </Button>
              </Box>
            </Box>
            {view === 'chart' ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={600} mb={1} color="text.secondary">Số lượng trang bị theo loại</Typography>
                  <SimpleBar
                    rows={thongKeTheoLoai.map((r, i) => ({
                      label: r.loai,
                      value: r.soLuong,
                      max:   maxSL,
                      color: BAR_COLORS[i % BAR_COLORS.length],
                    }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={600} mb={1} color="text.secondary">Tỷ lệ hoạt động theo loại (%)</Typography>
                  <SimpleBar
                    unit="%"
                    rows={thongKeTheoLoai.map((r, i) => ({
                      label: r.loai,
                      value: Math.round((r.hoatDong / r.soLuong) * 100),
                      max:   100,
                      color: militaryColors.success,
                    }))}
                  />
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ height: 450 }}>
                <DataGrid
                  rows={loaiRows} columns={colsLoai} getRowId={r => r.id}
                  pageSizeOptions={[10, 25]} disableRowSelectionOnClick
                  initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                  sx={{
                    borderRadius: 2,
                    '& .MuiDataGrid-columnHeaders': { bgcolor: militaryColors.darkBlue, color: '#fff', fontWeight: 700 },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Tab 1: Theo đơn vị */}
        {tab === 1 && (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>
                Thống kê trang bị theo đơn vị
              </Typography>
              <Box display="flex" gap={1}>
                <Button size="small" variant={view === 'chart' ? 'contained' : 'outlined'} startIcon={<BarChartIcon />}
                  onClick={() => setView('chart')}
                  sx={{ textTransform: 'none', ...(view === 'chart' ? { bgcolor: militaryColors.darkBlue } : {}) }}
                >Biểu đồ</Button>
                <Button size="small" variant={view === 'table' ? 'contained' : 'outlined'} startIcon={<TableChartIcon />}
                  onClick={() => setView('table')}
                  sx={{ textTransform: 'none', ...(view === 'table' ? { bgcolor: militaryColors.darkBlue } : {}) }}
                >Bảng</Button>
              </Box>
            </Box>
            {view === 'chart' ? (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={600} mb={1} color="text.secondary">Số lượng trang bị theo đơn vị</Typography>
                  <SimpleBar
                    rows={thongKeTheoDonVi.map((r, i) => ({
                      label: r.donVi,
                      value: r.soLuong,
                      max:   maxDV,
                      color: BAR_COLORS[i % BAR_COLORS.length],
                    }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" fontWeight={600} mb={1} color="text.secondary">Tỷ lệ hoạt động theo đơn vị (%)</Typography>
                  <SimpleBar
                    unit="%"
                    rows={thongKeTheoDonVi.map((r, i) => {
                      const pct = Math.round(r.tyLeHD * 100);
                      const color = pct >= 80 ? militaryColors.success : pct >= 60 ? militaryColors.warning : militaryColors.error;
                      return { label: r.donVi, value: pct, max: 100, color };
                    })}
                  />
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ height: 450 }}>
                <DataGrid
                  rows={dvRows} columns={colsDonVi} getRowId={r => r.id}
                  pageSizeOptions={[10, 25]} disableRowSelectionOnClick
                  initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                  sx={{
                    borderRadius: 2,
                    '& .MuiDataGrid-columnHeaders': { bgcolor: militaryColors.darkBlue, color: '#fff', fontWeight: 700 },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Tab 2: Biểu đồ phân bổ */}
        {tab === 2 && (
          <Box>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Biểu đồ phân bổ trang bị theo khối đơn vị
            </Typography>
            <Box sx={{ height: 420 }}>
              <ResponsivePie
                data={pieData}
                margin={{ top: 30, right: 180, bottom: 30, left: 30 }}
                innerRadius={0.5}
                padAngle={1.5}
                cornerRadius={4}
                activeOuterRadiusOffset={8}
                colors={{ datum: 'data.color' }}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
                arcLinkLabelsSkipAngle={8}
                arcLinkLabelsTextColor={isDark ? '#e0e0e0' : '#333333'}
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsSkipAngle={12}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
                legends={[{
                  anchor: 'right', direction: 'column',
                  justify: false, translateX: 170, translateY: 0,
                  itemsSpacing: 4, itemWidth: 160, itemHeight: 20,
                  itemTextColor: isDark ? '#ccc' : '#444',
                  itemDirection: 'left-to-right',
                  symbolSize: 12, symbolShape: 'circle',
                }]}
                theme={{
                  tooltip: {
                    container: {
                      background: isDark ? '#1B263B' : '#fff',
                      color: isDark ? '#e0e0e0' : '#333',
                      fontSize: 12, borderRadius: 6,
                    },
                  },
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ThongKeBaoCao;
