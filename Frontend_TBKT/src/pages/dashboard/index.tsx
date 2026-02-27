// ============================================================
// Dashboard – Bảng điều hành
// Hệ thống Quản lý Trang bị Kỹ thuật Thông tin
// ============================================================
import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/GridLegacy';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
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

import {
  dashboardStats,
  phanVungDonViData,
  nienHanNamData,
  thongKeTheoLoai,
} from '../../data/mockTBData';
import { militaryColors } from '../../theme';

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
      borderRadius: 2,
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
            borderRadius: 2,
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
        // sqrt scale: giữ sự tương đối nhưng rút khoảng cách giữa cột lớn/nhỏ
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
              {/* Số trên đầu cột */}
              <Typography variant="caption" fontWeight={700} fontSize={10} color="text.primary">
                {item.soLuong}
              </Typography>

              <Box
                sx={{
                  width: '72%',
                  height: h,
                  bgcolor: militaryColors.navy,
                  borderRadius: '4px 4px 0 0',
                  position: 'relative',
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                {/* Phần đỏ = hết niên hạn */}
                {hHet > 0 && (
                  <Box
                    sx={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: hHet,
                      bgcolor: militaryColors.error,
                    }}
                  />
                )}
                {/* % hết niên hạn bên trong cột — chỉ khi cột đủ cao */}
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

  // Thân cột: tṿ lệ thực nhưng khóa tối thiểu 18%
  // → khi chênh lệch lớn (ví dụ 8 vs 45) thanh nhỏ vẫn thấy rõ
  const clampedPct = (total: number) => 18 + (total / maxVal) * 82;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Chú giải */}
      <Box display="flex" gap={2.5} mb={2} flexWrap="wrap">
        {segments.map(s => (
          <Box key={s.key} display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: s.color, borderRadius: '2px', flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Các hàng */}
      {thongKeTheoLoai.map(row => {
        const total = row.soLuong;
        const pct = clampedPct(total);
        return (
          <Box key={row.loai} sx={{ mb: 1.4 }}>
            <Box display="flex" alignItems="center" gap={1}>

              {/* Nhãn — tooltip khi bị cắt */}
              <Tooltip title={row.loai} placement="left" enterDelay={400}>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ width: 188, flexShrink: 0, fontWeight: 600, fontSize: 11 }}
                >
                  {row.loai}
                </Typography>
              </Tooltip>

              {/* Track */}
              <Tooltip
                title={`Tổng: ${total} — Hoạt động: ${row.hoatDong} | SC: ${row.suaChua} | Niêm cất: ${row.niemCat} | Thanh lý: ${row.thanhLy}`}
                arrow
              >
                <Box sx={{ flex: 1, height: 24, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                  {/* Phần tô màu — rộng = clampedPct, nội dung là segments */}
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
                            flex: val,          // tỷ lệ thực giữa các segment
                            minWidth: '4px',        // segment rất nhỏ vẫn thấy
                            height: '100%',
                            bgcolor: s.color,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 0.7 },
                          }}
                        />
                      ) : null;
                    })}
                  </Box>
                  {/* Số % trong thanh (hiển khi thanh đủ rộng) */}
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

              {/* Tổng số — badge nổi bật */}
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

// ── Màu biểu đồ tròn — 2 bộ: light (tối) và dark (sáng) ────────
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

  return (
    <Box sx={{ p: 3 }}>
      {/* Tiêu đề */}
      <Box mb={3}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          BẢNG ĐIỀU HÀNH
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tổng hợp tình trạng trang bị kỹ thuật thông tin – Tổng cục Hậu cần Kỹ thuật
        </Typography>
        <Divider sx={{ mt: 1.5 }} />
      </Box>

      {/* ── 7 thẻ thống kê ────────────────────────────────── */}
      <Grid container spacing={2} mb={3}>
        {statCards.map((card, idx) => (
          <Grid item xs={12} sm={6} md={4} lg key={idx}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* ── Hai biểu đồ ──────────────────────────────────── */}
      <Grid container spacing={2}>
        {/* Biểu đồ phân vùng theo đơn vị (Pie) */}
        <Grid item xs={12} lg={7}>
          <Card elevation={3} sx={{ borderRadius: 2, height: 460 }}>
            <CardContent sx={{ height: '100%', pb: '16px !important' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Phân bổ trang bị theo khối đơn vị
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Thống kê số lượng trang bị kỹ thuật trên toàn quân
              </Typography>
              <Box sx={{ height: 390, mt: 1 }}>
                <ResponsivePie
                  data={pieData}
                  margin={{ top: 20, right: 150, bottom: 20, left: 20 }}
                  innerRadius={0.45}
                  padAngle={1.5}
                  cornerRadius={4}
                  activeOuterRadiusOffset={8}
                  colors={{ datum: 'data.color' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor={isDark ? '#e0e0e0' : '#333333'}
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={14}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2.5]] }}
                  legends={[
                    {
                      anchor: 'right',
                      direction: 'column',
                      justify: false,
                      translateX: 140,
                      translateY: 0,
                      itemsSpacing: 4,
                      itemWidth: 130,
                      itemHeight: 18,
                      itemTextColor: isDark ? '#ccc' : '#444',
                      itemDirection: 'left-to-right',
                      symbolSize: 12,
                      symbolShape: 'circle',
                    },
                  ]}
                  theme={{
                    tooltip: {
                      container: {
                        background: isDark ? '#1B263B' : '#fff',
                        color: isDark ? '#e0e0e0' : '#333',
                        fontSize: 12,
                        borderRadius: 6,
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Biểu đồ Niên hạn theo năm (Bar tự vẽ) */}
        <Grid item xs={12} lg={5}>
          <Card elevation={3} sx={{ borderRadius: 2, height: 460 }}>
            <CardContent sx={{ height: '100%', pb: '16px !important' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Niên hạn trang bị theo năm sản xuất
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Trang bị sắp hết / đã hết niên hạn (màu đỏ = hết niên hạn)
              </Typography>
              {/* Chú giải */}
              <Box display="flex" gap={2} mt={1}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 12, bgcolor: militaryColors.navy, borderRadius: '2px' }} />
                  <Typography variant="caption">Tổng trang bị</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 12, bgcolor: militaryColors.error, borderRadius: '2px' }} />
                  <Typography variant="caption">Hết niên hạn</Typography>
                </Box>
              </Box>
              <NienHanBarChart />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Biểu đồ tổng số lượng trang bị theo loại ─────── */}
      <Box mt={2}>
        <Card elevation={3} sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom color="text.primary">
              Tổng số lượng trang bị theo loại
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Phân bổ trạng thái từng chủng loại trang bị kỹ thuật thông tin
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <TongSoLuongChart />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
