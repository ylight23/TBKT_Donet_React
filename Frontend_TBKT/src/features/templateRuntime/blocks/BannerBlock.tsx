import React from 'react';
import { Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';

type Props = { message?: string; variant?: AlertColor };

export const BannerBlockConfig = {
  fields: {
    message: { type: 'text' as const, label: 'Thông điệp' },
    variant: {
      type: 'select' as const,
      label: 'Kiểu',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Success', value: 'success' },
        { label: 'Warning', value: 'warning' },
      ],
    },
  },
  render: ({ message, variant }: Props) => (
    <Alert severity={variant || 'info'} sx={{ m: '1px' }}>
      {message || 'Thông điệp banner'}
    </Alert>
  ),
};
