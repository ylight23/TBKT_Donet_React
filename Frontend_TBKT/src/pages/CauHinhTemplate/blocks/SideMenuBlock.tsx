import React from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';

type SideMenuItem = {
  icon?: string;
  label: string;
  badge?: string;
  active?: string;
  group?: string;
};

type Props = {
  title?: string;
  width?: string;
  bgColor?: string;
  compact?: string;
  items?: SideMenuItem[];
};

export const SideMenuBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề sidebar' },
    width: {
      type: 'select' as const,
      label: 'Chiều rộng',
      options: [
        { label: '200px', value: '200px' },
        { label: '240px', value: '240px' },
        { label: '280px', value: '280px' },
        { label: '320px', value: '320px' },
      ],
    },
    bgColor: {
      type: 'select' as const,
      label: 'Màu nền',
      options: [
        { label: 'Trắng', value: 'white' },
        { label: 'Xám nhạt', value: 'grey' },
        { label: 'Tối', value: 'dark' },
        { label: 'Primary', value: 'primary' },
      ],
    },
    compact: {
      type: 'select' as const,
      label: 'Chế độ compact',
      options: [
        { label: 'Bình thường', value: 'no' },
        { label: 'Compact (chỉ icon)', value: 'yes' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'Menu items',
      arrayFields: {
        icon: { type: 'text' as const, label: 'Icon (emoji hoặc ký tự)' },
        label: { type: 'text' as const, label: 'Nhãn' },
        badge: { type: 'text' as const, label: 'Badge' },
        active: {
          type: 'select' as const,
          label: 'Đang chọn',
          options: [
            { label: 'Không', value: 'no' },
            { label: 'Có', value: 'yes' },
          ],
        },
        group: { type: 'text' as const, label: 'Nhóm (tiêu đề section)' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Item',
    },
  },
  render: ({ title, width, bgColor, compact, items }: Props) => {
    const isCompact = compact === 'yes';
    const isDark = bgColor === 'dark' || bgColor === 'primary';
    const bgMap: Record<string, string> = {
      white: '#fff',
      grey: '#f5f5f5',
      dark: '#1a1a2e',
      primary: '#1565c0',
    };
    const bg = bgMap[bgColor || 'white'];
    const textColor = isDark ? '#fff' : 'text.primary';
    const activeColor = isDark ? 'rgba(255,255,255,0.15)' : 'primary.lighter';
    const activeDotColor = isDark ? '#90caf9' : '#1565c0';

    // Group items
    const rendered: React.ReactNode[] = [];
    let lastGroup = '';
    (items || []).forEach((item, i) => {
      if (item.group && item.group !== lastGroup) {
        lastGroup = item.group;
        rendered.push(
          <Box key={`group-${i}`}>
            {i > 0 && <Divider sx={{ my: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'divider' }} />}
            {!isCompact && (
              <Typography
                variant="caption"
                sx={{
                  px: 2,
                  py: 0.5,
                  display: 'block',
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {item.group}
              </Typography>
            )}
          </Box>,
        );
      }

      rendered.push(
        <ListItem key={i} disablePadding>
          <ListItemButton
            sx={{
              borderRadius: 1.5,
              mx: 1,
              my: 0.25,
              bgcolor: item.active === 'yes' ? activeColor : 'transparent',
              '&:hover': { bgcolor: activeColor },
              justifyContent: isCompact ? 'center' : 'flex-start',
              px: isCompact ? 1 : 1.5,
            }}
          >
            {item.icon && (
              <ListItemIcon sx={{ minWidth: isCompact ? 0 : 36 }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: item.active === 'yes' ? activeDotColor : 'transparent',
                    color: item.active === 'yes' ? '#fff' : textColor,
                    fontSize: 16,
                  }}
                >
                  {item.icon}
                </Avatar>
              </ListItemIcon>
            )}
            {!isCompact && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: item.active === 'yes' ? 700 : 400,
                  color: textColor,
                  noWrap: true,
                }}
              />
            )}
            {!isCompact && item.badge && (
              <Badge
                badgeContent={item.badge}
                color="error"
                sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none' } }}
              />
            )}
          </ListItemButton>
        </ListItem>,
      );
    });

    return (
      <Box
        sx={{
          width: width || '240px',
          bgcolor: bg,
          minHeight: 480,
          borderRight: '1px solid',
          borderColor: isDark ? 'transparent' : 'divider',
          py: 1,
        }}
      >
        {title && !isCompact && (
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ px: 2, py: 1.5, color: textColor, letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
        )}
        <List dense disablePadding>
          {rendered.length > 0 ? rendered : (
            <ListItem>
              <ListItemText
                primary="Chưa có menu item"
                primaryTypographyProps={{ color: 'text.secondary', variant: 'caption' }}
              />
            </ListItem>
          )}
        </List>
      </Box>
    );
  },
};
