import React, { useState, useEffect } from "react";
import {
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Grid,
    Dialog,
    Box,
    Typography,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from '@hookform/resolvers/yup';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Delete, Edit } from "@mui/icons-material";
import Create from '../../../components/Buttons/Create';
import ConfirmDialog from "../../../components/Dialog";
import { create, fetchOffice, update, deleteApi } from '../../../store/reducer/office';
import officeApi from '../../../apis/officeApi';

const validationSchema = Yup.object().shape({
    ten: Yup.string()
        .required("Tên đơn vị là bắt buộc")
        .max(500, "Tên đơn vị không được vượt quá 500 ký tự"),
    tenDayDu: Yup.string().max(500, "Tên đầy đủ không được vượt quá 500 ký tự"),
    vietTat: Yup.string().max(100, "Viết tắt không được vượt quá 100 ký tự"),
    idCapTren: Yup.string().max(255, "ID cấp trên không được vượt quá 255 ký tự"),
    thuTuSapXep: Yup.string().max(100, "Thứ tự sắp xếp không được vượt quá 100 ký tự"),
    thuTu: Yup.number()
        .integer("Thứ tự phải là một số nguyên")
        .min(0, "Thứ tự phải lớn hơn hoặc bằng 0")
        .nullable()
        .transform((value, originalValue) => originalValue === '' ? null : value),
    coCapDuoi: Yup.boolean(),
});

// Helper functions
const getFieldValue = (data, ...keys) => {
    for (const key of keys) {
        if (data?.[key] !== undefined && data?.[key] !== null) {
            return data[key];
        }
    }
    return null;
};

const convertToBoolean = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    if (typeof value === 'number') return value === 1 || value > 0;
    return Boolean(value);
};

