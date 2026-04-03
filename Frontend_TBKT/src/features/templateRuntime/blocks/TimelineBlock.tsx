import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Typography,
} from '@mui/material';

type TimelineStep = {
  title: string;
  description?: string;
  date?: string;
  status?: string;
};

type Props = {
  title?: string;
  orientation?: string;
  items?: TimelineStep[];
};

const STATUS_COLOR: Record<string, string> = {
  done:    '#2e7d32',
  active:  '#1565c0',
  pending: '#9e9e9e',
  error:   '#c62828',
};
const STATUS_LABEL: Record<string, string> = {
  done:    'Hoàn thành',
  active:  'Đang xử lý',
  pending: 'Chờ',
  error:   'Lỗi',
};

export const TimelineBlockConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    orientation: {
      type: 'select' as const,
      label: 'Hướng',
      options: [
        { label: 'Dọc (vertical)', value: 'vertical' },
        { label: 'Ngang (horizontal)', value: 'horizontal' },
      ],
    },
    items: {
      type: 'array' as const,
      label: 'Các bước',
      arrayFields: {
        title:       { type: 'text' as const,     label: 'Tiêu đề bước' },
        description: { type: 'textarea' as const, label: 'Mô tả' },
        date:        { type: 'text' as const,     label: 'Ngày / thời gian' },
        status: {
          type: 'select' as const,
          label: 'Trạng thái',
          options: [
            { label: 'Hoàn thành', value: 'done' },
            { label: 'Đang xử lý', value: 'active' },
            { label: 'Chờ',        value: 'pending' },
            { label: 'Lỗi',        value: 'error' },
          ],
        },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.title as string) || 'Bước',
    },
  },
  render: ({ title, orientation, items }: Props) => {
    const list = items || [];
    const isHorizontal = orientation === 'horizontal';

    return (
      <Box sx={{ p: '2px' }}>
        {title && (
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>{title}</Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            gap: 0,
          }}
        >
          {list.length === 0 && (
            <Typography color="text.secondary" variant="caption">Chưa có bước nào...</Typography>
          )}
          {list.map((step, i) => {
            const color = STATUS_COLOR[step.status || 'pending'];
            const isDone = step.status === 'done';
            const isActive = step.status === 'active';
            const isLast = i === list.length - 1;

            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  flexDirection: isHorizontal ? 'column' : 'row',
                  alignItems: isHorizontal ? 'center' : 'flex-start',
                  flex: isHorizontal ? 1 : undefined,
                }}
              >
                {/* Dot + connector */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: isHorizontal ? 'row' : 'column',
                    alignItems: 'center',
                    mr: isHorizontal ? 0 : 2,
                    mb: isHorizontal ? 1 : 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: isActive ? color : isDone ? color : 'grey.300',
                      border: `3px solid ${color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isActive ? `0 0 0 4px ${color}22` : 'none',
                      zIndex: 1,
                      flexShrink: 0,
                    }}
                  >
                    {isDone && (
                      <Box component="span" sx={{ color: '#fff', fontSize: 14, lineHeight: 1 }}>✓</Box>
                    )}
                    {isActive && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#fff',
                        }}
                      />
                    )}
                  </Box>
                  {!isLast && (
                    <Box
                      sx={{
                        [isHorizontal ? 'width' : 'height']: isHorizontal ? '100%' : 32,
                        [isHorizontal ? 'height' : 'width']: '2px',
                        bgcolor: isDone ? color : 'grey.300',
                        flex: isHorizontal ? 1 : undefined,
                        mx: isHorizontal ? 0.5 : undefined,
                        my: isHorizontal ? undefined : 0.25,
                      }}
                    />
                  )}
                </Box>

                {/* Content */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: isHorizontal ? 0 : 1,
                    flex: isHorizontal ? 1 : undefined,
                    width: isHorizontal ? '100%' : undefined,
                    borderColor: isActive ? color : 'divider',
                    borderLeftWidth: isHorizontal ? undefined : 3,
                    borderLeftColor: isHorizontal ? undefined : color,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{step.title}</Typography>
                    <Chip
                      label={STATUS_LABEL[step.status || 'pending']}
                      size="small"
                      sx={{
                        bgcolor: `${color}18`,
                        color,
                        fontWeight: 700,
                        fontSize: 10,
                        height: 20,
                        flexShrink: 0,
                      }}
                    />
                  </Box>
                  {step.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {step.description}
                    </Typography>
                  )}
                  {step.date && (
                    <Typography variant="caption" sx={{ color, fontWeight: 500, display: 'block', mt: 0.5 }}>
                      {step.date}
                    </Typography>
                  )}
                </Paper>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  },
};
