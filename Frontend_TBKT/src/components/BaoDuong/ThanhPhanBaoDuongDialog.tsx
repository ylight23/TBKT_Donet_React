import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { FieldSetGroup, type GeneralFieldSetItem } from '../TrangBiDataGrid/GeneralInfoTab';
import thamSoApi, { type LocalFieldSet } from '../../apis/thamSoApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../../constants/fieldSetKeys';

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

export interface ThanhPhanBaoDuongDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (payload: {
        formData: Record<string, string>;
        selectedEquipment: EquipmentOption[];
    }) => Promise<void>;
    initialData?: Record<string, string>;
    initialEquipment?: EquipmentOption[];
    editingId?: string;
    equipmentPool: EquipmentOption[];
    equipmentLoading: boolean;
}

const KEY_TEN_LICH = 'ten_lich_bao_duong';
const KEY_CAN_CU = 'can_cu';
const KEY_THOI_GIAN_LAP = 'thoi_gian_lap';
const KEY_DON_VI = 'don_vi';
const KEY_NGUOI_PHU_TRACH = 'nguoi_phu_trach';
const KEY_THOI_GIAN_THUC_HIEN = 'thoi_gian_thuc_hien';
const KEY_THOI_GIAN_KET_THUC = 'thoi_gian_ket_thuc';
const KEY_NOI_DUNG = 'noi_dung_cong_viec';
const KEY_VAT_CHAT = 'vat_chat_bao_dam';
const KEY_KET_QUA = 'ket_qua';

const DEFAULT_SET_COLORS = ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#7c3aed'];
const DOWS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS_VI = [
    'Thang 1', 'Thang 2', 'Thang 3', 'Thang 4',
    'Thang 5', 'Thang 6', 'Thang 7', 'Thang 8',
    'Thang 9', 'Thang 10', 'Thang 11', 'Thang 12',
];

const mergeFieldSets = (fieldSets: LocalFieldSet[]): LocalFieldSet[] => {
    if (fieldSets.length <= 1) return fieldSets;

    const first = fieldSets[0];
    const seenKeys = new Set<string>();
    const mergedFields = (fieldSets.flatMap((fs) => fs.fields ?? []))
        .filter((field) => {
            const key = String(field.key ?? '').trim().toLowerCase();
            if (!key || seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
        });

    const mergedFieldIds = Array.from(new Set(fieldSets.flatMap((fs) => fs.fieldIds ?? [])));
    const mergedMaDanhMuc = Array.from(new Set(fieldSets.flatMap((fs) => fs.maDanhMucTrangBi ?? [])));

    return [{
        ...first,
        fieldIds: mergedFieldIds,
        maDanhMucTrangBi: mergedMaDanhMuc,
        fields: mergedFields,
    }];
};

const toInputDate = (value: string): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
};

const toIsoDate = (value: string): string => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toISOString();
};

