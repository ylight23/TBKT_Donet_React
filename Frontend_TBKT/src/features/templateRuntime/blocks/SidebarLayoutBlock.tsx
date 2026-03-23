import React from 'react';
import { Box, Typography } from '@mui/material';
import { DropZone } from '@puckeditor/core';

type Props = {
  sidebarPosition?: string;
  sidebarWidth?: string;
  gap?: number;
  showHeader?: string;
};

export const SidebarLayoutBlockConfig = {
  fields: {
    sidebarPosition: {
      type: 'select' as const,
      label: 'Vị trí sidebar',
      options: [
        { label: 'Trái', value: 'left' },
        { label: 'Phải', value: 'right' },
      ],
    },
    sidebarWidth: {
      type: 'select' as const,
      label: 'Chiều rộng sidebar',
      options: [
        { label: '200px', value: '200px' },
        { label: '240px', value: '240px' },
        { label: '280px', value: '280px' },
        { label: '320px', value: '320px' },
      ],
    },
    gap: { type: 'number' as const, label: 'Khoảng cách (px)' },
    showHeader: {
      type: 'select' as const,
      label: 'Hiện vùng header',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
  },
  render: ({ sidebarPosition, sidebarWidth, gap, showHeader }: Props) => {
    const isLeft = (sidebarPosition || 'left') === 'left';
    const sw = sidebarWidth || '240px';
    const gp = gap || 0;
    const hideHeader = showHeader === 'no';

    return (
      <Box>
        {/* Header zone — always mounted so Puck tracks it; visually hidden via height */}
        <Box
          sx={{
            borderBottom: hideHeader ? 'none' : '1px solid',
            borderColor: 'divider',
            minHeight: hideHeader ? 0 : 56,
            overflow: hideHeader ? 'hidden' : 'visible',
            height: hideHeader ? 0 : undefined,
          }}
        >
          {!hideHeader && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 0.5, opacity: 0.5 }}>
              ▸ Header
            </Typography>
          )}
          <DropZone zone="header" />
        </Box>

        <Box sx={{ display: 'flex', gap: `${gp}px`, alignItems: 'flex-start' }}>
          {/* Sidebar - position controlled by flex order */}
          <Box
            sx={{
              order: isLeft ? 0 : 1,
              width: sw,
              minWidth: sw,
              flexShrink: 0,
              bgcolor: 'grey.50',
              borderRight: isLeft ? '1px solid' : 'none',
              borderLeft: isLeft ? 'none' : '1px solid',
              borderColor: 'divider',
              minHeight: 400,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 0.5, opacity: 0.5 }}>
              ▸ Sidebar
            </Typography>
            <DropZone zone="sidebar" />
          </Box>

          {/* Main content */}
          <Box sx={{ order: isLeft ? 1 : 0, flex: 1, minWidth: 0, minHeight: 400 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 0.5, opacity: 0.5 }}>
              ▸ Main content
            </Typography>
            <DropZone zone="main" />
          </Box>
        </Box>
      </Box>
    );
  },
};
