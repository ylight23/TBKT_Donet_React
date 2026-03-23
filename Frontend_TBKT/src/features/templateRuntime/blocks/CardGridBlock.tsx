import React from 'react';
import { Box, Typography } from '@mui/material';
import { DropZone } from '@puckeditor/core';

type Props = {
  columns?: string;
  gap?: number;
  rowHeight?: string;
};

export const CardGridBlockConfig = {
  fields: {
    columns: {
      type: 'select' as const,
      label: 'Số cột',
      options: [
        { label: '2 cột', value: '2' },
        { label: '3 cột', value: '3' },
        { label: '4 cột', value: '4' },
      ],
    },
    gap: { type: 'number' as const, label: 'Khoảng cách (px)' },
    rowHeight: {
      type: 'select' as const,
      label: 'Chiều cao tối thiểu mỗi ô',
      options: [
        { label: 'Tự động', value: 'auto' },
        { label: '120px', value: '120px' },
        { label: '200px', value: '200px' },
        { label: '280px', value: '280px' },
        { label: '360px', value: '360px' },
      ],
    },
  },
  render: ({ columns, gap, rowHeight }: Props) => {
    const cols = parseInt(columns || '3');
    const minH = rowHeight === 'auto' ? undefined : (rowHeight || '200px');
    const zones = Array.from({ length: cols }, (_, i) => i);

    return (
      <Box
        sx={{
          p: '1px',
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: `${gap || 16}px`,
        }}
      >
        {zones.map((i) => (
          <Box
            key={i}
            sx={{
              minHeight: minH,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', px: 1, pt: 0.5, opacity: 0.5 }}
            >
              ▸ Card {i + 1}
            </Typography>
            <DropZone zone={`cell-${i}`} />
          </Box>
        ))}
      </Box>
    );
  },
};
