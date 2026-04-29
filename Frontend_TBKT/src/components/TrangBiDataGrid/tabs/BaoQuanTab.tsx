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
    getBaoQuanSchedulesByTrangBi,
    type LocalBaoQuanScheduleByTrangBiItem,
} from '../../../apis/baoQuanScheduleApi';
import { ListSkeleton } from '../../Skeletons';

interface BaoQuanTabProps {
    trangBiId: string;
    trangBiName?: string;
    onOpenLogPanel: (editingLogId: string | null) => void;
    refreshKey?: number;
}

const BaoQuanTab: React.FC<BaoQuanTabProps> = ({
    trangBiId,
    trangBiName,
    onOpenLogPanel: _onOpenLogPanel,
    refreshKey = 0,
}) => {
    const navigate = useNavigate();
    const [items, setItems] = useState<LocalBaoQuanScheduleByTrangBiItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(() => {
        if (!trangBiId) return;
        setLoading(true);
        setError(null);
        getBaoQuanSchedulesByTrangBi(trangBiId)
            .then(setItems)
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [trangBiId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, refreshKey]);

    const handleOpenPreservationMenu = () => {
        const query = trangBiId ? `?idTrangBi=${encodeURIComponent(trangBiId)}` : '';
        navigate(`/bao-quan${query}`);
    };

    const resolveScheduleStatus = (item: LocalBaoQuanScheduleByTrangBiItem): {
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

    const renderStatusBadge = (item: LocalBaoQuanScheduleByTrangBiItem) => {
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
                    <InfoIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#16a34a' }}>
                        Nhật ký bảo quản
                    </Typography>
                    {trangBiName && (
                        <Typography variant="caption" color="text.secondary">- {trangBiName}</Typography>
                    )}
                    {items.length > 0 && (
                        <Chip label={items.length} size="small"
                            sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#dcfce7', color: '#15803d' }} />
                    )}
                </Stack>
                {trangBiId && (
                    <Button
                        size="small"
                        startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                        variant="contained"
                        onClick={handleOpenPreservationMenu}
                        sx={{
                            fontSize: '0.72rem',
                            textTransform: 'none',
                            bgcolor: '#16a34a',
                            '&:hover': { bgcolor: '#15803d' },
                        }}
                    >
                        Mở menu bảo quản
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
                    Vui lòng lưu trang bị trước để ghi nhật ký bảo quản.
                </Alert>
            )}

            {loading ? (
                <ListSkeleton rows={3} />
            ) : items.length === 0 && trangBiId ? (
                <Alert severity="info">Chưa có nhật ký bảo quản cho trang bị này.</Alert>
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
                                                        : '-'}
                                            </Typography>
                                            {renderStatusBadge(item)}
                                        </Stack>
                                        <Typography variant="body2" fontWeight={600} noWrap>
                                            {item.tenLichBaoQuan || 'Lịch bảo quản'}
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

export default BaoQuanTab;
