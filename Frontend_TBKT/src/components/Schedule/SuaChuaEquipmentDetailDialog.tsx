import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    MenuItem,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';

import thamSoApi, { type LocalFieldSet } from '../../apis/thamSoApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../../constants/fieldSetKeys';
import { FieldSetGroup, type GeneralFieldSetItem } from '../TrangBiDataGrid/GeneralInfoTab';
import type { EquipmentOption } from './GenericScheduleDialog';

type RepairTaskRow = {
    id: string;
    noiDung: string;
    boPhan: string;
    trangThai: string;
    tienDo: string;
    ktv: string;
    vatTu: string;
};

export interface SuaChuaEquipmentDetailDialogProps {
    equipment: EquipmentOption | null;
    value: Record<string, string>;
    onClose: () => void;
    onSave: (value: Record<string, string>) => void;
}

const TASKS_FIELD_KEY = 'hang_muc_sua_chua_json';
const MAX_STEP = 5;
const DEFAULT_SET_COLORS = ['#3C3489', '#0C447C', '#27500A', '#6B3A08'];

const COMMON_KEYS = new Set([
    'ma_phieu_sua_chua',
    'trang_thai_phieu',
    'so_luong',
    'thoi_gian_vao',
    'thoi_gian_ra_du_kien',
    'thoi_gian_ra_thuc_te',
    'muc_sua_chua_lan_nay',
    'muc_sua_chua_tiep_theo',
    'thoi_gian_sua_chua_tiep_theo',
    'don_vi_chu_quan',
    'don_vi_sua_chua_chi_tiet',
    'nguoi_tiep_nhan',
]);

const RESULT_KEYS = new Set([
    'tinh_trang_dau_vao',
    'tinh_trang_ky_thuat',
    'tinh_trang_su_dung',
    'nhien_lieu',
    'ngay_cong',
    'kinh_phi_du_kien',
    'kinh_phi_thuc_te',
    'ket_qua_sua_chua',
    'ngay_hoan_thanh_thuc_te',
    'tong_thoi_gian_sua_chua',
    'ghi_chu_chi_tiet',
]);

const SIGNATURE_KEYS = new Set([
    'nguoi_ban_giao',
    'nguoi_tiep_nhan_ky',
    'chi_huy_don_vi',
    'ngay_ky_ban_giao',
    'ngay_ky_tiep_nhan',
    'ngay_ky_chi_huy',
    'xac_nhan_hoan_thanh',
]);

const createTaskRow = (): RepairTaskRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    noiDung: '',
    boPhan: '',
    trangThai: 'chua_thuc_hien',
    tienDo: '0',
    ktv: '',
    vatTu: '',
});

const parseTasks = (raw?: string): RepairTaskRow[] => {
    if (!raw) return [createTaskRow()];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [createTaskRow()];
        const rows = parsed.map((item) => ({
            id: String(item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
            noiDung: String(item.noiDung || ''),
            boPhan: String(item.boPhan || ''),
            trangThai: String(item.trangThai || 'chua_thuc_hien'),
            tienDo: String(item.tienDo || '0'),
            ktv: String(item.ktv || ''),
            vatTu: String(item.vatTu || ''),
        }));
        return rows.length > 0 ? rows : [createTaskRow()];
    } catch {
        return [createTaskRow()];
    }
};

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

const toFieldSetContent = (fieldSets: LocalFieldSet[], allowedKeys: Set<string>): GeneralFieldSetItem[] => (
    fieldSets.map((detail) => ({
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
        fields: (detail.fields ?? [])
            .filter((field) => field.key !== TASKS_FIELD_KEY && allowedKeys.has(field.key))
            .map((field) => ({
                id: field.id,
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required,
                disabled: field.disabled ?? false,
                validation: field.validation ?? {},
            })),
    })).filter((item) => item.fields.length > 0)
);

