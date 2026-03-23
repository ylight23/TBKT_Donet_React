import React from 'react';
import { Box } from '@mui/material';
import { DropZone } from '@puckeditor/core';

type Props = { gap?: number; leftWidth?: string };

export const TwoColumnBlockConfig = {
  fields: {
    gap: { type: 'number' as const, label: 'Khoảng cách cột (px)' },
    leftWidth: {
      type: 'select' as const,
      label: 'Tỉ lệ cột trái',
      options: [
        { label: '50% / 50%', value: '50%' },
        { label: '33% / 67%', value: '33%' },
        { label: '67% / 33%', value: '67%' },
        { label: '25% / 75%', value: '25%' },
        { label: '75% / 25%', value: '75%' },
        { label: '20% / 80%', value: '20%' },
        { label: '80% / 20%', value: '80%' },
        { label: '40% / 60%', value: '40%' },
        { label: '60% / 40%', value: '60%' },
      ],
    },
  },
  render: ({ gap, leftWidth }: Props) => {
    const lw = leftWidth || '50%';
    const rw = lw === '50%' ? '50%' : `${100 - parseInt(lw)}%`;
    return (
      <Box sx={{ display: 'flex', gap: `${gap || 16}px`, p: '1px', alignItems: 'flex-start' }}>
        <Box sx={{ width: lw, minWidth: 0, flexShrink: 0 }}>
          <DropZone zone="left" />
        </Box>
        <Box sx={{ width: rw, minWidth: 0, flexShrink: 0 }}>
          <DropZone zone="right" />
        </Box>
      </Box>
    );
  },
};
