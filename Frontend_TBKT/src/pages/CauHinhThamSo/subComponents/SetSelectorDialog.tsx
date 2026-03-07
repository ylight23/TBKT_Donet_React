import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Divider,
    Stack,
    Typography,
    Grid,
    Paper
} from '@mui/material';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import LayersIcon from '@mui/icons-material/Layers';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FieldSet } from '../types';
import { mergeFieldsBySet, typeOf } from '../utils';

interface SetSelectorDialogProps {
    open: boolean;
    selectedSetIds: string[];
    fieldSets: FieldSet[];
    fields: DynamicField[];
    onSave: (selectedSetIds: string[]) => void;
    onClose: () => void;
}

const SetSelectorDialog: React.FC<SetSelectorDialogProps> = ({
    open,
    selectedSetIds,
    fieldSets,
    fields,
    onSave,
    onClose,
}) => {
    const [selected, setSelected] = useState<string[]>(selectedSetIds);

    useEffect(() => {
        setSelected(selectedSetIds);
    }, [selectedSetIds]);

    const mergedFields = useMemo(() => mergeFieldsBySet(selected, fieldSets, fields), [selected, fieldSets, fields]);

    const toggleSet = (setId: string) => {
        setSelected((prev) => (prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]));
    };

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            mode="custom"
            title="Chọn bộ dữ liệu cho trang bị"
            subtitle="Kết hợp nhiều bộ dữ liệu để tạo ra cấu trúc thông số đầy đủ"
            icon={<LayersIcon />}
            color="#10b981"
            maxWidth="md"
            confirmText="Áp dụng ngay"
            onConfirm={() => onSave(selected)}
            disabled={selected.length === 0}
        >
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                            DANH SÁCH BỘ DỮ LIỆU CÓ SẴN
                        </Typography>
                        <Chip size="small" label={fieldSets.length} sx={{ fontWeight: 700 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: 'background.default', height: 400, overflowY: 'auto' }}>
                        <Stack spacing={1.5}>
                            {fieldSets.map((set) => {
                                const isSelected = selected.includes(set.id);
                                return (
                                    <Box
                                        key={set.id}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2.5,
                                            cursor: 'pointer',
                                            border: '2px solid',
                                            borderColor: isSelected ? set.color : 'divider',
                                            bgcolor: isSelected ? `${set.color}08` : 'background.paper',
                                            transition: 'all 0.2s',
                                            '&:hover': { borderColor: isSelected ? set.color : 'primary.main', bgcolor: isSelected ? `${set.color}10` : 'action.hover' }
                                        }}
                                        onClick={() => toggleSet(set.id)}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Checkbox
                                                checked={isSelected}
                                                size="small"
                                                sx={{ color: set.color, '&.Mui-checked': { color: set.color }, p: 0 }}
                                            />
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: set.color,
                                                bgcolor: isSelected ? 'background.paper' : `${set.color}11`,
                                                p: 1,
                                                borderRadius: 2.5,
                                                boxShadow: isSelected ? 1 : 0
                                            }}>
                                                {set.icon}
                                            </Box>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" fontWeight={800}>{set.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{set.fieldIds.length} trường thông tin</Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
                            KẾT QUẢ TRƯỜNG DỮ LIỆU GỘP
                        </Typography>
                        <Chip size="small" color="primary" label={mergedFields.length} sx={{ fontWeight: 700 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: 400, display: 'flex', flexDirection: 'column' }}>
                        {mergedFields.length > 0 ? (
                            <Box sx={{ overflowY: 'auto', flex: 1, pr: 1 }}>
                                {mergedFields.map((field, index) => (
                                    <Stack
                                        key={field.id}
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                        sx={{
                                            py: 1,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            '&:last-of-type': { borderBottom: 'none' }
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ width: 24, textAlign: 'center' }}>
                                            {String(index + 1).padStart(2, '0')}
                                        </Typography>
                                        <Box sx={{ p: 0.5, bgcolor: 'action.hover', borderRadius: 2.5, color: 'text.secondary' }}>
                                            {typeOf(field.type).icon}
                                        </Box>
                                        <Box>
                                            <Typography variant="body2" fontWeight={700}>{field.label}</Typography>
                                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', opacity: 0.8 }}>{field.key}</Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'text.disabled', gap: 2 }}>
                                <LayersIcon sx={{ fontSize: 48, opacity: 0.2 }} />
                                <Typography variant="body2" fontWeight={600}>Chưa chọn bộ dữ liệu nào</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </CommonDialog>
    );
};

export default SetSelectorDialog;
