import React from 'react';
import { Box, Typography } from '@mui/material';

type Props = { title?: string; subtitle?: string; align?: string };

export const HeadingBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'text' as const, label: 'Mô tả ngắn' },
    align: {
      type: 'select' as const,
      label: 'Canh lề',
      options: [
        { label: 'Trái', value: 'left' },
        { label: 'Giữa', value: 'center' },
        { label: 'Phải', value: 'right' },
      ],
    },
  },
  render: ({ title, subtitle, align }: Props) => (
    <Box sx={{ textAlign: (align || 'left') as React.CSSProperties['textAlign'], p: '1px' }}>
      <Typography variant="h4" fontWeight={700}>{title || 'Tiêu đề giao diện'}</Typography>
      {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
    </Box>
  ),
};
