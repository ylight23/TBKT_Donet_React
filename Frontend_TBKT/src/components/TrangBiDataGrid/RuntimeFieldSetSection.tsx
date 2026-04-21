import React from 'react';
import Box from '@mui/material/Box';
import type { LocalDynamicField as DynamicField, LocalFieldSet as FieldSet } from '../../types/thamSo';
import { FieldSetGroup } from './GeneralInfoTab';

export interface RuntimeFieldSetContentItem {
    fieldSet: FieldSet;
    fields: DynamicField[];
}

interface RuntimeFieldSetSectionProps {
    items: RuntimeFieldSetContentItem[];
    formData: Record<string, string>;
    onFieldChange: (fieldKey: string, value: string) => void;
}

const DEFAULT_SET_COLORS = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'];

const RuntimeFieldSetSection: React.FC<RuntimeFieldSetSectionProps> = ({
    items,
    formData,
    onFieldChange,
}) => {
    if (items.length === 0) return null;

    return (
        <Box sx={{ mb: 2 }}>
            {items.map((item, index) => (
                <FieldSetGroup
                    key={`${item.fieldSet.id}-${index}`}
                    fieldSet={item.fieldSet}
                    fields={item.fields}
                    formData={formData}
                    onFieldChange={onFieldChange}
                    color={item.fieldSet.color || DEFAULT_SET_COLORS[index % DEFAULT_SET_COLORS.length]}
                    showSectionHeader
                />
            ))}
        </Box>
    );
};

export default RuntimeFieldSetSection;
