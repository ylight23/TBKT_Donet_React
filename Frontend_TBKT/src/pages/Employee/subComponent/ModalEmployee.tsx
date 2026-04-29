import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Avatar,
    Box,
    Button,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Typography
} from '@mui/material';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Business from '@mui/icons-material/Business';
import Clear from '@mui/icons-material/Clear';

import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import * as yupResolverModule from '@hookform/resolvers/yup';
import moment from 'moment';
import Create from '../../../components/Buttons/Create';
import { CommonDialog } from "../../../components/Dialog";
import OfficeDictionaryDialog from './OfficeDictionaryDialog';
import employeeApi from '../../../apis/employeeApi';
import { OfficeNode } from '../../Office/subComponent/OfficeDictionary';
import { useEmployee, EmployeeItem } from '../../../context/EmployeeContext';
import { FormSkeleton } from '../../../components/Skeletons';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmployeeFormData {
    hoVaTen: string;
    idDonVi: string;
    idQuanTriDonVi: string;
    idCapBac: string;
    chucVu: string;
    dienThoai: string;
    hinhAnh: string;
    email: string;
    kichHoat: boolean;
    ngaySinh?: string;
}

interface ModalEmployeeProps {
    data?: EmployeeItem;
}

// ── Validation ─────────────────────────────────────────────────────────────────

const createValidationSchema = Yup.object().shape({
    hoVaTen: Yup.string().required("Họ và tên là bắt buộc").max(255),
    email: Yup.string().required("Email là bắt buộc").email().max(255),
    dienThoai: Yup.string().required("Điện thoại là bắt buộc").matches(/^[0-9+\-() ]+$/).min(10).max(20),
    ngaySinh: Yup.date().nullable().typeError("Ngày sinh không hợp lệ"),
    idDonVi: Yup.string().max(255),
    idQuanTriDonVi: Yup.string().max(255),
    idCapBac: Yup.string().max(255),
    chucVu: Yup.string().max(255),
    hinhAnh: Yup.string().max(255),
    kichHoat: Yup.boolean(),
});

const updateValidationSchema = Yup.object().shape({
    hoVaTen: Yup.string().required("Họ và tên là bắt buộc").max(255),
    email: Yup.string().required("Email là bắt buộc").email().max(255),
    dienThoai: Yup.string().required("Điện thoại là bắt buộc").matches(/^[0-9+\-() ]+$/).min(10).max(20),
    ngaySinh: Yup.date().nullable().typeError("Ngày sinh không hợp lệ"),
    idDonVi: Yup.string().max(255),
    idQuanTriDonVi: Yup.string().max(255),
    idCapBac: Yup.string().max(255),
    chucVu: Yup.string().max(255),
    hinhAnh: Yup.string().max(255),
    kichHoat: Yup.boolean(),
});

// ── Component ──────────────────────────────────────────────────────────────────

