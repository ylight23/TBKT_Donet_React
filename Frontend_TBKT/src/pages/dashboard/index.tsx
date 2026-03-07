// ============================================================
// Dashboard – Bảng điều hành
// Hệ tokens Quản lý Trang bị Kỹ thuật Thông tin
// ============================================================
import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import { ResponsivePie } from '@nivo/pie';

// Icons
import ComputerIcon from '@mui/icons-material/Computer';
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import PercentIcon from '@mui/icons-material/Percent';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import BusinessIcon from '@mui/icons-material/Business';

import {
  dashboardStats,
  phanVungDonViData,
  nienHanNamData,
  thongKeTheoLoai,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import CommonFilter from '../../components/Filter/CommonFilter';

// ── StatCard props ───────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

// ── Component: Thẻ thống kê ──────────────────────────────────
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card
    elevation={3}
    sx={{
      borderRadius: 2.5,
      borderTop: `4px solid ${color}`,
      height: '100%',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 },
    }}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color} lineHeight={1.2}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}22`,
            borderRadius: 2.5,
            p: 1.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, {
            sx: { fontSize: 30, color },
          })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// ── Component: Biểu đồ Niên hạn (Bar) ───────────────────────
const NienHanBarChart: React.FC = () => {
  const max = Math.max(...nienHanNamData.map(d => d.soLuong));
  const BAR_MAX = 180; // px tối đa

  return (
    <Box sx={{ height: 270, display: 'flex', alignItems: 'flex-end', gap: 1.5, pt: 2, pb: 1 }}>
      {nienHanNamData.map(item => {
        const ratio = Math.sqrt(item.soLuong / max);
        const h = Math.max(ratio * BAR_MAX, 22);
        const hHet = Math.max((item.hetNienHan / item.soLuong) * h, 0);
        const pctHet = Math.round((item.hetNienHan / item.soLuong) * 100);
        return (
          <Tooltip
            key={item.nam}
            title={`${item.nam}: Tổng ${item.soLuong} | Hết niên hạn: ${item.hetNienHan} (${pctHet}%)`}
            arrow
          >
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
              <Typography variant="caption" fontWeight={700} fontSize={10} color="text.primary">
                {item.soLuong}
              </Typography>
              <Box
                sx={{
                  width: '72%',
                  height: h,
                  bgcolor: militaryColors.navy,
                  borderRadius: 2.5,
                  position: 'relative',
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                {hHet > 0 && (
                  <Box
                    sx={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: hHet,
                      bgcolor: militaryColors.error,
                    }}
                  />
                )}
                {h > 44 && pctHet > 0 && (
                  <Typography
                    variant="caption"
                    fontSize={9}
                    fontWeight={700}
                    sx={{
                      position: 'absolute', bottom: hHet + 3,
                      left: 0, right: 0, textAlign: 'center',
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1, pointerEvents: 'none',
                    }}
                  >
                    {pctHet}%
                  </Typography>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={10}>
                {item.nam}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

// ── Component: Biểu đồ tổng số lượng trang bị theo loại ────────
const TongSoLuongChart: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const maxVal = Math.max(...thongKeTheoLoai.map(d => d.soLuong), 1);

  const segments = [
    { key: 'hoatDong' as const, label: 'Hoạt động', color: isDark ? '#66BB6A' : '#2e7d32' },
    { key: 'suaChua' as const, label: 'Sửa chữa', color: isDark ? '#FFB74D' : '#ed6c02' },
    { key: 'niemCat' as const, label: 'Niêm cất', color: isDark ? '#90CAF9' : '#415A77' },
    { key: 'thanhLy' as const, label: 'Đã thanh lý', color: isDark ? '#EF9A9A' : '#d32f2f' },
  ];

  const clampedPct = (total: number) => 18 + (total / maxVal) * 82;

  return (
    <Box sx={{ width: '100%' }}>
      <Box display="flex" gap={2.5} mb={2} flexWrap="wrap">
        {segments.map(s => (
          <Box key={s.key} display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: s.color, borderRadius: 2.5, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {thongKeTheoLoai.map(row => {
        const total = row.soLuong;
        const pct = clampedPct(total);
        return (
          <Box key={row.loai} sx={{ mb: 1.4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title={row.loai} placement="left" enterDelay={400}>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ width: 188, flexShrink: 0, fontWeight: 600, fontSize: 11 }}
                >
                  {row.loai}
                </Typography>
              </Tooltip>
              <Tooltip
                title={`Tổng: ${total} — Hoạt động: ${row.hoatDong} | SC: ${row.suaChua} | Niêm cất: ${row.niemCat} | Thanh lý: ${row.thanhLy}`}
                arrow
              >
                <Box sx={{ flex: 1, height: 24, bgcolor: 'action.hover', borderRadius: 2.5, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: '100%',
                      display: 'flex',
                      transition: 'width 0.4s ease',
                    }}
                  >
                    {segments.map(s => {
                      const val = row[s.key] ?? 0;
                      return val > 0 ? (
                        <Box
                          key={s.key}
                          sx={{
                            flex: val,
                            minWidth: '4px',
                            height: '100%',
                            bgcolor: s.color,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 0.7 },
                          }}
                        />
                      ) : null;
                    })}
                  </Box>
                  {pct >= 35 && (
                    <Typography
                      variant="caption"
                      fontSize={9}
                      fontWeight={700}
                      sx={{
                        position: 'absolute',
                        right: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1,
                        pointerEvents: 'none',
                      }}
                    >
                      {Math.round((total / maxVal) * 100)}%
                    </Typography>
                  )}
                </Box>
              </Tooltip>
              <Box
                sx={{
                  minWidth: 36,
                  flexShrink: 0,
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: 12,
                  color: 'text.primary',
                }}
              >
                {total}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const PIE_COLORS_LIGHT = [
  '#0D1B2A', '#1B263B', '#415A77', '#778DA9',
  '#C9A84C', '#2e7d32', '#ed6c02', '#d32f2f',
  '#0288d1', '#7b1fa2',
];
const PIE_COLORS_DARK = [
  '#90CAF9', '#64B5F6', '#80DEEA', '#B0BEC5',
  '#FFD54F', '#66BB6A', '#FFB74D', '#EF9A9A',
  '#4FC3F7', '#CE93D8',
];

// ── Dashboard chính ──────────────────────────────────────────
const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const PIE_COLORS = isDark ? PIE_COLORS_DARK : PIE_COLORS_LIGHT;

  const pieData = useMemo(
    () => phanVungDonViData.map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] })),
    [PIE_COLORS],
  );

  const statCards: StatCardProps[] = [
    {
      title: 'Tổng số lượng trang bị',
      value: dashboardStats.tongSoLuong,
      icon: <ComputerIcon />,
      color: militaryColors.armyGreen,
      subtitle: 'Nhóm 1 + Nhóm 2',
    },
    {
      title: 'Trang bị đang hoạt động',
      value: dashboardStats.dangHoatDong,
      icon: <CheckCircleIcon />,
      color: militaryColors.success,
      subtitle: 'Sẵn sàng chiến đấu',
    },
    {
      title: 'Trang bị sửa chữa',
      value: dashboardStats.suaChua,
      icon: <BuildIcon />,
      color: militaryColors.warning,
      subtitle: 'Đang trong quá trình SC',
    },
    {
      title: 'Trang bị niêm cất',
      value: dashboardStats.niemCat,
      icon: <InventoryIcon />,
      color: militaryColors.navy,
      subtitle: 'Đang được bảo quản',
    },
    {
      title: 'Trang bị chờ thanh lý',
      value: dashboardStats.choThanhLy,
      icon: <HourglassEmptyIcon />,
      color: '#f57c00',
      subtitle: 'Chờ phê duyệt',
    },
    {
      title: 'Trang bị đã thanh lý',
      value: dashboardStats.daThanhLy,
      icon: <DeleteSweepIcon />,
      color: militaryColors.error,
      subtitle: 'Đã hoàn thành thủ tục',
    },
    {
      title: 'Hệ số kỹ thuật (Kkt)',
      value: `${(dashboardStats.heSoKyThuat * 100).toFixed(1)}%`,
      icon: <PercentIcon />,
      color: '#1565c0',
      subtitle: 'Tỷ lệ sẵn sàng kỹ thuật',
    },
  ];

  const [searchVal, setSearchVal] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [reportDate, setReportDate] = useState('');

  const activeFilters = useMemo(() => {
    const chips = [];
    if (unitFilter) {
      const units: Record<string, string> = { '1': 'Quân đoàn 1', '2': 'Quân đoàn 2', '3': 'Quân khu 1' };
      chips.push({ key: 'unit', label: `Đơn vị: ${units[unitFilter] || unitFilter}`, icon: <BusinessIcon /> });
    }
    if (groupFilter !== 'all') {
      const groups: Record<string, string> = { 'n1': 'Nhóm 1 (Thông tin)', 'n2': 'Nhóm 2 (Khí tài)' };
      chips.push({ key: 'group', label: `Nhóm: ${groups[groupFilter] || groupFilter}`, icon: <ComputerIcon /> });
    }
    if (reportDate) {
      chips.push({ key: 'date', label: `Ngày: ${reportDate}`, icon: <CalendarTodayIcon /> });
    }
    return chips;
  }, [unitFilter, groupFilter, reportDate]);

  const handleRemoveFilter = (key: string) => {
    if (key === 'unit') setUnitFilter('');
    if (key === 'group') setGroupFilter('all');
    if (key === 'date') setReportDate('');
  };

  const handleResetFilters = () => {
    setUnitFilter('');
    setGroupFilter('all');
    setReportDate('');
    setSearchVal('');
  };

  return (
    <Box sx={{ p: 1.5 }}>
      {/* Tiêu đề */}
      <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            BẢNG ĐIỀU HÀNH
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Giám sát trạng thái trang bị kỹ thuật thông tin toàn quân thời gian thực
          </Typography>
        </Box>
      </Box>

      {/* Filter Panel */}
      <CommonFilter
        search={searchVal}
        onSearchChange={setSearchVal}
        placeholder="Tìm kiếm nhanh thông tin, trạng thái, đơn vị..."
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleResetFilters}
        popoverTitle="Nhấn bộ lọc tìm kiếm"
        popoverDescription="Lọc dữ liệu bảng điều hành theo đơn vị, nhóm và ngày báo cáo"
        popoverWidth={500}
        onApply={() => undefined}
        endActions={(
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            sx={{
              borderRadius: 2.5, px: 3, height: 40,
              textTransform: 'none', fontWeight: 700,
              boxShadow: `0 4px 14px ${theme.palette.primary.main}44`
            }}
          >
            Cập nhật
          </Button>
        )}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, ml: 0.5 }}>ĐƠN VỊ</Typography>
            <TextField select fullWidth size="small" value={unitFilter} onChange={e => setUnitFilter(e.target.value)}>
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="1">Quân đoàn 1</MenuItem>
              <MenuItem value="2">Quân đoàn 2</MenuItem>
              <MenuItem value="3">Quân khu 1</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, ml: 0.5 }}>NHÓM</Typography>
            <TextField select fullWidth size="small" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="n1">Nhóm 1 (Thông tin)</MenuItem>
              <MenuItem value="n2">Nhóm 2 (Khí tài)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, ml: 0.5 }}>NGÀY BÁO CÁO</Typography>
            <TextField type="date" fullWidth size="small" value={reportDate} onChange={e => setReportDate(e.target.value)} />
          </Grid>
        </Grid>
      </CommonFilter>



      {/* Stat Cards */}
      <Grid container spacing={2} mb={2}>
        {statCards.map((card, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 'grow' }} key={idx}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card elevation={3} sx={{ borderRadius: 2.5, height: 460 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>Phân bổ theo đơn vị</Typography>
              <Box sx={{ height: 380 }}>
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 20, right: 150, bottom: 20, left: 20 }}
                  innerRadius={0.45}
                  padAngle={1.5}
                  cornerRadius={4}
                  colors={{ datum: 'data.color' }}
                  arcLinkLabelsTextColor={isDark ? '#e0e0e0' : '#333333'}
                  arcLabelsTextColor="#ffffff"
                  arcLabelsSkipAngle={10}
                  legends={[{
                    anchor: 'right', direction: 'column',
                    translateX: 140, itemWidth: 130, itemHeight: 18,
                    itemTextColor: isDark ? '#ccc' : '#444', symbolSize: 12, symbolShape: 'circle'
                  }]}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card elevation={3} sx={{ borderRadius: 2.5, height: 460 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Niên hạn sản xuất</Typography>
              <NienHanBarChart />
              <Box display="flex" gap={2} mt={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 12, bgcolor: militaryColors.navy, borderRadius: 2.5}} />
                  <Typography variant="caption">Tổng</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 12, bgcolor: militaryColors.error, borderRadius: 2.5}} />
                  <Typography variant="caption">Hết hạn</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Card elevation={3} sx={{ borderRadius: 2.5}}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} gutterBottom>Tổng số lượng theo loại</Typography>
            <TongSoLuongChart />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
