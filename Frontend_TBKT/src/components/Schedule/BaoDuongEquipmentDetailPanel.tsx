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
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PrintIcon from '@mui/icons-material/Print';
import SaveIcon from '@mui/icons-material/Save';

import thamSoApi, { type LocalFieldSet } from '../../apis/thamSoApi';
import { TRANG_BI_FIELD_SET_KEYS } from '../../constants/fieldSetKeys';
import { FieldSetGroup, type GeneralFieldSetItem } from '../TrangBiDataGrid/GeneralInfoTab';
import type { EquipmentOption } from './GenericScheduleDialog';

export interface BaoDuongEquipmentDetailPanelProps {
    equipment: EquipmentOption | null;
    value: Record<string, string>;
    onClose: () => void;
    onSave: (value: Record<string, string>) => void;
}

type WorkRow = {
    id: string;
    noiDung: string;
    hangMuc: string;
    trangThai: string;
    tienDo: string;
};

type MaterialRow = {
    id: string;
    tenVatChat: string;
    maKyHieu: string;
    donViTinh: string;
    soLuong: string;
    ghiChu: string;
};

const MAX_STEP = 5;
const WORK_ITEMS_FIELD_KEY = 'noi_dung_cong_viec_json';
const MATERIAL_ITEMS_FIELD_KEY = 'vat_chat_bao_dam_json';
const INFO_KEYS = new Set(['ngay_bao_duong', 'nguoi_thuc_hien']);
const RESULT_KEYS = new Set(['ket_qua']);

const createWorkRow = (): WorkRow => ({
    id: `${Date.now()}-${Math.random()}`,
    noiDung: '',
    hangMuc: '',
    trangThai: 'dang_thuc_hien',
    tienDo: '0',
});

const createMaterialRow = (): MaterialRow => ({
    id: `${Date.now()}-${Math.random()}`,
    tenVatChat: '',
    maKyHieu: '',
    donViTinh: '',
    soLuong: '',
    ghiChu: '',
});

const parseRows = <T,>(value: string | undefined, fallback: T[]): T[] => {
    if (!value) return fallback;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed as T[] : fallback;
    } catch {
        return fallback;
    }
};

const mergeFieldSets = (fieldSets: LocalFieldSet[]): LocalFieldSet[] => {
    if (fieldSets.length <= 1) return fieldSets;
    const first = fieldSets[0];
    const seenKeys = new Set<string>();
    const fields = fieldSets.flatMap((fs) => fs.fields ?? []).filter((field) => {
        const key = String(field.key ?? '').trim().toLowerCase();
        if (!key || seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
    });
    return [{ ...first, fields }];
};

const toFieldSetItem = (fieldSet: LocalFieldSet, keys: Set<string>): GeneralFieldSetItem | null => {
    const fields = (fieldSet.fields ?? []).filter((field) => keys.has(String(field.key || '').trim()));
    if (fields.length === 0) return null;
    return {
        fieldSet: {
            id: fieldSet.id,
            name: fieldSet.name,
            key: fieldSet.key,
            icon: fieldSet.icon,
            color: fieldSet.color,
            desc: fieldSet.desc,
            fieldIds: fields.map((f) => f.id),
            maDanhMucTrangBi: fieldSet.maDanhMucTrangBi ?? [],
        },
        fields,
    };
};

const Stepper: React.FC<{
    activeStep: number;
    formData: Record<string, string>;
    workCount: number;
    materialCount: number;
    onStepClick: (step: number) => void;
}> = ({ activeStep, formData, workCount, materialCount, onStepClick }) => {
    const steps = [
        { label: 'Thong tin', done: Boolean(formData.ngay_bao_duong || formData.nguoi_thuc_hien) },
        { label: 'Noi dung', done: workCount > 0 },
        { label: 'Vat chat', done: materialCount > 0 },
        { label: 'Ket qua', done: Boolean(formData.ket_qua) },
        { label: 'Hoan thanh', done: formData.xac_nhan_hoan_thanh === 'true' },
    ];

    return (
        <Box sx={{ px: 1.5, py: 1.15, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fff' }}>
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
                                        fontSize: 10,
                                        fontWeight: 900,
                                        bgcolor: step.done && !active ? '#E6F1FB' : active ? '#E6F1FB' : '#f5f4ef',
                                        color: step.done && !active ? '#0C447C' : active ? '#0C447C' : '#9a9a94',
                                        border: '1px solid',
                                        borderColor: step.done && !active ? '#74B3E8' : active ? '#74B3E8' : 'rgba(0,0,0,0.12)',
                                    }}
                                >
                                    {step.done && !active ? 'OK' : stepNo}
                                </Box>
                                <Typography sx={{ fontSize: 10.5, color: active ? '#1a1a18' : '#5c5c57', fontWeight: active ? 800 : 600, whiteSpace: 'nowrap' }}>
                                    {step.label}
                                </Typography>
                            </Stack>
                            {index < steps.length - 1 && <Divider sx={{ mx: 0.8, width: 24, flexShrink: 0 }} />}
                        </React.Fragment>
                    );
                })}
            </Stack>
        </Box>
    );
};

const PanelSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Box sx={{ p: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#1a1a18', mb: 1.25, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {title}
        </Typography>
        {children}
    </Box>
);

const BaoDuongEquipmentDetailPanel: React.FC<BaoDuongEquipmentDetailPanelProps> = ({
    equipment,
    value,
    onClose,
    onSave,
}) => {
    const [activeStep, setActiveStep] = useState(1);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [fieldSets, setFieldSets] = useState<LocalFieldSet[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [workRows, setWorkRows] = useState<WorkRow[]>([createWorkRow()]);
    const [materialRows, setMaterialRows] = useState<MaterialRow[]>([createMaterialRow()]);

    useEffect(() => {
        setFormData(value || {});
        setWorkRows(parseRows<WorkRow>(value?.[WORK_ITEMS_FIELD_KEY], [createWorkRow()]));
        setMaterialRows(parseRows<MaterialRow>(value?.[MATERIAL_ITEMS_FIELD_KEY], [createMaterialRow()]));
        setActiveStep(1);
    }, [value, equipment?.key]);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError('');
        thamSoApi.getFieldSetsByKey(TRANG_BI_FIELD_SET_KEYS.BAO_DUONG_CHI_TIET)
            .then((data) => {
                if (mounted) setFieldSets(mergeFieldSets(data));
            })
            .catch((err) => {
                if (mounted) setError((err as Error).message || 'Khong tai duoc fieldset chi tiet bao duong.');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleFieldChange = useCallback((key: string, nextValue: string) => {
        setFormData((prev) => ({ ...prev, [key]: nextValue }));
    }, []);

    const contentByKey = useMemo(() => {
        const first = fieldSets[0];
        if (!first) return { info: null, result: null };
        return {
            info: toFieldSetItem(first, INFO_KEYS),
            result: toFieldSetItem(first, RESULT_KEYS),
        };
    }, [fieldSets]);

    const renderContent = (item: GeneralFieldSetItem | null, emptyText: string) => {
        if (loading) {
            return (
                <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="text.secondary">Dang tai fieldset...</Typography>
                </Stack>
            );
        }
        if (error) return <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>{error}</Alert>;
        if (!item) return <Typography variant="caption" color="text.disabled">{emptyText}</Typography>;
        return (
            <FieldSetGroup
                fieldSet={item.fieldSet}
                fields={item.fields}
                formData={formData}
                onFieldChange={handleFieldChange}
                color={item.fieldSet.color || '#2563eb'}
                showSectionHeader={false}
            />
        );
    };

    const goStep = useCallback((step: number) => {
        setActiveStep(Math.min(MAX_STEP, Math.max(1, step)));
    }, []);

    const filledWorkRows = useMemo(
        () => workRows.filter((row) => row.noiDung.trim() || row.hangMuc.trim()),
        [workRows],
    );

    const filledMaterialRows = useMemo(
        () => materialRows.filter((row) => row.tenVatChat.trim() || row.maKyHieu.trim() || row.soLuong.trim()),
        [materialRows],
    );

    const updateWorkRow = useCallback((id: string, key: keyof WorkRow, nextValue: string) => {
        setWorkRows((prev) => prev.map((row) => row.id === id ? { ...row, [key]: nextValue } : row));
    }, []);

    const updateMaterialRow = useCallback((id: string, key: keyof MaterialRow, nextValue: string) => {
        setMaterialRows((prev) => prev.map((row) => row.id === id ? { ...row, [key]: nextValue } : row));
    }, []);

    const saveCurrent = useCallback(() => {
        const cleanedWorkRows = filledWorkRows.map((row) => ({
            noiDung: row.noiDung.trim(),
            hangMuc: row.hangMuc.trim(),
            trangThai: row.trangThai,
            tienDo: row.tienDo,
        }));
        const cleanedMaterialRows = filledMaterialRows.map((row) => ({
            tenVatChat: row.tenVatChat.trim(),
            maKyHieu: row.maKyHieu.trim(),
            donViTinh: row.donViTinh.trim(),
            soLuong: row.soLuong.trim(),
            ghiChu: row.ghiChu.trim(),
        }));

        onSave({
            ...formData,
            ten_trang_bi: equipment?.tenDanhMuc || '',
            so_hieu: equipment?.soHieu || '',
            noi_dung_cong_viec: cleanedWorkRows.map((row) => row.noiDung).filter(Boolean).join('; '),
            vat_chat_bao_dam: cleanedMaterialRows.map((row) => row.tenVatChat).filter(Boolean).join('; '),
            [WORK_ITEMS_FIELD_KEY]: JSON.stringify(cleanedWorkRows),
            [MATERIAL_ITEMS_FIELD_KEY]: JSON.stringify(cleanedMaterialRows),
        });
    }, [equipment?.soHieu, equipment?.tenDanhMuc, filledMaterialRows, filledWorkRows, formData, onSave]);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff', minHeight: 0 }}>
            <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#f5f4ef' }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ width: 34, height: 34, borderRadius: 1.25, bgcolor: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BuildCircleIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#1a1a18' }} noWrap>Chi tiet bao duong trang bi</Typography>
                        <Typography sx={{ fontSize: 11, color: '#5c5c57' }} noWrap>{equipment?.tenDanhMuc || 'Trang bi'} - {equipment?.maDanhMuc || '--'}</Typography>
                    </Box>
                    <IconButton size="small" onClick={onClose} sx={{ bgcolor: '#fff' }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Box>

            <Stepper activeStep={activeStep} formData={formData} workCount={filledWorkRows.length} materialCount={filledMaterialRows.length} onStepClick={goStep} />

            {equipment && activeStep < 5 && (
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fbfbfb' }}>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                        <Chip size="small" label={formData.ket_qua || 'Dang bao duong'} sx={{ bgcolor: '#E6F1FB', color: '#0C447C', height: 21, fontSize: 10 }} />
                        <Chip size="small" label={`So hieu: ${equipment.soHieu || '--'}`} sx={{ bgcolor: '#f5f4ef', color: '#5c5c57', height: 21, fontSize: 10 }} />
                        <Chip size="small" label={`CN: ${equipment.idChuyenNganhKt || '--'}`} sx={{ bgcolor: '#EEEDFE', color: '#3C3489', height: 21, fontSize: 10 }} />
                    </Stack>
                </Box>
            )}

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: '#fff' }}>
                {activeStep === 1 && (
                    <PanelSection title="Thong tin chi tiet bao duong">
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.25 }}>
                            {[
                                { label: 'Ten trang bi', value: equipment?.tenDanhMuc || '--' },
                                { label: 'So hieu', value: equipment?.soHieu || '--' },
                            ].map((item) => (
                                <Box key={item.label} sx={{ p: 1, borderRadius: 1, bgcolor: '#f5f4ef' }}>
                                    <Typography sx={{ fontSize: 10, color: '#5c5c57' }}>{item.label}</Typography>
                                    <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{item.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                        {renderContent(contentByKey.info, 'Chua co field thong tin chi tiet bao duong.')}
                    </PanelSection>
                )}
                {activeStep === 2 && (
                    <PanelSection title="Noi dung thuc hien">
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setWorkRows((prev) => [...prev, createWorkRow()])} sx={{ mb: 1, borderStyle: 'dashed' }}>
                            Them noi dung
                        </Button>
                        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['#', 'Noi dung thuc hien', 'Hang muc', 'Trang thai', 'Tien do', ''].map((head) => (
                                            <TableCell key={head} sx={{ bgcolor: '#f5f4ef', color: '#5c5c57', fontSize: 10, fontWeight: 800 }}>{head}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {workRows.map((row, index) => (
                                        <TableRow key={row.id}>
                                            <TableCell sx={{ width: 34, fontSize: 11 }}>{index + 1}</TableCell>
                                            <TableCell sx={{ minWidth: 190 }}><TextField size="small" fullWidth value={row.noiDung} onChange={(e) => updateWorkRow(row.id, 'noiDung', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 120 }}><TextField size="small" fullWidth value={row.hangMuc} onChange={(e) => updateWorkRow(row.id, 'hangMuc', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 130 }}>
                                                <TextField select size="small" fullWidth value={row.trangThai} onChange={(e) => updateWorkRow(row.id, 'trangThai', e.target.value)}>
                                                    <MenuItem value="chua_thuc_hien">Chua thuc hien</MenuItem>
                                                    <MenuItem value="dang_thuc_hien">Dang thuc hien</MenuItem>
                                                    <MenuItem value="hoan_thanh">Hoan thanh</MenuItem>
                                                </TextField>
                                            </TableCell>
                                            <TableCell sx={{ width: 90 }}><TextField size="small" type="number" value={row.tienDo} onChange={(e) => updateWorkRow(row.id, 'tienDo', e.target.value)} inputProps={{ min: 0, max: 100 }} /></TableCell>
                                            <TableCell align="center" sx={{ width: 42 }}>
                                                <IconButton size="small" color="error" onClick={() => setWorkRows((prev) => prev.length <= 1 ? [createWorkRow()] : prev.filter((item) => item.id !== row.id))}>
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
                    <PanelSection title="Vat chat bao dam">
                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setMaterialRows((prev) => [...prev, createMaterialRow()])} sx={{ mb: 1, borderStyle: 'dashed', color: '#6B3A08', borderColor: '#EF9F27' }}>
                            Them vat chat
                        </Button>
                        <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        {['#', 'Ten vat chat / vat tu', 'Ma / ky hieu', 'Don vi', 'So luong', 'Ghi chu', ''].map((head) => (
                                            <TableCell key={head} sx={{ bgcolor: '#f5f4ef', color: '#5c5c57', fontSize: 10, fontWeight: 800 }}>{head}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {materialRows.map((row, index) => (
                                        <TableRow key={row.id}>
                                            <TableCell sx={{ width: 34, fontSize: 11 }}>{index + 1}</TableCell>
                                            <TableCell sx={{ minWidth: 170 }}><TextField size="small" fullWidth value={row.tenVatChat} onChange={(e) => updateMaterialRow(row.id, 'tenVatChat', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 120 }}><TextField size="small" fullWidth value={row.maKyHieu} onChange={(e) => updateMaterialRow(row.id, 'maKyHieu', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 80 }}><TextField size="small" fullWidth value={row.donViTinh} onChange={(e) => updateMaterialRow(row.id, 'donViTinh', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 90 }}><TextField size="small" type="number" fullWidth value={row.soLuong} onChange={(e) => updateMaterialRow(row.id, 'soLuong', e.target.value)} /></TableCell>
                                            <TableCell sx={{ minWidth: 140 }}><TextField size="small" fullWidth value={row.ghiChu} onChange={(e) => updateMaterialRow(row.id, 'ghiChu', e.target.value)} /></TableCell>
                                            <TableCell align="center" sx={{ width: 42 }}>
                                                <IconButton size="small" color="error" onClick={() => setMaterialRows((prev) => prev.length <= 1 ? [createMaterialRow()] : prev.filter((item) => item.id !== row.id))}>
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
                {activeStep === 4 && (
                    <PanelSection title="Ket qua bao duong">
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1.25 }}>
                            {[
                                { label: 'Ngay duong', value: formData.ngay_bao_duong || '--' },
                                { label: 'Nguoi thuc hien', value: formData.nguoi_thuc_hien || '--' },
                                { label: 'Ket qua', value: formData.ket_qua || '--' },
                            ].map((item) => (
                                <Box key={item.label} sx={{ p: 1, borderRadius: 1, bgcolor: '#f5f4ef' }}>
                                    <Typography sx={{ fontSize: 10, color: '#5c5c57' }}>{item.label}</Typography>
                                    <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{item.value}</Typography>
                                </Box>
                            ))}
                        </Box>
                        {renderContent(contentByKey.result, 'Chua co field ket qua bao duong.')}
                    </PanelSection>
                )}
                {activeStep === 5 && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Box sx={{ width: 74, height: 74, borderRadius: '50%', bgcolor: '#E6F1FB', border: '1px solid #74B3E8', mx: 'auto', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0C447C', fontSize: 18, fontWeight: 900 }}>Hoan tat</Box>
                        <Typography sx={{ fontSize: 16, fontWeight: 900, mb: 1 }}>Phieu bao duong da duoc ghi nhan</Typography>
                        <Typography sx={{ fontSize: 12, color: '#5c5c57', mb: 2 }}>{equipment?.tenDanhMuc || 'Trang bi'} da co thong tin bao duong chi tiet</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, textAlign: 'left' }}>
                            {[
                                { label: 'Noi dung', value: `${filledWorkRows.length} dong` },
                                { label: 'Vat chat', value: `${filledMaterialRows.length} vat chat` },
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
                    {activeStep === 4 && <Button variant="contained" size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => { setFormData((prev) => ({ ...prev, xac_nhan_hoan_thanh: 'true' })); goStep(5); }}>Hoan thanh</Button>}
                    {activeStep === 5 && <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={saveCurrent}>Luu</Button>}
                </Stack>
            </Box>
        </Box>
    );
};

export default BaoDuongEquipmentDetailPanel;
