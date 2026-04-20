// ============================================================
// DieuDongTab — Nhật ký điều động, mở log panel qua callback
// ============================================================
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
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';

import {
    getLogHistoryByTrangBi,
    deleteTrangBiLog,
    type TrangBiLogSummary,
} from '../../../apis/trangBiLogApi';
import { LogType, LOG_STATUS_LABELS, LOG_TYPE_LABELS } from '../../../types/trangBiLog';

interface DieuDongTabProps {
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

const DieuDongTab: React.FC<DieuDongTabProps> = ({
    trangBiId,
    trangBiName,
    onOpenLogPanel,
    refreshKey = 0,
}) => {
    const [items, setItems] = useState<TrangBiLogSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadHistory = useCallback(() => {
        if (!trangBiId) return;
        setLoading(true);
        setError(null);
        getLogHistoryByTrangBi({ idTrangBi: trangBiId, logType: LogType.DieuDong, limit: 50 })
            .then(setItems)
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [trangBiId]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, refreshKey]);

    const handleAdd = () => onOpenLogPanel(null);
    const handleEdit = (logId: string) => onOpenLogPanel(logId);

    const handleDelete = async (logId: string) => {
        if (!window.confirm('Bạn có chắc muốn xóa nhật ký điều động này?')) return;
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon sx={{ fontSize: 16, color: '#0891b2' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#0891b2' }}>
                        Nhật ký điều động
                    </Typography>
                    {trangBiName && (
                        <Typography variant="caption" color="text.secondary">— {trangBiName}</Typography>
                    )}
                    {items.length > 0 && (
                        <Chip label={items.length} size="small"
                            sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#cffafe', color: '#0e7490' }} />
                    )}
                </Stack>
                {trangBiId && (
                    <Button
                        size="small"
                        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                        variant="contained"
                        onClick={handleAdd}
                        sx={{
                            fontSize: '0.72rem',
                            textTransform: 'none',
                            bgcolor: '#06b6d4',
                            '&:hover': { bgcolor: '#0891b2' },
                        }}
                    >
                        Thêm điều động
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
                    Vui lòng lưu trang bị trước để ghi nhật ký điều động.
                </Alert>
            )}

            {loading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : items.length === 0 && trangBiId ? (
                <Alert severity="info">Chưa có nhật ký điều động cho trang bị này.</Alert>
            ) : (
                <Stack spacing={0.75}>
                    {items.map((item) => (
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
                                            {LOG_TYPE_LABELS[LogType.DieuDong]}
                                        </Typography>
                                        {item.ktvChinh && (
                                            <Typography variant="caption" color="text.secondary">
                                                KTV: {item.ktvChinh}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton
                                            size="small"
                                            sx={{ p: 0.25 }}
                                            onClick={() => handleEdit(item.id)}
                                            title="Chỉnh sửa"
                                        >
                                            <EditIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            sx={{ p: 0.25 }}
                                            onClick={() => handleDelete(item.id)}
                                            disabled={deletingId === item.id}
                                            title="Xóa"
                                        >
                                            {deletingId === item.id ? (
                                                <CircularProgress size={14} />
                                            ) : (
                                                <DeleteIcon sx={{ fontSize: 14 }} />
                                            )}
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

export default DieuDongTab;
