import React, { Suspense } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import '@puckeditor/core/puck.css';
import { GridSkeleton } from '../../components/Skeletons';

const TemplateBuilderTab = React.lazy(() => import('./components/TemplateBuilderTab'));

const CauHinhTemplate: React.FC = () => (
    <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
            <Typography variant="h4" fontWeight={700}>Thiet ke giao dien template</Typography>

            <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                <Typography variant="caption" color="text.disabled">Quy trinh:</Typography>
                {([
                    { label: '1. Tao template', color: 'primary.main', tooltip: 'Thiet ke layout bang Puck Editor, dat ten va key cho template roi luu vao DB.' },
                    { label: '2. Ghi file export', color: 'secondary.main', tooltip: 'Xuat template thanh file JSON trong public/templates de runtime doc va render.' },
                    { label: '3. Gan vao man hinh', color: 'success.main', tooltip: 'Lap trinh vien chu dong gan template vao man nghiep vu tuong ung, khong dung FormConfig runtime nua.' },
                ] as const).map(({ label, color, tooltip }, i) => (
                    <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                        {i > 0 && <Typography variant="caption" color="text.disabled">/</Typography>}
                        <Tooltip title={tooltip} arrow>
                            <Typography
                                variant="caption"
                                sx={{ color, cursor: 'help', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
                            >
                                {label}
                            </Typography>
                        </Tooltip>
                    </Stack>
                ))}
            </Stack>

            <Suspense fallback={<GridSkeleton rows={8} cols={6} />}>
                <TemplateBuilderTab />
            </Suspense>
        </Stack>
    </Box>
);

export default CauHinhTemplate;
