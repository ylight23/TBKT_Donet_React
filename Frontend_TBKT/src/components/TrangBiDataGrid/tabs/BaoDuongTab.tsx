// ============================================================
// BaoDuongTab — Nhật ký bảo dưỡng, mở log panel qua callback
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    Typography,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';

import {
    getBaoDuongSchedulesByTrangBi,
    type LocalBaoDuongScheduleByTrangBiItem,
} from '../../../apis/baoDuongScheduleApi';
import { ListSkeleton } from '../../Skeletons';

interface BaoDuongTabProps {
    trangBiId: string;
    trangBiName?: string;
    onOpenLogPanel: (editingLogId: string | null) => void;
    refreshKey?: number;
}

const BaoDuongTab: React.FC<BaoDuongTabProps> = ({
    trangBiId,
    trangBiName,
    onOpenLogPanel: _onOpenLogPanel,
    refreshKey = 0,
}) => {
    const navigate = useNavigate();
    const [items, setItems] = useState<LocalBaoDuongScheduleByTrangBiItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(() => {
        if (!trangBiId) return;
        setLoading(true);
        setError(null);
        getBaoDuongSchedulesByTrangBi(trangBiId)
            .then(setItems)
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [trangBiId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, refreshKey]);

    const handleOpenMaintenanceMenu = () => {
        const query = trangBiId ? `?idTrangBi=${encodeURIComponent(trangBiId)}` : '';
        navigate(`/bao-duong${query}`);
    };

    const resolveScheduleStatus = (item: LocalBaoDuongScheduleByTrangBiItem): {
        label: string;
        bg: string;
        color: string;
    } => {
        const now = Date.now();
        const start = item.thoiGianThucHien ? new Date(item.thoiGianThucHien).getTime() : NaN;
        const end = item.thoiGianKetThuc ? new Date(item.thoiGianKetThuc).getTime() : NaN;
        if (Number.isFinite(end) && end < now) {
            return { label: 'Quá hạn', bg: '#FCEBEB', color: '#A32D2D' };
        }
        if (Number.isFinite(start) && (!Number.isFinite(end) || end >= now) && start <= now) {
            return { label: 'Đang thực hiện', bg: '#FAEEDA', color: '#854F0B' };
        }
        return { label: 'Sắp diễn ra', bg: '#EEEDFE', color: '#3C3489' };
    };

    const renderStatusBadge = (item: LocalBaoDuongScheduleByTrangBiItem) => {
        const sc = resolveScheduleStatus(item);
        return (
            <Chip
                size="small"
                label={sc.label}
                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.65rem', height: 18 }}
            />
        );
    };

    return (
        <Box sx={{ p: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon sx={{ fontSize: 16, color: '#2563eb' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#2563eb' }}>
                        Nhật ký bảo dưỡng
                    </Typography>
                    {trangBiName && (
                        <Typography variant="caption" color="text.secondary">— {trangBiName}</Typography>
                    )}
                    {items.length > 0 && (
                        <Chip label={items.length} size="small"
                            sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#dbeafe', color: '#1d4ed8' }} />
                    )}
                </Stack>
                {trangBiId && (
                    <Button
                        size="small"
                        startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                        variant="contained"
                        onClick={handleOpenMaintenanceMenu}
                        sx={{
                            fontSize: '0.72rem',
                            textTransform: 'none',
                            bgcolor: '#3b82f6',
                            '&:hover': { bgcolor: '#2563eb' },
                        }}
                    >
                        Mở menu Bảo dưỡng
                    </Button>
                )}
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {!trangBiId && (
                <Alert severity="info" sx={{ mb: 1 }}>
                    Vui lòng lưu trang bị trước để ghi nhật ký bảo dưỡng.
                </Alert>
            )}

            {loading ? (
                <ListSkeleton rows={3} />
            ) : items.length === 0 && trangBiId ? (
                <Alert severity="info">Chưa có nhật ký bảo dưỡng cho trang bị này.</Alert>
            ) : (
                <Stack spacing={0.75}>
                    {items.map((item) => (
                        <Card key={item.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {item.thoiGianThucHien
                                                    ? new Date(item.thoiGianThucHien).toLocaleDateString('vi-VN')
                                                    : item.thoiGianLap
                                                        ? new Date(item.thoiGianLap).toLocaleDateString('vi-VN')
                                                        : '—'}
                                            </Typography>
                                            {renderStatusBadge(item)}
                                        </Stack>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {item.tenLichBaoDuong || 'Lịch bảo dưỡng'}
                                        </Typography>
                                        {item.nguoiPhuTrach && (
                                            <Typography variant="caption" color="text.secondary">
                                                Người phụ trách: {item.nguoiPhuTrach}
                                            </Typography>
                                        )}
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default BaoDuongTab;
