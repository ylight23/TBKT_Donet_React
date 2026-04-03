import React from 'react';
import { Box } from '@mui/material';
import { DropZone } from '@puckeditor/core';
import { useTemplateRuntimeContext } from '../runtimeContext';

type Props = {
  minHeight?: string;
  paddingTop?: number;
  paddingBottom?: number;
  bgColor?: string;
  borderRadius?: number;
};

export const SectionBlockConfig = {
  fields: {
    minHeight: {
      type: 'text' as const,
      label: 'Min height (mac dinh 100% de full theo main content)',
    },
    paddingTop: { type: 'number' as const, label: 'Padding top (px)' },
    paddingBottom: { type: 'number' as const, label: 'Padding bottom (px)' },
    bgColor: { type: 'text' as const, label: 'Background color (hex/css)' },
    borderRadius: { type: 'number' as const, label: 'Border radius (px)' },
  },
  defaultProps: {
    minHeight: '100%',
    paddingTop: 24,
    paddingBottom: 24,
    bgColor: '',
    borderRadius: 0,
  },
  render: ({ minHeight, paddingTop, paddingBottom, bgColor, borderRadius }: Props) => {
    const { isRuntime } = useTemplateRuntimeContext();
    const safeMinHeight = (minHeight || '').trim() || '100%';
    return (
      <Box
        sx={{
          minHeight: safeMinHeight,
          height: safeMinHeight === '100%' ? '100%' : undefined,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          pt: `${Math.max(0, Number(paddingTop ?? 24))}px`,
          pb: `${Math.max(0, Number(paddingBottom ?? 24))}px`,
          borderRadius: `${Math.max(0, Number(borderRadius ?? 0))}px`,
          bgcolor: bgColor?.trim() || 'transparent',
          border: isRuntime ? 'none' : '1px dashed',
          borderColor: isRuntime ? 'transparent' : 'divider',
          opacity: isRuntime ? 1 : 0.85,
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <DropZone zone="content" />
        </Box>
      </Box>
    );
  },
};
