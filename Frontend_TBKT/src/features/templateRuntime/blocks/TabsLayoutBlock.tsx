import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { DropZone } from '@puckeditor/core';

type TabItem = { label: string; icon?: string };

type Props = {
  tabs?: TabItem[];
  variant?: string;
  textColor?: string;
};

export const TabsLayoutBlockConfig = {
  fields: {
    variant: {
      type: 'select' as const,
      label: 'Kiểu tab',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Scrollable', value: 'scrollable' },
        { label: 'Full width', value: 'fullWidth' },
      ],
    },
    textColor: {
      type: 'select' as const,
      label: 'Màu text',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Inherit', value: 'inherit' },
      ],
    },
    tabs: {
      type: 'array' as const,
      label: 'Danh sách tab',
      arrayFields: {
        label: { type: 'text' as const, label: 'Tên tab' },
        icon:  { type: 'text' as const, label: 'Icon emoji (tuỳ chọn)' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.label as string) || 'Tab',
    },
  },
  render: ({ tabs, variant, textColor }: Props) => {
    const list = tabs || [{ label: 'Tab 1' }, { label: 'Tab 2' }, { label: 'Tab 3' }];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [active, setActive] = useState(0);

    return (
      <Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={active}
            onChange={(_, v) => setActive(v as number)}
            variant={(variant as 'standard' | 'scrollable' | 'fullWidth') || 'standard'}
            textColor={(textColor as 'primary' | 'secondary' | 'inherit') || 'primary'}
            indicatorColor="primary"
          >
            {list.map((tab, i) => (
              <Tab
                key={i}
                label={
                  tab.icon
                    ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </Box>
                    : tab.label
                }
              />
            ))}
          </Tabs>
        </Box>

        {list.map((_, i) => (
          <Box
            key={i}
            role="tabpanel"
            sx={{
              display: active === i ? 'block' : 'none',
              minHeight: 120,
              pt: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, opacity: 0.5 }}>
              ▸ Nội dung tab {i + 1}
            </Typography>
            <DropZone zone={`tab-${i}`} />
          </Box>
        ))}
      </Box>
    );
  },
};
