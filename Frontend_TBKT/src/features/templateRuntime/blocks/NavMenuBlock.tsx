import React from 'react';
import { AppBar, Badge, Box, Chip, Stack, Toolbar, Typography } from '@mui/material';

type NavItem = { label: string; href?: string; badge?: string; active?: string };

type Props = {
  logo?: string;
  bgVariant?: string;
  items?: NavItem[];
  sticky?: string;
};

const COLOR_MAP: Record<string, { bg: string; text: string; activeBg: string }> = {
  primary:     { bg: '#1565c0', text: '#fff', activeBg: '#0d47a1' },
  dark:        { bg: '#1a1a2e', text: '#fff', activeBg: '#16213e' },
  white:       { bg: '#fff', text: '#1a1a2e', activeBg: '#f0f4ff' },
  transparent: { bg: 'transparent', text: '#1a1a2e', activeBg: 'rgba(0,0,0,0.06)' },
};

export const NavMenuBlockConfig = {
  fields: {
    logo: { type: 'text' as const, label: 'Tên / Logo text' },
    bgVariant: {
      type: 'select' as const,
      label: 'Màu nền',
      options: [
        { label: 'Primary (xanh)', value: 'primary' },
        { label: 'Tối (dark)', value: 'dark' },
        { label: 'Trắng', value: 'white' },
        { label: 'Trong suốt', value: 'transparent' },
      ],
    },
    sticky: {
      type: 'select' as const,
      label: 'Dính đầu trang (sticky)',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'Menu items',
      arrayFields: {
        label: { type: 'text' as const, label: 'Nhãn' },
        href: { type: 'text' as const, label: 'URL' },
        badge: { type: 'text' as const, label: 'Badge (số hoặc chữ)' },
        active: {
          type: 'select' as const,
          label: 'Đang chọn',
          options: [
            { label: 'Không', value: 'no' },
            { label: 'Có', value: 'yes' },
          ],
        },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Menu item',
    },
  },
  render: ({ logo, bgVariant, items, sticky }: Props) => {
    const scheme = COLOR_MAP[bgVariant || 'primary'];
    return (
      <AppBar
        position="static"
        sx={{
          bgcolor: scheme.bg,
          boxShadow: bgVariant === 'white' ? 1 : 0,
          // sticky is a render-time hint only; AppBar stays static in the editor
          ...(sticky === 'yes' && { outline: '2px dashed rgba(255,165,0,0.6)' }),
        }}
      >
        <Toolbar>
          {logo && (
            <Typography fontWeight={800} sx={{ mr: 4, color: scheme.text, letterSpacing: 1 }}>
              {logo}
            </Typography>
          )}
          <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
            {(items || []).map((item, i) => (
              <Box
                key={i}
                component={item.href ? 'a' : 'span'}
                href={item.href || undefined}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  bgcolor: item.active === 'yes' ? scheme.activeBg : 'transparent',
                  color: scheme.text,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  fontSize: 14,
                  fontWeight: item.active === 'yes' ? 700 : 400,
                  '&:hover': { bgcolor: scheme.activeBg },
                }}
              >
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    <Typography variant="body2" sx={{ color: scheme.text, fontWeight: 'inherit' }}>
                      {item.label}
                    </Typography>
                  </Badge>
                ) : (
                  item.label
                )}
              </Box>
            ))}
          </Stack>
        </Toolbar>
      </AppBar>
    );
  },
};
