import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { typeOf } from '../utils';
import FieldInput from './FieldInput';

interface DynamicDataFormTabGroup {
    id: string;
    label: string;
    fields: DynamicField[];
}

interface DynamicDataFormProps {
    fields: DynamicField[];
    tabGroups?: DynamicDataFormTabGroup[];
    data: Record<string, string>;
    errors: Record<string, string | null>;
    onChange: (key: string, value: string) => void;
}

const DynamicDataForm: React.FC<DynamicDataFormProps> = ({ fields, tabGroups, data, errors, onChange }) => {
    const effectiveGroups = React.useMemo(() => {
        const groups = (tabGroups ?? []).filter((group) => (group.label || '').trim().length > 0);
        if (groups.length === 0) {
            return [{ id: '__default__', label: 'Thong tin', fields }];
        }
        return groups;
    }, [fields, tabGroups]);

    const [activeTab, setActiveTab] = React.useState(0);

    React.useEffect(() => {
        setActiveTab(0);
    }, [effectiveGroups.length]);

    const currentGroup = effectiveGroups[Math.min(activeTab, Math.max(effectiveGroups.length - 1, 0))];
    const renderFields = currentGroup?.fields ?? [];

    return (
        <Stack spacing={1.5}>
            {effectiveGroups.length > 1 && (
                <Tabs
                    value={Math.min(activeTab, Math.max(effectiveGroups.length - 1, 0))}
                    onChange={(_, value) => setActiveTab(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {effectiveGroups.map((group, index) => (
                        <Tab
                            key={`${group.id}-${index}`}
                            value={index}
                            label={`${group.label} (${group.fields.length})`}
                            sx={{ textTransform: 'none' }}
                        />
                    ))}
                </Tabs>
            )}

            {renderFields.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                    Tab nay chua co truong du lieu duoc cau hinh.
                </Typography>
            )}

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
                {renderFields.map((field) => {
                    const meta = typeOf(field.type);
                    const isWide = field.type === 'textarea' || field.type === 'checkbox' || field.type === 'checkboxGroup';

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
        </Stack>
    );
};

export default DynamicDataForm;
