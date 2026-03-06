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
    Divider,
    CircularProgress,
    SxProps,
    Theme,
    alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type DialogMode = 'add' | 'edit' | 'delete' | 'info' | 'success' | 'warning' | 'error' | 'custom';

interface CommonDialogProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    mode?: DialogMode;
    children?: React.ReactNode;
    // Actions
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => Promise<void> | void;
    showConfirm?: boolean;
    showCancel?: boolean;
    /** Các action bổ sung hiển thị ở footer (bên trái nút Xác nhận) */
    extraActions?: React.ReactNode;
    // State
    loading?: boolean;
    disabled?: boolean;
    // Styling
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    color?: string; // Tùy chỉnh màu chủ đạo (ví dụ #3b82f6)
    sx?: SxProps<Theme>;
    /** Tùy chỉnh padding của DialogContent */
    contentPadding?: number | string;
}

/**
 * CommonDialog – Dialog dùng chung cho toàn hệ thống
 * Đảm bảo tính thẩm mỹ cao, đối xứng và nhất quán UI/UX.
 */
const CommonDialog: React.FC<CommonDialogProps> = ({
    open,
    onClose,
    title,
    subtitle,
    mode = 'info',
    children,
    confirmText,
    cancelText = 'Bỏ qua',
    onConfirm,
    showConfirm = true,
    showCancel = true,
    extraActions,
    loading = false,
    disabled = false,
    maxWidth = 'sm',
    fullWidth = true,
    icon,
    color: customColor,
    sx,
    contentPadding,
}) => {
    // Xác định cấu hình theo Mode
    const getModeConfig = () => {
        switch (mode) {
            case 'add':
                return {
                    defaultColor: '#10b981', // Emerald 500
                    defaultIcon: <AddCircleOutlineIcon />,
                    defaultConfirmText: 'Thêm mới'
                };
            case 'edit':
                return {
                    defaultColor: '#3b82f6', // Blue 500
                    defaultIcon: <EditOutlinedIcon />,
                    defaultConfirmText: 'Cập nhật'
                };
            case 'delete':
                return {
                    defaultColor: '#ef4444', // Red 500
                    defaultIcon: <DeleteOutlineIcon />,
                    defaultConfirmText: 'Xóa dữ liệu'
                };
            case 'success':
                return {
                    defaultColor: '#10b981',
                    defaultIcon: <CheckCircleOutlineIcon />,
                    defaultConfirmText: 'Đóng'
                };
            case 'error':
                return {
                    defaultColor: '#f43f5e', // Rose 500
                    defaultIcon: <ErrorOutlineIcon />,
                    defaultConfirmText: 'Thử lại'
                };
            case 'warning':
                return {
                    defaultColor: '#f59e0b', // Amber 500
                    defaultIcon: <ErrorOutlineIcon />,
                    defaultConfirmText: 'Xác nhận'
                };
            default:
                return {
                    defaultColor: '#64748b', // Slate 500
                    defaultIcon: <InfoOutlinedIcon />,
                    defaultConfirmText: 'Xác nhận'
                };
        }
    };

    const config = getModeConfig();
    const mainColor = customColor || config.defaultColor;
    const mainIcon = icon || config.defaultIcon;
    const finalConfirmText = confirmText || config.defaultConfirmText;

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: '0 24px 48px -12px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    ...sx
                }
            }}
        >
            {/* Header: Gradient + Icon + Title */}
            <DialogTitle sx={{
                p: 2.5,
                background: `linear-gradient(135deg, ${alpha(mainColor, 0.08)} 0%, ${alpha(mainColor, 0.03)} 100%)`,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Paper elevation={0} sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: alpha(mainColor, 0.12),
                        color: mainColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: alpha(mainColor, 0.2)
                    }}>
                        {mainIcon}
                    </Paper>
                    <Box>
                        <Typography fontWeight={800} variant="h6" sx={{ lineHeight: 1.2, color: 'text.primary' }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                <IconButton
                    size="small"
                    onClick={onClose}
                    disabled={loading}
                    sx={{
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'grey.100' }
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            {/* Content Body */}
            <DialogContent
                dividers
                sx={{
                    p: contentPadding !== undefined ? contentPadding : 3,
                    position: 'relative',
                    overflowX: 'hidden'
                }}
            >
                {loading && (
                    <Box sx={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)'
                    }}>
                        <CircularProgress size={40} color="primary" />
                    </Box>
                )}
                {children}
            </DialogContent>

            {/* Actions Footer */}
            {(showConfirm || showCancel || extraActions) && (
                <DialogActions sx={{
                    p: 2.5,
                    bgcolor: alpha(mainColor, 0.02),
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    gap: 1.5
                }}>
                    <Box sx={{ flex: 1 }}>
                        {extraActions}
                    </Box>
                    {showCancel && (
                        <Button
                            onClick={onClose}
                            disabled={loading}
                            sx={{
                                px: 3,
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'none'
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
                                borderRadius: 2,
                                fontWeight: 800,
                                textTransform: 'none',
                                bgcolor: mainColor,
                                boxShadow: `0 8px 16px -4px ${alpha(mainColor, 0.4)}`,
                                '&:hover': {
                                    bgcolor: mainColor,
                                    filter: 'brightness(0.9)',
                                    boxShadow: `0 12px 20px -4px ${alpha(mainColor, 0.5)}`
                                },
                                '&.Mui-disabled': { bgcolor: 'action.disabledBackground' }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                finalConfirmText
                            )}
                        </Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default CommonDialog;
