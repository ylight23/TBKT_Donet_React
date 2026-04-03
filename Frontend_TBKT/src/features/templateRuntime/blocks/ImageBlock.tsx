import React from 'react';
import { Box, Typography } from '@mui/material';

type Props = {
  src?: string;
  alt?: string;
  maxWidth?: string;
  borderRadius?: number;
  objectFit?: string;
};

export const ImageBlockConfig = {
  fields: {
    src: { type: 'text' as const, label: 'URL ảnh' },
    alt: { type: 'text' as const, label: 'Mô tả ảnh (alt)' },
    maxWidth: { type: 'text' as const, label: 'Chiều rộng tối đa (vd: 100%, 480px)' },
    borderRadius: { type: 'number' as const, label: 'Bo góc (px)' },
    objectFit: {
      type: 'select' as const,
      label: 'Kiểu hiển thị',
      options: [
        { label: 'Cover', value: 'cover' },
        { label: 'Contain', value: 'contain' },
        { label: 'Fill', value: 'fill' },
      ],
    },
  },
  render: ({ src, alt, maxWidth, borderRadius, objectFit }: Props) => (
    <Box sx={{ p: '1px' }}>
      {src ? (
        <Box
          component="img"
          src={src}
          alt={alt || ''}
          sx={{
            maxWidth: maxWidth || '100%',
            borderRadius: borderRadius ?? 0,
            objectFit: objectFit || 'cover',
            display: 'block',
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: 120,
            bgcolor: 'grey.200',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography color="text.secondary" variant="caption">Chưa có ảnh</Typography>
        </Box>
      )}
    </Box>
  ),
};