const ModalOffice = ({
    data,
    dispatch,
    colors,
    allOffices = [],
    defaultParentId = '',
    createLabel = 'Tạo mới',
    treeRef,
    onRefresh = null
}) => {
    const isUpdate = !!data;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentData, setCurrentData] = useState(null);
    
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(validationSchema),
        mode: 'onBlur',
        defaultValues: {
            ten: '',
            tenDayDu: '',
            vietTat: '',
            idCapTren: '',
            thuTu: 0,
            thuTuSapXep: '',
            coCapDuoi: false,
        }
    });

    // Fetch fresh data khi mở modal
    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) {
                setCurrentData(null);
                return;
            }

            // Nếu là tạo mới
            if (!data) {
                setCurrentData(null);
                reset({
                    ten: '',
                    tenDayDu: '',
                    vietTat: '',
                    idCapTren: defaultParentId || '',
                    thuTu: 0,
                    thuTuSapXep: '',
                    coCapDuoi: false,
                }, { keepDefaultValues: false, keepDirty: false, keepValues: false });

                if (defaultParentId) {
                    setValue('idCapTren', defaultParentId);
                }
                return;
            }

            try {
                setIsLoading(true);
                console.log('[ModalOffice] Fetching fresh data from API for ID:', data.id);

                // GỌI API getOffice trực tiếp
                const freshData = await officeApi.getOffice(data.id);
                console.log('[ModalOffice] Fresh data from API:', freshData);

                setCurrentData(freshData);

                const coCapDuoi = convertToBoolean(
                    freshData.coCapDuoi ?? freshData.cocapduoi ?? freshData.CoCapDuoi ?? false
                );

                console.log('[ModalOffice] Loading form with fresh data:', {
                    id: freshData.id,
                    cocapduoi: {
                        raw: freshData.coCapDuoi || freshData.cocapduoi || freshData.CoCapDuoi,
                        converted: coCapDuoi
                    },
                    ten: freshData.ten
                });

                reset({
                    ten: freshData.ten || '',
                    tenDayDu: getFieldValue(freshData, 'tendaydu', 'tenDayDu', 'TenDayDu') || '',
                    vietTat: getFieldValue(freshData, 'vietTat', 'vietTat', 'VietTat') || '',
                    idCapTren: getFieldValue(freshData, 'idcaptren', 'idCapTren', 'IdCapTren') || '',
                    thuTu: getFieldValue(freshData, 'thutu', 'thuTu', 'ThuTu') || 0,
                    thuTuSapXep: getFieldValue(freshData, 'thutusapxep', 'thuTuSapXep', 'ThuTuSapXep') || '',
                    coCapDuoi: coCapDuoi,
                }, { keepDefaultValues: false, keepDirty: false, keepValues: false });
            }
            catch (error) {
                console.error('[ModalOffice] Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isOpen, data?.id, allOffices, reset, setValue, defaultParentId]);

    const handleClose = () => {
        reset();
        setCurrentData(null);
        setIsOpen(false);
    };

    const handleSubmitForm = async (formData) => {
        try {
            setIsLoading(true);
            const finalData = {
                ...formData,
                coCapDuoi: convertToBoolean(formData.coCapDuoi),
                idCapTren: formData.idCapTren || defaultParentId || ''
            };

            if (isUpdate) {
                await dispatch(update({ ...finalData, id: data.id }));
            } else {
                await dispatch(create(finalData));
            }

            await dispatch(fetchOffice());

            if (onRefresh) {
                if (isUpdate && data?.id) {
                    const parentId = finalData.idCapTren || data.idCapTren || null;
                    if (treeRef?.current?.refreshNode) {
                        await treeRef.current.refreshNode(data.id);
                    } else {
                        await onRefresh(parentId);
                    }
                } else {
                    await onRefresh(defaultParentId || null);
                }
            }

            handleClose();
        } catch (error) {
            console.error('Error saving office:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const handleDelete = async () => {
        setConfirmDeleteOpen(false);
        if (!isUpdate) return;

        try {
            setIsLoading(true);
            await dispatch(deleteApi({ id: data.id }));
            await dispatch(fetchOffice());

            if (onRefresh) {
                const parentId = getFieldValue(data, 'idCapTren', 'idCapTren', 'IdCapTren');
                await onRefresh(parentId || null);
            }
            handleClose();
        } catch (error) {
            console.error('Error deleting office:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!data ? (
                <Create label={createLabel} onClick={() => setIsOpen(true)} sx={{ backgroundColor: colors?.greenAccent[600] }} />
            ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" color="warning" onClick={() => setIsOpen(true)} startIcon={<Edit />}>
                        Sửa
                    </Button>
                    <Button variant="contained" color="error" onClick={() => setConfirmDeleteOpen(true)} startIcon={<Delete />}>
                        Xóa
                    </Button>
                </Box>
            )}

            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Thông báo"
                message={`Có thực sự muốn xóa Đơn vị: "${data?.ten || data?.tendaydu || data?.id}"?`}
                confirmText="Xóa"
                cancelText="Hủy"
                confirmColor="error"
            />

            <Dialog open={isOpen} onClose={handleClose} scroll="paper" maxWidth="md" fullWidth>
                <DialogTitle>{isUpdate ? 'Cập nhật thông tin đơn vị' : 'Tạo mới đơn vị'}</DialogTitle>

                <DialogContent dividers>
                    {isLoading && isOpen ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                            <Typography>Đang tải dữ liệu...</Typography>
                        </Box>
                    ) : (
                        <Box component="form" autoComplete="off" sx={{ py: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Thông tin Cơ bản</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12}>
                                    <Controller
                                        name="ten"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Tên đơn vị *" fullWidth size="small" error={!!errors.ten} helperText={errors.ten?.message} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="tenDayDu"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Tên đầy đủ" fullWidth size="small" error={!!errors.tenDayDu} helperText={errors.tenDayDu?.message} />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="vietTat"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Viết tắt" fullWidth size="small" error={!!errors.vietTat} helperText={errors.vietTat?.message} />
                                        )}
                                    />
                                </Grid>
                                {/* <Grid item xs={12} sm={6}>
                                    <Controller
                                        name="thuTu"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField {...field} label="Thứ tự" fullWidth size="small" error={!!errors.thuTu} helperText={errors.thuTu?.message} />
                                        )}
                                    />
                                </Grid> */}
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Cấu trúc Tổ chức</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12}>
                                    <Controller
                                        name="idCapTren"
                                        control={control}
                                        render={({ field }) => (
                                            <FormControl fullWidth size="small" error={!!errors.idCapTren}>
                                                <InputLabel>Cấp trên {defaultParentId && '(Đã chọn)'}</InputLabel>
                                                <Select {...field} label="Cấp trên" disabled={!!defaultParentId}>
                                                    <MenuItem value="">-- Không có cấp trên --</MenuItem>
                                                    {allOffices.map((office) => (
                                                        <MenuItem key={office.id} value={office.id}>
                                                            {office.ten || office.tenDayDu || office.id}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                                {errors.idCapTren && <Typography variant="caption" sx={{ color: '#d32f2f', mt: 0.5, display: 'block' }}>{errors.idCapTren?.message}</Typography>}
                                                {defaultParentId && (
                                                    <Typography variant="caption" sx={{ color: '#1976d2', mt: 0.5, display: 'block' }}>
                                                        Đơn vị cha sẽ được tạo dưới: {allOffices.find(o => o.id === defaultParentId)?.ten || defaultParentId}
                                                    </Typography>
                                                )}
                                            </FormControl>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Controller
                                        name="coCapDuoi"
                                        control={control}
                                        render={({ field: { value, onChange } }) => (
                                            <FormControlLabel
                                                control={<Switch checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} color="success" />}
                                                label="Có cấp dưới"
                                            />
                                        )}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" color="inherit" onClick={handleClose} disabled={isLoading}>
                        Hủy
                    </Button>
                    <Button variant="contained" color="success" onClick={handleSubmit(handleSubmitForm)} disabled={isLoading}>
                        {isLoading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ModalOffice;