const Stepper: React.FC<{
    activeStep: number;
    formData: Record<string, string>;
    taskCount: number;
    onStepClick: (step: number) => void;
}> = ({ activeStep, formData, taskCount, onStepClick }) => {
    const steps = [
        { label: 'Thong tin', done: Boolean(formData.thoi_gian_vao || formData.muc_sua_chua_lan_nay || formData.nguoi_tiep_nhan) },
        { label: 'Hang muc', done: taskCount > 0 },
        { label: 'Ket qua', done: Boolean(formData.ket_qua_sua_chua || formData.ngay_hoan_thanh_thuc_te) },
        { label: 'Ky nhan', done: Boolean(formData.nguoi_ban_giao || formData.nguoi_tiep_nhan_ky || formData.chi_huy_don_vi) },
        { label: 'Hoan thanh', done: formData.xac_nhan_hoan_thanh === 'true' },
    ];

    return (
        <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
            <Stack direction="row" alignItems="center" sx={{ overflowX: 'auto' }}>
                {steps.map((step, index) => {
                    const stepNo = index + 1;
                    const active = activeStep === stepNo;
                    return (
                        <React.Fragment key={step.label}>
                            <Stack direction="row" alignItems="center" spacing={0.65} onClick={() => onStepClick(stepNo)} sx={{ cursor: 'pointer', flexShrink: 0 }}>
                                <Box
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 10.5,
                                        fontWeight: 900,
                                        bgcolor: step.done && !active ? '#EAF3DE' : active ? '#EEEDFE' : '#f5f4ef',
                                        color: step.done && !active ? '#27500A' : active ? '#3C3489' : '#9a9a94',
                                        border: '1px solid',
                                        borderColor: step.done && !active ? '#97C459' : active ? '#AFA9EC' : 'rgba(0,0,0,0.12)',
                                    }}
                                >
                                    {step.done && !active ? 'Hoàn tất' : stepNo}
                                </Box>
                                <Typography sx={{ fontSize: 10.5, color: active ? '#1a1a18' : '#5c5c57', fontWeight: active ? 800 : 600, whiteSpace: 'nowrap' }}>
                                    {step.label}
                                </Typography>
                            </Stack>
                            {index < steps.length - 1 && <Divider sx={{ mx: 0.8, width: 22, flexShrink: 0 }} />}
                        </React.Fragment>
                    );
                })}
            </Stack>
        </Box>
    );
};

