import React from 'react';
import { Avatar, Box, Chip, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';

type Props = {
  icon?: string;
  label?: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  active?: string;
  dividerAfter?: string;
  indent?: number;
};

export const MenuItemBlockConfig = {
  fields: {
    icon: { type: 'text' as const, label: 'Icon (emoji, ví dụ: 🏠 📊 ⚙️)' },
    label: { type: 'text' as const, label: 'Nhãn chính' },
    description: { type: 'text' as const, label: 'Mô tả phụ (tuỳ chọn)' },
    badge: { type: 'text' as const, label: 'Badge text' },
    badgeColor: {
      type: 'select' as const,
      label: 'Màu badge',
      options: [
        { label: 'Đỏ (error)', value: 'error' },
        { label: 'Xanh (primary)', value: 'primary' },
        { label: 'Cam (warning)', value: 'warning' },
        { label: 'Xanh lá (success)', value: 'success' },
      ],
    },
    active: {
      type: 'select' as const,
      label: 'Active (đang chọn)',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
    dividerAfter: {
      type: 'select' as const,
      label: 'Đường kẻ phía dưới',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
    indent: { type: 'number' as const, label: 'Thụt lề (px, dành cho sub-item)' },
  },
  render: ({ icon, label, description, badge, badgeColor, active, dividerAfter, indent }: Props) => (
    <Box
      sx={{
        borderBottom: dividerAfter === 'yes' ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      <ListItemButton
        sx={{
          pl: indent ? `${indent}px` : 2,
          pr: 2,
          py: description ? 1 : 0.75,
          bgcolor: active === 'yes' ? 'primary.50' : 'transparent',
          borderLeft: active === 'yes' ? '3px solid' : '3px solid transparent',
          borderLeftColor: active === 'yes' ? 'primary.main' : 'transparent',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        {icon && (
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: active === 'yes' ? 'primary.main' : 'grey.100',
                fontSize: 18,
              }}
            >
              {icon}
            </Avatar>
          </ListItemIcon>
        )}
        <ListItemText
          primary={label || 'Menu item'}
          secondary={description || undefined}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: active === 'yes' ? 700 : 400,
            color: active === 'yes' ? 'primary.main' : 'text.primary',
          }}
          secondaryTypographyProps={{ variant: 'caption' }}
        />
        {badge && (
          <Chip
            label={badge}
            color={(badgeColor as 'error' | 'primary' | 'warning' | 'success') || 'error'}
            size="small"
            sx={{ height: 20, fontSize: 11 }}
          />
        )}
      </ListItemButton>
    </Box>
  ),
};
