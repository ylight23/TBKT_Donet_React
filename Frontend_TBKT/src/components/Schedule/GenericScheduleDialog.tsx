import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import type { SvgIconComponent } from '@mui/icons-material';

import { FieldSetGroup, type GeneralFieldSetItem } from '../TrangBiDataGrid/GeneralInfoTab';
import { FormDialog } from '../Dialog';
import thamSoApi, { type LocalFieldSet } from '../../apis/thamSoApi';
import { FormSkeleton, GridSkeleton } from '../Skeletons';
import { militaryColors } from '../../theme';

export type EquipmentOption = {
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

export interface GenericScheduleDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (payload: { formData: Record<string, string>; selectedEquipment: EquipmentOption[] }) => Promise<void>;
    initialData?: Record<string, string>;
    initialEquipment?: EquipmentOption[];
    editingId?: string;
    equipmentPool: EquipmentOption[];
    equipmentLoading: boolean;
    title: string;
    icon: SvgIconComponent;
    color?: string;
    fieldSetKey: string;
    nameFieldKey: string;
    nameFieldLabel: string;
    requiredNameError: string;
    startDateFieldKey?: string;
    endDateFieldKey?: string;
    equipmentActionRenderer?: (equipment: EquipmentOption, selected: boolean, ensureSelected: () => void) => React.ReactNode;
    sidePanel?: React.ReactNode;
    sidePanelWidth?: number;
    readOnly?: boolean;
}

