import React from 'react';
import { Box, Button } from '@mui/material';

type Props = {
  text?: string;
  href?: string;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error';
  align?: string;
};

export const ButtonBlockConfig = {
  fields: {
    text: { type: 'text' as const, label: 'Nhãn nút' },
    href: { type: 'text' as const, label: 'URL liên kết' },
    variant: {
      type: 'select' as const,
      label: 'Kiểu nút',
      options: [
        { label: 'Nền đầy', value: 'contained' },
        { label: 'Viền', value: 'outlined' },
        { label: 'Chữ', value: 'text' },
      ],
    },
    color: {
      type: 'select' as const,
      label: 'Màu',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
      ],
    },
    align: {
      type: 'select' as const,
      label: 'Canh lề',
      options: [
        { label: 'Trái', value: 'flex-start' },
        { label: 'Giữa', value: 'center' },
        { label: 'Phải', value: 'flex-end' },
      ],
    },
  },
  render: ({ text, href, variant, color, align }: Props) => (
    <Box sx={{ display: 'flex', justifyContent: align || 'flex-start', p: '1px' }}>
      <Button
        variant={variant || 'contained'}
        color={color || 'primary'}
        component={href ? 'a' : 'button'}
        href={href || undefined}
      >
        {text || 'Nút bấm'}
      </Button>
    </Box>
  ),
};
