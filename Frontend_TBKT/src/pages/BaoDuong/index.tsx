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
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
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
    getBaoDuongSchedule,
    getListBaoDuongSchedule,
    saveBaoDuongSchedule,
    type LocalBaoDuongScheduleItem,
} from '../../apis/baoDuongScheduleApi';
import trangBiKiThuatApi from '../../apis/trangBiKiThuatApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../../constants/fieldSetKeys';
import { pickScheduleValue } from '../../utils/scheduleFormValue';

type MaintenanceSchedule = {
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

type BaoDuongTab = 'theo_doi_trang_bi' | 'lich_bao_duong';

const buildEquipmentKey = (id: string, nhom: number): string => `${nhom}:${id}`;
const normalizeForSearch = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const getStatusPriority = (status: 'overdue' | 'inprogress' | 'upcoming' | 'completed' | 'none'): number => {
    switch (status) {
        case 'inprogress': return 5;
        case 'upcoming': return 4;
        case 'overdue': return 3;
        case 'completed': return 2;
        default: return 1;
    }
};

const BaoDuong: React.FC = () => {
    const location = useLocation();
    const selectedTrangBiId = useMemo(() => new URLSearchParams(location.search).get('idTrangBi') || '', [location.search]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentPool, setEquipmentPool] = useState<EquipmentOption[]>([]);
    const [search, setSearch] = useState('');
    const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
    const [activeTab, setActiveTab] = useState<BaoDuongTab>('theo_doi_trang_bi');
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
            details.forEach((detail) => { if (detail) detailMap.set(detail.id, detail); });

            const mapped: MaintenanceSchedule[] = rows.map((row) => {
                const detail = detailMap.get(row.id);
                const params = detail?.parameters || {};
                return {
                    id: row.id,
                    tenLich: row.tenLichBaoDuong || pickScheduleValue(params, ['ten_lich_bao_duong', 'ten_bao_duong']),
                    canCu: row.canCu || pickScheduleValue(params, ['can_cu', 'can_cu_thuc_hien']),
                    thoiGianLap: row.thoiGianLap || pickScheduleValue(params, ['thoi_gian_lap']),
                    donVi: row.idDonVi || row.tenDonVi || pickScheduleValue(params, ['don_vi', 'don_vi_thuc_hien']),
                    nguoiPhuTrach: row.nguoiPhuTrach || pickScheduleValue(params, ['nguoi_phu_trach', 'nguoi_thuc_hien']),
                    thoiGianThucHien: row.thoiGianThucHien || pickScheduleValue(params, ['thoi_gian_thuc_hien']),
                    thoiGianKetThuc: row.thoiGianKetThuc || pickScheduleValue(params, ['thoi_gian_ket_thuc', 'thoi_gian_thuc_hien']),
                    noiDungCongViec: detail?.noiDungCongViec || pickScheduleValue(params, ['noi_dung_cong_viec', 'noi_dung_thuc_hien']),
                    vatChatBaoDam: detail?.vatChatBaoDam || '',
                    ketQua: detail?.ketQua || '',
                    parameters: detail?.parameters || {},
                    equipmentKeys: (detail?.dsTrangBi || []).map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi)),
                    soTrangBi: row.soTrangBi || 0,
                    version: detail?.version || 0,
                };
            });

            mapped.sort((a, b) => new Date(b.thoiGianLap || '1970-01-01').getTime() - new Date(a.thoiGianLap || '1970-01-01').getTime());
            setSchedules(mapped);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc danh sach lich bao duong.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.all([loadEquipmentPool()]).then(() => { void loadSchedules(); });
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
            [row.tenLich, row.canCu, row.donVi, row.nguoiPhuTrach, row.noiDungCongViec].some((x) => x.toLowerCase().includes(q)),
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

    const ganttByEquipment = useMemo<MaintenanceSchedule[]>(() => {
        const poolByKey = new Map(equipmentPool.map((item) => [item.key, item]));
        const chosenByEquipment = new Map<string, MaintenanceSchedule>();

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
            const title = equipment ? `${equipment.tenDanhMuc}${equipment.soHieu ? ` - ${equipment.soHieu}` : ''}` : schedule.tenLich;
            return {
                ...schedule,
                id: `eq-${equipmentKey}`,
                tenLich: title,
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

    const handleEquipmentGanttClick = useCallback((row: MaintenanceSchedule) => {
        const sourceScheduleId = row.parameters?.__schedule_id;
        if (!sourceScheduleId) return;
        const schedule = filteredSchedules.find((item) => item.id === sourceScheduleId) || schedules.find((item) => item.id === sourceScheduleId);
        if (schedule) void openEditDialog(schedule);
    }, [filteredSchedules, openEditDialog, schedules]);

    const handleSaveSchedule = useCallback(async ({ formData, selectedEquipment }: { formData: Record<string, string>; selectedEquipment: EquipmentOption[]; }) => {
        const payloadItem: LocalBaoDuongScheduleItem = {
            id: editingSchedule?.id || '',
            tenLichBaoDuong: pickScheduleValue(formData, ['ten_lich_bao_duong', 'ten_bao_duong']).trim(),
            canCu: pickScheduleValue(formData, ['can_cu', 'can_cu_thuc_hien']),
            idDonVi: pickScheduleValue(formData, ['don_vi', 'don_vi_thuc_hien']),
            tenDonVi: pickScheduleValue(formData, ['don_vi', 'don_vi_thuc_hien']),
            nguoiPhuTrach: pickScheduleValue(formData, ['nguoi_phu_trach', 'nguoi_thuc_hien']),
            thoiGianLap: pickScheduleValue(formData, ['thoi_gian_lap']),
            thoiGianThucHien: pickScheduleValue(formData, ['thoi_gian_thuc_hien']),
            thoiGianKetThuc: pickScheduleValue(formData, ['thoi_gian_ket_thuc', 'thoi_gian_thuc_hien']),
            noiDungCongViec: pickScheduleValue(formData, ['noi_dung_cong_viec', 'noi_dung_thuc_hien']),
            vatChatBaoDam: pickScheduleValue(formData, ['vat_chat_bao_dam']),
            ketQua: pickScheduleValue(formData, ['ket_qua']),
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
        <OfficeProvider>
            <Box sx={{ p: { xs: 1, lg: 1.25, xl: 1.5 }, height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                            BAO DUONG TRANG BI
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Quan ly lich bao duong theo mo hinh schedule-first.
                        </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
                        Them ke hoach
                    </Button>
                </Stack>

                {errorMessage && <Alert severity="error" onClose={() => setErrorMessage('')} sx={{ mb: 1.5 }}>{errorMessage}</Alert>}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1, xl: 1.5 }, mb: { xs: 1, xl: 1.5 }, flexShrink: 0 }}>
                    {[
                        { label: 'Tong ke hoach', value: stats.total, color: '#3C3489', bg: '#EEEDFE', border: '#AFA9EC' },
                        { label: 'Da hoan thanh', value: stats.completed, color: '#3B6D11', bg: '#EAF3DE', border: '#97C459' },
                        { label: 'Dang thuc hien', value: stats.inprogress, color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
                        { label: 'Qua han', value: stats.overdue, color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
                    ].map((item) => (
                        <Card key={item.label} variant="outlined" sx={{ borderRadius: 2, border: `0.5px solid ${item.border}44` }}>
                            <CardContent sx={{ p: { xs: 1, xl: 1.5 }, '&:last-child': { pb: { xs: 1, xl: 1.5 } } }}>
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

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '220px minmax(0, 1fr) 220px', xl: '260px minmax(0, 1fr) 260px' },
                        gridTemplateAreas: { xs: '"center" "left" "right"', lg: '"left center right"' },
                        gap: { xs: 1, xl: 1.5 },
                        alignItems: 'stretch',
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Card variant="outlined" sx={{ gridArea: 'left', borderRadius: 2, overflow: 'hidden', height: '100%', minHeight: { xs: 220, lg: 0 } }}>
                        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, height: '100%' }}>
                            <Box sx={{ height: '100%', overflow: 'hidden', p: 1 }}>
                                <OfficeDictionary onSelect={setSelectedOffice} selectedOffice={selectedOffice} />
                            </Box>
                        </CardContent>
                    </Card>

                    <Box sx={{ gridArea: 'center', height: '100%', minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'center' }} mb={1} spacing={1}>
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
                                sx={{ width: { xs: '100%', lg: 260, xl: 320 }, maxWidth: '100%', '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
                            />
                            <Tabs value={activeTab} onChange={(_, value: BaoDuongTab) => setActiveTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                                <Tab value="theo_doi_trang_bi" label="Theo doi trang bi" />
                                <Tab value="lich_bao_duong" label="Lich bao duong" />
                            </Tabs>
                        </Stack>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            {activeTab === 'theo_doi_trang_bi' ? (
                                <GanttView schedules={ganttByEquipment} onScheduleClick={handleEquipmentGanttClick} loading={loading || saving} panelHeight="100%" />
                            ) : (
                                <GanttView schedules={filteredSchedules} onScheduleClick={openEditDialog} loading={loading || saving} panelHeight="100%" />
                            )}
                        </Box>
                    </Box>
                    <Box sx={{ gridArea: 'right', minWidth: 0, minHeight: { xs: 220, lg: 0 } }}>
                        <GanttChartSidebar schedules={filteredSchedules} onScheduleClick={openEditDialog} panelHeight="100%" />
                    </Box>
                </Box>

                <GenericScheduleDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSave={handleSaveSchedule}
                    initialData={dialogInitialData}
                    initialEquipment={dialogInitialEquipment}
                    editingId={editingSchedule?.id}
                    equipmentPool={equipmentPool}
                    equipmentLoading={equipmentLoading}
                    title={editingSchedule?.id ? 'Cap nhat ke hoach bao duong' : 'Them ke hoach bao duong'}
                    icon={BuildCircleIcon}
                    color="#2563eb"
                    fieldSetKey={TRANG_BI_FIELD_SET_KEYS.BAO_DUONG}
                    nameFieldKey="ten_lich_bao_duong"
                    nameFieldLabel="Ten bao duong"
                    requiredNameError="Vui long nhap ten lich bao duong."
                    startDateFieldKey="thoi_gian_thuc_hien"
                    endDateFieldKey="thoi_gian_ket_thuc"
                />
            </Box>
        </OfficeProvider>
    );
};

export default BaoDuong;
