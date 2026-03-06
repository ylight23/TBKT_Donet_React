import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { typeOf } from '../utils';
import FieldInput from './FieldInput';

interface DynamicDataFormProps {
    fields: DynamicField[];
    data: Record<string, string>;
    errors: Record<string, string | null>;
    onChange: (key: string, value: string) => void;
}

const DynamicDataForm: React.FC<DynamicDataFormProps> = ({ fields, data, errors, onChange }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
        }}
    >
        {fields.map((field) => {
            const meta = typeOf(field.type);
            const isWide = field.type === 'textarea' || field.type === 'checkbox';

            return (
                <Box key={field.id} sx={{ gridColumn: { xs: '1', md: isWide ? '1 / -1' : 'auto' } }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            {field.label}
                            {field.required ? ' *' : ''}
                        </Typography>
                        <Chip
                            size="small"
                            icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: meta.color }}>{meta.icon}</Box> as any}
                            label={meta.label}
                            sx={{
                                height: 18,
                                fontSize: 10,
                                bgcolor: `${meta.color}22`,
                                color: meta.color,
                                border: `1px solid ${meta.color}55`,
                            }}
                        />
                    </Stack>
                    <FieldInput
                        field={field}
                        value={data[field.key]}
                        error={errors[field.key] ?? undefined}
                        onChange={onChange}
                    />
                </Box>
            );
        })}
    </Box>
);

export default DynamicDataForm;
