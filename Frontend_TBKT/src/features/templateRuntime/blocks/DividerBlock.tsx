import React from 'react';
import { Box, Divider, Typography } from '@mui/material';

type Props = { label?: string; thickness?: number; margin?: number };

export const DividerBlockConfig = {
  fields: {
    label: { type: 'text' as const, label: 'Nhãn (để trống nếu không cần)' },
    thickness: { type: 'number' as const, label: 'Độ dày (px)' },
    margin: { type: 'number' as const, label: 'Lề trên/dưới (px)' },
  },
  render: ({ label, thickness, margin }: Props) => (
    <Box sx={{ px: '1px', py: `${margin ?? 12}px` }}>
      <Divider sx={{ borderBottomWidth: thickness || 1 }}>
        {label && (
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        )}
      </Divider>
    </Box>
  ),
};
