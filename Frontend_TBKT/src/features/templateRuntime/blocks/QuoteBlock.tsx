import React from 'react';
import { Box, Typography } from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

type Props = {
  quote?: string;
  author?: string;
  role?: string;
  variant?: string;
  accentColor?: string;
};

export const QuoteBlockConfig = {
  fields: {
    quote: { type: 'textarea' as const, label: 'Nội dung trích dẫn' },
    author: { type: 'text' as const, label: 'Tác giả' },
    role:   { type: 'text' as const, label: 'Chức danh / Nguồn' },
    variant: {
      type: 'select' as const,
      label: 'Kiểu hiển thị',
      options: [
        { label: 'Viền trái',        value: 'border-left' },
        { label: 'Nền màu nhạt',     value: 'filled' },
        { label: 'Trung tâm to lớn', value: 'centered' },
      ],
    },
    accentColor: {
      type: 'select' as const,
      label: 'Màu nhấn',
      options: [
        { label: 'Xanh primary', value: '#1565c0' },
        { label: 'Xanh lá',      value: '#2e7d32' },
        { label: 'Tím',          value: '#6a1b9a' },
        { label: 'Cam',          value: '#e65100' },
      ],
    },
  },
  render: ({ quote, author, role, variant, accentColor }: Props) => {
    const color = accentColor || '#1565c0';

    if (variant === 'centered') {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <FormatQuoteIcon sx={{ fontSize: 48, color, opacity: 0.3, mb: 1 }} />
          <Typography
            variant="h6"
            fontStyle="italic"
            sx={{ maxWidth: 680, mx: 'auto', lineHeight: 1.7, color: 'text.primary' }}
          >
            "{quote || 'Trích dẫn của bạn ở đây...'}"
          </Typography>
          {(author || role) && (
            <Box sx={{ mt: 2 }}>
              {author && <Typography variant="body2" fontWeight={700}>{author}</Typography>}
              {role   && <Typography variant="caption" color="text.secondary">{role}</Typography>}
            </Box>
          )}
        </Box>
      );
    }

    if (variant === 'filled') {
      return (
        <Box sx={{ p: 3, bgcolor: `${color}0f`, borderRadius: 2, m: 2 }}>
          <FormatQuoteIcon sx={{ fontSize: 32, color, mb: 1 }} />
          <Typography variant="body1" fontStyle="italic" sx={{ lineHeight: 1.8 }}>
            {quote || 'Trích dẫn của bạn ở đây...'}
          </Typography>
          {(author || role) && (
            <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 24, height: 2, bgcolor: color }} />
              <Box>
                {author && <Typography variant="caption" fontWeight={700}>{author}</Typography>}
                {role && <Typography variant="caption" color="text.secondary"> — {role}</Typography>}
              </Box>
            </Box>
          )}
        </Box>
      );
    }

    // Default: border-left
    return (
      <Box
        sx={{
          borderLeft: `4px solid ${color}`,
          pl: 2.5,
          py: 1,
          mx: 2,
          my: 1.5,
        }}
      >
        <Typography variant="body1" fontStyle="italic" sx={{ lineHeight: 1.8 }}>
          "{quote || 'Trích dẫn của bạn ở đây...'}"
        </Typography>
        {(author || role) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {author}{role ? ` — ${role}` : ''}
          </Typography>
        )}
      </Box>
    );
  },
};
