import React, { useState } from 'react';


import { Button, Typography } from '@mui/material';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import BusinessIcon from '@mui/icons-material/Business';

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
        <CommonDialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            mode="info"
            title={title}
            subtitle="Duyệt cây đơn vị để chọn cấp quản lý hoặc đơn vị công tác"
            icon={<BusinessIcon />}
            onConfirm={handleConfirm}
            confirmText="Xác nhận chọn"
            disabled={!currentSelected}
            contentPadding={0}
            extraActions={
                <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={handleClear}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                    Bỏ chọn đơn vị
                </Button>
            }
            sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
        >
            <OfficeDictionary
                offices={offices}
                selectedOffice={selectedOffice}
                onSelect={(node) => {
                    setCurrentSelected(node);
                }}
            />
        </CommonDialog>
    );
};

export default OfficeDictionaryDialog;
