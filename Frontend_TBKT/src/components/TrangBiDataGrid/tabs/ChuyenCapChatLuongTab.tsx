import React, { useCallback, useEffect, useState } from 'react';
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
    getChuyenCapChatLuongSchedulesByTrangBi,
    type LocalChuyenCapChatLuongScheduleGridItem,
} from '../../../apis/chuyenCapChatLuongScheduleApi';
import { ListSkeleton } from '../../Skeletons';

interface ChuyenCapChatLuongTabProps {
    trangBiId: string;
    trangBiNhom: 1 | 2;
    trangBiName?: string;
    refreshKey?: number;
}

const ChuyenCapChatLuongTab: React.FC<ChuyenCapChatLuongTabProps> = ({
    trangBiId,
    trangBiNhom,
    trangBiName,
    refreshKey = 0,
}) => {
    const navigate = useNavigate();
    const [items, setItems] = useState<LocalChuyenCapChatLuongScheduleGridItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadHistory = useCallback(() => {
        if (!trangBiId) return;
        setLoading(true);
        setError(null);
        getChuyenCapChatLuongSchedulesByTrangBi(trangBiId, trangBiNhom)
            .then(setItems)
            .catch((err) => setError((err as Error).message))
            .finally(() => setLoading(false));
    }, [trangBiId, trangBiNhom]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory, refreshKey]);

    const handleOpenUpgradeMenu = () => {
        const query = trangBiId ? `?idTrangBi=${encodeURIComponent(trangBiId)}&nhom=${trangBiNhom}` : '';
        navigate(`/chuyen-cap-chat-luong${query}`);
    };

    return (
        <Box sx={{ p: 1.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <InfoIcon sx={{ fontSize: 16, color: '#2e7d32' }} />
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#2e7d32' }}>
                        Nhật ký chuyển cấp chất lượng
                    </Typography>
                    {trangBiName && (
                        <Typography variant="caption" color="text.secondary">- {trangBiName}</Typography>
                    )}
                    {items.length > 0 && (
                        <Chip label={items.length} size="small" sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#dcfce7', color: '#15803d' }} />
                    )}
                </Stack>
                {trangBiId && (
                    <Button
                        size="small"
                        startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                        variant="contained"
                        onClick={handleOpenUpgradeMenu}
                        sx={{ fontSize: '0.72rem', textTransform: 'none', bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                    >
                        Mở menu chuyển cấp
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
                    Vui lòng lưu trang bị trước để xem lịch chuyển cấp chất lượng.
                </Alert>
            )}

            {loading ? (
                <ListSkeleton rows={3} />
            ) : items.length === 0 && trangBiId ? (
                <Alert severity="info">Chưa có lịch chuyển cấp chất lượng cho trang bị này.</Alert>
            ) : (
                <Stack spacing={0.75}>
                    {items.map((item) => (
                        <Card key={item.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                            <CardContent sx={{ p: 1.25, '&:last-child': { pb: 1.25 } }}>
                                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        {item.ngaySua ? new Date(item.ngaySua).toLocaleDateString('vi-VN') : '-'}
                                    </Typography>
                                    {item.capChatLuong && (
                                        <Chip size="small" label={item.capChatLuong} sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 600, fontSize: '0.65rem', height: 18 }} />
                                    )}
                                </Stack>
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {item.tenChuyenCapChatLuong || 'Chuyển cấp chất lượng'}
                                </Typography>
                                {item.donViThucHien && (
                                    <Typography variant="caption" color="text.secondary">
                                        Đơn vị thực hiện: {item.donViThucHien}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

export default ChuyenCapChatLuongTab;
