import React from 'react';
import Box from '@mui/material/Box';
import PageFormConfig from '../../CauHinhThamSo/subComponents/PageFormConfig';
import { useFormConfigManager } from '../hooks/useFormConfigManager';

const FormConfigTab: React.FC = () => {
    const formConfig = useFormConfigManager();

    return (
        <Box sx={{ minHeight: 560 }}>
            <PageFormConfig
                fields={formConfig.fields}
                fieldSets={formConfig.fieldSets}
                forms={formConfig.forms}
                setForms={formConfig.setForms}
                activeFormId={formConfig.activeFormId}
                setActiveFormId={formConfig.setActiveFormId}
            />
        </Box>
    );
};

export default FormConfigTab;
