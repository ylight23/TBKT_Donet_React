import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from '@mui/material';
import OfficeDictionary, { OfficeNode } from '../../Office/subComponent/OfficeDictionary';

interface OfficeDictionaryDialogProps {
    open: boolean;
    onClose: () => void;
    onSelect: (office: OfficeNode | null) => void;
    selectedId?: string;
    title?: string;
    offices?: OfficeNode[];
}

const OfficeDictionaryDialog: React.FC<OfficeDictionaryDialogProps> = ({
    open,
    onClose,
    onSelect,
    selectedId,
    title = 'Chọn đơn vị',
    offices = [],
}) => {
    const [currentSelected, setCurrentSelected] = useState<OfficeNode | null>(null);

    const selectedOffice = selectedId
        ? offices.find(o => String(o.id) === selectedId) ?? null
        : null;

    const handleConfirm = () => {
        if (currentSelected) {
            onSelect(currentSelected);
        }
        onClose();
    };

    const handleClear = () => {
        onSelect(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { height: '70vh' } }}
        >
            <DialogTitle>{title}</DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <OfficeDictionary
                    offices={offices}
                    selectedOffice={selectedOffice}
                    onSelect={(node) => {
                        setCurrentSelected(node);
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button variant="outlined" color="inherit" onClick={onClose}>
                    Hủy
                </Button>
                <Button variant="outlined" color="warning" onClick={handleClear}>
                    Bỏ chọn
                </Button>
                <Button variant="contained" color="primary"
                    onClick={handleConfirm}
                    disabled={!currentSelected}
                >
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OfficeDictionaryDialog;