const MiniCalendar: React.FC<{
    year: number;
    month: number;
    rangeStart: Date | null;
    rangeEnd: Date | null;
    onPrev: () => void;
    onNext: () => void;
    onDayClick: (d: number) => void;
}> = ({ year, month, rangeStart, rangeEnd, onPrev, onNext, onDayClick }) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;

    const isInRange = (day: number): 'none' | 'start' | 'end' | 'middle' => {
        const dt = new Date(year, month, day);
        if (rangeStart && dt.toDateString() === rangeStart.toDateString()) return 'start';
        if (rangeEnd && dt.toDateString() === rangeEnd.toDateString()) return 'end';
        if (rangeStart && rangeEnd && dt > rangeStart && dt < rangeEnd) return 'middle';
        return 'none';
    };

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Button size="small" onClick={onPrev} sx={{ minWidth: 24, p: 0.25 }}>
                    <NavigateBeforeIcon fontSize="small" />
                </Button>
                <Typography variant="caption" fontWeight={700}>{MONTHS_VI[month]}, {year}</Typography>
                <Button size="small" onClick={onNext} sx={{ minWidth: 24, p: 0.25 }}>
                    <NavigateNextIcon fontSize="small" />
                </Button>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
                {DOWS_VI.map((d) => (
                    <Typography key={d} sx={{ fontSize: '0.62rem', color: 'text.secondary', textAlign: 'center', fontWeight: 700 }}>
                        {d}
                    </Typography>
                ))}
                {Array.from({ length: startOffset }, (_, i) => (
                    <Box key={`pad-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const state = isInRange(d);
                    return (
                        <Box
                            key={`day-${d}`}
                            onClick={() => onDayClick(d)}
                            sx={{
                                textAlign: 'center',
                                py: 0.35,
                                borderRadius: 1,
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontWeight: state === 'start' || state === 'end' ? 700 : 500,
                                bgcolor: state === 'start' || state === 'end' ? '#3C3489' : state === 'middle' ? '#EEEDFE' : 'transparent',
                                color: state === 'start' || state === 'end' ? '#fff' : state === 'middle' ? '#3C3489' : 'text.primary',
                                '&:hover': { bgcolor: state === 'none' ? 'action.hover' : undefined },
                            }}
                        >
                            {d}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

const ThanhPhanBaoDuongDialog: React.FC<ThanhPhanBaoDuongDialogProps> = ({
    open,
    onClose,
    onSave,
    initialData = {},
    initialEquipment = [],
    editingId,
    equipmentPool,
    equipmentLoading,
}) => {
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [selectedEquipmentKeys, setSelectedEquipmentKeys] = useState<Set<string>>(new Set());
    const [equipmentSearch, setEquipmentSearch] = useState('');
    const [nhomFilter, setNhomFilter] = useState<'all' | 'nhom1' | 'nhom2'>('all');
    const [schemaLoading, setSchemaLoading] = useState(false);
    const [schemaError, setSchemaError] = useState('');
    const [fieldSetDetails, setFieldSetDetails] = useState<LocalFieldSet[]>([]);
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

    const loadFieldSets = useCallback(async () => {
        setSchemaLoading(true);
        setSchemaError('');
        try {
            const data = await thamSoApi.getFieldSetsByKey(TRANG_BI_FIELD_SET_KEYS.BAO_DUONG);
            setFieldSetDetails(mergeFieldSets(data));
        } catch (error) {
            setSchemaError((error as Error).message || 'Khong tai duoc fieldset bao duong.');
        } finally {
            setSchemaLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        setFormData({
            [KEY_TEN_LICH]: initialData[KEY_TEN_LICH] || '',
            [KEY_CAN_CU]: initialData[KEY_CAN_CU] || '',
            [KEY_THOI_GIAN_LAP]: toInputDate(initialData[KEY_THOI_GIAN_LAP] || ''),
            [KEY_DON_VI]: initialData[KEY_DON_VI] || '',
            [KEY_NGUOI_PHU_TRACH]: initialData[KEY_NGUOI_PHU_TRACH] || '',
            [KEY_THOI_GIAN_THUC_HIEN]: toInputDate(initialData[KEY_THOI_GIAN_THUC_HIEN] || ''),
            [KEY_THOI_GIAN_KET_THUC]: toInputDate(initialData[KEY_THOI_GIAN_KET_THUC] || ''),
            [KEY_NOI_DUNG]: initialData[KEY_NOI_DUNG] || '',
            [KEY_VAT_CHAT]: initialData[KEY_VAT_CHAT] || '',
            [KEY_KET_QUA]: initialData[KEY_KET_QUA] || '',
        });
        setSelectedEquipmentKeys(new Set(initialEquipment.map((e) => e.key)));
        setEquipmentSearch('');
        setNhomFilter('all');
        setSaveError('');

        const start = initialData[KEY_THOI_GIAN_THUC_HIEN] ? new Date(initialData[KEY_THOI_GIAN_THUC_HIEN]) : null;
        const end = initialData[KEY_THOI_GIAN_KET_THUC] ? new Date(initialData[KEY_THOI_GIAN_KET_THUC]) : null;
        setRangeStart(start);
        setRangeEnd(end);
        if (start) {
            setCalYear(start.getFullYear());
            setCalMonth(start.getMonth());
        }

        void loadFieldSets();
    }, [open, initialData, initialEquipment, loadFieldSets]);

    const handleFieldChange = useCallback((key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleDayClick = useCallback((d: number) => {
        const dt = new Date(calYear, calMonth, d);
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(dt);
            setRangeEnd(null);
            handleFieldChange(KEY_THOI_GIAN_THUC_HIEN, toInputDate(dt.toISOString()));
            handleFieldChange(KEY_THOI_GIAN_KET_THUC, '');
            return;
        }

        const start = dt < rangeStart ? dt : rangeStart;
        const end = dt < rangeStart ? rangeStart : dt;
        setRangeStart(start);
        setRangeEnd(end);
        handleFieldChange(KEY_THOI_GIAN_THUC_HIEN, toInputDate(start.toISOString()));
        handleFieldChange(KEY_THOI_GIAN_KET_THUC, toInputDate(end.toISOString()));
    }, [calMonth, calYear, handleFieldChange, rangeEnd, rangeStart]);

    const navigateMonth = useCallback((dir: number) => {
        setCalMonth((prev) => {
            let next = prev + dir;
            if (next > 11) {
                next = 0;
                setCalYear((y) => y + 1);
            } else if (next < 0) {
                next = 11;
                setCalYear((y) => y - 1);
            }
            return next;
        });
    }, []);

    const dynamicContent = useMemo<GeneralFieldSetItem[]>(() => (
        fieldSetDetails.map((detail) => ({
            fieldSet: {
                id: detail.id,
                name: detail.name,
                key: detail.key || '',
                icon: detail.icon || '',
                color: detail.color || '',
                desc: detail.desc || '',
                fieldIds: detail.fieldIds ?? [],
                maDanhMucTrangBi: detail.maDanhMucTrangBi ?? [],
            },
            fields: (detail.fields ?? []).map((field) => ({
                id: field.id,
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required,
                disabled: field.disabled ?? false,
                validation: field.validation ?? {},
            })),
        }))
    ), [fieldSetDetails]);

    const selectedEquipment = useMemo(
        () => equipmentPool.filter((item) => selectedEquipmentKeys.has(item.key)),
        [equipmentPool, selectedEquipmentKeys],
    );

    const filteredEquipmentRows = useMemo(() => {
        const q = equipmentSearch.trim().toLowerCase();
        return equipmentPool.filter((item) => {
            const matchSearch = !q || [item.maDanhMuc, item.tenDanhMuc, item.soHieu, item.donVi]
                .some((v) => v.toLowerCase().includes(q));
            const matchNhom = nhomFilter === 'all'
                || (nhomFilter === 'nhom1' && item.nhom === 1)
                || (nhomFilter === 'nhom2' && item.nhom === 2);
            return matchSearch && matchNhom;
        });
    }, [equipmentPool, equipmentSearch, nhomFilter]);

    const equipmentColumns = useMemo<GridColDef<EquipmentOption>[]>(() => ([
        { field: 'soHieu', headerName: 'So hieu', width: 130 },
        { field: 'maDanhMuc', headerName: 'Ma danh muc', width: 180 },
        { field: 'tenDanhMuc', headerName: 'Ten trang bi', minWidth: 260, flex: 1 },
        { field: 'nhom', headerName: 'Nhom', width: 90, align: 'center', headerAlign: 'center', valueGetter: (_, row) => `N${row.nhom}` },
        { field: 'donVi', headerName: 'Don vi', minWidth: 170, flex: 0.8 },
    ]), []);

    const rowSelectionModel = useMemo<GridRowSelectionModel>(
        () => ({ type: 'include', ids: new Set(Array.from(selectedEquipmentKeys)) }),
        [selectedEquipmentKeys],
    );

    const handleSelectionModelChange = useCallback((model: GridRowSelectionModel) => {
        setSelectedEquipmentKeys(new Set(Array.from(model.ids).map((id) => String(id))));
    }, []);

    const formatDateLabel = (dt: Date | null): string => {
        if (!dt) return '--';
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    };

    const durationDays = useMemo(() => {
        if (!rangeStart || !rangeEnd) return null;
        return Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, [rangeEnd, rangeStart]);

    const handleSave = async () => {
        const tenLich = (formData[KEY_TEN_LICH] || '').trim();
        if (!tenLich) {
            setSaveError('Vui long nhap ten lich bao duong.');
            return;
        }
        if (selectedEquipmentKeys.size === 0) {
            setSaveError('Vui long chon it nhat 1 trang bi.');
            return;
        }

        const mergedFormData: Record<string, string> = {
            ...formData,
            [KEY_TEN_LICH]: tenLich,
            [KEY_THOI_GIAN_LAP]: formData[KEY_THOI_GIAN_LAP] ? toIsoDate(formData[KEY_THOI_GIAN_LAP]) : '',
            [KEY_THOI_GIAN_THUC_HIEN]: formData[KEY_THOI_GIAN_THUC_HIEN] ? toIsoDate(formData[KEY_THOI_GIAN_THUC_HIEN]) : '',
            [KEY_THOI_GIAN_KET_THUC]: formData[KEY_THOI_GIAN_KET_THUC] ? toIsoDate(formData[KEY_THOI_GIAN_KET_THUC]) : '',
        };

        setSaving(true);
        setSaveError('');
        try {
            await onSave({ formData: mergedFormData, selectedEquipment });
        } catch (error) {
            setSaveError((error as Error).message || 'Khong the luu lich bao duong.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <BuildCircleIcon color="primary" />
                    <Typography variant="h6" fontWeight={800}>
                        {editingId ? 'Cap nhat ke hoach bao duong' : 'Them ke hoach bao duong'}
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Button size="small" onClick={onClose} sx={{ minWidth: 'auto', p: 0.5 }}>
                        <CloseIcon fontSize="small" />
                    </Button>
                </Stack>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', minHeight: 640, maxHeight: 'calc(100vh - 220px)' }}>
                    <Box sx={{ width: '52%', minWidth: 460, borderRight: '0.5px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Thong tin ke hoach
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField fullWidth size="small" label="Ten lich bao duong *" value={formData[KEY_TEN_LICH] || ''} onChange={(e) => handleFieldChange(KEY_TEN_LICH, e.target.value)} />
                            <TextField fullWidth size="small" label="Can cu" multiline minRows={2} value={formData[KEY_CAN_CU] || ''} onChange={(e) => handleFieldChange(KEY_CAN_CU, e.target.value)} />
                            <Stack direction="row" spacing={1.5}>
                                <TextField fullWidth size="small" label="Don vi" value={formData[KEY_DON_VI] || ''} onChange={(e) => handleFieldChange(KEY_DON_VI, e.target.value)} />
                                <TextField fullWidth size="small" label="Nguoi phu trach" value={formData[KEY_NGUOI_PHU_TRACH] || ''} onChange={(e) => handleFieldChange(KEY_NGUOI_PHU_TRACH, e.target.value)} />
                            </Stack>
                            <TextField fullWidth size="small" type="date" label="Thoi gian lap" InputLabelProps={{ shrink: true }} value={formData[KEY_THOI_GIAN_LAP] || ''} onChange={(e) => handleFieldChange(KEY_THOI_GIAN_LAP, e.target.value)} />
                            <Stack direction="row" spacing={1.5}>
                                <TextField fullWidth size="small" type="date" label="Bat dau" InputLabelProps={{ shrink: true }} value={formData[KEY_THOI_GIAN_THUC_HIEN] || ''} onChange={(e) => { handleFieldChange(KEY_THOI_GIAN_THUC_HIEN, e.target.value); if (e.target.value) setRangeStart(new Date(e.target.value)); }} />
                                <TextField fullWidth size="small" type="date" label="Ket thuc" InputLabelProps={{ shrink: true }} value={formData[KEY_THOI_GIAN_KET_THUC] || ''} onChange={(e) => { handleFieldChange(KEY_THOI_GIAN_KET_THUC, e.target.value); if (e.target.value) setRangeEnd(new Date(e.target.value)); }} />
                            </Stack>
                            <TextField fullWidth size="small" label="Noi dung cong viec" multiline minRows={2} value={formData[KEY_NOI_DUNG] || ''} onChange={(e) => handleFieldChange(KEY_NOI_DUNG, e.target.value)} />
                            <TextField fullWidth size="small" label="Vat chat bao dam" value={formData[KEY_VAT_CHAT] || ''} onChange={(e) => handleFieldChange(KEY_VAT_CHAT, e.target.value)} />
                            <TextField fullWidth size="small" label="Ket qua" value={formData[KEY_KET_QUA] || ''} onChange={(e) => handleFieldChange(KEY_KET_QUA, e.target.value)} />

                            <Box sx={{ borderTop: '0.5px solid', borderColor: 'divider', pt: 1.5 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                    Truong dong bo sung
                                </Typography>
                                {schemaLoading ? (
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <CircularProgress size={16} />
                                        <Typography variant="caption" color="text.secondary">Dang tai fieldset...</Typography>
                                    </Stack>
                                ) : schemaError ? (
                                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>{schemaError}</Alert>
                                ) : dynamicContent.length === 0 ? (
                                    <Typography variant="caption" color="text.disabled">Chua co fieldset cau hinh cho bao duong.</Typography>
                                ) : (
                                    dynamicContent.map((item, index) => (
                                        <FieldSetGroup
                                            key={`${item.fieldSet.id}-${index}`}
                                            fieldSet={item.fieldSet}
                                            fields={item.fields}
                                            formData={formData}
                                            onFieldChange={handleFieldChange}
                                            color={item.fieldSet.color || DEFAULT_SET_COLORS[index % DEFAULT_SET_COLORS.length]}
                                            showSectionHeader
                                        />
                                    ))
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default', height: '40%', minHeight: 230 }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}>
                                Chon khoang thoi gian
                            </Typography>
                            <Box sx={{ maxWidth: 320 }}>
                                <MiniCalendar
                                    year={calYear}
                                    month={calMonth}
                                    rangeStart={rangeStart}
                                    rangeEnd={rangeEnd}
                                    onPrev={() => navigateMonth(-1)}
                                    onNext={() => navigateMonth(1)}
                                    onDayClick={handleDayClick}
                                />
                                <Stack direction="row" spacing={1} mt={1}>
                                    <Box sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 1, p: 0.75, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Bat dau</Typography>
                                        <Typography variant="caption" fontWeight={700}>{formatDateLabel(rangeStart)}</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 1, p: 0.75, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Ket thuc</Typography>
                                        <Typography variant="caption" fontWeight={700}>{formatDateLabel(rangeEnd)}</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 1, p: 0.75, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Thoi luong</Typography>
                                        <Typography variant="caption" fontWeight={700}>{durationDays !== null ? `${durationDays} ngay` : '--'}</Typography>
                                    </Box>
                                </Stack>
                            </Box>
                        </Box>

                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 320 }}>
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                                    Danh sach trang bi
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    ({selectedEquipment.length} da chon / {equipmentPool.length})
                                </Typography>
                            </Box>

                            <Box sx={{ px: 2, py: 1, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField
                                    size="small"
                                    placeholder="Tim trang bi..."
                                    value={equipmentSearch}
                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                    InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
                                    sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
                                />
                                {(['all', 'nhom1', 'nhom2'] as const).map((n) => (
                                    <Button
                                        key={n}
                                        size="small"
                                        variant={nhomFilter === n ? 'contained' : 'outlined'}
                                        onClick={() => setNhomFilter(n)}
                                        sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.72rem', textTransform: 'none' }}
                                    >
                                        {n === 'all' ? 'Tat ca' : n === 'nhom1' ? 'Nhom 1' : 'Nhom 2'}
                                    </Button>
                                ))}
                            </Box>

                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                {equipmentLoading ? (
                                    <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>
                                ) : (
                                    <DataGrid
                                        rows={filteredEquipmentRows}
                                        getRowId={(row) => row.key}
                                        columns={equipmentColumns}
                                        checkboxSelection
                                        disableRowSelectionOnClick
                                        rowSelectionModel={rowSelectionModel}
                                        onRowSelectionModelChange={handleSelectionModelChange}
                                        keepNonExistentRowsSelected
                                        hideFooter
                                        density="compact"
                                        sx={{
                                            border: 0,
                                            '& .MuiDataGrid-columnHeaders': { borderBottom: '0.5px solid', borderColor: 'divider' },
                                            '& .MuiDataGrid-cell': { borderBottom: '0.5px solid', borderColor: 'divider', fontSize: '0.78rem' },
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 2, py: 1.5 }}>
                {saveError && (
                    <Alert severity="error" sx={{ flex: 1, py: 0.5, px: 1.5, mr: 1 }}>
                        {saveError}
                    </Alert>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {selectedEquipmentKeys.size > 0
                        ? `Ke hoach ap dung cho ${selectedEquipmentKeys.size} trang bi`
                        : 'Nhap thong tin va chon it nhat 1 trang bi'}
                </Typography>
                <Button onClick={onClose} variant="outlined">Huy</Button>
                <Button onClick={handleSave} variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />} disabled={saving}>
                    {saving ? 'Dang luu...' : (editingId ? 'Cap nhat' : 'Luu ke hoach')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ThanhPhanBaoDuongDialog;
