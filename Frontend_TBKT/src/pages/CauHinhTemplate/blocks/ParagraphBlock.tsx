import React from 'react';
import { Typography } from '@mui/material';

type Props = { content?: string };

export const ParagraphBlockConfig = {
  fields: {
    content: { type: 'textarea' as const, label: 'Nội dung' },
  },
  render: ({ content }: Props) => (
    <Typography variant="body1" sx={{ p: '1px', whiteSpace: 'pre-wrap' }}>
      {content || 'Nội dung đoạn văn...'}
    </Typography>
  ),
};
