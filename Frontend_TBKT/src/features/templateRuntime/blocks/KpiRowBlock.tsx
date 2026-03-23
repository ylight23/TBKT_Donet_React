import React, { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import thamSoApi from '../../../apis/thamSoApi';

type KpiItem = {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendValue?: string;
  color?: string;
};

type Props = {
  items?: KpiItem[];
  columns?: string;
  sourceKey?: string;
};

const trendIcon = (t?: string) => {
  if (t === 'up')   return <TrendingUpIcon sx={{ fontSize: 16 }} />;
  if (t === 'down') return <TrendingDownIcon sx={{ fontSize: 16 }} />;
  return <TrendingFlatIcon sx={{ fontSize: 16 }} />;
};
const trendColor = (t?: string) =>
  t === 'up' ? 'success' : t === 'down' ? 'error' : 'default';

export const KpiRowBlockConfig = {
  fields: {
    sourceKey: { type: 'text' as const, label: 'Source key (datasource)' },
    columns: {
      type: 'select' as const,
      label: 'Số cột',
      options: [
        { label: '2 cột', value: '2' },
        { label: '3 cột', value: '3' },
        { label: '4 cột', value: '4' },
        { label: '5 cột', value: '5' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'KPI items',
      arrayFields: {
        label:      { type: 'text' as const, label: 'Nhãn' },
        value:      { type: 'text' as const, label: 'Giá trị chính' },
        sub:        { type: 'text' as const, label: 'Giá trị phụ / đơn vị' },
        trendValue: { type: 'text' as const, label: 'Chỉ số thay đổi (vd: +12%)' },
        trend: {
          type: 'select' as const,
          label: 'Xu hướng',
          options: [
            { label: 'Đi lên', value: 'up' },
            { label: 'Đi xuống', value: 'down' },
            { label: 'Không đổi', value: 'flat' },
          ],
        },
        color: {
          type: 'select' as const,
          label: 'Màu viền nhấn',
          options: [
            { label: 'Xanh', value: '#1565c0' },
            { label: 'Xanh lá', value: '#2e7d32' },
            { label: 'Cam', value: '#e65100' },
            { label: 'Tím', value: '#6a1b9a' },
            { label: 'Không màu', value: '' },
          ],
        },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'KPI',
    },
  },
  render: ({ items, columns, sourceKey }: Props) => {
    const cols = parseInt(columns || '4');
    const staticList = items || [];

    // Runtime: fetch data từ API nếu có sourceKey
    const [dynamicItems, setDynamicItems] = useState<KpiItem[]>([]);
    const [loadingKpi, setLoadingKpi] = useState(false);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
      if (!sourceKey) return;
      let cancelled = false;
      setLoadingKpi(true);
      setLoadError('');
      thamSoApi.getDynamicMenuRows(sourceKey, 50)
        .then((data) => {
          if (cancelled) return;
          // Mỗi row từ API map sang KpiItem:
          // Kỳ vọng fields: label, value, sub, trend, trendValue, color
          setDynamicItems(data.map((r) => ({
            label: String(r.label ?? r.name ?? ''),
            value: String(r.value ?? r.count ?? ''),
            sub: r.sub ? String(r.sub) : undefined,
            trend: r.trend ? String(r.trend) : undefined,
            trendValue: r.trendValue ? String(r.trendValue) : undefined,
            color: r.color ? String(r.color) : undefined,
          })));
        })
        .catch((err) => { if (!cancelled) setLoadError(String(err)); })
        .finally(() => { if (!cancelled) setLoadingKpi(false); });
      return () => { cancelled = true; };
    }, [sourceKey]);

    const list = sourceKey ? dynamicItems : staticList;

    if (loadError) return <Alert severity="error" sx={{ m: 2 }}>{loadError}</Alert>;
    if (loadingKpi) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>;

    return (
      <Box
        sx={{
          p: '1px',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 2,
        }}
      >
        {list.length === 0 && (
          <Typography color="text.secondary" variant="caption" sx={{ gridColumn: `1 / -1` }}>
            Chưa có KPI item nào...
          </Typography>
        )}
        {list.map((item, i) => (
          <Paper
            key={i}
            variant="outlined"
            sx={{
              p: 2,
              borderTop: item.color ? `3px solid ${item.color}` : '3px solid transparent',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {item.label}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ my: 0.5, lineHeight: 1.2 }}>
              {item.value || '—'}
            </Typography>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {item.sub && (
                <Typography variant="caption" color="text.secondary">{item.sub}</Typography>
              )}
              {item.trendValue && (
                <Chip
                  icon={trendIcon(item.trend)}
                  label={item.trendValue}
                  color={trendColor(item.trend) as 'success' | 'error' | 'default'}
                  size="small"
                  sx={{ height: 22, fontSize: 11 }}
                />
              )}
            </Stack>
          </Paper>
        ))}
      </Box>
    );
  },
};
