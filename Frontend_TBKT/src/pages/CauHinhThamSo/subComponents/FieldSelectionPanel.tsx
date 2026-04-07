import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { getStripedRowBackground, getStripedHoverBackground } from '../../../utils/stripedSurface';
import { typeOf } from '../utils';

const FIELD_ROW_HEIGHT = 54;
const OVERSCAN = 16;
const DEFAULT_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [50, 100, 200];
const GRID_COLUMNS = 2;

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
    const theme = useTheme();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

    const totalCount = filteredAllFields.length;
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
    const safePage = Math.min(page, pageCount - 1);

    useEffect(() => {
        if (page !== safePage) {
            setPage(safePage);
        }
    }, [page, safePage]);

    const pagedFields = useMemo(() => {
        const start = safePage * pageSize;
        return filteredAllFields.slice(start, start + pageSize);
    }, [filteredAllFields, safePage, pageSize]);

    const virtualRows = Math.max(1, Math.ceil(pagedFields.length / GRID_COLUMNS));
    const virtualizer = useVirtualizer({
        count: virtualRows,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => FIELD_ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    return (
        <Stack spacing={1} sx={{ height: '100%' }}>
            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2" fontWeight={800}>
                        Chọn trường dữ liệu ({selectedIds.length}/{totalFields})
                    </Typography>
                    <Stack direction="row" spacing={0.75}>
                        <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={onSelectAll}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Chọn tất cả
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            onClick={onClearAll}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            Bỏ chọn
                        </Button>
                    </Stack>
                </Stack>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm trường..."
                    value={fieldSearch}
                    onChange={(e) => {
                        setPage(0);
                        onFieldSearchChange(e.target.value);
                    }}
                    sx={{ mb: 1 }}
                />

                <Box
                    ref={scrollRef}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2.5,
                    }}
                >
                    <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((vRow) => {
                            const rowStart = vRow.index * GRID_COLUMNS;
                            const rowFields = pagedFields.slice(rowStart, rowStart + GRID_COLUMNS);

                            return (
                                <Box
                                    key={vRow.key}
                                    data-index={vRow.index}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${vRow.start}px)`,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                            gap: 1,
                                            px: 1,
                                            py: 0.5,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: getStripedRowBackground(theme, vRow.index),
                                        }}
                                    >
                                        {rowFields.map((field) => {
                                            const checked = selectedSet.has(field.id);
                                            const meta = typeOf(field.type);

                                            return (
                                                <Box
                                                    key={field.id}
                                                    onClick={() => onToggle(field.id)}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        px: 1,
                                                        py: 0.5,
                                                        minHeight: FIELD_ROW_HEIGHT - 12,
                                                        borderRadius: 1.5,
                                                        cursor: 'pointer',
                                                        bgcolor: checked ? `${selectedColor}0d` : 'transparent',
                                                        '&:hover': { bgcolor: checked ? `${selectedColor}1a` : getStripedHoverBackground(theme) },
                                                        transition: 'background-color 0.12s',
                                                    }}
                                                >
                                                    <Checkbox
                                                        size="small"
                                                        checked={checked}
                                                        sx={{
                                                            p: 0.25,
                                                            mr: 0.75,
                                                            color: checked ? selectedColor : undefined,
                                                            '&.Mui-checked': { color: selectedColor },
                                                        }}
                                                        onChange={() => onToggle(field.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Box sx={{ color: meta.color, display: 'flex', mr: 0.5 }}>{meta.icon}</Box>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
                                                            {field.label}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            noWrap
                                                            sx={{ fontFamily: 'monospace', fontSize: 11 }}
                                                        >
                                                            {field.key} · {meta.label}
                                                        </Typography>
                                                    </Box>
                                                    {field.required && (
                                                        <Chip size="small" label="*" color="error" sx={{ height: 16, fontSize: 10, ml: 0.5 }} />
                                                    )}
                                                </Box>
                                            );
                                        })}
                                        {rowFields.length < GRID_COLUMNS && <Box sx={{ minHeight: FIELD_ROW_HEIGHT - 12 }} />}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {pagedFields.length === 0 && (
                        <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                            Không tìm thấy trường nào
                        </Typography>
                    )}
                </Box>

                <TablePagination
                    component="div"
                    count={totalCount}
                    page={safePage}
                    onPageChange={(_, nextPage) => setPage(nextPage)}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(e) => {
                        const nextSize = Number(e.target.value) || DEFAULT_PAGE_SIZE;
                        setPageSize(nextSize);
                        setPage(0);
                    }}
                    rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                    sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}
                />
            </Box>
        </Stack>
    );
});

FieldSelectionPanel.displayName = 'FieldSelectionPanel';

export default FieldSelectionPanel;