const DEFAULT_SET_COLORS = [
    militaryColors.forestGreen,
    militaryColors.info,
    militaryColors.success,
    militaryColors.warning,
    militaryColors.gold,
];
const DOWS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const mergeFieldSets = (fieldSets: LocalFieldSet[]): LocalFieldSet[] => {
    if (fieldSets.length <= 1) return fieldSets;
    const first = fieldSets[0];
    const seenKeys = new Set<string>();
    const mergedFields = fieldSets.flatMap((fs) => fs.fields ?? []).filter((field) => {
        const key = String(field.key ?? '').trim().toLowerCase();
        if (!key || seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
    });
    return [{
        ...first,
        fieldIds: Array.from(new Set(fieldSets.flatMap((fs) => fs.fieldIds ?? []))),
        maDanhMucTrangBi: Array.from(new Set(fieldSets.flatMap((fs) => fs.maDanhMucTrangBi ?? []))),
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
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Button size="small" onClick={onPrev} sx={{ minWidth: 24, p: 0.25 }}>
                    <NavigateBeforeIcon fontSize="small" />
                </Button>
                <Typography variant="caption" fontWeight={700}>{MONTHS_VI[month]}, {year}</Typography>
                <Button size="small" onClick={onNext} sx={{ minWidth: 24, p: 0.25 }}>
                    <NavigateNextIcon fontSize="small" />
                </Button>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.25, width: '100%' }}>
                {DOWS_VI.map((d) => (
                    <Typography key={d} sx={{ fontSize: '0.62rem', color: 'text.secondary', textAlign: 'center', fontWeight: 700 }}>
                        {d}
                    </Typography>
                ))}
                {Array.from({ length: startOffset }, (_, i) => <Box key={`pad-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const state = isInRange(d);
                    return (
                        <Box
                            key={`day-${d}`}
                            onClick={() => onDayClick(d)}
                            sx={{
                                textAlign: 'center',
                                py: { xs: 0.25, sm: 0.35 },
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

const GenericScheduleDialog: React.FC<GenericScheduleDialogProps> = ({
    open,
    onClose,
    onSave,
    initialData = {},
    initialEquipment = [],
    editingId,
    equipmentPool,
    equipmentLoading,
    title,
    icon: Icon,
    color = militaryColors.forestGreen,
    fieldSetKey,
    nameFieldKey,
    nameFieldLabel,
    requiredNameError,
    startDateFieldKey = 'thoi_gian_thuc_hien',
    endDateFieldKey = 'thoi_gian_ket_thuc',
    equipmentActionRenderer,
    sidePanel,
    sidePanelWidth = 520,
    readOnly = false,
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
            const data = await thamSoApi.getFieldSetsByKey(fieldSetKey);
            setFieldSetDetails(mergeFieldSets(data));
        } catch (error) {
            setSchemaError((error as Error).message || 'Không tải được dữ liệu.');
        } finally {
            setSchemaLoading(false);
        }
    }, [fieldSetKey]);

    useEffect(() => {
        if (!open) return;
        const normalizedData: Record<string, string> = { ...initialData };
        const startRaw = normalizedData[startDateFieldKey] || '';
        const endRaw = normalizedData[endDateFieldKey] || '';
        if (startRaw) normalizedData[startDateFieldKey] = toInputDate(startRaw);
        if (endRaw) normalizedData[endDateFieldKey] = toInputDate(endRaw);

        setFormData(normalizedData);
        setSelectedEquipmentKeys(new Set(initialEquipment.map((e) => e.key)));
        setEquipmentSearch('');
        setNhomFilter('all');
        setSaveError('');

        const start = startRaw ? new Date(startRaw) : null;
        const end = endRaw ? new Date(endRaw) : null;
        setRangeStart(start);
        setRangeEnd(end);
        if (start) {
            setCalYear(start.getFullYear());
            setCalMonth(start.getMonth());
        }

        void loadFieldSets();
    }, [open, initialData, initialEquipment, startDateFieldKey, endDateFieldKey, loadFieldSets]);

    const handleFieldChange = useCallback((key: string, value: string) => {
        if (readOnly) return;
        setFormData((prev) => ({ ...prev, [key]: value }));
    }, [readOnly]);

    const handleDayClick = useCallback((d: number) => {
        if (readOnly) return;
        const dt = new Date(calYear, calMonth, d);
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(dt);
            setRangeEnd(null);
            handleFieldChange(startDateFieldKey, toInputDate(dt.toISOString()));
            handleFieldChange(endDateFieldKey, '');
            return;
        }

        const start = dt < rangeStart ? dt : rangeStart;
        const end = dt < rangeStart ? rangeStart : dt;
        setRangeStart(start);
        setRangeEnd(end);
        handleFieldChange(startDateFieldKey, toInputDate(start.toISOString()));
        handleFieldChange(endDateFieldKey, toInputDate(end.toISOString()));
    }, [calMonth, calYear, endDateFieldKey, handleFieldChange, rangeEnd, rangeStart, readOnly, startDateFieldKey]);

    const navigateMonth = useCallback((dir: number) => {
        setCalMonth((prev) => {
            let next = prev + dir;
            if (next > 11) { next = 0; setCalYear((y) => y + 1); }
            else if (next < 0) { next = 11; setCalYear((y) => y - 1); }
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
                disabled: readOnly || (field.disabled ?? false),
                validation: field.validation ?? {},
            })),
        }))
    ), [fieldSetDetails, readOnly]);

    const dynamicFieldKeys = useMemo(
        () => new Set(dynamicContent.flatMap((item) => item.fields.map((field) => String(field.key || '').trim())).filter(Boolean)),
        [dynamicContent],
    );

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

    const equipmentColumns = useMemo<GridColDef<EquipmentOption>[]>(() => {
        const baseColumns: GridColDef<EquipmentOption>[] = [
            { field: 'soHieu', headerName: 'Số hiệu', width: 130 },
            { field: 'maDanhMuc', headerName: 'Mã danh mục', width: 180 },
            { field: 'tenDanhMuc', headerName: 'Tên trang bị', minWidth: 260, flex: 1 },
            { field: 'nhom', headerName: 'Nhóm', width: 90, align: 'center', headerAlign: 'center', valueGetter: (_, row) => `N${row.nhom}` },
            { field: 'donVi', headerName: 'Đơn vị', minWidth: 170, flex: 0.8 },
        ];

        if (!equipmentActionRenderer || readOnly) return baseColumns;

        return [
            {
                field: '__actions',
                headerName: 'Chi tiết',
                width: 118,
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                align: 'center',
                headerAlign: 'center',
                renderCell: (params) => equipmentActionRenderer(
                    params.row,
                    selectedEquipmentKeys.has(params.row.key),
                    () => setSelectedEquipmentKeys((prev) => new Set([...Array.from(prev), params.row.key])),
                ),
            },
            ...baseColumns,
        ];
    }, [equipmentActionRenderer, readOnly, selectedEquipmentKeys]);

    const rowSelectionModel = useMemo<GridRowSelectionModel>(
        () => ({ type: 'include', ids: new Set(Array.from(selectedEquipmentKeys)) }),
        [selectedEquipmentKeys],
    );

    const handleSelectionModelChange = useCallback((model: GridRowSelectionModel) => {
        if (readOnly) return;
        setSelectedEquipmentKeys(new Set(Array.from(model.ids).map((id) => String(id))));
    }, [readOnly]);

    const formatDateLabel = (dt: Date | null): string => {
        if (!dt) return '--';
        return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
    };

    const durationDays = useMemo(() => {
        if (!rangeStart || !rangeEnd) return null;
        return Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, [rangeEnd, rangeStart]);

    const handleSave = async () => {
        if (readOnly) return;
        const requiredName = String(formData[nameFieldKey] || '').trim();
        if (!requiredName) {
            setSaveError(requiredNameError);
            return;
        }
        if (selectedEquipmentKeys.size === 0) {
            setSaveError('Vui lòng chọn ít nhất 1 trang bị.');
            return;
        }

        const mergedFormData: Record<string, string> = { ...formData, [nameFieldKey]: requiredName };
        if (mergedFormData[startDateFieldKey]) mergedFormData[startDateFieldKey] = toIsoDate(mergedFormData[startDateFieldKey]);
        if (mergedFormData[endDateFieldKey]) mergedFormData[endDateFieldKey] = toIsoDate(mergedFormData[endDateFieldKey]);

        setSaving(true);
        setSaveError('');
        try {
            await onSave({ formData: mergedFormData, selectedEquipment });
        } catch (error) {
            setSaveError((error as Error).message || 'Không thể lưu kế hoạch.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormDialog
            open={open}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            mode={editingId ? 'edit' : 'add'}
            title={title}
            icon={<Icon />}
            color={color}
            contentPadding={0}
            showCancel={false}
            showConfirm={false}
            customActions={(
                <>
                    {saveError && <Alert severity="error" sx={{ flex: 1, py: 0.5, px: 1.5, mr: 1 }}>{saveError}</Alert>}
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        {selectedEquipmentKeys.size > 0
                            ? `Kế hoạch áp dụng cho ${selectedEquipmentKeys.size} trang bị`
                            : 'Nhập thông tin và chọn ít nhất 1 trang bị'}
                    </Typography>
                    <Button onClick={onClose} variant="outlined">{readOnly ? 'Đóng' : 'Hủy'}</Button>
                    {!readOnly && (
                        <Button onClick={handleSave} variant="contained" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />} disabled={saving}>
                            {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu kế hoạch')}
                        </Button>
                    )}
                </>
            )}
        >
            <Box sx={{ display: 'flex', minHeight: 640, maxHeight: 'calc(100vh - 220px)', overflow: 'hidden' }}>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                    <Box sx={{ width: sidePanel ? '46%' : '52%', minWidth: sidePanel ? 380 : 460, border: '0.5px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Thông tin kế hoạch
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {!dynamicFieldKeys.has(nameFieldKey) && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    label={nameFieldLabel}
                                    value={formData[nameFieldKey] || ''}
                                    disabled={readOnly}
                                    onChange={(e) => handleFieldChange(nameFieldKey, e.target.value)}
                                />
                            )}
                            {!dynamicFieldKeys.has(startDateFieldKey) && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Thời gian thực hiện"
                                    InputLabelProps={{ shrink: true }}
                                    value={formData[startDateFieldKey] || ''}
                                    disabled={readOnly}
                                    onChange={(e) => { handleFieldChange(startDateFieldKey, e.target.value); if (e.target.value) setRangeStart(new Date(e.target.value)); }}
                                />
                            )}
                            {!dynamicFieldKeys.has(endDateFieldKey) && (
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="date"
                                    label="Thời gian kết thúc"
                                    InputLabelProps={{ shrink: true }}
                                    value={formData[endDateFieldKey] || ''}
                                    disabled={readOnly}
                                    onChange={(e) => { handleFieldChange(endDateFieldKey, e.target.value); if (e.target.value) setRangeEnd(new Date(e.target.value)); }}
                                />
                            )}

                            <Box sx={{ borderTop: '0.5px solid', borderColor: 'divider', pt: 1.5 }}>
                                {schemaLoading ? (
                                    <FormSkeleton rows={3} cols={1} />
                                ) : schemaError ? (
                                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>{schemaError}</Alert>
                                ) : dynamicContent.length === 0 ? (
                                    <Typography variant="caption" color="text.disabled">Chưa có dữ liệu cấu hình.</Typography>
                                ) : (
                                    dynamicContent.map((item, index) => (
                                        <FieldSetGroup
                                            key={`${item.fieldSet.id}-${index}`}
                                            fieldSet={item.fieldSet}
                                            fields={item.fields}
                                            formData={formData}
                                            onFieldChange={handleFieldChange}
                                            color={item.fieldSet.color || DEFAULT_SET_COLORS[index % DEFAULT_SET_COLORS.length]}
                                            showSectionHeader={false}
                                        />
                                    ))
                                )}
                            </Box>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                        <Box
                            sx={{
                                border: '0.5px solid',
                                borderColor: 'divider',
                                bgcolor: '#EAF2FF',
                                flex: '0 0 auto',
                                minHeight: 0,
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                                    Chọn khoảng thời gian
                                </Typography>
                            </Box>
                            <Box sx={{ width: '100%', minWidth: 0, p: 1.5 }}>
                                <MiniCalendar
                                    year={calYear}
                                    month={calMonth}
                                    rangeStart={rangeStart}
                                    rangeEnd={rangeEnd}
                                    onPrev={() => navigateMonth(-1)}
                                    onNext={() => navigateMonth(1)}
                                    onDayClick={handleDayClick}
                                />
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                        gap: 1,
                                        mt: 1,
                                    }}
                                >
                                    <Box sx={{ minWidth: 0, bgcolor: 'background.default', borderRadius: 1, p: 0.75, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Bắt đầu</Typography>
                                        <Typography variant="caption" fontWeight={700} noWrap>{formatDateLabel(rangeStart)}</Typography>
                                    </Box>
                                    <Box sx={{ minWidth: 0, bgcolor: 'background.default', borderRadius: 1, p: 0.75, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Kết thúc</Typography>
                                        <Typography variant="caption" fontWeight={700} noWrap>{formatDateLabel(rangeEnd)}</Typography>
                                    </Box>
                                    <Box sx={{ minWidth: 0, bgcolor: 'background.default', borderRadius: 1, p: 0.75, textAlign: 'center' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Thời lượng</Typography>
                                        <Typography variant="caption" fontWeight={700} noWrap>{durationDays !== null ? `${durationDays} ngày` : '--'}</Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>

                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, border: '0.5px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                            <Box sx={{ px: 2, py: 1.5, borderBottom: '0.5px solid', borderColor: 'divider', bgcolor: 'background.default', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                                    Danh sách trang bị
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    ({selectedEquipment.length} đã chọn / {equipmentPool.length})
                                </Typography>
                            </Box>

                            <Box sx={{ px: 2, py: 1, borderBottom: '0.5px solid', borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField
                                    size="small"
                                    placeholder="Tìm trang bị..."
                                    value={equipmentSearch}
                                    disabled={readOnly}
                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                    InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
                                    sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.75 } }}
                                />
                                {(['all', 'nhom1', 'nhom2'] as const).map((n) => (
                                    <Button
                                        key={n}
                                        size="small"
                                        variant={nhomFilter === n ? 'contained' : 'outlined'}
                                        disabled={readOnly}
                                        onClick={() => setNhomFilter(n)}
                                        sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: '0.72rem', textTransform: 'none' }}
                                    >
                                        {n === 'all' ? 'Tất cả' : n === 'nhom1' ? 'Nhóm 1' : 'Nhóm 2'}
                                    </Button>
                                ))}
                            </Box>

                            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                {equipmentLoading ? (
                                    <GridSkeleton rows={6} cols={5} />
                                ) : (
                                    <DataGrid
                                        rows={filteredEquipmentRows}
                                        getRowId={(row) => row.key}
                                        columns={equipmentColumns}
                                        checkboxSelection={!readOnly}
                                        disableRowSelectionOnClick
                                        rowSelectionModel={readOnly ? undefined : rowSelectionModel}
                                        onRowSelectionModelChange={readOnly ? undefined : handleSelectionModelChange}
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
                {sidePanel && (
                    <Box
                        sx={{
                            width: sidePanelWidth,
                            maxWidth: '48%',
                            flexShrink: 0,
                            borderLeft: '0.5px solid',
                            borderColor: 'divider',
                            bgcolor: '#f6f7f9',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                        }}
                    >
                        {sidePanel}
                    </Box>
                )}
            </Box>
        </FormDialog>
    );
};

export default GenericScheduleDialog;

