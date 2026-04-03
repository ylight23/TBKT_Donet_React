import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Typography,
    Box,
    Stack,
    Paper,
    CircularProgress,
    SxProps,
    Theme,
    alpha,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type DialogMode = 'add' | 'edit' | 'delete' | 'info' | 'success' | 'warning' | 'error' | 'custom';

type DialogMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;

interface DialogModeConfig {
    defaultColor: string;
    defaultIcon: React.ReactNode;
    defaultConfirmText: string;
}

const getDialogModeConfig = (mode: DialogMode): DialogModeConfig => {
    switch (mode) {
        case 'add':
            return {
                defaultColor: '#10b981',
                defaultIcon: <AddCircleOutlineIcon />,
                defaultConfirmText: 'Thêm mới',
            };
        case 'edit':
            return {
                defaultColor: '#3b82f6',
                defaultIcon: <EditOutlinedIcon />,
                defaultConfirmText: 'Cập nhật',
            };
        case 'delete':
            return {
                defaultColor: '#ef4444',
                defaultIcon: <DeleteOutlineIcon />,
                defaultConfirmText: 'Xóa dữ liệu',
            };
        case 'success':
            return {
                defaultColor: '#10b981',
                defaultIcon: <CheckCircleOutlineIcon />,
                defaultConfirmText: 'Đóng',
            };
        case 'error':
            return {
                defaultColor: '#f43f5e',
                defaultIcon: <ErrorOutlineIcon />,
                defaultConfirmText: 'Thử lại',
            };
        case 'warning':
            return {
                defaultColor: '#f59e0b',
                defaultIcon: <ErrorOutlineIcon />,
                defaultConfirmText: 'Xác nhận',
            };
        default:
            return {
                defaultColor: '#64748b',
                defaultIcon: <InfoOutlinedIcon />,
                defaultConfirmText: 'Xác nhận',
            };
    }
};

interface DialogShellProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    mode?: DialogMode;
    children?: React.ReactNode;
    actions?: React.ReactNode;
    headerActions?: React.ReactNode;
    loading?: boolean;
    maxWidth?: DialogMaxWidth;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    color?: string;
    sx?: SxProps<Theme>;
    contentSx?: SxProps<Theme>;
    contentPadding?: number | string;
    dividers?: boolean;
    hideCloseButton?: boolean;
}

export interface FormDialogProps extends Omit<DialogShellProps, 'actions'> {
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => Promise<void> | void;
    onCancel?: () => void;
    showConfirm?: boolean;
    showCancel?: boolean;
    extraActions?: React.ReactNode;
    customActions?: React.ReactNode;
    disabled?: boolean;
}

export interface ConfirmDialogProps extends Omit<DialogShellProps, 'actions'> {
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => Promise<void> | void;
    onCancel?: () => void;
    confirmDisabled?: boolean;
    extraActions?: React.ReactNode;
}

export interface NoticeDialogProps extends Omit<DialogShellProps, 'actions'> {
    description?: React.ReactNode;
    acknowledgeText?: string;
    onAcknowledge?: () => Promise<void> | void;
    extraActions?: React.ReactNode;
}

export interface CommonDialogProps extends FormDialogProps {}

