import React, { Suspense, useState } from 'react';
import { Box, Card, CardContent, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import '@puckeditor/core/puck.css';
import { GridSkeleton } from '../../components/Skeletons';

const TemplateBuilderTab = React.lazy(() => import('./components/TemplateBuilderTab'));
const FormConfigTab = React.lazy(() => import('./components/FormConfigTab'));

type ActiveTab = 'builder' | 'formConfig';

const CauHinhTemplate: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('builder');

    return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
                <Typography variant="h4" fontWeight={700}>Thiết kế giao diện (Layout + Form)</Typography>

                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                    <Typography variant="caption" color="text.disabled">Quy trình:</Typography>
                    {([
                        { label: '① Tạo template', color: 'primary.main', tooltip: 'Thiết kế layout bằng Puck Editor, đặt tên và key cho template rồi lưu vào DB' },
                        { label: '② Ghi file (Export)', color: 'secondary.main', tooltip: 'Xuất template thành file JSON vào public/templates/ để hệ thống đọc khi render' },
                        { label: '③ Tạo menu → Gán template', color: 'success.main', tooltip: 'Vào Cấu hình Menu Động → tạo menu item → chọn template key để áp dụng giao diện' },
                    ] as const).map(({ label, color, tooltip }, i) => (
                        <Stack key={label} direction="row" alignItems="center" spacing={0.5}>
                            {i > 0 && <Typography variant="caption" color="text.disabled">→</Typography>}
                            <Tooltip title={tooltip} arrow>
                                <Typography variant="caption" sx={{ color, cursor: 'help', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                                    {label}
                                </Typography>
                            </Tooltip>
                        </Stack>
                    ))}
                </Stack>

                <Card sx={{ mb: 0 }}>
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                        <Tabs
                            value={activeTab}
                            onChange={(_, v: ActiveTab) => setActiveTab(v)}
                            sx={{ '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 38 } }}
                        >
                            <Tab value="builder" label="Xây dựng template" />
                            <Tab value="formConfig" label="Quản lý form nhập" />
                        </Tabs>
                    </CardContent>
                </Card>

                {activeTab === 'builder' && (
                    <Suspense fallback={<GridSkeleton rows={8} cols={6} />}>
                        <TemplateBuilderTab />
                    </Suspense>
                )}

                {activeTab === 'formConfig' && (
                    <Suspense fallback={<GridSkeleton rows={8} cols={6} />}>
                        <FormConfigTab />
                    </Suspense>
                )}
            </Stack>
        </Box>
    );
};

export default CauHinhTemplate;
