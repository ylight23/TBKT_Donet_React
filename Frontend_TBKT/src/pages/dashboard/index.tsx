import React, { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import { ResponsivePie } from '@nivo/pie';
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
import { militaryColors } from '../../theme';
import CommonFilter from '../../components/Filter/CommonFilter';
import useTrangBiGridData, { type TrangBiGridItem } from '../../hooks/useTrangBiGridData';
import { ChartSkeleton } from '../../components/Skeletons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

interface NienHanDatum {
  nam: number;
  soLuong: number;
  hetNienHan: number;
}

interface LoaiDatum {
  loai: string;
  soLuong: number;
  hoatDong: number;
  suaChua: number;
  niemCat: number;
  thanhLy: number;
}

const PIE_COLORS_LIGHT = ['#22C55E', '#38BDF8', '#F59E0B', '#FB7185', '#A78BFA', '#2DD4BF', '#F97316', '#84CC16', '#60A5FA', '#F472B6'];
const PIE_COLORS_DARK = ['#86EFAC', '#7DD3FC', '#FDE68A', '#FDA4AF', '#C4B5FD', '#5EEAD4', '#FDBA74', '#BEF264', '#93C5FD', '#F9A8D4'];

const normalizeText = (value?: string): string => (
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
);

const includesAny = (value: string | undefined, terms: string[]): boolean => {
  const normalized = normalizeText(value);
  return terms.some((term) => normalized.includes(term));
};

const isOperating = (row: TrangBiGridItem): boolean => includesAny(row.trangThai, ['hoat dong', 'dang su dung']);
const isRepairing = (row: TrangBiGridItem): boolean => includesAny(row.trangThai, ['sua chua']);
const isPreserved = (row: TrangBiGridItem): boolean => includesAny(row.trangThai, ['niem cat', 'bao quan']);
const isWaitingLiquidation = (row: TrangBiGridItem): boolean => includesAny(row.trangThai, ['cho thanh ly']);
const isLiquidated = (row: TrangBiGridItem): boolean => includesAny(row.trangThai, ['da thanh ly', 'thanh ly']);
const isGoodTechnical = (row: TrangBiGridItem): boolean => (
  includesAny(row.chatLuong, ['tot', 'kha']) ||
  includesAny(row.tinhTrangKyThuat, ['tot', 'kha', 'hoat dong tot'])
);

const getUnitName = (row: TrangBiGridItem): string => row.donViQuanLy || row.donVi || 'Chưa có đơn vị';
const getLoaiName = (row: TrangBiGridItem): string => row.loai || row.tenDanhMuc || row.maDanhMuc || 'Khác';

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card
    elevation={3}
    sx={{
      borderRadius: 2.5,
      borderTop: `4px solid ${color}`,
      height: '100%',
      transition: 'box-shadow 0.2s',
      '&:hover': { boxShadow: 6 },
    }}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
          <Typography variant="h4" fontWeight={700} color={color} lineHeight={1.2}>{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
        <Box sx={{ bgcolor: `${color}22`, borderRadius: 2.5, p: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: 30, color } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const NienHanBarChart: React.FC<{ data: NienHanDatum[] }> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.soLuong), 1);
  const BAR_MAX = 180;

  if (data.length === 0) {
    return <Box sx={{ height: 270, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>Chưa có dữ liệu niên hạn</Box>;
  }

  return (
    <Box sx={{ height: 270, display: 'flex', alignItems: 'flex-end', gap: 1.5, pt: 2, pb: 1 }}>
      {data.map((item) => {
        const ratio = Math.sqrt(item.soLuong / max);
        const h = Math.max(ratio * BAR_MAX, 22);
        const hHet = item.soLuong > 0 ? Math.max((item.hetNienHan / item.soLuong) * h, 0) : 0;
        const pctHet = item.soLuong > 0 ? Math.round((item.hetNienHan / item.soLuong) * 100) : 0;
        return (
          <Tooltip key={item.nam} title={`${item.nam}: Tổng ${item.soLuong} | Hết niên hạn: ${item.hetNienHan} (${pctHet}%)`} arrow>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}>
              <Typography variant="caption" fontWeight={700} fontSize={10} color="text.primary">{item.soLuong}</Typography>
              <Box sx={{ width: '72%', height: h, bgcolor: militaryColors.navy, borderRadius: 2.5, position: 'relative', overflow: 'hidden' }}>
                {hHet > 0 && <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: hHet, bgcolor: militaryColors.error }} />}
              </Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize={10}>{item.nam}</Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

const TongSoLuongChart: React.FC<{ data: LoaiDatum[] }> = ({ data }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const maxVal = Math.max(...data.map((d) => d.soLuong), 1);

  const segments = [
    { key: 'hoatDong' as const, label: 'Hoạt động', color: isDark ? '#66BB6A' : '#2e7d32' },
    { key: 'suaChua' as const, label: 'Sửa chữa', color: isDark ? '#FFB74D' : '#ed6c02' },
    { key: 'niemCat' as const, label: 'Niêm cất/Bảo quản', color: isDark ? '#90CAF9' : '#415A77' },
    { key: 'thanhLy' as const, label: 'Thanh lý', color: isDark ? '#EF9A9A' : '#d32f2f' },
  ];

  if (data.length === 0) {
    return <Box sx={{ minHeight: 160, display: 'grid', placeItems: 'center', color: 'text.secondary' }}>Chưa có dữ liệu trang bị</Box>;
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box display="flex" gap={2.5} mb={2} flexWrap="wrap">
        {segments.map((s) => (
          <Box key={s.key} display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 12, height: 12, bgcolor: s.color, borderRadius: 2.5, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {data.map((row) => {
        const total = row.soLuong;
        const pct = 18 + (total / maxVal) * 82;
        return (
          <Box key={row.loai} sx={{ mb: 1.4 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title={row.loai} placement="left" enterDelay={400}>
                <Typography variant="caption" noWrap sx={{ width: 188, flexShrink: 0, fontWeight: 600, fontSize: 11 }}>
                  {row.loai}
                </Typography>
              </Tooltip>
              <Tooltip title={`Tổng: ${total} - Hoạt động: ${row.hoatDong} | Sửa chữa: ${row.suaChua} | Niêm cất: ${row.niemCat} | Thanh lý: ${row.thanhLy}`} arrow>
                <Box sx={{ flex: 1, height: 24, bgcolor: 'action.hover', borderRadius: 2.5, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}>
                  <Box sx={{ width: `${pct}%`, height: '100%', display: 'flex', transition: 'width 0.4s ease' }}>
                    {segments.map((s) => {
                      const val = row[s.key] ?? 0;
                      return val > 0 ? <Box key={s.key} sx={{ flex: val, minWidth: '4px', height: '100%', bgcolor: s.color }} /> : null;
                    })}
                  </Box>
                </Box>
              </Tooltip>
              <Box sx={{ minWidth: 36, flexShrink: 0, textAlign: 'right', fontWeight: 700, fontSize: 12, color: 'text.primary' }}>{total}</Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { data: trangBiRows, loading, errorMessage } = useTrangBiGridData();
  const [searchVal, setSearchVal] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [reportDate, setReportDate] = useState('');

  const unitOptions = useMemo(() => (
    Array.from(new Set(trangBiRows.map(getUnitName))).filter(Boolean).sort()
  ), [trangBiRows]);

  const filteredRows = useMemo(() => {
    const q = normalizeText(searchVal);
    return trangBiRows.filter((row) => {
      const matchSearch = !q || [
        row.maDanhMuc,
        row.tenDanhMuc,
        row.soHieu,
        row.trangThai,
        row.tinhTrangKyThuat,
        row.chatLuong,
        getUnitName(row),
      ].some((value) => normalizeText(value).includes(q));
      const matchUnit = !unitFilter || getUnitName(row) === unitFilter;
      const matchGroup = groupFilter === 'all' || row.nhomTrangBi === (groupFilter === 'n1' ? 1 : 2);
      return matchSearch && matchUnit && matchGroup;
    });
  }, [trangBiRows, searchVal, unitFilter, groupFilter]);

  const dashboardStats = useMemo(() => {
    const total = filteredRows.length;
    const goodCount = filteredRows.filter(isGoodTechnical).length;
    return {
      tongSoLuong: total,
      dangHoatDong: filteredRows.filter(isOperating).length,
      suaChua: filteredRows.filter(isRepairing).length,
      niemCat: filteredRows.filter(isPreserved).length,
      choThanhLy: filteredRows.filter(isWaitingLiquidation).length,
      daThanhLy: filteredRows.filter(isLiquidated).length,
      heSoKyThuat: total > 0 ? goodCount / total : 0,
    };
  }, [filteredRows]);

  const phanVungDonViData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredRows.forEach((row) => counts.set(getUnitName(row), (counts.get(getUnitName(row)) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value], index) => ({
        id: label,
        label,
        value,
        color: (isDark ? PIE_COLORS_DARK : PIE_COLORS_LIGHT)[index % (isDark ? PIE_COLORS_DARK : PIE_COLORS_LIGHT).length],
      }));
  }, [filteredRows, isDark]);

  const nienHanNamData = useMemo<NienHanDatum[]>(() => {
    const currentYear = new Date().getFullYear();
    const counts = new Map<number, { soLuong: number; hetNienHan: number }>();
    filteredRows.forEach((row) => {
      const year = row.namSanXuat || row.namSuDung;
      if (!year) return;
      const entry = counts.get(year) || { soLuong: 0, hetNienHan: 0 };
      entry.soLuong += 1;
      if (row.nienHanSuDung > 0 && year + row.nienHanSuDung <= currentYear) entry.hetNienHan += 1;
      counts.set(year, entry);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-10)
      .map(([nam, value]) => ({ nam, ...value }));
  }, [filteredRows]);

  const thongKeTheoLoai = useMemo<LoaiDatum[]>(() => {
    const counts = new Map<string, LoaiDatum>();
    filteredRows.forEach((row) => {
      const loai = getLoaiName(row);
      const entry = counts.get(loai) || { loai, soLuong: 0, hoatDong: 0, suaChua: 0, niemCat: 0, thanhLy: 0 };
      entry.soLuong += 1;
      if (isOperating(row)) entry.hoatDong += 1;
      if (isRepairing(row)) entry.suaChua += 1;
      if (isPreserved(row)) entry.niemCat += 1;
      if (isLiquidated(row) || isWaitingLiquidation(row)) entry.thanhLy += 1;
      counts.set(loai, entry);
    });
    return Array.from(counts.values()).sort((a, b) => b.soLuong - a.soLuong).slice(0, 12);
  }, [filteredRows]);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (unitFilter) chips.push({ key: 'unit', label: `Don vi: ${unitFilter}`, icon: <BusinessIcon /> });
    if (groupFilter !== 'all') chips.push({ key: 'group', label: `Nhom: ${groupFilter === 'n1' ? 'Nhom 1' : 'Nhom 2'}`, icon: <ComputerIcon /> });
    if (reportDate) chips.push({ key: 'date', label: `Ngay: ${reportDate}`, icon: <CalendarTodayIcon /> });
    return chips;
  }, [unitFilter, groupFilter, reportDate]);

  const statCards: StatCardProps[] = [
    { title: 'Tổng số lượng trang bị', value: dashboardStats.tongSoLuong, icon: <ComputerIcon />, color: militaryColors.armyGreen, subtitle: 'Nhóm 1 + Nhóm 2' },
    { title: 'Trang bị đang hoạt động', value: dashboardStats.dangHoatDong, icon: <CheckCircleIcon />, color: militaryColors.success, subtitle: 'Theo tình trạng sử dụng' },
    { title: 'Trang bị sửa chữa', value: dashboardStats.suaChua, icon: <BuildIcon />, color: militaryColors.warning, subtitle: 'Theo tình trạng sử dụng' },
    { title: 'Trang bị niêm cất/bảo quản', value: dashboardStats.niemCat, icon: <InventoryIcon />, color: militaryColors.navy, subtitle: 'Theo tình trạng sử dụng' },
    { title: 'Trang bị chờ thanh lý', value: dashboardStats.choThanhLy, icon: <HourglassEmptyIcon />, color: '#f57c00', subtitle: 'Theo tình trạng sử dụng' },
    { title: 'Trang bị đã thanh lý', value: dashboardStats.daThanhLy, icon: <DeleteSweepIcon />, color: militaryColors.error, subtitle: 'Theo tình trạng sử dụng' },
    { title: 'Hệ số kỹ thuật', value: `${(dashboardStats.heSoKyThuat * 100).toFixed(1)}%`, icon: <PercentIcon />, color: '#1565c0', subtitle: 'Tốt/Kha trên tổng số' },
  ];

  return (
    <Box sx={{ p: 1.5 }}>
      <Box mb={1.5} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            BẢNG ĐIỀU HÀNH
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thống kê từ danh sách trang bị kỹ thuật nhóm 1 và nhóm 2
          </Typography>
        </Box>
      </Box>

      {errorMessage && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{errorMessage}</Alert>}

      <CommonFilter
        search={searchVal}
        onSearchChange={setSearchVal}
        placeholder="Tìm kiếm mã, tên, trạng thái, đơn vị..."
        activeFilters={activeFilters}
        onRemoveFilter={(key) => {
          if (key === 'unit') setUnitFilter('');
          if (key === 'group') setGroupFilter('all');
          if (key === 'date') setReportDate('');
        }}
        onClearAll={() => {
          setUnitFilter('');
          setGroupFilter('all');
          setReportDate('');
          setSearchVal('');
        }}
        popoverTitle="Bộ lọc thống kê"
        popoverDescription="Thống kê trang bị kỹ thuật"
        popoverWidth={500}
        onApply={() => undefined}
        endActions={(
          <Button variant="contained" startIcon={<SearchIcon />} disabled={loading} sx={{ borderRadius: 2.5, px: 3, height: 40, textTransform: 'none', fontWeight: 700 }}>
            Cập nhật
          </Button>
        )}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, ml: 0.5 }}>ĐƠN VỊ</Typography>
            <TextField select fullWidth size="small" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
              <MenuItem value="">Tất cả</MenuItem>
              {unitOptions.map((unit) => <MenuItem key={unit} value={unit}>{unit}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, ml: 0.5 }}>NHÓM</Typography>
            <TextField select fullWidth size="small" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <MenuItem value="all">Tất cả</MenuItem>
              <MenuItem value="n1">Nhóm 1</MenuItem>
              <MenuItem value="n2">Nhóm 2</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" fontWeight={800} sx={{ display: 'block', mb: 0.5, ml: 0.5 }}>NGÀY BÁO CÁO</Typography>
            <TextField type="date" fullWidth size="small" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </Grid>
        </Grid>
      </CommonFilter>

      <Grid container spacing={2} mb={2}>
        {statCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 'grow' }} key={card.title}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card elevation={3} sx={{ borderRadius: 2.5, height: 460 }}>
            <CardContent sx={{ height: '100%' }}>
              <Typography variant="h6" fontWeight={800} gutterBottom>Phân bổ theo đơn vị</Typography>
              <Box sx={{ height: 380 }}>
                {phanVungDonViData.length > 0 ? (
                  <ResponsivePie
                    data={phanVungDonViData}
                    margin={{ top: 20, right: 150, bottom: 20, left: 20 }}
                    innerRadius={0.45}
                    padAngle={1.5}
                    cornerRadius={4}
                    colors={{ datum: 'data.color' }}
                    arcLinkLabelsTextColor={isDark ? '#e0e0e0' : '#333333'}
                    arcLabelsTextColor="#ffffff"
                    arcLabelsSkipAngle={10}
                    legends={[{ anchor: 'right', direction: 'column', translateX: 140, itemWidth: 130, itemHeight: 18, itemTextColor: isDark ? '#ccc' : '#444', symbolSize: 12, symbolShape: 'circle' }]}
                  />
                ) : (
                  <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', color: 'text.secondary' }}>
                    {loading ? <ChartSkeleton /> : 'Chưa có dữ liệu đơn vị'}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card elevation={3} sx={{ borderRadius: 2.5, height: 460 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={800} gutterBottom>Niên hạn sản xuất/sử dụng</Typography>
              <NienHanBarChart data={nienHanNamData} />
              <Box display="flex" gap={2} mt={2}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 12, bgcolor: militaryColors.navy, borderRadius: 2.5 }} />
                  <Typography variant="caption">Tổng</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box sx={{ width: 12, height: 12, bgcolor: militaryColors.error, borderRadius: 2.5 }} />
                  <Typography variant="caption">Hết hạn</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Card elevation={3} sx={{ borderRadius: 2.5 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={800} gutterBottom>Tổng số lượng theo loại</Typography>
            <TongSoLuongChart data={thongKeTheoLoai} />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;
