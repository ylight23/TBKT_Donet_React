import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Button,
    TextField,
    FormControlLabel,
    Switch,
    Grid,
    Tooltip,
    Dialog,
    Box,
    Typography,
    Divider,
    Paper,
    Avatar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    InputAdornment
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import * as Yup from "yup";
import { yupResolver } from '@hookform/resolvers/yup';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { Delete, Edit, Download, Upload, Business, Clear } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import Create from '../../../components/Buttons/Create'
import OfficeDictionaryDialog from './OfficeDictionaryDialog'
import moment from 'moment';
import { create, fetchEmployee, update, deleteApi } from '../../../store/reducer/employee'
import employeeApi from '../../../apis/employeeApi'

// Validation Schema dựa trên Employee.proto
const validationSchema = Yup.object().shape({
    // Thông tin tài khoản
    tenTaiKhoan: Yup.string()
        .required("Tên tài khoản là bắt buộc")
        .min(3, "Tên tài khoản phải có ít nhất 3 ký tự")
        .max(255, "Tên tài khoản không được vượt quá 255 ký tự"),

    matKhau: Yup.string()
        .required("Mật khẩu là bắt buộc")
        .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
        .max(255, "Mật khẩu không được vượt quá 255 ký tự"),

    // Thông tin cá nhân
    hoVaTen: Yup.string()
        .required("Họ và tên là bắt buộc")
        .max(255, "Họ và tên không được vượt quá 255 ký tự")
        .matches(/^[a-zA-Z0-9\u0080-\uFFFF\s\-'.]+$/, "Họ và tên không được chứa ký tự đặc biệt"),

    email: Yup.string()
        .required("Email là bắt buộc")
        .email("Email không hợp lệ")
        .max(255, "Email không được vượt quá 255 ký tự"),

    dienThoai: Yup.string()
        .required("Điện thoại là bắt buộc")
        .matches(/^[0-9\+\-\(\)\s]+$/, "Số điện thoại không hợp lệ")
        .min(10, "Số điện thoại phải có ít nhất 10 ký tự")
        .max(20, "Số điện thoại không được vượt quá 20 ký tự"),

    // Thông tin công ty
    ngaySinh: Yup.date()
        .nullable()
        .typeError("Ngày sinh không hợp lệ"),

    idDonVi: Yup.string()
        .max(255, "ID Đơn vị không được vượt quá 255 ký tự"),

    idQuanTriDonVi: Yup.string()
        .max(255, "ID Quản trị không được vượt quá 255 ký tự"),

    idCapBac: Yup.string()
        .max(255, "ID Cấp bậc không được vượt quá 255 ký tự"),

    chucVu: Yup.string()
        .max(255, "Chức vụ không được vượt quá 255 ký tự"),

    hinhAnh: Yup.string()
        .max(255, "Đường dẫn hình ảnh không được vượt quá 255 ký tự")
        .url("Đường dẫn hình ảnh không hợp lệ"),

    // Trạng thái
    kichHoat: Yup.boolean(),
});

// Helper function - chuyển ra ngoài component để tránh recreate
const buildOfficeTree = (officeList) => {
    const map = {};
    const roots = [];

    // Tạo map trước
    officeList.forEach(office => {
        map[office.id] = { ...office, children: [] };
    });

    // Xây dựng cây
    officeList.forEach(office => {
        const parentId = office.idCapTren;
        if (parentId && map[parentId]) {
            map[parentId].children.push(map[office.id]);
        } else if (!parentId || parentId === '') {
            roots.push(map[office.id]);
        }
    });

    return { roots, map };
};

const ModalEmployee = (props) => {
    const { data, dispatch, colors, capBacList = [], officeList = [] } = props;
    const isUpdate = data ? true : false;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    // State cho TreeViewPopup
    const [openOfficePopup, setOpenOfficePopup] = useState(false);
    const [currentOfficeField, setCurrentOfficeField] = useState(null);
    const [officeNames, setOfficeNames] = useState({ idDonVi: '', idQuanTriDonVi: '' });

    // Cache để tránh fetch lại data không cần thiết
    const dataCache = useRef({});
    const prevDataId = useRef(null);

    const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: yupResolver(validationSchema),
        mode: 'onBlur',
        defaultValues: {
            tenTaiKhoan: '',
            matKhau: '',
            hoVaTen: '',
            idDonVi: '',
            idQuanTriDonVi: '',
            idCapBac: '',
            chucVu: '',
            dienThoai: '',
            hinhAnh: '',
            email: '',
            kichHoat: true,
        }
    });

    const idDonViValue = watch('idDonVi');
    const idQuanTriDonViValue = watch('idQuanTriDonVi');

    const handleOpen = useCallback(() => {
        setIsOpen(true);
    }, []);

    // ✅ Helper để lấy tên đơn vị từ ID
    const getOfficeName = useCallback((officeId) => {
        if (!officeId) return '';
        const office = officeList.find(o => o.id === officeId);
        return office?.ten || office?.tenDayDu || officeId;
    }, [officeList]);

    // ✅ OPTIMIZATION: Chỉ fetch data khi thực sự cần (khi mở modal lần đầu hoặc data.id thay đổi)
    useEffect(() => {
        const loadData = async () => {
            if (!isOpen) {
                return;
            }

            // Reset khi đóng modal
            if (!isOpen) {
                setImagePreview(null);
                setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
                return;
            }

            // Tạo mới - reset form
            if (!data) {
                reset({
                    tenTaiKhoan: '',
                    matKhau: '',
                    hoVaTen: '',
                    idDonVi: '',
                    idQuanTriDonVi: '',
                    idCapBac: '',
                    chucVu: '',
                    dienThoai: '',
                    hinhAnh: '',
                    email: '',
                    kichHoat: false,
                });
                setImagePreview(null);
                setOfficeNames({ idDonVi: '', idQuanTriDonVi: '' });
                dataCache.current = {};
                prevDataId.current = null;
                return;
            }

            // Kiểm tra nếu data.id giống với lần trước thì dùng cache
            if (prevDataId.current === data.id && dataCache.current[data.id]) {
                console.log('[ModalEmployee] Using cached data for ID:', data.id);
                const cachedData = dataCache.current[data.id];

                reset(cachedData.formData);
                setOfficeNames(cachedData.officeNames);
                if (cachedData.imagePreview) {
                    setImagePreview(cachedData.imagePreview);
                }
                return;
            }

            // Cập nhật - fetch dữ liệu mới từ API
            try {
                setIsLoading(true);
                console.log('[ModalEmployee] Fetching fresh data for ID:', data.id);

                const freshData = await employeeApi.getEmployee(data.id);

                let ngaySinhFormatted = '';
                if (freshData.ngaySinh) {
                    if (typeof freshData.ngaySinh === 'object' && freshData.ngaySinh.seconds) {
                        ngaySinhFormatted = moment.unix(freshData.ngaySinh.seconds).format('YYYY-MM-DD');
                    } else if (typeof freshData.ngaySinh === 'string') {
                        ngaySinhFormatted = moment(freshData.ngaySinh).format('YYYY-MM-DD');
                    }
                }

                const formData = {
                    tenTaiKhoan: freshData.tenTaiKhoan || '',
                    matKhau: freshData.matKhau || '',
                    hoVaTen: freshData.hoVaTen || '',
                    idDonVi: freshData.idDonVi || '',
                    idQuanTriDonVi: freshData.idQuanTriDonVi || '',
                    idCapBac: freshData.idCapBac || '',
                    chucVu: freshData.chucVu || '',
                    dienThoai: freshData.dienThoai || '',
                    hinhAnh: freshData.hinhAnh || '',
                    email: freshData.email || '',
                    kichHoat: freshData.kichHoat ?? true,
                    ngaySinh: freshData.ngaySinh ? ngaySinhFormatted : '',
                };

                reset(formData);

                // Lấy tên đơn vị từ officeTree.map
                const officeTree = buildOfficeTree(officeList);
                const donViName = officeTree.map[freshData.idDonVi]?.ten || freshData.idDonVi || '';
                const quanTriDonViName = officeTree.map[freshData.idQuanTriDonVi]?.ten || freshData.idQuanTriDonVi || '';

                const names = {
                    idDonVi: donViName,
                    idQuanTriDonVi: quanTriDonViName
                };

                setOfficeNames(names);

                const imageUrl = freshData.hinhAnh || null;
                if (imageUrl) {
                    setImagePreview(imageUrl);
                }

                // ✅ Cache data để lần sau không cần fetch lại
                dataCache.current[data.id] = {
                    formData,
                    officeNames: names,
                    imagePreview: imageUrl
                };
                prevDataId.current = data.id;

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

    const handleOpenOfficePopup = useCallback((fieldName) => {
        setCurrentOfficeField(fieldName);
        setOpenOfficePopup(true);
    }, []);

    const handleSelectOffice = useCallback((office) => {
        if (currentOfficeField) {
            if (office) {
                setValue(currentOfficeField, office.id || office._id);
                setOfficeNames(prev => ({
                    ...prev,
                    [currentOfficeField]: office.ten || office.tenDayDu || office._label || office.id
                }));
            } else {
                setValue(currentOfficeField, '');
                setOfficeNames(prev => ({
                    ...prev,
                    [currentOfficeField]: ''
                }));
            }
        }
    }, [currentOfficeField, setValue]);

    const handleClearOffice = useCallback((fieldName, e) => {
        e.stopPropagation();
        setValue(fieldName, '');
        setOfficeNames(prev => ({ ...prev, [fieldName]: '' }));
    }, [setValue]);

    const handleSubmitForm = useCallback(async (formData) => {
        try {
            setIsLoading(true);
            if (isUpdate) {
                await dispatch(update({ ...formData, id: data.id }));
                // Xóa cache khi update
                delete dataCache.current[data.id];
            } else {
                await dispatch(create(formData));
            }
            dispatch(fetchEmployee());
            handleClose();
        } catch (error) {
            console.error('Error saving employee:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isUpdate, dispatch, data?.id, handleClose]);

    const handleDelete = useCallback(async () => {
        if (isUpdate && window.confirm('Bạn chắc chắn muốn xóa nhân viên này?')) {
            try {
                setIsLoading(true);
                await dispatch(deleteApi({ id: data.id }));
                // Xóa cache khi delete
                delete dataCache.current[data.id];
                dispatch(fetchEmployee());
                handleClose();
            } catch (error) {
                console.error('Error deleting employee:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [isUpdate, dispatch, data?.id, handleClose]);

    const handleImageChange = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result;
                setImagePreview(base64);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const handleClearImage = useCallback(() => {
        setImagePreview(null);
    }, []);

    return (
        <>
            {!data ? (
                <Create
                    label="Tạo mới"
                    onClick={handleOpen}
                    sx={{ backgroundColor: colors?.greenAccent[600] }}
                    variant="contained"
                >
                    Tạo mới
                </Create>
            ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="text"
                        color="warning"
                        onClick={handleOpen}
                        startIcon={<Edit />}
                    >
                        Sửa
                    </Button>
                    <Button
                        size="small"
                        variant="text"
                        color="error"
                        onClick={handleDelete}
                        disabled={isLoading}
                        startIcon={<Delete />}
                    >
                        Xóa
                    </Button>
                </Box>
            )}

            <Dialog
                open={isOpen}
                onClose={handleClose}
                scroll="paper"
                aria-labelledby="employee-dialog-title"
                maxWidth="md"
                fullWidth
            >
                <DialogTitle id="employee-dialog-title">
                    {isUpdate ? 'Cập nhật thông tin ' : 'Tạo mới '}
                </DialogTitle>

                <DialogContent dividers>
                    <Box component="form" autoComplete="off" sx={{ py: 2 }}>
                        {/* Hình ảnh người dùng - Đầu tiên */}
                        <Box sx={{ mb: 4, textAlign: 'center' }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                Hình ảnh người dùng
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Box component="label" sx={{ cursor: 'pointer', position: 'relative' }}>
                                    <Avatar
                                        src={imagePreview}
                                        alt={data?.hovaten || 'User'}
                                        sx={{
                                            width: 120,
                                            height: 120,
                                            fontSize: '2.5rem',
                                            backgroundColor: colors?.primary?.[400] || '#e0e0e0',
                                            border: '2px solid #ccc',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                opacity: 0.8,
                                                transform: 'scale(1.05)'
                                            }
                                        }}
                                    >
                                        {!imagePreview && (data?.hovaten?.charAt(0) || '👤')}
                                    </Avatar>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleImageChange}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            mt: 1,
                                            textAlign: 'center',
                                            color: '#666',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        Click để chọn ảnh
                                    </Typography>
                                </Box>

                                {imagePreview && (
                                    <Box>
                                        <Button
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            onClick={handleClearImage}
                                        >
                                            Xóa ảnh
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Phần Thông tin Tài khoản */}
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Thông tin Tài khoản
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="tenTaiKhoan"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Tên tài khoản"
                                            fullWidth
                                            size="small"
                                            error={!!errors.tenTaiKhoan}
                                            helperText={errors.tenTaiKhoan?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Email"
                                            type="email"
                                            fullWidth
                                            size="small"
                                            error={!!errors.email}
                                            helperText={errors.email?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="matKhau"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Mật khẩu"
                                            type="password"
                                            fullWidth
                                            size="small"
                                            error={!!errors.matKhau}
                                            helperText={errors.matKhau?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        {/* Phần Thông tin Cá nhân */}
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Thông tin Cá nhân
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12}>
                                <Controller
                                    name="hoVaTen"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Họ và tên"
                                            fullWidth
                                            size="small"
                                            error={!!errors.hoVaTen}
                                            helperText={errors.hoVaTen?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="ngaySinh"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Ngày sinh"
                                            type="date"
                                            fullWidth
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                            error={!!errors.ngaySinh}
                                            helperText={errors.ngaySinh?.message}
                                        />
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="dienThoai"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Điện thoại"
                                            fullWidth
                                            size="small"
                                            error={!!errors.dienThoai}
                                            helperText={errors.dienThoai?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        {/* Phần Thông tin Công ty */}
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Thông tin Đơn vị
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Đơn vị công tác"
                                    fullWidth
                                    size="small"
                                    value={officeNames.idDonVi || idDonViValue || ''}
                                    onClick={() => handleOpenOfficePopup('idDonVi')}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {officeNames.idDonVi && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleClearOffice('idDonVi', e)}
                                                    >
                                                        <Clear fontSize="small" />
                                                    </IconButton>
                                                )}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenOfficePopup('idDonVi')}
                                                >
                                                    <Business />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                    error={!!errors.idDonVi}
                                    helperText={errors.idDonVi?.message}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Quản trị dữ liệu đơn vị"
                                    fullWidth
                                    size="small"
                                    value={officeNames.idQuanTriDonVi || idQuanTriDonViValue || ''}
                                    onClick={() => handleOpenOfficePopup('idQuanTriDonVi')}
                                    InputProps={{
                                        readOnly: true,
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                {officeNames.idQuanTriDonVi && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleClearOffice('idQuanTriDonVi', e)}
                                                    >
                                                        <Clear fontSize="small" />
                                                    </IconButton>
                                                )}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenOfficePopup('idQuanTriDonVi')}
                                                >
                                                    <Business />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                    error={!!errors.idQuanTriDonVi}
                                    helperText={errors.idQuanTriDonVi?.message}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="idCapBac"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            select
                                            label="Cấp bậc"
                                            fullWidth
                                            size="small"
                                            error={!!errors.idCapBac}
                                            helperText={errors.idCapBac?.message}
                                            InputLabelProps={{ shrink: true }}
                                            SelectProps={{
                                                displayEmpty: true
                                            }}
                                        >
                                            <MenuItem value="">
                                                <em>Chọn cấp bậc</em>
                                            </MenuItem>
                                            {capBacList.map((item) => (
                                                <MenuItem key={item.id} value={item.id}>
                                                    {item.ten || item.id}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    )}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="chucVu"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Chức vụ"
                                            fullWidth
                                            size="small"
                                            error={!!errors.chucVu}
                                            helperText={errors.chucVu?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        {/* Phần Trạng thái */}
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Trạng thái
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Controller
                                    name="kichHoat"
                                    control={control}
                                    render={({ field }) => (
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    {...field}
                                                    checked={field.value}
                                                    color="success"
                                                />
                                            }
                                            label="Kích hoạt tài khoản"
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    </Box>
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
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleSubmit(handleSubmitForm)}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ModalEmployee;
