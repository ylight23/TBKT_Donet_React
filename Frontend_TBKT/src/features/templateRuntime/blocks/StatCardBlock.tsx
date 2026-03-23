import React from 'react';
import { Box, Typography } from '@mui/material';

type Props = { label?: string; value?: string; tone?: string };

export const StatCardBlockConfig = {
  fields: {
    label: { type: 'text' as const, label: 'Nhãn' },
    value: { type: 'text' as const, label: 'Giá trị' },
    tone: {
      type: 'select' as const,
      label: 'Màu nhấn',
      options: [
        { label: 'Xanh dương', value: '#1565c0' },
        { label: 'Xanh lá', value: '#2e7d32' },
        { label: 'Cam', value: '#ef6c00' },
      ],
    },
  },
  render: ({ label, value, tone }: Props) => (
    <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Typography variant="caption" sx={{ color: tone || '#1565c0', fontWeight: 700 }}>
        {label || 'Nhãn thống kê'}
      </Typography>
      <Typography variant="h5" fontWeight={700}>{value || '0'}</Typography>
    </Box>
  ),
};
