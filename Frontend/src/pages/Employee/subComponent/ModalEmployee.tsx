import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Button, TextField, FormControlLabel, Switch, Dialog, Box,
    Typography, Divider, Avatar, MenuItem, CircularProgress,
    InputAdornment, IconButton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from '@hookform/resolvers/yup';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Delete, Edit, Business, Clear } from "@mui/icons-material";
import Create from '../../../components/Buttons/Create';
import ConfirmDialog from "../../../components/Dialog";
import OfficeDictionaryDialog from './OfficeDictionaryDialog';
import moment from 'moment';
import employeeApi from '../../../apis/employeeApi';
import { OfficeNode } from '../../Office/subComponent/OfficeDictionary';
import { useEmployee, EmployeeItem } from '../../../context/EmployeeContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface EmployeeFormData {
    tenTaiKhoan: string;
    matKhau: string;
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
    tenTaiKhoan: Yup.string().required("Tên tài khoản là bắt buộc").min(3).max(255),
    matKhau:     Yup.string().required("Mật khẩu là bắt buộc").min(6).max(255),
    hoVaTen:     Yup.string().required("Họ và tên là bắt buộc").max(255),
    email:       Yup.string().required("Email là bắt buộc").email().max(255),
    dienThoai:   Yup.string().required("Điện thoại là bắt buộc").matches(/^[0-9+\-() ]+$/).min(10).max(20),
    ngaySinh:    Yup.date().nullable().typeError("Ngày sinh không hợp lệ"),
    idDonVi:     Yup.string().max(255),
    idQuanTriDonVi: Yup.string().max(255),
    idCapBac:    Yup.string().max(255),
    chucVu:      Yup.string().max(255),
    hinhAnh:     Yup.string().max(255),
    kichHoat:    Yup.boolean(),
});

const updateValidationSchema = Yup.object().shape({
    tenTaiKhoan: Yup.string().required("Tên tài khoản là bắt buộc").min(3).max(255),
    matKhau:     Yup.string().max(255),   // ← không bắt buộc khi update
    hoVaTen:     Yup.string().required("Họ và tên là bắt buộc").max(255),
    email:       Yup.string().required("Email là bắt buộc").email().max(255),
    dienThoai:   Yup.string().required("Điện thoại là bắt buộc").matches(/^[0-9+\-() ]+$/).min(10).max(20),
    ngaySinh:    Yup.date().nullable().typeError("Ngày sinh không hợp lệ"),
    idDonVi:     Yup.string().max(255),
    idQuanTriDonVi: Yup.string().max(255),
    idCapBac:    Yup.string().max(255),
    chucVu:      Yup.string().max(255),
    hinhAnh:     Yup.string().max(255),
    kichHoat:    Yup.boolean(),
});

// ── Component ──────────────────────────────────────────────────────────────────

