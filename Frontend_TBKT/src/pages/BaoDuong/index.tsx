import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

import GanttView from '../../components/BaoDuong/GanttView';
import GanttChartSidebar from '../../components/BaoDuong/GanttChartSidebar';
import ThanhPhanBaoDuongDialog from '../../components/BaoDuong/ThanhPhanBaoDuongDialog';
import {
    getBaoDuongSchedule,
    getListBaoDuongSchedule,
    saveBaoDuongSchedule,
    type LocalBaoDuongScheduleItem,
} from '../../apis/baoDuongScheduleApi';
import trangBiKiThuatApi from '../../apis/trangBiKiThuatApi';

type EquipmentOption = {
    key: string;
    id: string;
    nhom: 1 | 2;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    donVi: string;
    idChuyenNganhKt: string;
    idNganh: string;
};

export type MaintenanceSchedule = {
    id: string;
    tenLich: string;
    canCu: string;
    thoiGianLap: string;
    donVi: string;
    nguoiPhuTrach: string;
    thoiGianThucHien: string;
    thoiGianKetThuc: string;
    noiDungCongViec: string;
    vatChatBaoDam: string;
    ketQua: string;
    parameters: Record<string, string>;
    equipmentKeys: string[];
    soTrangBi: number;
    version?: number;
};

const buildEquipmentKey = (id: string, nhom: number): string => `${nhom}:${id}`;

