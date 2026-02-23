import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
} from '@mui/material';
import OfficeDictionary from '../../Office/subComponent/OfficeDictionary';

/**
 * Wrapper component để sử dụng OfficeDictionary đã tối ưu trong ModalEmployee
 * Thay thế cho TreeViewPopup cũ
 */
const OfficeDictionaryDialog = ({
    open,
    onClose,
    onSelect,
    selectedId,
    title = "Chọn đơn vị",
    offices = []
}) => {
    const [selectedOffice, setSelectedOffice] = useState(null);
    const dictionaryRef = useRef(null);

    // Reset khi dialog mở
    React.useEffect(() => {
        if (open) {
            // Tìm office đã chọn từ selectedId
            const office = offices.find(o => o.id?.toString() === selectedId?.toString());
            setSelectedOffice(office || null);
        }
    }, [open, selectedId, offices]);

    const handleSelectOffice = (office) => {
        setSelectedOffice(office);
    };

    const handleConfirm = () => {
        if (selectedOffice) {
            onSelect(selectedOffice);
        }
        onClose();
    };

    const handleClear = () => {
        setSelectedOffice(null);
        onSelect(null);
        onClose();
    };

    const handleCancel = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { height: '80vh', maxHeight: '800px' } }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pb: 1,
                borderBottom: '1px solid #e0e0e0'
            }}>
                <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
                    {title}
                </Box>
                {selectedOffice && (
                    <Typography variant="body2" component="span" sx={{
                        color: '#1976d2',
                        fontWeight: 500,
                        backgroundColor: '#e3f2fd',
                        px: 2,
                        py: 0.5,
                        borderRadius: 1
                    }}>
                        Đã chọn: {selectedOffice.ten || selectedOffice.tenDayDu || selectedOffice.id}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <OfficeDictionary
                    ref={dictionaryRef}
                    offices={offices}
                    selectedOffice={selectedOffice}
                    onSelectOffice={handleSelectOffice}
                    onSelect={handleSelectOffice}
                />
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleCancel}
                >
                    Hủy
                </Button>
                <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleClear}
                >
                    Bỏ chọn
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConfirm}
                    disabled={!selectedOffice}
                >
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OfficeDictionaryDialog;
