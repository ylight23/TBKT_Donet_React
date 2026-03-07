import React, { useState, useEffect } from "react";
import {
    CircularProgress,
    Box,
    Button,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';

import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from '@hookform/resolvers/yup';
import Create from '../../../components/Buttons/Create';
import { CommonDialog } from "../../../components/Dialog";
import officeApi from '../../../apis/officeApi';
import { OfficeNode } from './OfficeDictionary';
import { useOffice } from '../../../context/OfficeContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface OfficeFormData {
    ten: string;
    tenDayDu: string;
    vietTat: string;
    idCapTren: string;
    thuTu: number | null;
    thuTuSapXep: string;
    coCapDuoi: boolean;
}

interface ModalOfficeProps {
    data?: OfficeNode;
    defaultParentId?: string;
    createLabel?: string;
}

// ── Validation ─────────────────────────────────────────────────────────────────

const validationSchema = Yup.object().shape({
    ten: Yup.string().required("Tên đơn vị là bắt buộc").max(500),
    tenDayDu: Yup.string().max(500),
    vietTat: Yup.string().max(100),
    idCapTren: Yup.string().max(255),
    thuTuSapXep: Yup.string().max(100),
    thuTu: Yup.number().integer().min(0).nullable()
        .transform((v, orig) => (orig === '' ? null : v)),
    coCapDuoi: Yup.boolean(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const getFieldValue = (data: OfficeNode | null | undefined, ...keys: string[]): unknown => {
    for (const key of keys) {
        if (data?.[key] !== undefined && data?.[key] !== null) return data[key];
    }
    return null;
};

const convertToBoolean = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    if (typeof value === 'number') return value === 1 || value > 0;
    return Boolean(value);
};

// ── Component ──────────────────────────────────────────────────────────────────

const ModalOffice: React.FC<ModalOfficeProps> = ({
    data,
    defaultParentId = '',
    createLabel = 'Tạo mới',
}) => {
    const { state, actions, meta } = useOffice();
    const { allOffices } = state;
    const { createOffice, updateOffice, deleteOffice } = actions;
    const { colors } = meta;

    const isUpdate = !!data;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentData, setCurrentData] = useState<OfficeNode | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<OfficeFormData>({
        resolver: yupResolver(validationSchema) as any,
        mode: 'onBlur',
        defaultValues: {
            ten: '', tenDayDu: '', vietTat: '',
            idCapTren: '', thuTu: 0, thuTuSapXep: '', coCapDuoi: false,
        },
    });

    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) { setCurrentData(null); return; }
            if (!isUpdate) {
                setCurrentData(null);
                reset({
                    ten: '', tenDayDu: '', vietTat: '',
                    idCapTren: defaultParentId || '',
                    thuTu: 0, thuTuSapXep: '', coCapDuoi: false,
                });
                if (defaultParentId) setValue('idCapTren', defaultParentId);
                return;
            }
            try {
                setIsLoading(true);
                const result = await officeApi.getOffice(String(data.id));
                if (!result) return;
                const freshData = result as unknown as OfficeNode;
                setCurrentData(freshData);
                reset({
                    ten: (freshData.ten as string) || '',
                    tenDayDu: (getFieldValue(freshData, 'tendaydu', 'tenDayDu', 'TenDayDu') as string) || '',
                    vietTat: (getFieldValue(freshData, 'vietTat', 'VietTat') as string) || '',
                    idCapTren: (getFieldValue(freshData, 'idcaptren', 'idCapTren', 'IdCapTren') as string) || '',
                    thuTu: (getFieldValue(freshData, 'thutu', 'thuTu', 'ThuTu') as number) || 0,
                    thuTuSapXep: (getFieldValue(freshData, 'thutusapxep', 'thuTuSapXep', 'ThuTuSapXep') as string) || '',
                    coCapDuoi: convertToBoolean(freshData.coCapDuoi ?? freshData.cocapduoi ?? (freshData as any).CoCapDuoi ?? false),
                });
            } catch (err) {
                console.error('[ModalOffice] Error loading:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [isOpen, data?.id, reset, setValue, defaultParentId, isUpdate]);

    const handleClose = () => { reset(); setCurrentData(null); setIsOpen(false); };

    const handleSubmitForm = async (formData: OfficeFormData) => {
        try {
            setIsLoading(true);
            const finalData = {
                ...formData,
                coCapDuoi: convertToBoolean(formData.coCapDuoi),
                idCapTren: formData.idCapTren || defaultParentId || '',
                danhSachCapDuoi: (currentData as any)?.danhSachCapDuoi ?? [],
                parameters: (currentData as any)?.parameters ?? [],
            };

            if (isUpdate) {
                const oldParentId = getFieldValue(data, 'idCapTren', 'IdCapTren') as string | null;
                await updateOffice({
                    ...finalData,
                    id: String(data!.id),
                    _oldParentId: oldParentId,
                } as any);
            } else {
                await createOffice(finalData as any);
            }
            handleClose();
        } catch (err) {
            console.error('[ModalOffice] Error saving:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setConfirmDeleteOpen(false);
        if (!isUpdate) return;
        try {
            setIsLoading(true);
            const parentId = getFieldValue(data, 'idCapTren', 'IdCapTren') as string | null;
            await deleteOffice(String(data!.id), parentId);
            handleClose();
        } catch (err) {
            console.error('[ModalOffice] Error deleting:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!data ? (
                <Create
                    label={createLabel}
                    onClick={() => setIsOpen(true)}
                    sx={{ backgroundColor: colors?.greenAccent?.[600] }}
                />
            ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" color="warning" onClick={() => setIsOpen(true)} startIcon={<Edit />}>Sửa</Button>
                    <Button variant="contained" color="error" onClick={() => setConfirmDeleteOpen(true)} startIcon={<Delete />}>Xóa</Button>
                </Box>
            )}

            <CommonDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                mode="delete"
                title="Xác nhận xóa"
                subtitle="Hành động này không thể hoàn tác và sẽ ảnh hưởng đến các cấp trực thuộc"
                confirmText="Xóa vĩnh viễn"
                loading={isLoading}
            >
                <Typography>
                    Bạn có thực sự muốn xóa Đơn vị: <strong>"{data?.ten || (data as any)?.tendaydu || data?.id}"</strong>?
                </Typography>
            </CommonDialog>

            <CommonDialog
                open={isOpen}
                onClose={handleClose}
                maxWidth="sm"
                mode={isUpdate ? 'edit' : 'add'}
                title={isUpdate ? 'Cập nhật thông tin đơn vị' : 'Tạo mới đơn vị'}
                subtitle="Vui lòng điền chính xác các thông tin cơ cấu tổ chức"
                onConfirm={handleSubmit(handleSubmitForm)}
                loading={isLoading}
                confirmText={isUpdate ? 'Lưu thay đổi' : 'Tạo đơn vị'}
            >
                {isLoading && isOpen ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, flexDirection: 'column', gap: 2 }}>
                        <CircularProgress size={40} />
                        <Typography color="text.secondary">Đang tải dữ liệu…</Typography>
                    </Box>
                ) : (
                    <Box component="form" autoComplete="off">
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 2.5}} />
                            Thông tin Cơ bản
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid size={12}>
                                <Controller name="ten" control={control} render={({ field }) => (
                                    <TextField {...field} label="Tên đơn vị *" fullWidth size="small"
                                        error={!!errors.ten} helperText={errors.ten?.message} />
                                )} />
                            </Grid>
                            <Grid size={12}>
                                <Controller name="tenDayDu" control={control} render={({ field }) => (
                                    <TextField {...field} label="Tên đầy đủ" fullWidth size="small"
                                        error={!!errors.tenDayDu} helperText={errors.tenDayDu?.message} />
                                )} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Controller name="vietTat" control={control} render={({ field }) => (
                                    <TextField {...field} label="Viết tắt" fullWidth size="small"
                                        error={!!errors.vietTat} helperText={errors.vietTat?.message} />
                                )} />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 2.5}} />
                            Cấu trúc Tổ chức
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <Controller name="idCapTren" control={control} render={({ field }) => (
                                    <FormControl fullWidth size="small" error={!!errors.idCapTren}>
                                        <InputLabel>Cấp trên {defaultParentId && '(Đã chọn)'}</InputLabel>
                                        <Select {...field} label="Cấp trên" disabled={!!defaultParentId}>
                                            <MenuItem value="">-- Không có cấp trên --</MenuItem>
                                            {allOffices.map(o => (
                                                <MenuItem key={String(o.id)} value={String(o.id)}>
                                                    {(o.ten || o.tenDayDu || o.id) as string}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {defaultParentId && (
                                            <Typography variant="caption" sx={{ color: 'primary.main', mt: 0.5, display: 'block' }}>
                                                Đơn vị cha: {allOffices.find(o => o.id === defaultParentId)?.ten as string || defaultParentId}
                                            </Typography>
                                        )}
                                    </FormControl>
                                )} />
                            </Grid>
                            <Grid size={12}>
                                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                                    <Controller name="coCapDuoi" control={control} render={({ field: { value, onChange } }) => (
                                        <FormControlLabel
                                            control={<Switch checked={Boolean(value)} onChange={e => onChange(e.target.checked)} color="success" />}
                                            label={<Typography variant="body2" fontWeight={700}>Đơn vị này có chứa các cấp trực thuộc (cấp dưới)</Typography>}
                                        />
                                    )} />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </CommonDialog>
        </>
    );
};

export default ModalOffice;
