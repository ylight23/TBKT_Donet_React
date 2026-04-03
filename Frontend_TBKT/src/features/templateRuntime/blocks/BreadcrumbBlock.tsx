import React from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

type BreadcrumbItem = { label: string; href?: string };

type Props = {
  items?: BreadcrumbItem[];
  separator?: string;
  showHome?: string;
};

export const BreadcrumbBlockConfig = {
  fields: {
    showHome: {
      type: 'select' as const,
      label: 'Hiện icon Home đầu tiên',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
    separator: {
      type: 'select' as const,
      label: 'Ký tự ngăn cách',
      options: [
        { label: '›', value: '›' },
        { label: '/', value: '/' },
        { label: '→', value: '→' },
        { label: '•', value: '•' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'Các mục breadcrumb',
      arrayFields: {
        label: { type: 'text' as const, label: 'Nhãn' },
        href: { type: 'text' as const, label: 'Link (để trống = trang hiện tại)' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Mục',
    },
  },
  defaultProps: {
    showHome: 'yes',
    separator: '›',
    items: [
      { label: 'Trang chủ', href: '/' },
      { label: 'Danh mục', href: '/catalog' },
      { label: 'Trang hiện tại', href: '' },
    ],
  },
  render: ({ items, separator, showHome }: Props) => {
    const list = items || [];
    const sep = separator || '›';

    return (
      <Box sx={{ p: '2px' }}>
        <Breadcrumbs separator={sep === '›' ? <NavigateNextIcon fontSize="small" /> : sep}>
          {showHome === 'yes' && (
            <Link
              underline="hover"
              color="inherit"
              href="/"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}
            >
              <HomeIcon sx={{ fontSize: 18 }} />
            </Link>
          )}
          {list.map((item, i) => {
            const isLast = i === list.length - 1;
            return isLast || !item.href ? (
              <Typography key={i} color="text.primary" variant="body2" fontWeight={600}>
                {item.label}
              </Typography>
            ) : (
              <Link key={i} underline="hover" color="inherit" href={item.href} variant="body2">
                {item.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>
    );
  },
};
