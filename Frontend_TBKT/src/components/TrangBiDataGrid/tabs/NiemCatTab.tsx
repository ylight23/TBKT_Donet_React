import React, { useEffect, useState, useCallback } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';

import {
    getLogHistoryByTrangBi,
    deleteTrangBiLog,
    type TrangBiLogSummary,
} from '../../../apis/trangBiLogApi';
import { LogType, LOG_STATUS_LABELS, LOG_TYPE_LABELS } from '../../../types/trangBiLog';
import { ListSkeleton } from '../../Skeletons';

interface NiemCatTabProps {
    trangBiId: string;
    trangBiName?: string;
    onOpenLogPanel: (editingLogId: string | null) => void;
    refreshKey?: number;
}

const STATUS_CHIP_COLORS: Record<number, { bg: string; color: string }> = {
    0: { bg: '#f5f5f5', color: '#757575' },
    1: { bg: '#EAF3DE', color: '#3B6D11' },
    2: { bg: '#FAEEDA', color: '#854F0B' },
    3: { bg: '#EEEDFE', color: '#3C3489' },
    4: { bg: '#FCEBEB', color: '#A32D2D' },
};

const NiemCatTab: React.FC<NiemCatTabProps> = ({ trangBiId, trangBiName, onOpenLogPanel, refreshKey = 0 }) => {
    const navigate = useNavigate();
    const [items, setItems] = useState<TrangBiLogSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadHistory = useCallback(() => {
        if (!trangBiId) return;
        setLoading(true);
        setError(null);
        getLogHistoryByTrangBi({ idTrangBi: trangBiId, logType: LogType.NiemCat, limit: 50 })
            .then(setItems)
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [trangBiId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, refreshKey]);

    const handleOpenMenu = () => {
        const query = trangBiId ? `?idTrangBi=${encodeURIComponent(trangBiId)}` : '';
        navigate(`/niem-cat${query}`);
    };

    const handleDelete = async (logId: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa nhật ký niêm cất này?')) return;
        setDeletingId(logId);
        try {
            await deleteTrangBiLog([logId]);
            setItems((prev) => prev.filter((item) => item.id !== logId));
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setDeletingId(null);
        }
    };

    const renderStatusBadge = (status: number) => {
        const sc = STATUS_CHIP_COLORS[status] ?? STATUS_CHIP_COLORS[0];
        return <Chip size="small" label={LOG_STATUS_LABELS[status as keyof typeof LOG_STATUS_LABELS] ?? ''} sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.65rem', height: 18 }} />;
    };

    return (
        <Box sx={{ p: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon sx={{ fontSize: 16, color: '#7c3aed' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#7c3aed' }}>Nhật ký niêm cất</Typography>
                    {trangBiName && <Typography variant="caption" color="text.secondary">- {trangBiName}</Typography>}
                    {items.length > 0 && <Chip label={items.length} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#ede9fe', color: '#6d28d9' }} />}
                </Stack>
                {trangBiId && (
                    <Button size="small" startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />} variant="outlined" onClick={handleOpenMenu} sx={{ fontSize: '0.72rem', textTransform: 'none', color: '#7c3aed', borderColor: '#7c3aed' }}>
                        Mở menu niêm cất
                    </Button>
                )}
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>}
            {!trangBiId && <Alert severity="info" sx={{ mb: 1 }}>Vui lòng lưu trang bị trước để xem lịch sử niêm cất.</Alert>}

            {loading ? (
                <ListSkeleton rows={3} />
            ) : items.length === 0 && trangBiId ? (
                <Alert severity="info">Chưa có nhật ký niêm cất cho trang bị này.</Alert>
            ) : (
                <Stack spacing={0.75}>
                    {items.map((item) => (
                        <Card key={item.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                            <Typography variant="caption" fontWeight={700} color="text.secondary">
                                                {item.ngayThucHien ? new Date(item.ngayThucHien).toLocaleDateString('vi-VN') : item.ngayDuKien ? new Date(item.ngayDuKien).toLocaleDateString('vi-VN') : '-'}
                                            </Typography>
                                            {renderStatusBadge(item.status)}
                                        </Stack>
                                        <Typography variant="body2" fontWeight={600} noWrap>{LOG_TYPE_LABELS[LogType.NiemCat]}</Typography>
                                        {item.ktvChinh && <Typography variant="caption" color="text.secondary">KTV: {item.ktvChinh}</Typography>}
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton size="small" sx={{ p: 0.25 }} onClick={() => onOpenLogPanel(item.id)} title="Chỉnh sửa"><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                                        <IconButton size="small" color="error" sx={{ p: 0.25 }} onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} title="Xóa">
                                            {deletingId === item.id ? <CircularProgress size={14} /> : <DeleteIcon sx={{ fontSize: 14 }} />}
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

export default NiemCatTab;
