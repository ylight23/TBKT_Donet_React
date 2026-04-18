// ============================================================
// Component Tab: BaoQuanTab
// Displays preservation log history + DynamicFields for the equipment.
// Fields are loaded via FieldSet filtered by loai_nghiep_vu = "bao_quan".
// ============================================================
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';

import {
    getLogHistoryByTrangBi,
    type TrangBiLogSummary,
} from '../../../apis/trangBiLogApi';
import {
    LOG_STATUS_LABELS,
    LOG_STATUS_COLORS,
    LOG_TYPE_LABELS,
    LogType,
} from '../../../types/trangBiLog';
import type { LocalDynamicField as DynamicField, LocalFieldSet as FieldSet } from '../../../types/thamSo';
import { FieldSetGroup } from '../GeneralInfoTab';

interface LogTabProps {
    trangBiId: string;
    trangBiName?: string;
    fieldSets: FieldSet[];
    formData: Record<string, string>;
    onFieldChange: (fieldKey: string, value: string) => void;
}

const DEFAULT_SET_COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'];

const STATUS_CHIP_COLORS: Record<number, { bg: string; color: string }> = {
    0: { bg: '#f5f5f5', color: '#757575' },
    1: { bg: '#EAF3DE', color: '#3B6D11' },
    2: { bg: '#FAEEDA', color: '#854F0B' },
    3: { bg: '#EEEDFE', color: '#3C3489' },
    4: { bg: '#FCEBEB', color: '#A32D2D' },
};

const BaoQuanTab: React.FC<LogTabProps> = ({
    trangBiId,
    trangBiName,
    fieldSets,
    formData,
    onFieldChange,
}) => {
    const [items, setItems] = useState<TrangBiLogSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldsExpanded, setFieldsExpanded] = useState(false);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    useEffect(() => {
        if (!trangBiId) return;
        setLoading(true);
        getLogHistoryByTrangBi({ idTrangBi: trangBiId, logType: LogType.BaoQuan, limit: 20 })
            .then(setItems)
            .catch(err => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [trangBiId]);

    const renderStatusBadge = (status: number) => {
        const sc = STATUS_CHIP_COLORS[status] ?? STATUS_CHIP_COLORS[0];
        return (
            <Chip
                size="small"
                label={LOG_STATUS_LABELS[status as keyof typeof LOG_STATUS_LABELS] ?? ''}
                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.65rem', height: 18 }}
            />
        );
    };

    return (
        <Box sx={{ p: 1.5 }}>
            {/* ── DynamicFields section (collapsible) ─────────────────── */}
            {fieldSets.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                    <Box
                        onClick={() => setFieldsExpanded(prev => !prev)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 0.75,
                            cursor: 'pointer',
                            borderRadius: 1.5,
                            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                            userSelect: 'none',
                            mb: 1,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : theme.palette.divider}`,
                            transition: 'all 0.15s',
                            '&:hover': {
                                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            },
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                color: 'text.secondary',
                                transition: 'transform 0.2s',
                                transform: fieldsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                        >
                            <ChevronRightIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>
                            Biểu mẫu bảo quản ({fieldSets.length} bộ dữ liệu)
                        </Typography>
                        <Chip
                            label={`${fieldSets.reduce((a, fs) => a + (fs.fields?.length ?? 0), 0)} trường`}
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 18 }}
                        />
                    </Box>

                    {fieldsExpanded && fieldSets.map((fs, idx) => (
                        <Box
                            key={fs.id ?? `bao-quan-fs-${idx}`}
                            sx={{
                                mb: 1.5,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : theme.palette.divider}`,
                                borderRadius: 2,
                                overflow: 'hidden',
                            }}
                        >
                            {fs.name && (
                                <Box
                                    sx={{
                                        px: 1.5,
                                        py: 0.75,
                                        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : theme.palette.divider}`,
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={0.75}>
                                        <Box
                                            sx={{
                                                width: 3,
                                                height: 14,
                                                borderRadius: '2px',
                                                bgcolor: fs.color || DEFAULT_SET_COLORS[idx % DEFAULT_SET_COLORS.length],
                                            }}
                                        />
                                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                                            {fs.name}
                                        </Typography>
                                    </Stack>
                                </Box>
                            )}
                            <Box sx={{ px: 1.5, py: 1 }}>
                                <FieldSetGroup
                                    fieldSet={fs}
                                    fields={fs.fields ?? []}
                                    formData={formData}
                                    onFieldChange={onFieldChange}
                                    color={fs.color || DEFAULT_SET_COLORS[idx % DEFAULT_SET_COLORS.length]}
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}

            <Divider sx={{ my: 1 }} />

            {/* ── Log history section ─────────────────────────────── */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon sx={{ fontSize: 16, color: '#639922' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#639922' }}>
                        Nhật ký bảo quản
                    </Typography>
                    {trangBiName && (
                        <Typography variant="caption" color="text.secondary">
                            — {trangBiName}
                        </Typography>
                    )}
                </Stack>
                <Button
                    size="small"
                    startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                    variant="outlined"
                    sx={{ fontSize: '0.72rem', textTransform: 'none' }}
                >
                    Thêm bảo quản
                </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
            ) : items.length === 0 ? (
                <Alert severity="info">
                    Chưa có nhật ký bảo quản cho trang bị này.
                </Alert>
            ) : (
                <Stack spacing={0.75}>
                    {items.map(item => (
                        <Card key={item.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {item.ngayThucHien
                                                    ? new Date(item.ngayThucHien).toLocaleDateString('vi-VN')
                                                    : item.ngayDuKien
                                                        ? new Date(item.ngayDuKien).toLocaleDateString('vi-VN')
                                                        : '—'}
                                            </Typography>
                                            {renderStatusBadge(item.status)}
                                        </Stack>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {LOG_TYPE_LABELS[LogType.BaoQuan]}
                                        </Typography>
                                        {item.ktvChinh && (
                                            <Typography variant="caption" color="text.secondary">
                                                KTV: {item.ktvChinh}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton size="small" sx={{ p: 0.25 }}>
                                            <InfoIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        <IconButton size="small" color="error" sx={{ p: 0.25 }}>
                                            <DeleteIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default BaoQuanTab;
