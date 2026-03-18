import React from 'react';
import { Box, Divider, Grid, Link, Stack, Typography } from '@mui/material';

type FooterLink = { label: string; href?: string };
type FooterColumn = { heading: string; links?: FooterLink[] };

type Props = {
  brand?: string;
  tagline?: string;
  copyright?: string;
  bgColor?: string;
  columns?: FooterColumn[];
};

export const FooterBlockConfig = {
  fields: {
    brand:     { type: 'text' as const, label: 'Tên thương hiệu / logo text' },
    tagline:   { type: 'text' as const, label: 'Slogan / mô tả ngắn' },
    copyright: { type: 'text' as const, label: 'Copyright (vd: © 2026 Công ty ABC)' },
    bgColor: {
      type: 'select' as const,
      label: 'Màu nền',
      options: [
        { label: 'Tối (dark)',     value: 'dark' },
        { label: 'Xám nhạt',      value: 'light' },
        { label: 'Primary',       value: 'primary' },
        { label: 'Trắng / viền',  value: 'white' },
      ],
    },
    columns: {
      type: 'array' as const,
      label: 'Nhóm liên kết',
      arrayFields: {
        heading: { type: 'text' as const, label: 'Tiêu đề nhóm' },
        links: {
          type: 'array' as const,
          label: 'Liên kết',
          arrayFields: {
            label: { type: 'text' as const, label: 'Nhãn' },
            href:  { type: 'text' as const, label: 'URL' },
          },
          getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Link',
        },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.heading as string) || 'Nhóm',
    },
  },
  render: ({ brand, tagline, copyright, bgColor, columns }: Props) => {
    const isDark    = bgColor === 'dark' || bgColor === 'primary';
    const bgMap: Record<string, string> = {
      dark:    '#1a1a2e',
      primary: '#1565c0',
      light:   '#f5f5f5',
      white:   '#fff',
    };
    const bg        = bgMap[bgColor || 'dark'];
    const textColor = isDark ? '#fff' : 'text.primary';
    const subColor  = isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary';
    const linkColor = isDark ? 'rgba(255,255,255,0.75)' : 'text.secondary';
    const divColor  = isDark ? 'rgba(255,255,255,0.12)' : 'divider';

    return (
      <Box sx={{ bgcolor: bg, px: 4, pt: 5, pb: 3 }}>
        <Grid container spacing={4}>
          {/* Brand column */}
          <Grid size={{ xs: 12, md: columns && columns.length > 0 ? 3 : 12 }}>
            {brand && (
              <Typography variant="h6" fontWeight={800} sx={{ color: textColor, mb: 1 }}>
                {brand}
              </Typography>
            )}
            {tagline && (
              <Typography variant="body2" sx={{ color: subColor, maxWidth: 260 }}>
                {tagline}
              </Typography>
            )}
          </Grid>

          {/* Link columns */}
          {(columns || []).map((col, ci) => (
            <Grid size={{ xs: 6, md: 'grow' }} key={ci}>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: textColor,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  display: 'block',
                  mb: 1.5,
                }}
              >
                {col.heading}
              </Typography>
              <Stack spacing={1}>
                {(col.links || []).map((lnk, li) => (
                  <Link
                    key={li}
                    href={lnk.href || '#'}
                    underline="hover"
                    sx={{ color: linkColor, fontSize: 14 }}
                  >
                    {lnk.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mt: 4, mb: 2, borderColor: divColor }} />
        <Typography variant="caption" sx={{ color: subColor }}>
          {copyright || `© ${new Date().getFullYear()} — All rights reserved`}
        </Typography>
      </Box>
    );
  },
};
