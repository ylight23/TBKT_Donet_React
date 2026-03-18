import React from 'react';
import { Box } from '@mui/material';

type Props = { height?: number };

export const SpacerBlockConfig = {
  fields: {
    height: { type: 'number' as const, label: 'Chiều cao (px)' },
  },
  render: ({ height }: Props) => <Box sx={{ height: height || 24 }} />,
};