export const DialogShell: React.FC<DialogShellProps> = ({
    open,
    onClose,
    title,
    subtitle,
    mode = 'info',
    children,
    actions,
    headerActions,
    loading = false,
    maxWidth = 'sm',
    fullWidth = true,
    icon,
    color: customColor,
    sx,
    contentSx,
    contentPadding,
    dividers = true,
    hideCloseButton = false,
}) => {
    const theme = useTheme();
    const config = getDialogModeConfig(mode);
    const mainColor = customColor || config.defaultColor;
    const titleColor = customColor || theme.palette.primary.main;
    const mainIcon = icon || config.defaultIcon;

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            PaperProps={{
                sx: {
                    borderRadius: 2.5,
                    boxShadow: '0 24px 48px -12px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    backgroundImage: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    ...sx,
                },
            }}
        >
            <DialogTitle sx={{
                p: 2.5,
                background: `linear-gradient(135deg, ${alpha(titleColor, 0.14)} 0%, ${alpha(titleColor, 0.06)} 100%)`,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
            }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
                    <Paper elevation={0} sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2.5,
                        bgcolor: alpha(titleColor, 0.14),
                        color: titleColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: alpha(titleColor, 0.24),
                        flexShrink: 0,
                    }}>
                        {mainIcon}
                    </Paper>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography fontWeight={800} variant="h6" sx={{ lineHeight: 1.2, color: 'text.primary' }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35 }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                    {headerActions}
                    {!hideCloseButton && (
                        <IconButton
                            size="small"
                            onClick={onClose}
                            disabled={loading}
                            sx={{
                                bgcolor: 'background.paper',
                                boxShadow: 1,
                                '&:hover': { bgcolor: 'grey.100' },
                            }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            </DialogTitle>

            <DialogContent
                dividers={dividers}
                sx={{
                    p: contentPadding !== undefined ? contentPadding : 3,
                    position: 'relative',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    ...contentSx,
                }}
            >
                {loading && (
                    <Box sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)',
                    }}>
                        <CircularProgress size={40} color="primary" />
                    </Box>
                )}
                {children}
            </DialogContent>

            {actions && (
                <DialogActions sx={{
                    p: 2.5,
                    bgcolor: alpha(mainColor, 0.025),
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    gap: 1.5,
                }}>
                    {actions}
                </DialogActions>
            )}
        </Dialog>
    );
};

export const FormDialog: React.FC<FormDialogProps> = ({
    confirmText,
    cancelText = 'Bỏ qua',
    onConfirm,
    onCancel,
    showConfirm = true,
    showCancel = true,
    extraActions,
    customActions,
    disabled = false,
    loading = false,
    mode = 'info',
    color,
    ...props
}) => {
    const config = getDialogModeConfig(mode);
    const mainColor = color || config.defaultColor;
    const finalConfirmText = confirmText || config.defaultConfirmText;

    return (
        <DialogShell
            {...props}
            mode={mode}
            color={mainColor}
            loading={loading}
            actions={customActions || (
                <>
                    <Box sx={{ flex: 1 }}>{extraActions}</Box>
                    {showCancel && (
                        <Button
                            onClick={onCancel || props.onClose}
                            disabled={loading}
                            sx={{
                                px: 3,
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'none',
                            }}
                        >
                            {cancelText}
                        </Button>
                    )}
                    {showConfirm && (
                        <Button
                            variant="contained"
                            disabled={loading || disabled}
                            onClick={onConfirm}
                            sx={{
                                px: 4,
                                py: 1,
                                borderRadius: 2.5,
                                fontWeight: 800,
                                textTransform: 'none',
                                bgcolor: mainColor,
                                boxShadow: `0 8px 16px -4px ${alpha(mainColor, 0.4)}`,
                                '&:hover': {
                                    bgcolor: mainColor,
                                    filter: 'brightness(0.9)',
                                    boxShadow: `0 12px 20px -4px ${alpha(mainColor, 0.5)}`,
                                },
                                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                            }}
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : finalConfirmText}
                        </Button>
                    )}
                </>
            )}
        />
    );
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    description,
    confirmText,
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
    confirmDisabled = false,
    extraActions,
    children,
    mode = 'delete',
    ...props
}) => {
    const body = children || (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {description}
        </Typography>
    );

    return (
        <FormDialog
            {...props}
            mode={mode}
            onConfirm={onConfirm}
            onCancel={onCancel}
            confirmText={confirmText}
            cancelText={cancelText}
            disabled={confirmDisabled}
            extraActions={extraActions}
        >
            {body}
        </FormDialog>
    );
};

export const NoticeDialog: React.FC<NoticeDialogProps> = ({
    description,
    acknowledgeText,
    onAcknowledge,
    extraActions,
    children,
    mode = 'info',
    ...props
}) => {
    const config = getDialogModeConfig(mode);
    const body = children || (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {description}
        </Typography>
    );

    return (
        <FormDialog
            {...props}
            mode={mode}
            onConfirm={onAcknowledge || props.onClose}
            confirmText={acknowledgeText || config.defaultConfirmText}
            showCancel={false}
            extraActions={extraActions}
        >
            {body}
        </FormDialog>
    );
};

const CommonDialog: React.FC<CommonDialogProps> = (props) => {
    return <FormDialog {...props} />;
};

export default CommonDialog;