const ModalEmployee: React.FC<ModalEmployeeProps> = ({ data }) => {
    const { state, actions, meta } = useEmployee();
    const { capBacList, officeList } = state;
    const { createEmployee, updateEmployee, deleteEmployee } = actions;
    const { colors } = meta;

    const isUpdate = !!data;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [openOfficePopup, setOpenOfficePopup] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState<string | null>(null);
    const [officeNames, setOfficeNames] = useState<{ idDonVi: string; idQuanTriDonVi: string }>({ idDonVi: '', idQuanTriDonVi: '' });

    const dataCache = useRef<Record<string, any>>({});
    const prevDataId = useRef<string | null>(null);
    const yupResolver = (yupResolverModule as any).yupResolver;

    const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EmployeeFormData>({
        resolver: yupResolver(isUpdate ? updateValidationSchema : createValidationSchema) as any,
        mode: 'onBlur',
        defaultValues: { hoVaTen: '', idDonVi: '', idQuanTriDonVi: '', idCapBac: '', chucVu: '', dienThoai: '', hinhAnh: '', email: '', kichHoat: true },
    });

    const idDonViValue = watch('idDonVi');
    const idQuanTriDonViValue = watch('idQuanTriDonVi');

    const handleOpen = useCallback(() => { setIsOpen(true); }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) return;
            if (!data) {
                reset({ hoVaTen: '', idDonVi: '', idQuanTriDonVi: '', idCapBac: '', chucVu: '', dienThoai: '', hinhAnh: '', email: '', kichHoat: true });
                setImagePreview(null);
                setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
                return;
            }
            try {
                setIsLoading(true);
                const fetchedData = await employeeApi.getEmployee(data.id!);
                if (!fetchedData) return;
                const freshData = fetchedData as any;

                let ngaySinhFormatted = '';
                if (freshData.ngaySinh) {
                    if (typeof freshData.ngaySinh === 'object' && 'seconds' in freshData.ngaySinh) {
                        ngaySinhFormatted = moment.unix(Number(freshData.ngaySinh.seconds)).format('YYYY-MM-DD');
                    } else if (typeof freshData.ngaySinh === 'string') {
                        ngaySinhFormatted = moment(freshData.ngaySinh).format('YYYY-MM-DD');
                    }
                }

                const formData: EmployeeFormData = {
                    hoVaTen: freshData.hoVaTen || '',
                    idDonVi: freshData.idDonVi || '',
                    idQuanTriDonVi: freshData.idQuanTriDonVi || '',
                    idCapBac: freshData.idCapBac || '',
                    chucVu: freshData.chucVu || '',
                    dienThoai: freshData.dienThoai || '',
                    hinhAnh: freshData.hinhAnh || '',
                    email: freshData.email || '',
                    kichHoat: freshData.kichHoat ?? true,
                    ngaySinh: ngaySinhFormatted,
                };
                reset(formData);

                const officeMap: Record<string, OfficeNode> = {};
                officeList.forEach(o => { officeMap[String(o.id)] = o; });
                const names = {
                    idDonVi: officeMap[freshData.idDonVi]?.ten as string || freshData.idDonVi || '',
                    idQuanTriDonVi: officeMap[freshData.idQuanTriDonVi]?.ten as string || freshData.idQuanTriDonVi || '',
                };
                setOfficeNames(names);
                setImagePreview(freshData.hinhAnh || null);
            } catch (error) {
                console.error('[ModalEmployee] Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [isOpen, data?.id, officeList, reset]);

    const handleClose = useCallback(() => {
        reset();
        setImagePreview(null);
        setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
        setIsOpen(false);
    }, [reset]);

    const handleOpenOfficePopup = useCallback((fieldName: string) => {
        setCurrentOfficeField(fieldName);
        setOpenOfficePopup(true);
    }, []);

    const handleSelectOffice = useCallback((office: OfficeNode | null) => {
        if (currentOfficeField) {
            if (office) {
                setValue(currentOfficeField as any, String(office.id || ''));
                setOfficeNames(prev => ({ ...prev, [currentOfficeField]: (office.ten || office.tenDayDu || office.id) as string }));
            } else {
                setValue(currentOfficeField as any, '');
                setOfficeNames(prev => ({ ...prev, [currentOfficeField!]: '' }));
            }
        }
        setOpenOfficePopup(false);
    }, [currentOfficeField, setValue]);

    const handleClearOffice = useCallback((fieldName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setValue(fieldName as any, '');
        setOfficeNames(prev => ({ ...prev, [fieldName]: '' }));
    }, [setValue]);

    const handleSubmitForm = useCallback(async (formData: EmployeeFormData) => {
        try {
            setIsLoading(true);
            if (isUpdate && data?.id) {
                await updateEmployee({ ...formData, id: data.id });
            } else {
                await createEmployee(formData as any);
            }
            handleClose();
        } catch (error) {
            console.error('Error saving employee:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isUpdate, data?.id, createEmployee, updateEmployee, handleClose]);

    const handleDelete = useCallback(async () => {
        setConfirmDeleteOpen(false);
        if (!isUpdate || !data?.id) return;
        try {
            setIsLoading(true);
            await deleteEmployee(data.id);
            handleClose();
        } catch (error) {
            console.error('Error deleting employee:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isUpdate, data?.id, deleteEmployee, handleClose]);

    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => { setImagePreview(event.target?.result as string); };
            reader.readAsDataURL(file);
        }
    }, []);

    return (
        <>
            {!data ? (
                <Create label="Tạo mới" onClick={handleOpen} sx={{ backgroundColor: colors?.greenAccent?.[600] }} variant="contained" />
            ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="text" color="warning" onClick={handleOpen} startIcon={<Edit />}>Sửa</Button>
                    <Button size="small" variant="text" color="error" onClick={() => setConfirmDeleteOpen(true)} disabled={isLoading} startIcon={<Delete />}>Xóa</Button>
                </Box>
            )}

            <CommonDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                mode="delete"
                title="Xác nhận xóa cán bộ"
                subtitle="Dữ liệu hồ sơ nhân sự và các thông tin liên quan sẽ bị gỡ bỏ."
                confirmText="Xóa cán bộ"
                loading={isLoading}
            >
                <Typography>
                    Bạn có thực sự muốn xóa cán bộ: <strong>"{data?.hoVaTen || data?.id}"</strong>?
                </Typography>
            </CommonDialog>

            <CommonDialog
                open={isOpen}
                onClose={handleClose}
                maxWidth="md"
                mode={isUpdate ? 'edit' : 'add'}
                title={isUpdate ? 'Cập nhật thông tin cán bộ' : 'Tạo mới cán bộ'}
                subtitle="Quản lý hồ sơ nhân sự. Thông tin đăng nhập do SSO quản lý tập trung."
                onConfirm={handleSubmit(handleSubmitForm)}
                loading={isLoading}
                confirmText={isUpdate ? 'Lưu cán bộ' : 'Tạo cán bộ'}
            >
                {isLoading && isOpen ? (
                    <FormSkeleton rows={8} cols={2} />
                ) : (
                    <Box component="form" autoComplete="off">
                        <Grid container spacing={3}>
                            {/* Cột trái: Avatar & Ảnh */}
                            <Grid size={{ xs: 12, md: 3 }}>
                                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2.5, bgcolor: 'background.default', height: '100%' }}>
                                    <Typography variant="subtitle2" fontWeight={800} gutterBottom>Ảnh đại diện</Typography>
                                    <Box sx={{ position: 'relative', display: 'inline-block', mt: 2 }}>
                                        <Avatar
                                            src={imagePreview || undefined}
                                            sx={{
                                                width: 140,
                                                height: 140,
                                                margin: '0 auto',
                                                border: '4px solid',
                                                borderColor: 'background.paper',
                                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                                fontSize: '3rem'
                                            }}
                                        >
                                            {!imagePreview && (data?.hoVaTen?.charAt(0) || '👤')}
                                        </Avatar>
                                        <IconButton
                                            component="label"
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                '&:hover': { bgcolor: 'primary.dark' },
                                                boxShadow: 2
                                            }}
                                            size="small"
                                        >
                                            <Edit fontSize="small" />
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                                        </IconButton>
                                    </Box>
                                    {imagePreview && (
                                        <Button
                                            fullWidth
                                            size="small"
                                            color="error"
                                            sx={{ mt: 2 }}
                                            onClick={() => setImagePreview(null)}
                                        >
                                            Xóa ảnh
                                        </Button>
                                    )}
                                    <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
                                        Hỗ trợ: JPG, PNG, GIF. Tối đa 2MB.
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Cột phải: Thông tin chi tiết */}
                            <Grid size={{ xs: 12, md: 9 }}>
                                <Stack spacing={3}>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 2.5}} />
                                            Thông tin liên hệ
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid size={12}>
                                                <Controller name="email" control={control} render={({ field }) => (
                                                    <TextField {...field} label="Địa chỉ email *" type="email" fullWidth size="small" error={!!errors.email} helperText={errors.email?.message} />
                                                )} />
                                            </Grid>
                                            <Grid size={6}>
                                                <Controller name="dienThoai" control={control} render={({ field }) => (
                                                    <TextField {...field} label="Số điện thoại liên hệ *" fullWidth size="small" error={!!errors.dienThoai} helperText={errors.dienThoai?.message} />
                                                )} />
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    <Divider />

                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 2.5}} />
                                            Thông tin cá nhân & Công tác
                                        </Typography>
                                        <Grid container spacing={2}>
                                            <Grid size={8}>
                                                <Controller name="hoVaTen" control={control} render={({ field }) => (
                                                    <TextField {...field} label="Họ và tên cán bộ *" fullWidth size="small" error={!!errors.hoVaTen} helperText={errors.hoVaTen?.message} />
                                                )} />
                                            </Grid>
                                            <Grid size={4}>
                                                <Controller name="ngaySinh" control={control} render={({ field }) => (
                                                    <TextField {...field} label="Ngày sinh" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.ngaySinh} helperText={errors.ngaySinh?.message} />
                                                )} />
                                            </Grid>
                                            <Grid size={6}>
                                                <TextField
                                                    label="Đơn vị công tác"
                                                    fullWidth
                                                    size="small"
                                                    value={officeNames.idDonVi || idDonViValue || ''}
                                                    onClick={() => handleOpenOfficePopup('idDonVi')}
                                                    InputProps={{
                                                        readOnly: true,
                                                        startAdornment: <InputAdornment position="start"><Business fontSize="small" color="action" /></InputAdornment>,
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                {officeNames.idDonVi && <IconButton size="small" onClick={(e) => handleClearOffice('idDonVi', e)}><Clear fontSize="small" /></IconButton>}
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                    sx={{ cursor: 'pointer', '& .MuiInputBase-root': { bgcolor: 'background.default' } }}
                                                />
                                            </Grid>
                                            <Grid size={6}>
                                                <TextField
                                                    label="Đơn vị quản trị dữ liệu"
                                                    fullWidth
                                                    size="small"
                                                    value={officeNames.idQuanTriDonVi || idQuanTriDonViValue || ''}
                                                    onClick={() => handleOpenOfficePopup('idQuanTriDonVi')}
                                                    InputProps={{
                                                        readOnly: true,
                                                        startAdornment: <InputAdornment position="start"><Business fontSize="small" color="action" /></InputAdornment>,
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                {officeNames.idQuanTriDonVi && <IconButton size="small" onClick={(e) => handleClearOffice('idQuanTriDonVi', e)}><Clear fontSize="small" /></IconButton>}
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                    sx={{ cursor: 'pointer', '& .MuiInputBase-root': { bgcolor: 'background.default' } }}
                                                />
                                            </Grid>
                                            <Grid size={6}>
                                                <Controller name="idCapBac" control={control} render={({ field }) => (
                                                    <TextField {...field} select label="Cấp bậc / Quân hàm" fullWidth size="small" InputLabelProps={{ shrink: true }}>
                                                        <MenuItem value=""><em>-- Chọn cấp bậc --</em></MenuItem>
                                                        {capBacList.map((item) => (
                                                            <MenuItem key={item.id} value={item.id}>{item.ten || item.id}</MenuItem>
                                                        ))}
                                                    </TextField>
                                                )} />
                                            </Grid>
                                            <Grid size={6}>
                                                <Controller name="chucVu" control={control} render={({ field }) => (
                                                    <TextField {...field} label="Chức vụ hiện tại" fullWidth size="small" />
                                                )} />
                                            </Grid>
                                        </Grid>
                                    </Box>

                                    <Divider />

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={800}>Trạng thái hoạt động</Typography>
                                            <Typography variant="caption" color="text.secondary">Tài khoản chỉ có thể đăng nhập khi ở trạng thái Kích hoạt</Typography>
                                        </Box>
                                        <Controller name="kichHoat" control={control} render={({ field }) => (
                                            <FormControlLabel
                                                control={<Switch {...field} checked={field.value} color="success" />}
                                                label={field.value ? "Đang hoạt động" : "Đã khóa"}
                                            />
                                        )} />
                                    </Box>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </CommonDialog>

            <OfficeDictionaryDialog
                open={openOfficePopup}
                onClose={() => setOpenOfficePopup(false)}
                onSelect={handleSelectOffice}
                selectedId={currentOfficeField === 'idDonVi' ? idDonViValue : idQuanTriDonViValue}
                title={currentOfficeField === 'idDonVi' ? 'Chọn đơn vị công tác' : 'Chọn đơn vị quản trị'}
                offices={officeList}
            />
        </>
    );
};

export default ModalEmployee;
