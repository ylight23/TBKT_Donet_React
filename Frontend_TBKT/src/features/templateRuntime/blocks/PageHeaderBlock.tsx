import React from 'react';
import { Box, Breadcrumbs, Divider, Link, Stack, Typography } from '@mui/material';
import { DropZone } from '@puckeditor/core';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

type BreadcrumbItem = { label: string; href?: string };

type Props = {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  divider?: string;
  actionsZone?: string;
};

export const PageHeaderBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề trang' },
    subtitle: { type: 'text' as const, label: 'Mô tả phụ' },
    divider: {
      type: 'select' as const,
      label: 'Đường kẻ dưới',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
    actionsZone: {
      type: 'select' as const,
      label: 'Vùng nút hành động (DropZone)',
      options: [
        { label: 'Hiện', value: 'yes' },
        { label: 'Ẩn', value: 'no' },
      ],
    },
    breadcrumbs: {
      type: 'array' as const,
      label: 'Breadcrumbs',
      arrayFields: {
        label: { type: 'text' as const, label: 'Nhãn' },
        href: { type: 'text' as const, label: 'URL (để trống nếu là trang hiện tại)' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Trang',
    },
  },
  render: ({ title, subtitle, breadcrumbs, divider, actionsZone }: Props) => (
    <Box sx={{ p: '1px', pb: divider !== 'no' ? 0 : '2px' }}>
      {(breadcrumbs || []).length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 1 }}
        >
          {(breadcrumbs || []).map((crumb, i) => {
            const isLast = i === (breadcrumbs || []).length - 1;
            return isLast || !crumb.href ? (
              <Typography key={i} variant="caption" color="text.primary" fontWeight={600}>
                {crumb.label}
              </Typography>
            ) : (
              <Link key={i} href={crumb.href} underline="hover" variant="caption" color="text.secondary">
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.3 }}>
            {title || 'Tiêu đề trang'}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {/* Actions zone — always mounted; hidden via zero size to preserve Puck zone registration */}
        <Box
          sx={{
            flexShrink: 0,
            minWidth: actionsZone !== 'no' ? 120 : 0,
            minHeight: actionsZone !== 'no' ? 40 : 0,
            overflow: actionsZone === 'no' ? 'hidden' : 'visible',
            width: actionsZone === 'no' ? 0 : undefined,
          }}
        >
          <DropZone zone="actions" />
        </Box>
      </Stack>

      {divider !== 'no' && <Divider sx={{ mt: 2 }} />}
    </Box>
  ),
};
