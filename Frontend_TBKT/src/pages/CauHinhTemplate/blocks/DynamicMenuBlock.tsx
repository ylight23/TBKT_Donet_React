import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { nameToIcon } from '../../../utils/thamSoUtils';
import thamSoApi from '../../../apis/thamSoApi';
import type { DynamicMenuConfigItem } from '../../../types/dynamicMenu';

type Props = {
  title?: string;
  showDisabled?: string;
};

export const DynamicMenuBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề menu (để trống = ẩn)' },
    showDisabled: {
      type: 'select' as const,
      label: 'Hiện menu đã tắt?',
      options: [
        { label: 'Không', value: 'no' },
        { label: 'Có', value: 'yes' },
      ],
    },
  },
  defaultProps: {
    title: 'Menu động',
    showDisabled: 'no',
  },
  render: ({ title, showDisabled }: Props) => {
    const [items, setItems] = useState<DynamicMenuConfigItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const menus = await thamSoApi.getListDynamicMenus();
          if (!cancelled) {
            const filtered = showDisabled === 'yes' ? menus : menus.filter((m) => m.enabled);
            setItems(filtered as DynamicMenuConfigItem[]);
          }
        } catch {
          if (!cancelled) setItems([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      void load();
      return () => { cancelled = true; };
    }, [showDisabled]);

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    return (
      <Box sx={{ py: 1 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight={700} sx={{ px: 2, mb: 1 }}>
            {title}
          </Typography>
        )}
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
            Chưa có menu động nào.
          </Typography>
        ) : (
          <List dense disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.id}
                component="a"
                href={item.path || `/menu-dong/${item.id}`}
                sx={{ opacity: item.enabled ? 1 : 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {nameToIcon(item.icon || 'Assignment')}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  secondary={item.templateKey ? `Template: ${item.templateKey}` : undefined}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    );
  },
};