const PanelSection: React.FC<{
    title: string;
    children: React.ReactNode;
}> = ({ title, children }) => (
    <Box sx={{ p: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#1a1a18', mb: 1.25, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {title}
        </Typography>
        {children}
    </Box>
);

const SuaChuaEquipmentDetailDialog: React.FC<SuaChuaEquipmentDetailDialogProps> = ({
    equipment,
    value,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [taskRows, setTaskRows] = useState<RepairTaskRow[]>([createTaskRow()]);
    const [fieldSets, setFieldSets] = useState<LocalFieldSet[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeStep, setActiveStep] = useState(1);

    const loadSchema = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await thamSoApi.getFieldSetsByKey(TRANG_BI_FIELD_SET_KEYS.SUA_CHUA_CHI_TIET);
            setFieldSets(mergeFieldSets(data));
        } catch (err) {
            setError((err as Error).message || 'Khong tai duoc fieldset chi tiet sua chua.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setFormData({ ...value });
        setTaskRows(parseTasks(value[TASKS_FIELD_KEY]));
        setActiveStep(1);
        void loadSchema();
    }, [loadSchema, value]);

    const commonContent = useMemo(() => toFieldSetContent(fieldSets, COMMON_KEYS), [fieldSets]);
    const resultContent = useMemo(() => toFieldSetContent(fieldSets, RESULT_KEYS), [fieldSets]);
    const signatureContent = useMemo(() => toFieldSetContent(fieldSets, SIGNATURE_KEYS), [fieldSets]);
    const completedTasks = useMemo(
        () => taskRows.filter((row) => row.noiDung.trim() || row.boPhan.trim() || row.ktv.trim() || row.vatTu.trim()).length,
        [taskRows],
    );
    const costSummary = useMemo(() => ({
        duKien: Number(formData.kinh_phi_du_kien || 0),
        thucTe: Number(formData.kinh_phi_thuc_te || 0),
        nhienLieu: Number(formData.nhien_lieu || 0),
        ngayCong: Number(formData.ngay_cong || 0),
    }), [formData]);

    const handleFieldChange = useCallback((key: string, nextValue: string) => {
        setFormData((prev) => ({ ...prev, [key]: nextValue }));
    }, []);

    const renderContent = useCallback((items: GeneralFieldSetItem[], emptyText: string) => {
        if (loading) {
            return (
                <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">Dang tai fieldset...</Typography>
                </Stack>
            );
        }
        if (error) return <Alert severity="warning">{error}</Alert>;
        if (items.length === 0) return <Alert severity="info">{emptyText}</Alert>;

        return items.map((item, index) => (
            <FieldSetGroup
                key={`${item.fieldSet.id}-${index}`}
                fieldSet={item.fieldSet}
                fields={item.fields}
                formData={formData}
                onFieldChange={handleFieldChange}
                color={item.fieldSet.color || DEFAULT_SET_COLORS[index % DEFAULT_SET_COLORS.length]}
                showSectionHeader={false}
            />
        ));
    }, [error, formData, handleFieldChange, loading]);

    const updateTaskRow = useCallback((id: string, key: keyof RepairTaskRow, nextValue: string) => {
        setTaskRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: nextValue } : row)));
    }, []);

    const saveCurrent = useCallback(() => {
        const cleanedTasks = taskRows
            .map((row) => ({
                ...row,
                noiDung: row.noiDung.trim(),
                boPhan: row.boPhan.trim(),
                ktv: row.ktv.trim(),
                vatTu: row.vatTu.trim(),
            }))
            .filter((row) => row.noiDung || row.boPhan || row.ktv || row.vatTu);

        onSave({
            ...formData,
            [TASKS_FIELD_KEY]: JSON.stringify(cleanedTasks),
        });
    }, [formData, onSave, taskRows]);

    const goStep = useCallback((step: number) => {
        setActiveStep(Math.min(MAX_STEP, Math.max(1, step)));
    }, []);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', minHeight: 0 }}>
            <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f5f4ef' }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.25, bgcolor: '#EEEDFE', color: '#3C3489', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AssignmentIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#1a1a18' }} noWrap>Chi tiet sua chua trang bi</Typography>
                        <Typography sx={{ fontSize: 11, color: '#5c5c57' }} noWrap>{equipment?.tenDanhMuc || 'Trang bi'} - {equipment?.maDanhMuc || '--'}</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ bgcolor: '#fff' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            <Stepper activeStep={activeStep} formData={formData} taskCount={completedTasks} onStepClick={goStep} />

            {equipment && activeStep < 5 && (
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fbfbfb' }}>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={formData.trang_thai_phieu || 'Dang sua chua'} sx={{ bgcolor: '#FCEBEB', color: '#7A2020', height: 21, fontSize: 10 }} />
                        <Chip size="small" label={`CN: ${equipment.idChuyenNganhKt || '--'}`} sx={{ bgcolor: '#EEEDFE', color: '#3C3489', height: 21, fontSize: 10 }} />
                        <Chip size="small" label={`So hieu: ${equipment.soHieu || '--'}`} sx={{ bgcolor: '#f5f4ef', color: '#5c5c57', height: 21, fontSize: 10 }} />
                    </Stack>
                </Box>
            )}

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: '#fff' }}>
                {activeStep === 1 && (
                    <PanelSection title="Thong tin tiep nhan sua chua">
                        {renderContent(commonContent, 'Chua co field thong tin chung cho phieu chi tiet sua chua.')}
                    </PanelSection>
                )}

                {activeStep === 2 && (
                    <PanelSection title="Hang muc sua chua">
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setTaskRows((prev) => [...prev, createTaskRow()])} sx={{ mb: 1 }}>
                            Them hang muc
                        </Button>
                        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['Noi dung', 'Bo phan', 'Trang thai', 'Tien do', ''].map((head) => (
                                            <TableCell key={head} sx={{ bgcolor: '#f5f4ef', color: '#5c5c57', fontSize: 10, fontWeight: 800 }}>
                                                {head}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {taskRows.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell sx={{ minWidth: 160 }}><TextField size="small" fullWidth value={row.noiDung} onChange={(e) => updateTaskRow(row.id, 'noiDung', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 110 }}><TextField size="small" fullWidth value={row.boPhan} onChange={(e) => updateTaskRow(row.id, 'boPhan', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 120 }}>
                                                <TextField select size="small" fullWidth value={row.trangThai} onChange={(e) => updateTaskRow(row.id, 'trangThai', e.target.value)}>
                                                    <MenuItem value="chua_thuc_hien">Chua thuc hien</MenuItem>
                                                    <MenuItem value="dang_lam">Dang lam</MenuItem>
                                                    <MenuItem value="hoan_thanh">Hoan thanh</MenuItem>
                                                </TextField>
                                            </TableCell>
                                            <TableCell sx={{ width: 80 }}><TextField size="small" type="number" value={row.tienDo} onChange={(e) => updateTaskRow(row.id, 'tienDo', e.target.value)} inputProps={{ min: 0, max: 100 }} /></TableCell>
                                            <TableCell align="center" sx={{ width: 42 }}>
                                                <IconButton size="small" color="error" onClick={() => setTaskRows((prev) => prev.length <= 1 ? [createTaskRow()] : prev.filter((item) => item.id !== row.id))}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </PanelSection>
                )}

                {activeStep === 3 && (
                    <PanelSection title="Tinh trang & ket qua">
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.25 }}>
                            {[
                                { label: 'Nhien lieu', value: costSummary.nhienLieu || '--' },
                                { label: 'Ngay cong', value: costSummary.ngayCong || '--' },
                                { label: 'Kinh phi DK', value: costSummary.duKien ? costSummary.duKien.toLocaleString('vi-VN') : '--' },
                                { label: 'Kinh phi TT', value: costSummary.thucTe ? costSummary.thucTe.toLocaleString('vi-VN') : '--' },
                            ].map((item) => (
                                <Box key={item.label} sx={{ p: 1, borderRadius: 1, bgcolor: '#f5f4ef' }}>
                                    <Typography sx={{ fontSize: 10, color: '#5c5c57' }}>{item.label}</Typography>
                                    <Typography sx={{ fontSize: 15, fontWeight: 900 }}>{item.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                        {renderContent(resultContent, 'Chua co field tinh trang va ket qua cho phieu chi tiet sua chua.')}
                    </PanelSection>
                )}

                {activeStep === 4 && (
                    <PanelSection title="Ky xac nhan">
                        <Box sx={{ display: 'grid', gap: 1, mb: 1.25 }}>
                            {[
                                { label: 'Tho may / KTV thuc hien', name: formData.nguoi_ban_giao },
                                { label: 'Tro ly ky thuat kiem tra', name: formData.nguoi_tiep_nhan_ky },
                                { label: 'Chi huy don vi phe duyet', name: formData.chi_huy_don_vi },
                            ].map((item) => (
                                <Box key={item.label} sx={{ border: '1px dashed', borderColor: item.name ? '#97C459' : 'divider', borderRadius: 1, p: 1.2, bgcolor: item.name ? '#EAF3DE' : '#f5f4ef' }}>
                                    <Typography sx={{ fontSize: 11, color: '#5c5c57', fontWeight: 700 }}>{item.label}</Typography>
                                    <Typography sx={{ fontSize: 12, color: item.name ? '#27500A' : '#9a9a94', fontWeight: 800 }}>{item.name || 'Nhap thong tin ky ben duoi'}</Typography>
                                </Box>
                            ))}
                        </Box>
                        {renderContent(signatureContent, 'Chua co field ky xac nhan cho phieu chi tiet sua chua.')}
                    </PanelSection>
                )}

                {activeStep === 5 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Box sx={{ width: 80, height: 75, borderRadius: '50%', bgcolor: '#EAF3DE', border: '1px solid #97C459', mx: 'auto', mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27500A', fontSize: 20, fontWeight: 900 }}>Hoàn tất</Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 900, mb: 1 }}>Phiếu sửa chữa đã được ghi nhận</Typography>
                        <Typography sx={{ fontSize: 12, color: '#5c5c57', mb: 2 }}>{equipment?.tenDanhMuc || 'Trang bị'} đã hoàn thành sửa chữa</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, textAlign: 'left' }}>
                            {[
                                { label: 'So phieu SC', value: formData.ma_phieu_sua_chua || '#SC' },
                                { label: 'Thoi gian SC', value: formData.tong_thoi_gian_sua_chua ? `${formData.tong_thoi_gian_sua_chua} ngay` : '--' },
                                { label: 'Hang muc', value: `${completedTasks} hang muc` },
                                { label: 'Kinh phi', value: costSummary.thucTe ? `${costSummary.thucTe.toLocaleString('vi-VN')} d` : '--' },
                            ].map((item) => (
                                <Box key={item.label} sx={{ bgcolor: '#f5f4ef', borderRadius: 1, p: 1 }}>
                                    <Typography sx={{ fontSize: 10, color: '#5c5c57' }}>{item.label}</Typography>
                                    <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{item.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>

            <Box sx={{ p: 1.25, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#f8f8fa' }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                    {activeStep > 1 && <Button variant="outlined" size="small" onClick={() => goStep(activeStep - 1)}>Quay lai</Button>}
                    <Button variant="outlined" size="small" startIcon={<PrintIcon />}>In phieu</Button>
                    <Box sx={{ flex: 1 }} />
                    {activeStep < 4 && <Button variant="contained" size="small" onClick={() => goStep(activeStep + 1)}>Tiep tuc</Button>}
                    {activeStep === 4 && <Button variant="contained" size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => { setFormData((prev) => ({ ...prev, xac_nhan_hoan_thanh: 'true', trang_thai_phieu: 'Hoan thanh' })); goStep(5); }}>Hoan thanh</Button>}
                    {activeStep === 5 && <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveCurrent}>Luu</Button>}
                </Stack>
            </Box>
        </Box>
    );
};

export default SuaChuaEquipmentDetailDialog;
