import React, { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type AccordionPanel = { title: string; content: string };

type Props = {
  panels?: AccordionPanel[];
  variant?: string;
  defaultOpen?: string;
};

export const AccordionBlockConfig = {
  fields: {
    variant: {
      type: 'select' as const,
      label: 'Kiểu viền',
      options: [
        { label: 'Viền ngoài', value: 'outlined' },
        { label: 'Đổ bóng', value: 'elevation' },
        { label: 'Không viền', value: 'flat' },
      ],
    },
    defaultOpen: {
      type: 'select' as const,
      label: 'Mặc định mở panel đầu',
      options: [
        { label: 'Có', value: 'yes' },
        { label: 'Không', value: 'no' },
      ],
    },
    panels: {
      type: 'array' as const,
      label: 'Các panel',
      arrayFields: {
        title: { type: 'text' as const, label: 'Tiêu đề panel' },
        content: { type: 'textarea' as const, label: 'Nội dung' },
      },
      getItemSummary: (item: Record<string, unknown>) => (item.title as string) || 'Panel',
    },
  },
  render: ({ panels, variant, defaultOpen }: Props) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [expanded, setExpanded] = useState<string | false>(
      defaultOpen !== 'no' ? 'panel-0' : false,
    );
    const isFlat = variant === 'flat';

    return (
      <Box sx={{ px: 2, py: 1 }}>
        {(panels || []).length === 0 && (
          <Typography color="text.secondary" variant="caption">Chưa có panel...</Typography>
        )}
        {(panels || []).map((panel, i) => (
          <Accordion
            key={i}
            expanded={expanded === `panel-${i}`}
            onChange={(_, isExpanded) => setExpanded(isExpanded ? `panel-${i}` : false)}
            variant={isFlat ? undefined : (variant as 'outlined' | 'elevation') || 'outlined'}
            disableGutters={isFlat}
            sx={isFlat ? { boxShadow: 'none', '&:before': { display: 'none' } } : undefined}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={600}>{panel.title || `Panel ${i + 1}`}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {panel.content || 'Nội dung...'}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  },
};
