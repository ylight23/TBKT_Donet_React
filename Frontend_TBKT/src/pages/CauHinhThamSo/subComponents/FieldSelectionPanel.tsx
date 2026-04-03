import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { typeOf } from '../utils';

const FIELD_ROW_HEIGHT = 40;
const OVERSCAN = 16;

interface FieldSelectionPanelProps {
    selectedIds: string[];
    totalFields: number;
    filteredAllFields: DynamicField[];
    fieldSearch: string;
    selectedColor: string;
    onFieldSearchChange: (value: string) => void;
    onSelectAll: () => void;
    onClearAll: () => void;
    onToggle: (fieldId: string) => void;
}

const FieldSelectionPanel: React.FC<FieldSelectionPanelProps> = React.memo(({
    selectedIds,
    totalFields,
    filteredAllFields,
    fieldSearch,
    selectedColor,
    onFieldSearchChange,
    onSelectAll,
    onClearAll,
    onToggle,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const selectedSet = new Set(selectedIds);

    const virtualizer = useVirtualizer({
        count: filteredAllFields.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => FIELD_ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    return (
        <>
            <Divider />

            <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" fontWeight={800}>
                        Chọn trường dữ liệu ({selectedIds.length}/{totalFields})
                    </Typography>
                    <Stack direction="row" spacing={0.5}>
                        <Button size="small" onClick={onSelectAll}>Chọn tất cả</Button>
                        <Button size="small" onClick={onClearAll}>Bỏ chọn</Button>
                    </Stack>
                </Stack>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm trường..."
                    value={fieldSearch}
                    onChange={(e) => onFieldSearchChange(e.target.value)}
                    sx={{ mb: 1 }}
                />

                <Box
                    ref={scrollRef}
                    sx={{ height: Math.min(filteredAllFields.length * FIELD_ROW_HEIGHT, 360), overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}
                >
                    <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((vRow) => {
                            const field = filteredAllFields[vRow.index];
                            const checked = selectedSet.has(field.id);
                            const meta = typeOf(field.type);
                            return (
                                <Box
                                    key={vRow.key}
                                    data-index={vRow.index}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${vRow.start}px)`,
                                    }}
                                >
                                    <Box
                                        onClick={() => onToggle(field.id)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', px: 1.5, py: 0.5,
                                            height: FIELD_ROW_HEIGHT - 1,
                                            cursor: 'pointer',
                                            bgcolor: checked ? `${selectedColor}0d` : 'transparent',
                                            borderBottom: '1px solid', borderColor: 'divider',
                                            '&:hover': { bgcolor: checked ? `${selectedColor}1a` : 'action.hover' },
                                            transition: 'background-color 0.12s',
                                        }}
                                    >
                                        <Checkbox
                                            size="small"
                                            checked={checked}
                                            sx={{ p: 0.5, mr: 1, color: checked ? selectedColor : undefined, '&.Mui-checked': { color: selectedColor } }}
                                            onChange={() => onToggle(field.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Box sx={{ color: meta.color, display: 'flex', mr: 0.75 }}>{meta.icon}</Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>{field.label}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>
                                                {field.key} · {meta.label}
                                            </Typography>
                                        </Box>
                                        {field.required && <Chip size="small" label="*" color="error" sx={{ height: 16, fontSize: 10, ml: 1 }} />}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {filteredAllFields.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                            Không tìm thấy trường nào
                        </Typography>
                    )}
                </Box>
            </Box>
        </>
    );
});

FieldSelectionPanel.displayName = 'FieldSelectionPanel';

export default FieldSelectionPanel;
