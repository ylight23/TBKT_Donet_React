import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { LOG_TYPES, LOG_LABELS } from '../constants';
import {
    EquipmentItem,
    EquipmentLog,
    FieldSet,
    LogType,
    LogTypeEntry,
    TechParam
} from '../types';
import { mergeFieldsBySet, validateFieldValue } from '../utils';
import DynamicDataForm from './DynamicDataForm';

interface EquipmentFormProps {
    equipment: EquipmentItem;
    fields: DynamicField[];
    fieldSets: FieldSet[];
    onChange: (next: EquipmentItem) => void;
    onSelectSets: () => void;
}

type EquipmentTab = 'info' | 'tech' | 'logs';

const EquipmentForm: React.FC<EquipmentFormProps> = ({ equipment, fields, fieldSets, onChange, onSelectSets }) => {
    const [tab, setTab] = useState<EquipmentTab>('info');
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<Record<string, string | null>>({});

    const [logType, setLogType] = useState<LogType | ''>('');
    const [logMeta, setLogMeta] = useState<{ date: string; performedBy: string }>({ date: '', performedBy: '' });
    const [logData, setLogData] = useState<Record<string, string>>({});

    useEffect(() => {
        setTouched({});
        setErrors({});
        setTab('info');
        setLogType('');
        setLogMeta({ date: '', performedBy: '' });
        setLogData({});
    }, [equipment.id]);

    const mergedFields = useMemo(
        () => mergeFieldsBySet(equipment.selectedSetIds, fieldSets, fields),
        [equipment.selectedSetIds, fieldSets, fields],
    );

    const totalErrors = mergedFields.reduce((acc, field) => (validateFieldValue(equipment.data[field.key], field) ? acc + 1 : acc), 0);

    const handleFieldChange = (key: string, value: string) => {
        onChange({ ...equipment, data: { ...equipment.data, [key]: value } });
        setTouched((prev) => ({ ...prev, [key]: true }));

        const foundField = fields.find((field) => field.key === key);
        if (foundField) {
            setErrors((prev) => ({ ...prev, [key]: validateFieldValue(value, foundField) }));
        }
    };

    const touchedErrors = Object.fromEntries(
        Object.entries(errors).filter(([key]) => touched[key]),
    ) as Record<string, string | null>;

    const setLabelById = (setId: string): React.ReactNode => {
        const found = fieldSets.find((set) => set.id === setId);
        return found ? <Stack direction="row" alignItems="center" spacing={0.5}><Box sx={{ display: 'flex', alignItems: 'center' }}>{found.icon}</Box><span>{found.name}</span></Stack> : setId;
    };

    const updateTechParams = (nextParams: TechParam[]) => {
        onChange({ ...equipment, techParams: nextParams });
    };

    const addTechParam = () => {
        updateTechParams([...equipment.techParams, { id: `tp_${Math.random().toString(36).slice(2, 9)}`, key: '', value: '' }]);
    };

    const updateTechParamField = (id: string, prop: 'key' | 'value', value: string) => {
        updateTechParams(equipment.techParams.map((param) => (param.id === id ? { ...param, [prop]: value } : param)));
    };

    const removeTechParam = (id: string) => {
        updateTechParams(equipment.techParams.filter((param) => param.id !== id));
    };

    const submitLog = () => {
        if (!logType || !logMeta.date || !logMeta.performedBy) {
            return;
        }

        const nextLog: EquipmentLog = {
            id: `log_${Math.random().toString(36).slice(2, 9)}`,
            type: logType,
            date: logMeta.date,
            performedBy: logMeta.performedBy,
            data: { ...logData },
        };

        onChange({ ...equipment, logs: [...equipment.logs, nextLog] });
        setLogType('');
        setLogMeta({ date: '', performedBy: '' });
        setLogData({});
    };

    const removeLog = (logId: string) => {
        onChange({ ...equipment, logs: equipment.logs.filter((log) => log.id !== logId) });
    };

    const sortedLogs = [...equipment.logs].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        Bộ dữ liệu:
                    </Typography>
                    {equipment.selectedSetIds.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                            Chưa chọn bộ dữ liệu
                        </Typography>
                    )}
                    {equipment.selectedSetIds.map((setId) => (
                        <Chip key={setId} label={setLabelById(setId)} size="small" />
                    ))}

                    <Button size="small" variant="outlined" sx={{ ml: 'auto' }} onClick={onSelectSets}>
                        Chọn bộ dữ liệu
                    </Button>
                    {totalErrors > 0 && <Chip size="small" color="error" label={`${totalErrors} lỗi`} />}
                </Stack>

                <Tabs
                    value={tab}
                    onChange={(_, nextTab: EquipmentTab) => setTab(nextTab)}
                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Tab value="info" label="Thông tin" />
                    <Tab value="tech" label="Thông số kỹ thuật" />
                    <Tab value="logs" label={`Lịch sử (${equipment.logs.length})`} />
                </Tabs>

                <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
                    {tab === 'info' && (
                        <>
                            {equipment.selectedSetIds.length === 0 && (
                                <Box
                                    sx={{
                                        p: 4,
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        borderRadius: 2.5,
                                        textAlign: 'center',
                                    }}
                                >
                                    <Typography color="text.secondary" mb={1}>
                                        Chưa chọn bộ dữ liệu cho trang bị này
                                    </Typography>
                                    <Button variant="outlined" onClick={onSelectSets}>
                                        Chọn bộ dữ liệu
                                    </Button>
                                </Box>
                            )}

                            {equipment.selectedSetIds.map((setId) => {
                                const set = fieldSets.find((item) => item.id === setId);
                                if (!set) return null;

                                const setFields = set.fieldIds
                                    .map((fieldId) => fields.find((field) => field.id === fieldId))
                                    .filter((field): field is DynamicField => Boolean(field));

                                return (
                                    <Box key={set.id} mb={3}>
                                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', color: set.color }}>{set.icon}</Box>
                                            <Typography fontWeight={800} color={set.color}>
                                                {set.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {setFields.length} trường
                                            </Typography>
                                        </Stack>

                                        <DynamicDataForm
                                            fields={setFields}
                                            data={equipment.data}
                                            errors={touchedErrors}
                                            onChange={handleFieldChange}
                                        />
                                    </Box>
                                );
                            })}
                        </>
                    )}

                    {tab === 'tech' && (
                        <Box>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                <Typography fontWeight={700}>Thông số kỹ thuật tự do</Typography>
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={addTechParam}>
                                    Thêm thông số
                                </Button>
                            </Stack>

                            {equipment.techParams.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có thông số.
                                </Typography>
                            )}

                            <Stack spacing={1}>
                                {equipment.techParams.map((param, index) => (
                                    <Box
                                        key={param.id}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '24px 1fr 1fr 40px',
                                            gap: 1,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            {index + 1}
                                        </Typography>
                                        <TextField
                                            size="small"
                                            value={param.key}
                                            placeholder="Tên thông số"
                                            onChange={(event) => updateTechParamField(param.id, 'key', event.target.value)}
                                        />
                                        <TextField
                                            size="small"
                                            value={param.value}
                                            placeholder="Giá trị"
                                            onChange={(event) => updateTechParamField(param.id, 'value', event.target.value)}
                                        />
                                        <IconButton size="small" onClick={() => removeTechParam(param.id)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {tab === 'logs' && (
                        <Box>
                            {!logType && (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
                                    {(Object.entries(LOG_TYPES) as LogTypeEntry[]).map(
                                        ([type, config]) => (
                                            <Button
                                                key={type}
                                                variant="outlined"
                                                sx={{ color: config.color, borderColor: `${config.color}66` }}
                                                onClick={() => setLogType(type)}
                                            >
                                                + {config.label}
                                            </Button>
                                        ),
                                    )}
                                </Stack>
                            )}

                            {logType && (
                                <Card variant="outlined" sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                                            <Stack direction="row" alignItems="center" spacing={0.75} fontWeight={800} sx={{ color: LOG_TYPES[logType].color }}>
                                                {LOG_TYPES[logType].icon}
                                                <Typography fontWeight={800} color={LOG_TYPES[logType].color}>{LOG_TYPES[logType].label}</Typography>
                                            </Stack>
                                            <IconButton size="small" onClick={() => setLogType('')}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Stack>

                                        <Box
                                            sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                                gap: 1.5,
                                            }}
                                        >
                                            <TextField
                                                size="small"
                                                type="date"
                                                label="Ngày"
                                                InputLabelProps={{ shrink: true }}
                                                value={logMeta.date}
                                                onChange={(event) => setLogMeta((prev) => ({ ...prev, date: event.target.value }))}
                                            />
                                            <TextField
                                                size="small"
                                                label="Người thực hiện"
                                                value={logMeta.performedBy}
                                                onChange={(event) =>
                                                    setLogMeta((prev) => ({ ...prev, performedBy: event.target.value }))
                                                }
                                            />

                                            {LOG_TYPES[logType].fields.map((fieldKey) => (
                                                <TextField
                                                    key={fieldKey}
                                                    size="small"
                                                    label={LOG_LABELS[fieldKey] ?? fieldKey}
                                                    value={logData[fieldKey] ?? ''}
                                                    onChange={(event) =>
                                                        setLogData((prev) => ({ ...prev, [fieldKey]: event.target.value }))
                                                    }
                                                />
                                            ))}
                                        </Box>

                                        <Stack direction="row" spacing={1} mt={2}>
                                            <Button variant="contained" onClick={submitLog}>
                                                Lưu lịch sử
                                            </Button>
                                            <Button variant="outlined" onClick={() => setLogType('')}>
                                                Huỷ
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            )}

                            <Stack spacing={1}>
                                {sortedLogs.map((log) => {
                                    const config = LOG_TYPES[log.type];
                                    return (
                                        <Card key={log.id} variant="outlined" sx={{ borderLeft: `4px solid ${config.color}` }}>
                                            <CardContent sx={{ py: 1.5 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                                    <Box>
                                                        <Stack direction="row" alignItems="center" spacing={0.75}>
                                                            <Box sx={{ color: config.color, display: 'flex', alignItems: 'center' }}>{config.icon}</Box>
                                                            <Typography fontWeight={700}>{config.label}</Typography>
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {log.date} · {log.performedBy}
                                                        </Typography>

                                                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
                                                            {Object.entries(log.data)
                                                                .filter(([, value]) => Boolean(value))
                                                                .map(([fieldKey, value]) => (
                                                                    <Chip
                                                                        key={`${log.id}-${fieldKey}`}
                                                                        size="small"
                                                                        label={`${LOG_LABELS[fieldKey] ?? fieldKey}: ${value}`}
                                                                        variant="outlined"
                                                                    />
                                                                ))}
                                                        </Stack>
                                                    </Box>

                                                    <Tooltip title="Xoá lịch sử">
                                                        <IconButton size="small" onClick={() => removeLog(log.id)}>
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default EquipmentForm;