const ModalEmployee: React.FC<ModalEmployeeProps> = ({ data }) => {
    // ── Dùng { state, actions, meta } thay vì flat ────────────────────────────
    const { state, actions, meta } = useEmployee();
    const { capBacList, officeList }                    = state;
    const { createEmployee, updateEmployee, deleteEmployee } = actions;
    const { colors }                                    = meta;

    const isUpdate = !!data;
    const [isOpen, setIsOpen]           = useState(false);
    const [isLoading, setIsLoading]     = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [openOfficePopup, setOpenOfficePopup] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState<string | null>(null);
    const [officeNames, setOfficeNames] = useState<{ idDonVi: string; idQuanTriDonVi: string }>({ idDonVi: '', idQuanTriDonVi: '' });

    const dataCache  = useRef<Record<string, any>>({});
    const prevDataId = useRef<string | null>(null);

    const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EmployeeFormData>({
        resolver: yupResolver(isUpdate ? updateValidationSchema : createValidationSchema) as any,
        mode: 'onBlur',
        defaultValues: { tenTaiKhoan: '', matKhau: '', hoVaTen: '', idDonVi: '', idQuanTriDonVi: '', idCapBac: '', chucVu: '', dienThoai: '', hinhAnh: '', email: '', kichHoat: true },
    });

    const idDonViValue       = watch('idDonVi');
    const idQuanTriDonViValue = watch('idQuanTriDonVi');

    const handleOpen = useCallback(() => { setIsOpen(true); }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) return;
            if (!data) {
                reset({ tenTaiKhoan: '', matKhau: '', hoVaTen: '', idDonVi: '', idQuanTriDonVi: '', idCapBac: '', chucVu: '', dienThoai: '', hinhAnh: '', email: '', kichHoat: false });
                setImagePreview(null);
                setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
                dataCache.current = {};
                prevDataId.current = null;
                return;
            }
            if (prevDataId.current === data.id && dataCache.current[data.id!]) {
                const cachedData = dataCache.current[data.id!];
                reset(cachedData.formData);
                setOfficeNames(cachedData.officeNames);
                if (cachedData.imagePreview) setImagePreview(cachedData.imagePreview);
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
                    tenTaiKhoan:     freshData.tenTaiKhoan || '',
                    matKhau:         '',   // ← không điền lại password khi update
                    hoVaTen:         freshData.hoVaTen || '',
                    idDonVi:         freshData.idDonVi || '',
                    idQuanTriDonVi:  freshData.idQuanTriDonVi || '',
                    idCapBac:        freshData.idCapBac || '',
                    chucVu:          freshData.chucVu || '',
                    dienThoai:       freshData.dienThoai || '',
                    hinhAnh:         freshData.hinhAnh || '',
                    email:           freshData.email || '',
                    kichHoat:        freshData.kichHoat ?? true,
                    ngaySinh:        ngaySinhFormatted,
                };
                reset(formData);

                const officeMap: Record<string, OfficeNode> = {};
                officeList.forEach(o => { officeMap[String(o.id)] = o; });
                const names = {
                    idDonVi:         officeMap[freshData.idDonVi]?.ten as string || freshData.idDonVi || '',
                    idQuanTriDonVi:  officeMap[freshData.idQuanTriDonVi]?.ten as string || freshData.idQuanTriDonVi || '',
                };
                setOfficeNames(names);

                const imageUrl = freshData.hinhAnh || null;
                if (imageUrl) setImagePreview(imageUrl);

                dataCache.current[data.id!] = { formData, officeNames: names, imagePreview: imageUrl };
                prevDataId.current = data.id!;
            } catch (error) {
                console.error('[ModalEmployee] Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [isOpen, data, officeList, reset]);

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
                // ✅ actions.updateEmployee thay vì dispatch(update(...))
                await updateEmployee({ ...formData, id: data.id });
                delete dataCache.current[data.id];
            } else {
                // ✅ actions.createEmployee thay vì dispatch(create(...))
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
            // ✅ actions.deleteEmployee thay vì dispatch(deleteApi(...))
            await deleteEmployee(data.id);
            delete dataCache.current[data.id];
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

            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Thông báo"
                message={`Có thực sự muốn xóa cán bộ: "${data?.hoVaTen || data?.id}"?`}
                confirmText="Xóa" cancelText="Hủy" confirmColor="error"
            />

            <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth disableEnforceFocus disableRestoreFocus keepMounted={false}>
                <DialogTitle>{isUpdate ? 'Cập nhật thông tin cán bộ' : 'Tạo mới cán bộ'}</DialogTitle>
                <DialogContent dividers>
                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Box component="form" autoComplete="off" sx={{ py: 2 }}>
                            {/* Hình ảnh */}
                            <Box sx={{ mb: 4, textAlign: 'center' }}>
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Hình ảnh người dùng</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                    <Box component="label" sx={{ cursor: 'pointer' }}>
                                        <Avatar src={imagePreview || undefined} sx={{ width: 120, height: 120, fontSize: '2.5rem', backgroundColor: colors?.primary?.[400] || '#e0e0e0', border: '2px solid #ccc', '&:hover': { opacity: 0.8 } }}>
                                            {!imagePreview && (data?.hoVaTen?.charAt(0) || '👤')}
                                        </Avatar>
                                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                                        <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: '#666' }}>Click để chọn ảnh</Typography>
                                    </Box>
                                    {imagePreview && <Button size="small" color="error" variant="outlined" onClick={() => setImagePreview(null)}>Xóa ảnh</Button>}
                                </Box>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {/* Tài khoản */}
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Thông tin Tài khoản</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="tenTaiKhoan" control={control} render={({ field }) => (
                                        <TextField {...field} label="Tên tài khoản" fullWidth size="small" error={!!errors.tenTaiKhoan} helperText={errors.tenTaiKhoan?.message} />
                                    )} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="email" control={control} render={({ field }) => (
                                        <TextField {...field} label="Email" type="email" fullWidth size="small" error={!!errors.email} helperText={errors.email?.message} />
                                    )} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="matKhau" control={control} render={({ field }) => (
                                        <TextField {...field} label={isUpdate ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}
                                            type="password" fullWidth size="small" error={!!errors.matKhau} helperText={errors.matKhau?.message} />
                                    )} />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Cá nhân */}
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Thông tin Cá nhân</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12}>
                                    <Controller name="hoVaTen" control={control} render={({ field }) => (
                                        <TextField {...field} label="Họ và tên" fullWidth size="small" error={!!errors.hoVaTen} helperText={errors.hoVaTen?.message} />
                                    )} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="ngaySinh" control={control} render={({ field }) => (
                                        <TextField {...field} label="Ngày sinh" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} error={!!errors.ngaySinh} helperText={errors.ngaySinh?.message} />
                                    )} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="dienThoai" control={control} render={({ field }) => (
                                        <TextField {...field} label="Điện thoại" fullWidth size="small" error={!!errors.dienThoai} helperText={errors.dienThoai?.message} />
                                    )} />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Đơn vị */}
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Thông tin Đơn vị</Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={6}>
                                    <TextField label="Đơn vị công tác" fullWidth size="small"
                                        value={officeNames.idDonVi || idDonViValue || ''}
                                        onClick={() => handleOpenOfficePopup('idDonVi')}
                                        InputProps={{ readOnly: true, endAdornment: (
                                            <InputAdornment position="end">
                                                {officeNames.idDonVi && <IconButton size="small" onClick={(e) => handleClearOffice('idDonVi', e)}><Clear fontSize="small" /></IconButton>}
                                                <IconButton size="small" onClick={() => handleOpenOfficePopup('idDonVi')}><Business /></IconButton>
                                            </InputAdornment>
                                        )}}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField label="Quản trị dữ liệu đơn vị" fullWidth size="small"
                                        value={officeNames.idQuanTriDonVi || idQuanTriDonViValue || ''}
                                        onClick={() => handleOpenOfficePopup('idQuanTriDonVi')}
                                        InputProps={{ readOnly: true, endAdornment: (
                                            <InputAdornment position="end">
                                                {officeNames.idQuanTriDonVi && <IconButton size="small" onClick={(e) => handleClearOffice('idQuanTriDonVi', e)}><Clear fontSize="small" /></IconButton>}
                                                <IconButton size="small" onClick={() => handleOpenOfficePopup('idQuanTriDonVi')}><Business /></IconButton>
                                            </InputAdornment>
                                        )}}
                                        sx={{ cursor: 'pointer' }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="idCapBac" control={control} render={({ field }) => (
                                        <TextField {...field} select label="Cấp bậc" fullWidth size="small" InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }}>
                                            <MenuItem value=""><em>Chọn cấp bậc</em></MenuItem>
                                            {capBacList.map((item) => (
                                                <MenuItem key={item.id} value={item.id}>{item.ten || item.id}</MenuItem>
                                            ))}
                                        </TextField>
                                    )} />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Controller name="chucVu" control={control} render={({ field }) => (
                                        <TextField {...field} label="Chức vụ" fullWidth size="small" />
                                    )} />
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Trạng thái */}
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Trạng thái</Typography>
                            <Controller name="kichHoat" control={control} render={({ field }) => (
                                <FormControlLabel control={<Switch {...field} checked={field.value} color="success" />} label="Kích hoạt tài khoản" />
                            )} />
                        </Box>
                    )}
                </DialogContent>

                <OfficeDictionaryDialog
                    open={openOfficePopup}
                    onClose={() => setOpenOfficePopup(false)}
                    onSelect={handleSelectOffice}
                    selectedId={currentOfficeField === 'idDonVi' ? idDonViValue : idQuanTriDonViValue}
                    title={currentOfficeField === 'idDonVi' ? 'Chọn đơn vị công tác' : 'Chọn đơn vị quản trị'}
                    offices={officeList}
                />

                <DialogActions sx={{ p: 2 }}>
                    <Button variant="outlined" color="inherit" onClick={handleClose} disabled={isLoading}>Hủy</Button>
                    <Button variant="contained" color="success" onClick={handleSubmit(handleSubmitForm)} disabled={isLoading}>
                        {isLoading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ModalEmployee;
