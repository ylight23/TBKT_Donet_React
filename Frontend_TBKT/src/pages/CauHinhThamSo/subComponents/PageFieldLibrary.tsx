import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FieldSet } from '../types';
import { FIELD_TYPES } from '../constants';
import { hasValidationRules, typeOf } from '../utils';
import FieldConfigPanel from './FieldConfigPanel';
import { listDanhMucChuyenNganh, DanhMucChuyenNganhOption } from '../../../apis/danhmucChuyenNganhApi';
import type { RootState } from '../../../store';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 52;
const OVERSCAN = 16;

type SortKey = 'label' | 'key' | 'type';
type RequiredFilter = 'all' | 'required' | 'optional';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PageFieldLibraryProps {
    fields: DynamicField[];
    deletedFields: DynamicField[];
    onRestoreField: (id: string) => void | Promise<void>;
    setFields: React.Dispatch<React.SetStateAction<DynamicField[]>>;
    fieldSets: FieldSet[];
    setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PageFieldLibrary: React.FC<PageFieldLibraryProps> = ({
    fields,
    deletedFields,
    onRestoreField,
    setFields,
    fieldSets,
    setFieldSets,
}) => {
    const visibleCNs = useSelector((state: RootState) => state.permissionReducer.visibleCNs);
    // ── state ──
    const [search, setSearch] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
    const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
    const [selectedCnIds, setSelectedCnIds] = useState<Set<string>>(new Set());
    const [showNoCn, setShowNoCn] = useState(false);
    const [cnOptions, setCnOptions] = useState<DanhMucChuyenNganhOption[]>([]);
    const [requiredFilter, setRequiredFilter] = useState<RequiredFilter>('all');
    const [showOrphans, setShowOrphans] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('label');
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [fsSearch, setFsSearch] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);

    // ── load CN options once ──
    useEffect(() => {
        listDanhMucChuyenNganh().then(setCnOptions).catch(() => {});
    }, []);

    // CN lookup map for display
    const cnMap = useMemo(() => {
        const m = new Map<string, DanhMucChuyenNganhOption>();
        for (const cn of cnOptions) m.set(cn.id, cn);
        return m;
    }, [cnOptions]);

    const allowedCnOptions = useMemo(
        () => (visibleCNs.length === 0
            ? cnOptions
            : cnOptions.filter((cn) => visibleCNs.includes(cn.id))),
        [cnOptions, visibleCNs],
    );

    // ── derived data ──

    // Reverse index: field id → set of FieldSet ids it belongs to
    const fieldToSetIds = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const fs of fieldSets) {
            for (const fid of fs.fieldIds) {
                if (!map.has(fid)) map.set(fid, new Set());
                map.get(fid)!.add(fs.id);
            }
        }
        return map;
    }, [fieldSets]);

    const assignedFieldIds = useMemo(() => new Set(fieldToSetIds.keys()), [fieldToSetIds]);

    // Filtered + sorted fields
    const filteredFields = useMemo(() => {
        const lowerSearch = search.toLowerCase().trim();

        let result = fields.filter((f) => {
            if (lowerSearch && !f.label.toLowerCase().includes(lowerSearch) && !f.key.toLowerCase().includes(lowerSearch)) {
                return false;
            }
            if (selectedTypes.size > 0 && !selectedTypes.has(f.type)) return false;
            if (requiredFilter === 'required' && !f.required) return false;
            if (requiredFilter === 'optional' && f.required) return false;
            if (visibleCNs.length > 0 && f.cnIds && f.cnIds.length > 0) {
                const hasVisibleCn = f.cnIds.some((cnId) => visibleCNs.includes(cnId));
                if (!hasVisibleCn) return false;
            }

            if (showOrphans) {
                if (assignedFieldIds.has(f.id)) return false;
            } else if (selectedSetIds.size > 0) {
                const fSets = fieldToSetIds.get(f.id);
                if (!fSets) return false;
                let match = false;
                for (const sid of selectedSetIds) {
                    if (fSets.has(sid)) { match = true; break; }
                }
                if (!match) return false;
            }

            // CN filter
            if (showNoCn) {
                if (f.cnIds && f.cnIds.length > 0) return false;
            } else if (selectedCnIds.size > 0) {
                if (!f.cnIds || f.cnIds.length === 0) return false;
                let cnMatch = false;
                for (const cid of selectedCnIds) {
                    if (f.cnIds.includes(cid)) { cnMatch = true; break; }
                }
                if (!cnMatch) return false;
            }

            return true;
        });

        result.sort((a, b) => {
            if (sortKey === 'label') return a.label.localeCompare(b.label, 'vi');
            if (sortKey === 'key') return a.key.localeCompare(b.key);
            return a.type.localeCompare(b.type);
        });

        return result;
    }, [fields, search, selectedTypes, requiredFilter, selectedSetIds, showOrphans, selectedCnIds, showNoCn, sortKey, fieldToSetIds, assignedFieldIds, visibleCNs]);

    const virtualizer = useVirtualizer({
        count: filteredFields.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: OVERSCAN,
    });

    const editingField = editingFieldId ? fields.find((f) => f.id === editingFieldId) : undefined;

    const filteredSetsForFilter = useMemo(() => {
        const lower = fsSearch.toLowerCase().trim();
        if (!lower) return fieldSets;
        return fieldSets.filter((s) => s.name.toLowerCase().includes(lower));
    }, [fieldSets, fsSearch]);

    // ── handlers ──

    const handleAddField = () => {
        const id = `field_${Math.random().toString(36).slice(2, 9)}`;
        const newField: DynamicField = {
            id,
            key: `truong_${fields.length + 1}`,
            label: 'Trường mới',
            type: 'text',
            required: false,
            validation: {},
        };
        setFields((prev) => [...prev, newField]);
        setEditingFieldId(id);
    };

    const handleSaveField = (nextField: DynamicField) => {
        setFields((prev) => prev.map((f) => (f.id === nextField.id ? nextField : f)));
        setEditingFieldId(null);
    };

    const handleDeleteField = (fieldId: string) => {
        setFields((prev) => prev.filter((f) => f.id !== fieldId));
        setFieldSets((prev) =>
            prev.map((s) => ({
                ...s,
                fieldIds: s.fieldIds.filter((id) => id !== fieldId),
                fields: (s.fields ?? []).filter((f) => f.id !== fieldId),
            })),
        );
        if (editingFieldId === fieldId) setEditingFieldId(null);
    };

    const toggleType = (type: string) => {
        setSelectedTypes((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            return next;
        });
    };

    const toggleSetFilter = (setId: string) => {
        setShowOrphans(false);
        setSelectedSetIds((prev) => {
            const next = new Set(prev);
            if (next.has(setId)) next.delete(setId); else next.add(setId);
            return next;
        });
    };

    const handleShowOrphans = () => {
        setShowOrphans((prev) => !prev);
        if (!showOrphans) setSelectedSetIds(new Set());
    };

    const toggleCnFilter = (cnId: string) => {
        setShowNoCn(false);
        setSelectedCnIds((prev) => {
            const next = new Set(prev);
            if (next.has(cnId)) next.delete(cnId); else next.add(cnId);
            return next;
        });
    };

    const handleShowNoCn = () => {
        setShowNoCn((prev) => !prev);
        if (!showNoCn) setSelectedCnIds(new Set());
    };

    const clearAllFilters = () => {
        setSearch('');
        setSelectedTypes(new Set());
        setSelectedSetIds(new Set());
        setSelectedCnIds(new Set());
        setShowNoCn(false);
        setRequiredFilter('all');
        setShowOrphans(false);
    };

    const hasActiveFilters = search || selectedTypes.size > 0 || selectedSetIds.size > 0 || selectedCnIds.size > 0 || showNoCn || requiredFilter !== 'all' || showOrphans;

    // ── render ──
    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 1.5 }}>
            {/* ── Left: Filter Sidebar ── */}
            <Card sx={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CardContent sx={{ p: 1.5, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Search */}
                    <TextField
                        fullWidth size="small"
                        placeholder="Tìm theo nhãn / key..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                                endAdornment: search ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            },
                        }}
                    />

                    {/* Type filter */}
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary"
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>
                            Kiểu dữ liệu
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {FIELD_TYPES.map((ft) => {
                                const active = selectedTypes.has(ft.value);
                                return (
                                    <Chip
                                        key={ft.value}
                                        size="small"
                                        label={ft.label}
                                        icon={<Box sx={{ display: 'flex', pl: 0.5 }}>{ft.icon}</Box> as any}
                                        onClick={() => toggleType(ft.value)}
                                        sx={{
                                            fontSize: 10, height: 22,
                                            bgcolor: active ? `${ft.color}22` : undefined,
                                            color: active ? ft.color : undefined,
                                            borderColor: active ? ft.color : undefined,
                                        }}
                                        variant={active ? 'outlined' : 'filled'}
                                    />
                                );
                            })}
                        </Box>
                    </Box>

                    <Divider />

                    {/* FieldSet filter */}
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary"
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>
                            Lọc theo bộ dữ liệu
                        </Typography>

                        {fieldSets.length > 8 && (
                            <TextField
                                fullWidth size="small"
                                placeholder="Tìm bộ..."
                                value={fsSearch}
                                onChange={(e) => setFsSearch(e.target.value)}
                                sx={{ mb: 0.5, '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }}
                            />
                        )}

                        <Box
                            onClick={handleShowOrphans}
                            sx={{
                                display: 'flex', alignItems: 'center', px: 0.5, py: 0.25,
                                borderRadius: 1, cursor: 'pointer',
                                bgcolor: showOrphans ? 'warning.main' : 'transparent',
                                color: showOrphans ? 'warning.contrastText' : 'text.secondary',
                                '&:hover': { bgcolor: showOrphans ? 'warning.dark' : 'action.hover' },
                            }}
                        >
                            <Checkbox size="small" checked={showOrphans}
                                sx={{ p: 0.25, mr: 0.5, color: 'inherit', '&.Mui-checked': { color: 'inherit' } }}
                            />
                            <Typography variant="caption" fontWeight={600} noWrap>Chưa thuộc bộ nào</Typography>
                            <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.8 }}>
                                {fields.length - assignedFieldIds.size}
                            </Typography>
                        </Box>

                        <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            {filteredSetsForFilter.map((s) => {
                                const active = selectedSetIds.has(s.id);
                                const setColor = (s as any).color ?? '#3b82f6';
                                return (
                                    <Box
                                        key={s.id}
                                        onClick={() => toggleSetFilter(s.id)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', px: 0.5, py: 0.25,
                                            borderRadius: 1, cursor: 'pointer',
                                            bgcolor: active ? `${setColor}11` : 'transparent',
                                            '&:hover': { bgcolor: active ? `${setColor}22` : 'action.hover' },
                                        }}
                                    >
                                        <Checkbox size="small" checked={active} sx={{ p: 0.25, mr: 0.5 }} />
                                        <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                            {s.name || '(chưa đặt tên)'}
                                        </Typography>
                                        <Typography variant="caption" color="text.disabled">{s.fieldIds.length}</Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>

                    <Divider />

                    {/* CN (Chuyên Ngành) filter */}
                    {allowedCnOptions.length > 0 && (
                        <Box>
                            <Typography variant="caption" fontWeight={700} color="text.secondary"
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>
                                Chuyên ngành
                            </Typography>
                            <Box
                                onClick={handleShowNoCn}
                                sx={{
                                    display: 'flex', alignItems: 'center', px: 0.5, py: 0.25,
                                    borderRadius: 1, cursor: 'pointer',
                                    bgcolor: showNoCn ? 'warning.main' : 'transparent',
                                    color: showNoCn ? 'warning.contrastText' : 'text.secondary',
                                    '&:hover': { bgcolor: showNoCn ? 'warning.dark' : 'action.hover' },
                                }}
                            >
                                <Checkbox size="small" checked={showNoCn}
                                    sx={{ p: 0.25, mr: 0.5, color: 'inherit', '&.Mui-checked': { color: 'inherit' } }}
                                />
                                <Typography variant="caption" fontWeight={600} noWrap>Chưa gán CN</Typography>
                                <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.8 }}>
                                    {fields.filter((f) => !f.cnIds || f.cnIds.length === 0).length}
                                </Typography>
                            </Box>
                            <Box sx={{ maxHeight: 140, overflowY: 'auto' }}>
                                {allowedCnOptions.map((cn) => {
                                    const active = selectedCnIds.has(cn.id);
                                    const count = fields.filter((f) => f.cnIds?.includes(cn.id)).length;
                                    return (
                                        <Box
                                            key={cn.id}
                                            onClick={() => toggleCnFilter(cn.id)}
                                            sx={{
                                                display: 'flex', alignItems: 'center', px: 0.5, py: 0.25,
                                                borderRadius: 1, cursor: 'pointer',
                                                bgcolor: active ? 'primary.50' : 'transparent',
                                                '&:hover': { bgcolor: active ? 'primary.100' : 'action.hover' },
                                            }}
                                        >
                                            <Checkbox size="small" checked={active} sx={{ p: 0.25, mr: 0.5 }} />
                                            <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                                {cn.ten}{cn.vietTat ? ` (${cn.vietTat})` : ''}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">{count}</Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

                    <Divider />

                    {/* Required filter */}
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary"
                            sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.25 }}>
                            Bắt buộc
                        </Typography>
                        <RadioGroup value={requiredFilter} onChange={(e) => setRequiredFilter(e.target.value as RequiredFilter)}>
                            {(['all', 'required', 'optional'] as const).map((v) => (
                                <FormControlLabel
                                    key={v} value={v}
                                    control={<Radio size="small" sx={{ p: 0.25 }} />}
                                    label={<Typography variant="caption">{v === 'all' ? 'Tất cả' : v === 'required' ? 'Bắt buộc' : 'Tuỳ chọn'}</Typography>}
                                    sx={{ m: 0, height: 24 }}
                                />
                            ))}
                        </RadioGroup>
                    </Box>

                    {hasActiveFilters && (
                        <Button size="small" variant="text" color="inherit" onClick={clearAllFilters}
                            sx={{ fontSize: 11, textTransform: 'none' }}>
                            Xoá bộ lọc
                        </Button>
                    )}

                    {/* Deleted fields */}
                    {deletedFields.length > 0 && (
                        <>
                            <Divider />
                            <Box>
                                <Box onClick={() => setShowDeleted(!showDeleted)}
                                    sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', py: 0.5 }}>
                                    <RestoreIcon fontSize="small" sx={{ mr: 0.5, color: 'warning.main' }} />
                                    <Typography variant="caption" fontWeight={700} color="warning.main">
                                        Đã xoá ({deletedFields.length})
                                    </Typography>
                                    <ExpandMoreIcon fontSize="small"
                                        sx={{ ml: 'auto', transform: showDeleted ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                </Box>
                                <Collapse in={showDeleted}>
                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                        {deletedFields.map((f) => (
                                            <Box key={f.id} sx={{ p: 0.75, borderRadius: 1, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography variant="caption" fontWeight={600} noWrap display="block">{f.label}</Typography>
                                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>{f.key}</Typography>
                                                </Box>
                                                <Button size="small" variant="text" sx={{ fontSize: 10, minWidth: 0 }}
                                                    onClick={() => void onRestoreField(f.id)}>
                                                    Phục hồi
                                                </Button>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Collapse>
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── Middle: Virtualized Field List ── */}
            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                {/* Toolbar */}
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                        {filteredFields.length.toLocaleString('vi')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        / {fields.length.toLocaleString('vi')} trường
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <TextField
                        select size="small" value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        sx={{ minWidth: 130, '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }}
                        label="Sắp xếp"
                    >
                        <MenuItem value="label">Nhãn (A-Z)</MenuItem>
                        <MenuItem value="key">Key (A-Z)</MenuItem>
                        <MenuItem value="type">Kiểu</MenuItem>
                    </TextField>
                    <Tooltip title="Thêm trường mới">
                        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddField}>
                            Thêm trường
                        </Button>
                    </Tooltip>
                </Box>

                {/* Virtual list */}
                <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((vRow) => {
                            const field = filteredFields[vRow.index];
                            const active = editingFieldId === field.id;
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
                                        onClick={() => setEditingFieldId(active ? null : field.id)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            px: 1.5, py: 0.75, height: ROW_HEIGHT - 1,
                                            cursor: 'pointer',
                                            borderBottom: '1px solid', borderColor: 'divider',
                                            bgcolor: active ? 'primary.50' : 'transparent',
                                            borderLeft: active ? '3px solid' : '3px solid transparent',
                                            borderLeftColor: active ? 'primary.main' : 'transparent',
                                            '&:hover': { bgcolor: active ? 'primary.50' : 'action.hover' },
                                            transition: 'background-color 0.1s',
                                        }}
                                    >
                                        <Typography variant="caption" color="text.disabled"
                                            sx={{ width: 36, textAlign: 'right', fontFamily: 'monospace' }}>
                                            {vRow.index + 1}
                                        </Typography>

                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={700} noWrap>{field.label}</Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>
                                                {field.key}
                                            </Typography>
                                        </Box>

                                        <Chip
                                            size="small"
                                            icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: meta.color }}>{meta.icon}</Box> as any}
                                            label={meta.label}
                                            sx={{ height: 20, fontSize: 10, bgcolor: `${meta.color}18`, color: meta.color }}
                                        />

                                        {field.required && (
                                            <Chip size="small" color="error" label="Bắt buộc" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                                        )}

                                        {hasValidationRules(field) && (
                                            <Chip size="small" color="success" label="Validate" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                                        )}

                                        {field.cnIds && field.cnIds.length > 0 && field.cnIds.slice(0, 3).map((cid) => {
                                            const cn = cnMap.get(cid);
                                            return (
                                                <Chip key={cid} size="small"
                                                    label={cn?.vietTat || cn?.ten || cid}
                                                    sx={{ height: 18, fontSize: 9, bgcolor: 'info.50', color: 'info.main' }}
                                                />
                                            );
                                        })}
                                        {field.cnIds && field.cnIds.length > 3 && (
                                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>
                                                +{field.cnIds.length - 3}
                                            </Typography>
                                        )}

                                        <Tooltip title="Xoá trường">
                                            <IconButton size="small"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                                                sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {filteredFields.length === 0 && (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary" mb={1}>
                                {hasActiveFilters ? 'Không có trường nào phù hợp bộ lọc.' : 'Chưa có trường dữ liệu nào.'}
                            </Typography>
                            {hasActiveFilters ? (
                                <Button size="small" onClick={clearAllFilters}>Xoá bộ lọc</Button>
                            ) : (
                                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddField}>Thêm trường đầu tiên</Button>
                            )}
                        </Box>
                    )}
                </Box>
            </Card>

            {/* ── Right: Detail Panel ── */}
            <Box sx={{ width: editingField ? 380 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease' }}>
                {editingField ? (
                    <FieldConfigPanel
                        key={editingField.id}
                        field={editingField}
                        onSave={handleSaveField}
                        onClose={() => setEditingFieldId(null)}
                        cnOptions={allowedCnOptions}
                    />
                ) : null}
            </Box>
        </Box>
    );
};

export default PageFieldLibrary;
