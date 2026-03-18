import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ChipProps } from '@mui/material';

type ChipItemData = { label: string };

type Props = { title?: string; color?: ChipProps['color']; items?: ChipItemData[] };

export const ChipListBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề (tuỳ chọn)' },
    color: {
      type: 'select' as const,
      label: 'Màu chip',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
        { label: 'Error', value: 'error' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'Tags',
      arrayFields: {
        label: { type: 'text' as const, label: 'Nhãn' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Tag',
    },
  },
  render: ({ title, color, items }: Props) => (
    <Box sx={{ p: '1px' }}>
      {title && (
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>{title}</Typography>
      )}
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {(items || []).map((item, i) => (
          <Chip key={i} label={item.label} color={color || 'default'} size="small" />
        ))}
        {(!items || items.length === 0) && (
          <Chip label="Tag mẫu" color="default" size="small" />
        )}
      </Stack>
    </Box>
  ),
};
