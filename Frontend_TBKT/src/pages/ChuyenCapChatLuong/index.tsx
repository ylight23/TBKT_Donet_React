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
import StarRateIcon from '@mui/icons-material/StarRate';
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
    getChuyenCapChatLuongSchedule,
    getListChuyenCapChatLuongSchedule,
    saveChuyenCapChatLuongSchedule,
    type LocalChuyenCapChatLuongScheduleItem,
} from '../../apis/chuyenCapChatLuongScheduleApi';
import trangBiKiThuatApi from '../../apis/trangBiKiThuatApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../../constants/fieldSetKeys';
import { pickScheduleValue } from '../../utils/scheduleFormValue';

type ChuyenCapTab = 'theo_doi_trang_bi' | 'ket_qua_chuyen_cap';

type UpgradeSchedule = {
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

const ChuyenCapChatLuong: React.FC = () => {
    const location = useLocation();
    const selectedTrangBiId = useMemo(() => new URLSearchParams(location.search).get('idTrangBi') || '', [location.search]);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [schedules, setSchedules] = useState<UpgradeSchedule[]>([]);
    const [equipmentLoading, setEquipmentLoading] = useState(false);
    const [equipmentPool, setEquipmentPool] = useState<EquipmentOption[]>([]);
    const [search, setSearch] = useState('');
    const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
    const [activeTab, setActiveTab] = useState<ChuyenCapTab>('theo_doi_trang_bi');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<UpgradeSchedule | null>(null);

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
            const rows = await getListChuyenCapChatLuongSchedule({});
            const details = await Promise.all(rows.map(async (row) => {
                try { return await getChuyenCapChatLuongSchedule(row.id); } catch { return null; }
            }));
            const detailMap = new Map<string, LocalChuyenCapChatLuongScheduleItem>();
            details.forEach((detail) => { if (detail) detailMap.set(detail.id, detail); });

            const mapped: UpgradeSchedule[] = rows.map((row) => {
                const detail = detailMap.get(row.id);
                const params = detail?.parameters || {};
                const start = pickScheduleValue(params, ['thoi_gian_thuc_hien']) || detail?.ngayTao || '';
                const end = pickScheduleValue(params, ['thoi_gian_ket_thuc', 'thoi_gian_thuc_hien']) || start;
                return {
                    id: row.id,
                    tenLich: row.tenChuyenCapChatLuong || pickScheduleValue(params, ['ten_chuyen_cap_chat_luong']),
                    canCu: row.canCu || pickScheduleValue(params, ['can_cu', 'can_cu_thuc_hien']),
                    thoiGianLap: detail?.ngayTao || '',
                    donVi: row.donViThucHien || pickScheduleValue(params, ['don_vi_thuc_hien', 'don_vi']),
                    nguoiPhuTrach: pickScheduleValue(params, ['nguoi_phu_trach', 'nguoi_thuc_hien']),
                    thoiGianThucHien: start,
                    thoiGianKetThuc: end,
                    noiDungCongViec: detail?.ghiChu || '',
                    vatChatBaoDam: pickScheduleValue(params, ['vat_chat_bao_dam']),
                    ketQua: pickScheduleValue(params, ['ket_qua']),
                    parameters: detail?.parameters || {},
                    equipmentKeys: (detail?.dsTrangBi || []).map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi)),
                    soTrangBi: row.soTrangBi || 0,
                    version: detail?.version || 0,
                };
            });

            mapped.sort((a, b) => new Date(b.thoiGianLap || '1970-01-01').getTime() - new Date(a.thoiGianLap || '1970-01-01').getTime());
            setSchedules(mapped);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc danh sach chuyen cap chat luong.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.all([loadEquipmentPool()]).then(() => { void loadSchedules(); });
    }, [loadEquipmentPool, loadSchedules]);

    const resolveStatus = useCallback((schedule: UpgradeSchedule): 'overdue' | 'inprogress' | 'upcoming' | 'completed' | 'none' => {
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
            [row.tenLich, row.canCu, row.donVi].some((x) => x.toLowerCase().includes(q)),
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

    const ganttByEquipment = useMemo<UpgradeSchedule[]>(() => {
        const poolByKey = new Map(equipmentPool.map((item) => [item.key, item]));
        const chosenByEquipment = new Map<string, UpgradeSchedule>();
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

    const openEditDialog = useCallback(async (schedule: UpgradeSchedule) => {
        setSaving(true);
        try {
            const detail = await getChuyenCapChatLuongSchedule(schedule.id);
            setEditingSchedule({
                id: detail.id,
                tenLich: detail.tenChuyenCapChatLuong || '',
                canCu: detail.canCu || '',
                thoiGianLap: detail.ngayTao || '',
                donVi: detail.donViThucHien || '',
                nguoiPhuTrach: detail.parameters?.nguoi_phu_trach || '',
                thoiGianThucHien: detail.parameters?.thoi_gian_thuc_hien || detail.ngayTao || '',
                thoiGianKetThuc: detail.parameters?.thoi_gian_ket_thuc || detail.parameters?.thoi_gian_thuc_hien || detail.ngayTao || '',
                noiDungCongViec: detail.ghiChu || '',
                vatChatBaoDam: detail.parameters?.vat_chat_bao_dam || '',
                ketQua: detail.parameters?.ket_qua || '',
                parameters: detail.parameters || {},
                equipmentKeys: detail.dsTrangBi.map((member) => buildEquipmentKey(member.idTrangBi, member.nhomTrangBi)),
                soTrangBi: detail.dsTrangBi.length,
                version: detail.version || 0,
            });
            setDialogOpen(true);
        } catch (error) {
            setErrorMessage((error as Error).message || 'Khong tai duoc chi tiet chuyen cap chat luong.');
        } finally {
            setSaving(false);
        }
    }, []);

    const handleEquipmentGanttClick = useCallback((row: UpgradeSchedule) => {
        const sourceScheduleId = row.parameters?.__schedule_id;
        if (!sourceScheduleId) return;
        const schedule = filteredSchedules.find((item) => item.id === sourceScheduleId) || schedules.find((item) => item.id === sourceScheduleId);
        if (schedule) void openEditDialog(schedule);
    }, [filteredSchedules, openEditDialog, schedules]);

    const handleSave = useCallback(async ({ formData, selectedEquipment }: { formData: Record<string, string>; selectedEquipment: EquipmentOption[]; }) => {
        const payload: LocalChuyenCapChatLuongScheduleItem = {
            id: editingSchedule?.id || '',
            tenChuyenCapChatLuong: pickScheduleValue(formData, ['ten_chuyen_cap_chat_luong']),
            canCu: pickScheduleValue(formData, ['can_cu', 'can_cu_thuc_hien']),
            soMenhLenh: pickScheduleValue(formData, ['so_menh_lenh']),
            capChatLuong: pickScheduleValue(formData, ['cap_chat_luong']),
            donViThucHien: pickScheduleValue(formData, ['don_vi_thuc_hien', 'don_vi']),
            ghiChu: pickScheduleValue(formData, ['ghi_chu', 'noi_dung_cong_viec', 'noi_dung_thuc_hien']),
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
        await saveChuyenCapChatLuongSchedule({ item: payload, expectedVersion: editingSchedule?.version });
        setDialogOpen(false);
        await loadSchedules();
    }, [editingSchedule, loadSchedules]);

    const dialogInitialData = useMemo<Record<string, string>>(() => {
        if (!editingSchedule) return {};
        return {
            ten_chuyen_cap_chat_luong: editingSchedule.tenLich,
            can_cu: editingSchedule.canCu,
            so_menh_lenh: editingSchedule.parameters?.so_menh_lenh || '',
            cap_chat_luong: editingSchedule.parameters?.cap_chat_luong || '',
            don_vi_thuc_hien: editingSchedule.donVi,
            ghi_chu: editingSchedule.noiDungCongViec,
            thoi_gian_thuc_hien: editingSchedule.thoiGianThucHien,
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
            <Box sx={{ p: { xs: 1, lg: 1.25, xl: 1.5 }, height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                        <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
                            CHUYEN CAP CHAT LUONG
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Quan ly theo doi trang bi va ket qua chuyen cap chat luong.</Typography>
                    </Box>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>Them ke hoach</Button>
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
                                        <StarRateIcon sx={{ fontSize: 16, color: item.color }} />
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
                            <Tabs value={activeTab} onChange={(_, value: ChuyenCapTab) => setActiveTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                                <Tab value="theo_doi_trang_bi" label="Theo doi trang bi" />
                                <Tab value="ket_qua_chuyen_cap" label="Ket qua chuyen cap" />
                            </Tabs>
                        </Stack>
                        <Box sx={{ flex: 1, minHeight: 0 }}>
                            {activeTab === 'theo_doi_trang_bi'
                                ? <GanttView schedules={ganttByEquipment} onScheduleClick={handleEquipmentGanttClick} loading={loading || saving} panelHeight="100%" />
                                : <GanttView schedules={filteredSchedules} onScheduleClick={openEditDialog} loading={loading || saving} panelHeight="100%" />}
                        </Box>
                    </Box>
                    <Box sx={{ gridArea: 'right', minWidth: 0, minHeight: { xs: 220, lg: 0 } }}>
                        <GanttChartSidebar schedules={filteredSchedules} onScheduleClick={openEditDialog} panelHeight="100%" />
                    </Box>
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
                    title={editingSchedule?.id ? 'Cap nhat chuyen cap chat luong' : 'Them chuyen cap chat luong'}
                    icon={StarRateIcon}
                    fieldSetKey={TRANG_BI_FIELD_SET_KEYS.CHUYEN_CAP_CHAT_LUONG}
                    nameFieldKey="ten_chuyen_cap_chat_luong"
                    nameFieldLabel="Ten chuyen cap chat luong"
                    requiredNameError="Vui long nhap ten chuyen cap chat luong."
                    startDateFieldKey="thoi_gian_thuc_hien"
                    endDateFieldKey="thoi_gian_ket_thuc"
                />
            </Box>
        </OfficeProvider>
    );
};

export default ChuyenCapChatLuong;
