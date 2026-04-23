import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useLocation } from 'react-router-dom';
import OfficeDictionary, { type OfficeNode } from '../Office/subComponent/OfficeDictionary';
import { OfficeProvider } from '../../context/OfficeContext';

import GanttView from '../../components/BaoDuong/GanttView';
import GanttChartSidebar from '../../components/BaoDuong/GanttChartSidebar';
import GenericScheduleDialog, { type EquipmentOption } from '../../components/Schedule/GenericScheduleDialog';
import {
    getNiemCatSchedule,
    getListNiemCatSchedule,
    saveNiemCatSchedule,
    type LocalNiemCatScheduleItem,
} from '../../apis/niemCatScheduleApi';
import trangBiKiThuatApi from '../../apis/trangBiKiThuatApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../../constants/fieldSetKeys';

type NiemCatTab = 'theo_doi_trang_bi' | 'ket_qua_niem_cat';

type PreserveSchedule = {
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
const normalizeForSearch = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const getStatusPriority = (status: 'overdue' | 'inprogress' | 'upcoming' | 'completed' | 'none'): number => {
    switch (status) {
        case 'inprogress': return 5;
        case 'upcoming': return 4;
        case 'overdue': return 3;
        case 'completed': return 2;
        default: return 1;
    }
};

const NiemCat: React.FC = () => {
    const location = useLocation();
    const selectedTrangBiId = useMemo(() => new URLSearchParams(location.search).get('idTrangBi') || '', [location.search]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [schedules, setSchedules] = useState<PreserveSchedule[]>([]);
    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentPool, setEquipmentPool] = useState<EquipmentOption[]>([]);
    const [search, setSearch] = useState('');
    const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
    const [activeTab, setActiveTab] = useState<NiemCatTab>('theo_doi_trang_bi');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PreserveSchedule | null>(null);

    const loadEquipmentPool = useCallback(async () => {
        setEquipmentLoading(true);
        try {
            const [n1, n2] = await Promise.all([
                trangBiKiThuatApi.getListTrangBiNhom1({}),
                trangBiKiThuatApi.getListTrangBiNhom2({}),
            ]);
            setEquipmentPool([
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
            ]);
        } finally {
            setEquipmentLoading(false);
        }
    }, []);

    const loadSchedules = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const rows = await getListNiemCatSchedule({});
            const details = await Promise.all(rows.map(async (row) => {
                try { return await getNiemCatSchedule(row.id); } catch { return null; }
            }));
            const detailMap = new Map<string, LocalNiemCatScheduleItem>();
            details.forEach((detail) => { if (detail) detailMap.set(detail.id, detail); });

            const mapped: PreserveSchedule[] = rows.map((row) => {
                const detail = detailMap.get(row.id);
                const start = detail?.ngayNiemCat || '';
                const end = detail?.parameters?.thoi_gian_ket_thuc || start;
                return {
                    id: row.id,
                    tenLich: row.tenNiemCat || '',
                    canCu: row.canCu || '',
                    thoiGianLap: row.ngayNiemCat || '',
                    donVi: row.donViThucHien || '',
                    nguoiPhuTrach: row.nguoiThucHien || '',
                    thoiGianThucHien: start,
                    thoiGianKetThuc: end,
                    noiDungCongViec: detail?.parameters?.noi_dung_cong_viec || '',
                    vatChatBaoDam: detail?.parameters?.vat_chat_bao_dam || '',
                    ketQua: row.ketQuaThucHien || '',
                    parameters: detail?.parameters || {},
                    equipmentKeys: (detail?.dsTrangBi || []).map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi)),
                    soTrangBi: row.soTrangBi || 0,
                    version: detail?.version || 0,
                };
            });

            mapped.sort((a, b) => new Date(b.thoiGianLap || '1970-01-01').getTime() - new Date(a.thoiGianLap || '1970-01-01').getTime());
            setSchedules(mapped);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc danh sach niem cat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.all([loadEquipmentPool()]).then(() => { void loadSchedules(); });
    }, [loadEquipmentPool, loadSchedules]);

    const resolveStatus = useCallback((schedule: PreserveSchedule): 'overdue' | 'inprogress' | 'upcoming' | 'completed' | 'none' => {
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
        let overdue = 0; let inprogress = 0; let completed = 0;
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
        const rows = !q ? schedules : schedules.filter((row) =>
            [row.tenLich, row.canCu, row.donVi, row.nguoiPhuTrach].some((x) => x.toLowerCase().includes(q)),
        );
        const selectedOfficeId = String(selectedOffice?.id || '').trim();
        const selectedOfficeTokens = [
            String(selectedOffice?.ten || '').trim(),
            String(selectedOffice?.tenDayDu || '').trim(),
            String(selectedOffice?.vietTat || '').trim(),
            String(selectedOffice?.code || '').trim(),
        ].filter(Boolean).map(normalizeForSearch);

        const rowsByUnit = selectedOfficeId
            ? rows.filter((s) => {
                const donViValue = String(s.donVi || '').trim();
                if (!donViValue) return false;
                if (donViValue === selectedOfficeId) return true;
                if (donViValue.startsWith(`${selectedOfficeId}.`)) return true;
                const normalizedDonVi = normalizeForSearch(donViValue);
                return selectedOfficeTokens.some((token) => token && normalizedDonVi.includes(token));
            })
            : rows;

        if (!selectedTrangBiId) return rowsByUnit;
        const selectedKeys = new Set([buildEquipmentKey(selectedTrangBiId, 1), buildEquipmentKey(selectedTrangBiId, 2)]);
        return rowsByUnit.filter((s) => s.equipmentKeys.some((k) => selectedKeys.has(k)));
    }, [search, schedules, selectedOffice, selectedTrangBiId]);

    const ganttByEquipment = useMemo<PreserveSchedule[]>(() => {
        const poolByKey = new Map(equipmentPool.map((item) => [item.key, item]));
        const chosenByEquipment = new Map<string, PreserveSchedule>();
        filteredSchedules.forEach((schedule) => {
            const currentStatus = resolveStatus(schedule);
            const currentPriority = getStatusPriority(currentStatus);
            const currentStart = new Date(schedule.thoiGianThucHien || schedule.thoiGianLap || '1970-01-01').getTime();
            schedule.equipmentKeys.forEach((equipmentKey) => {
                const existing = chosenByEquipment.get(equipmentKey);
                if (!existing) { chosenByEquipment.set(equipmentKey, schedule); return; }
                const existingStatus = resolveStatus(existing);
                const existingPriority = getStatusPriority(existingStatus);
                const existingStart = new Date(existing.thoiGianThucHien || existing.thoiGianLap || '1970-01-01').getTime();
                if (currentPriority > existingPriority || (currentPriority === existingPriority && currentStart > existingStart)) {
                    chosenByEquipment.set(equipmentKey, schedule);
                }
            });
        });
        return Array.from(chosenByEquipment.entries()).map(([equipmentKey, schedule]) => {
            const equipment = poolByKey.get(equipmentKey);
            return {
                ...schedule,
                id: `eq-${equipmentKey}`,
                tenLich: equipment ? `${equipment.tenDanhMuc}${equipment.soHieu ? ` - ${equipment.soHieu}` : ''}` : schedule.tenLich,
                donVi: equipment?.donVi || schedule.donVi,
                soTrangBi: 1,
                equipmentKeys: [equipmentKey],
                parameters: { ...schedule.parameters, __schedule_id: schedule.id },
            };
        });
    }, [equipmentPool, filteredSchedules, resolveStatus]);

    const openCreateDialog = useCallback(() => {
        setEditingSchedule(null);
        setDialogOpen(true);
    }, []);

    const openEditDialog = useCallback(async (schedule: PreserveSchedule) => {
        setSaving(true);
        try {
            const detail = await getNiemCatSchedule(schedule.id);
            setEditingSchedule({
                id: detail.id,
                tenLich: detail.tenNiemCat || '',
                canCu: detail.canCu || '',
                thoiGianLap: detail.ngayNiemCat || '',
                donVi: detail.donViThucHien || '',
                nguoiPhuTrach: detail.nguoiThucHien || '',
                thoiGianThucHien: detail.ngayNiemCat || '',
                thoiGianKetThuc: detail.parameters?.thoi_gian_ket_thuc || detail.ngayNiemCat || '',
                noiDungCongViec: detail.parameters?.noi_dung_cong_viec || '',
                vatChatBaoDam: detail.parameters?.vat_chat_bao_dam || '',
                ketQua: detail.ketQuaThucHien || '',
                parameters: detail.parameters || {},
                equipmentKeys: detail.dsTrangBi.map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi)),
                soTrangBi: detail.dsTrangBi.length,
                version: detail.version || 0,
            });
            setDialogOpen(true);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc chi tiet niem cat.');
        } finally {
            setSaving(false);
        }
    }, []);

    const handleEquipmentGanttClick = useCallback((row: PreserveSchedule) => {
        const sourceScheduleId = row.parameters?.__schedule_id;
        if (!sourceScheduleId) return;
        const schedule = filteredSchedules.find((item) => item.id === sourceScheduleId) || schedules.find((item) => item.id === sourceScheduleId);
        if (schedule) void openEditDialog(schedule);
    }, [filteredSchedules, openEditDialog, schedules]);

    const handleSave = useCallback(async ({ formData, selectedEquipment }: { formData: Record<string, string>; selectedEquipment: EquipmentOption[]; }) => {
        const payload: LocalNiemCatScheduleItem = {
            id: editingSchedule?.id || '',
            tenNiemCat: formData.ten_niem_cat || '',
            canCu: formData.can_cu || '',
            loaiDeNghi: formData.loai_de_nghi || '',
            loaiNiemCat: formData.loai_niem_cat || '',
            donViThucHien: formData.don_vi_thuc_hien || '',
            nguoiThucHien: formData.nguoi_thuc_hien || '',
            ngayNiemCat: formData.ngay_niem_cat || '',
            ketQuaThucHien: formData.ket_qua_thuc_hien || '',
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
        await saveNiemCatSchedule({ item: payload, expectedVersion: editingSchedule?.version });
        setDialogOpen(false);
        await loadSchedules();
    }, [editingSchedule, loadSchedules]);

    const dialogInitialData = useMemo<Record<string, string>>(() => {
        if (!editingSchedule) return {};
        return {
            ten_niem_cat: editingSchedule.tenLich,
            can_cu: editingSchedule.canCu,
            loai_de_nghi: editingSchedule.parameters?.loai_de_nghi || '',
            loai_niem_cat: editingSchedule.parameters?.loai_niem_cat || '',
            don_vi_thuc_hien: editingSchedule.donVi,
            nguoi_thuc_hien: editingSchedule.nguoiPhuTrach,
            ngay_niem_cat: editingSchedule.thoiGianThucHien,
            ket_qua_thuc_hien: editingSchedule.ketQua,
            thoi_gian_ket_thuc: editingSchedule.thoiGianKetThuc,
            ...editingSchedule.parameters,
        };
    }, [editingSchedule]);

    const dialogInitialEquipment = useMemo<EquipmentOption[]>(() => {
        if (!editingSchedule) return [];
        return equipmentPool.filter((item) => editingSchedule.equipmentKeys.includes(item.key));
    }, [editingSchedule, equipmentPool]);

    return (
        <OfficeProvider>
            <Box sx={{ p: 1.5, height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                            NIEM CAT TRANG BI
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Quan ly theo doi va ket qua niem cat trang bi.</Typography>
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Them ke hoach</Button>
                </Stack>

                {errorMessage && <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 1.5 }}>{errorMessage}</Alert>}

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 1.5, flexShrink: 0 }}>
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
                                        <WarehouseIcon sx={{ fontSize: 16, color: item.color }} />
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

                <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr 300px', gap: 1.5, alignItems: 'stretch', flex: 1, minHeight: 0 }}>
                    <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', height: '100%', minHeight: 0 }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, height: '100%' }}>
                            <Box sx={{ height: '100%', overflow: 'hidden', p: 1 }}>
                                <OfficeDictionary onSelect={setSelectedOffice} selectedOffice={selectedOffice} />
                            </Box>
                        </CardContent>
                    </Card>

                    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
                            <Tabs value={activeTab} onChange={(_, value: NiemCatTab) => setActiveTab(value)}>
                                <Tab value="theo_doi_trang_bi" label="Theo doi trang bi" />
                                <Tab value="ket_qua_niem_cat" label="Ket qua niem cat" />
                            </Tabs>
                        </Stack>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            {activeTab === 'theo_doi_trang_bi'
                                ? <GanttView schedules={ganttByEquipment} onScheduleClick={handleEquipmentGanttClick} loading={loading || saving} panelHeight="100%" />
                                : <GanttView schedules={filteredSchedules} onScheduleClick={openEditDialog} loading={loading || saving} panelHeight="100%" />}
                        </Box>
                    </Box>
                    <GanttChartSidebar schedules={filteredSchedules} onScheduleClick={openEditDialog} panelHeight="100%" />
                </Box>

                <GenericScheduleDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSave}
                    initialData={dialogInitialData}
                    initialEquipment={dialogInitialEquipment}
                    editingId={editingSchedule?.id}
                    equipmentPool={equipmentPool}
                    equipmentLoading={equipmentLoading}
                    title={editingSchedule?.id ? 'Cap nhat ke hoach niem cat' : 'Them ke hoach niem cat'}
                    icon={WarehouseIcon}
                    fieldSetKey={TRANG_BI_FIELD_SET_KEYS.NIEM_CAT}
                    nameFieldKey="ten_niem_cat"
                    nameFieldLabel="Ten niem cat"
                    requiredNameError="Vui long nhap ten niem cat."
                    startDateFieldKey="ngay_niem_cat"
                    endDateFieldKey="thoi_gian_ket_thuc"
                />
            </Box>
        </OfficeProvider>
    );
};

export default NiemCat;
