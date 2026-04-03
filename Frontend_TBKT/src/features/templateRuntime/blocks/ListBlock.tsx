import React from 'react';
import { Box, List, ListItem, ListItemText, Typography } from '@mui/material';

type ListItemData = { text: string };

type Props = { title?: string; ordered?: string; items?: ListItemData[] };

export const ListBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề danh sách' },
    ordered: {
      type: 'select' as const,
      label: 'Kiểu danh sách',
      options: [
        { label: 'Bullet (•)', value: 'unordered' },
        { label: 'Đánh số (1.)', value: 'ordered' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'Mục',
      arrayFields: {
        text: { type: 'text' as const, label: 'Nội dung' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.text as string) || 'Mục',
    },
  },
  render: ({ title, ordered, items }: Props) => (
    <Box sx={{ p: '1px' }}>
      {title && <Typography fontWeight={600} sx={{ mb: 0.5 }}>{title}</Typography>}
      <List dense component={ordered === 'ordered' ? 'ol' : 'ul'} sx={{ pl: 2 }}>
        {(items || []).map((item, i) => (
          <ListItem key={i} disableGutters>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        {(!items || items.length === 0) && (
          <ListItem disableGutters>
            <ListItemText
              primary="Chưa có mục nào..."
              primaryTypographyProps={{ color: 'text.secondary' }}
            />
          </ListItem>
        )}
      </List>
    </Box>
  ),
};