const BaoDuong: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);

    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentPool, setEquipmentPool] = useState<EquipmentOption[]>([]);
    const [search, setSearch] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);

    const loadEquipmentPool = useCallback(async () => {
        setEquipmentLoading(true);
        try {
            const [n1, n2] = await Promise.all([
                trangBiKiThuatApi.getListTrangBiNhom1({}),
                trangBiKiThuatApi.getListTrangBiNhom2({}),
            ]);

            const mapped: EquipmentOption[] = [
                ...n1.map((item) => ({
                    key: buildEquipmentKey(item.id, 1),
                    id: item.id,
                    nhom: 1 as const,
                    maDanhMuc: item.maDanhMuc,
                    tenDanhMuc: item.tenDanhMuc,
                    soHieu: item.soHieu,
                    donVi: item.donViQuanLy || item.donVi || '',
                    idChuyenNganhKt: item.idChuyenNganhKt || '',
                    idNganh: item.idNganh || '',
                })),
                ...n2.map((item) => ({
                    key: buildEquipmentKey(item.id, 2),
                    id: item.id,
                    nhom: 2 as const,
                    maDanhMuc: item.maDanhMuc,
                    tenDanhMuc: item.tenDanhMuc,
                    soHieu: item.soHieu,
                    donVi: item.donViQuanLy || item.donVi || '',
                    idChuyenNganhKt: item.idChuyenNganhKt || '',
                    idNganh: item.idNganh || '',
                })),
            ];
            setEquipmentPool(mapped);
        } finally {
            setEquipmentLoading(false);
        }
    }, []);

    const loadSchedules = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const rows = await getListBaoDuongSchedule({});
            const details = await Promise.all(rows.map(async (row) => {
                try {
                    return await getBaoDuongSchedule(row.id);
                } catch {
                    return null;
                }
            }));

            const detailMap = new Map<string, LocalBaoDuongScheduleItem>();
            details.forEach((detail) => {
                if (detail) detailMap.set(detail.id, detail);
            });

            const mapped: MaintenanceSchedule[] = rows.map((row) => {
                const detail = detailMap.get(row.id);
                return {
                    id: row.id,
                    tenLich: row.tenLichBaoDuong || '',
                    canCu: row.canCu || '',
                    thoiGianLap: row.thoiGianLap || '',
                    donVi: row.idDonVi || row.tenDonVi || '',
                    nguoiPhuTrach: row.nguoiPhuTrach || '',
                    thoiGianThucHien: row.thoiGianThucHien || '',
                    thoiGianKetThuc: row.thoiGianKetThuc || '',
                    noiDungCongViec: detail?.noiDungCongViec || '',
                    vatChatBaoDam: detail?.vatChatBaoDam || '',
                    ketQua: detail?.ketQua || '',
                    parameters: detail?.parameters || {},
                    equipmentKeys: (detail?.dsTrangBi || []).map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi)),
                    soTrangBi: row.soTrangBi || 0,
                    version: detail?.version || 0,
                };
            });

            mapped.sort((a, b) => {
                const d1 = new Date(a.thoiGianLap || '1970-01-01').getTime();
                const d2 = new Date(b.thoiGianLap || '1970-01-01').getTime();
                return d2 - d1;
            });
            setSchedules(mapped);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc danh sach lich bao duong.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.all([loadEquipmentPool()]).then(() => {
            void loadSchedules();
        });
    }, [loadEquipmentPool, loadSchedules]);

    const resolveStatus = useCallback((schedule: MaintenanceSchedule): 'overdue' | 'inprogress' | 'upcoming' | 'completed' | 'none' => {
        if (schedule.ketQua && schedule.ketQua.trim() !== '') return 'completed';
        const now = Date.now();
        const start = schedule.thoiGianThucHien ? new Date(schedule.thoiGianThucHien).getTime() : null;
        const end = schedule.thoiGianKetThuc ? new Date(schedule.thoiGianKetThuc).getTime() : null;
        if (!start) return 'none';
        if (end && end < now) return 'overdue';
        if (start <= now && (!end || end >= now)) return 'inprogress';
        return 'upcoming';
    }, []);

    const stats = useMemo(() => {
        let overdue = 0;
        let inprogress = 0;
        let completed = 0;
        schedules.forEach((s) => {
            const st = resolveStatus(s);
            if (st === 'overdue') overdue += 1;
            else if (st === 'inprogress') inprogress += 1;
            else if (st === 'completed') completed += 1;
        });
        return { total: schedules.length, completed, inprogress, overdue };
    }, [resolveStatus, schedules]);

    const filteredSchedules = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return schedules;
        return schedules.filter((row) => [row.tenLich, row.canCu, row.donVi, row.nguoiPhuTrach, row.noiDungCongViec]
            .some((x) => x.toLowerCase().includes(q)));
    }, [search, schedules]);

    const openCreateDialog = useCallback(() => {
        setEditingSchedule(null);
        setDialogOpen(true);
    }, []);

    const openEditDialog = useCallback(async (schedule: MaintenanceSchedule) => {
        setSaving(true);
        try {
            const detail = await getBaoDuongSchedule(schedule.id);
            const equipmentKeys = detail.dsTrangBi.map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi));
            setEditingSchedule({
                id: detail.id,
                tenLich: detail.tenLichBaoDuong || '',
                canCu: detail.canCu || '',
                thoiGianLap: detail.thoiGianLap || '',
                donVi: detail.idDonVi || detail.tenDonVi || '',
                nguoiPhuTrach: detail.nguoiPhuTrach || '',
                thoiGianThucHien: detail.thoiGianThucHien || '',
                thoiGianKetThuc: detail.thoiGianKetThuc || '',
                noiDungCongViec: detail.noiDungCongViec || '',
                vatChatBaoDam: detail.vatChatBaoDam || '',
                ketQua: detail.ketQua || '',
                parameters: detail.parameters || {},
                equipmentKeys,
                soTrangBi: detail.dsTrangBi.length,
                version: detail.version || 0,
            });
            setDialogOpen(true);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc chi tiet lich bao duong.');
        } finally {
            setSaving(false);
        }
    }, []);

    const handleSaveSchedule = useCallback(async ({ formData, selectedEquipment }: { formData: Record<string, string>; selectedEquipment: EquipmentOption[]; }) => {
        const payloadItem: LocalBaoDuongScheduleItem = {
            id: editingSchedule?.id || '',
            tenLichBaoDuong: (formData['ten_lich_bao_duong'] || '').trim(),
            canCu: formData['can_cu'] || '',
            idDonVi: formData['don_vi'] || '',
            tenDonVi: formData['don_vi'] || '',
            nguoiPhuTrach: formData['nguoi_phu_trach'] || '',
            thoiGianLap: formData['thoi_gian_lap'] || '',
            thoiGianThucHien: formData['thoi_gian_thuc_hien'] || '',
            thoiGianKetThuc: formData['thoi_gian_ket_thuc'] || '',
            noiDungCongViec: formData['noi_dung_cong_viec'] || '',
            vatChatBaoDam: formData['vat_chat_bao_dam'] || '',
            ketQua: formData['ket_qua'] || '',
            dsTrangBi: selectedEquipment.map((equipment) => ({
                idTrangBi: equipment.id,
                nhomTrangBi: equipment.nhom,
                maDanhMuc: equipment.maDanhMuc,
                tenDanhMuc: equipment.tenDanhMuc,
                soHieu: equipment.soHieu,
                idChuyenNganhKt: equipment.idChuyenNganhKt,
                idNganh: equipment.idNganh,
                parameters: {},
            })),
            parameters: formData,
            version: editingSchedule?.version || 0,
        };

        await saveBaoDuongSchedule({ item: payloadItem, expectedVersion: editingSchedule?.version });
        setDialogOpen(false);
        await loadSchedules();
    }, [editingSchedule, loadSchedules]);

    const dialogInitialData = useMemo<Record<string, string>>(() => {
        if (!editingSchedule) return {};
        return {
            ten_lich_bao_duong: editingSchedule.tenLich,
            can_cu: editingSchedule.canCu,
            thoi_gian_lap: editingSchedule.thoiGianLap,
            don_vi: editingSchedule.donVi,
            nguoi_phu_trach: editingSchedule.nguoiPhuTrach,
            thoi_gian_thuc_hien: editingSchedule.thoiGianThucHien,
            thoi_gian_ket_thuc: editingSchedule.thoiGianKetThuc,
            noi_dung_cong_viec: editingSchedule.noiDungCongViec,
            vat_chat_bao_dam: editingSchedule.vatChatBaoDam,
            ket_qua: editingSchedule.ketQua,
            ...editingSchedule.parameters,
        };
    }, [editingSchedule]);

    const dialogInitialEquipment = useMemo<EquipmentOption[]>(() => {
        if (!editingSchedule) return [];
        return equipmentPool.filter((item) => editingSchedule.equipmentKeys.includes(item.key));
    }, [editingSchedule, equipmentPool]);

    return (
        <Box sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box>
                    <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                        BAO DUONG TRANG BI
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quan ly ke hoach bao duong theo mo hinh schedule-first.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                    Them ke hoach
                </Button>
            </Stack>

            {errorMessage && (
                <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 1.5 }}>{errorMessage}</Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 1.5 }}>
                {[
                    { label: 'Tong ke hoach', value: stats.total, color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
                    { label: 'Da hoan thanh', value: stats.completed, color: '#3B6D11', bg: '#EAF3DE', border: '#97C459' },
                    { label: 'Dang thuc hien', value: stats.inprogress, color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
                    { label: 'Qua han', value: stats.overdue, color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
                ].map((item) => (
                    <Card key={item.label} variant="outlined" sx={{ borderRadius: 2, border: `0.5px solid ${item.border}44` }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <BuildCircleIcon sx={{ fontSize: 16, color: item.color }} />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight={800} sx={{ color: item.color, lineHeight: 1.1 }}>{item.value}</Typography>
                                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 1.5, alignItems: 'start' }}>
                <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <TextField
                            size="small"
                            placeholder="Tim ten ke hoach, can cu, don vi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ width: 360, '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                        />
                    </Stack>
                    <GanttView schedules={filteredSchedules} onScheduleClick={openEditDialog} loading={loading || saving} />
                </Box>
                <GanttChartSidebar schedules={filteredSchedules} onScheduleClick={openEditDialog} />
            </Box>

            <ThanhPhanBaoDuongDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSave={handleSaveSchedule}
                initialData={dialogInitialData}
                initialEquipment={dialogInitialEquipment}
                editingId={editingSchedule?.id}
                equipmentPool={equipmentPool}
                equipmentLoading={equipmentLoading}
            />
        </Box>
    );
};

export default BaoDuong;
