import React, { useEffect, useState } from 'react';
import { Alert, Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { nameToIcon } from '../../../utils/thamSoUtils';
import thamSoApi from '../../../apis/thamSoApi';
import type { DynamicMenuConfigItem } from '../../../types/dynamicMenu';
import { useMyPermissions } from '../../../hooks/useMyPermissions';
import { TreeSkeleton } from '../../../components/Skeletons';

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
    const { canFunc, isAdmin, loaded: permLoaded } = useMyPermissions();
    const [items, setItems] = useState<DynamicMenuConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
      let cancelled = false;
      const load = async () => {
        try {
          setLoadError('');
          const menus = await thamSoApi.getListDynamicMenus();
          if (!cancelled) {
            const visibleByPermission = menus.filter((m) => {
              if (!permLoaded || isAdmin) return true;
              return !m.permissionCode || canFunc(m.permissionCode, 'view');
            });
            const filtered = showDisabled === 'yes'
              ? visibleByPermission
              : visibleByPermission.filter((m) => m.enabled);
            setItems(filtered as DynamicMenuConfigItem[]);
          }
        } catch (err) {
          if (!cancelled) {
            setItems([]);
            setLoadError((err as Error)?.message || 'Khong the tai danh sach menu dong.');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      void load();
      return () => { cancelled = true; };
    }, [showDisabled, canFunc, isAdmin, permLoaded]);

    if (loading) {
      return <TreeSkeleton rows={6} />;
    }

    return (
      <Box sx={{ py: 1 }}>
        {title && (
          <Typography variant="subtitle1" fontWeight={700} sx={{ px: 2, mb: 1 }}>
            {title}
          </Typography>
        )}
        {loadError && (
          <Alert severity="warning" sx={{ mx: 2, mb: 1 }}>
            {loadError}
          </Alert>
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
