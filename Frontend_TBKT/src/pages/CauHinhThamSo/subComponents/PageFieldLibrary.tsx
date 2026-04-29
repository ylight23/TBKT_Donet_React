
import React, { Profiler, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InventoryIcon from '@mui/icons-material/Inventory';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import { LocalDynamicField as DynamicField } from '../../../types/thamSo';
import { FieldSet } from '../types';
import { FIELD_TYPES } from '../constants';
import { hasValidationRules, typeOf } from '../utils';
import FieldConfigPanel from './FieldConfigPanel';
import { listDanhMucChuyenNganh, DanhMucChuyenNganhOption } from '../../../apis/danhmucChuyenNganhApi';
import type { RootState } from '../../../store';
import { getStripedHoverBackground, getStripedRowBackground } from '../../../utils/stripedSurface';

const ROW_HEIGHT = 52;
const FILTER_ROW_HEIGHT = 28;
const OVERSCAN = 16;
const QUICK_CATEGORY_FIELD_PRESETS: DynamicField[] = [
    {
        id: '',
        key: 'ma_danh_muc',
        label: 'Mã danh mục trang bị',
        type: 'select',
        required: false,
        disabled: false,
        validation: {
            dataSource: 'api',
            apiUrl: '/DanhMucTrangBi.DanhMucTrangBiService/GetListTree',
            displayType: 'tree',
        },
    },
    {
        id: '',
        key: 'ten_danh_muc',
        label: 'Tên danh mục trang bị',
        type: 'text',
        required: false,
        disabled: true,
        validation: {},
    },
    {
        id: '',
        key: 'id_cap_tren',
        label: 'Mã cấp trên',
        type: 'text',
        required: false,
        disabled: true,
        validation: {},
    },
];

type SortKey = 'label' | 'key' | 'type';
type RequiredFilter = 'all' | 'required' | 'optional';

interface PageFieldLibraryProps {
    fields: DynamicField[];
    deletedFields: DynamicField[];
    onRestoreField: (id: string) => void | Promise<void>;
    onHardDeleteField: (id: string) => void | Promise<void>;
    setFields: React.Dispatch<React.SetStateAction<DynamicField[]>>;
    fieldSets: FieldSet[];
    setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
}

interface FieldLibraryRowProps {
    field: DynamicField;
    index: number;
    start: number;
    active: boolean;
    cnMap: Map<string, DanhMucChuyenNganhOption>;
    onToggle: (fieldId: string) => void;
    onDelete: (fieldId: string) => void;
}

const FieldLibraryRow = React.memo(({ field, index, start, active, cnMap, onToggle, onDelete }: FieldLibraryRowProps) => {
    const theme = useTheme();
    const meta = typeOf(field.type);

    return (
        <Box style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${start}px)` }}>
            <Box
                onClick={() => onToggle(field.id)}
                sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, height: ROW_HEIGHT - 1,
                    cursor: 'pointer', borderBottom: '1px solid', borderColor: 'divider',
                    bgcolor: active ? 'primary.50' : getStripedRowBackground(theme, index),
                    borderLeft: active ? '3px solid' : '3px solid transparent',
                    borderLeftColor: active ? 'primary.main' : 'transparent',
                    '&:hover': { bgcolor: active ? 'primary.50' : getStripedHoverBackground(theme) },
                    transition: 'background-color 0.1s',
                }}
            >
                <Typography variant="caption" color="text.disabled" sx={{ width: 36, textAlign: 'right', fontFamily: 'inherit' }}>
                    {index + 1}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{field.label}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'inherit' }}>{field.key}</Typography>
                </Box>
                <Chip size="small" icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: meta.color }}>{meta.icon}</Box> as any} label={meta.label} sx={{ height: 20, fontSize: 10, bgcolor: `${meta.color}18`, color: meta.color }} />
                {field.required && <Chip size="small" color="error" label="Bat buoc" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
                {hasValidationRules(field) && <Chip size="small" color="success" label="Validate" variant="outlined" sx={{ height: 20, fontSize: 10 }} />}
                {field.cnIds && field.cnIds.length > 0 && field.cnIds.slice(0, 3).map((cid) => {
                    const cn = cnMap.get(cid);
                    return <Chip key={cid} size="small" label={cn?.vietTat || cn?.ten || cid} sx={{ height: 18, fontSize: 9, bgcolor: 'info.50', color: 'info.main' }} />;
                })}
                {field.cnIds && field.cnIds.length > 3 && <Typography variant="caption" color="text.disabled" sx={{ fontSize: 9 }}>+{field.cnIds.length - 3}</Typography>}
                <Tooltip title="Xoa truong">
                    <IconButton size="small" onClick={(event) => { event.stopPropagation(); onDelete(field.id); }} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
});

FieldLibraryRow.displayName = 'FieldLibraryRow';

const shouldLogProfiler = import.meta.env.DEV;

const handleProfilerRender = (
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
) => {
    if (!shouldLogProfiler || actualDuration < 8) {
        return;
    }

    console.info(`[PERF][CauHinhThamSo][${id}]`, {
        phase,
        actualDurationMs: Number(actualDuration.toFixed(2)),
        baseDurationMs: Number(baseDuration.toFixed(2)),
    });
};

const PageFieldLibrary: React.FC<PageFieldLibraryProps> = ({ fields, deletedFields, onRestoreField, onHardDeleteField, setFields, fieldSets, setFieldSets }) => {
    const theme = useTheme();
    const visibleCNs = useSelector((state: RootState) => state.permissionReducer.visibleCNs);
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
    const [editableKeyIds, setEditableKeyIds] = useState<Set<string>>(new Set());
    const [showDeleted, setShowDeleted] = useState(false);
    const [fsSearch, setFsSearch] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const setFilterScrollRef = useRef<HTMLDivElement>(null);
    const cnFilterScrollRef = useRef<HTMLDivElement>(null);
    const deferredSearch = useDeferredValue(search);
    const deferredFsSearch = useDeferredValue(fsSearch);

    useEffect(() => { listDanhMucChuyenNganh().then(setCnOptions).catch(() => {}); }, []);

    const cnMap = useMemo(() => {
        const map = new Map<string, DanhMucChuyenNganhOption>();
        for (const cn of cnOptions) map.set(cn.id, cn);
        return map;
    }, [cnOptions]);
    const visibleCnSet = useMemo(() => new Set(visibleCNs), [visibleCNs]);
    const allowedCnOptions = useMemo(() => (visibleCNs.length === 0 ? cnOptions : cnOptions.filter((cn) => visibleCnSet.has(cn.id))), [cnOptions, visibleCNs.length, visibleCnSet]);
    const noCnCount = useMemo(() => fields.reduce((count, field) => count + ((!field.cnIds || field.cnIds.length === 0) ? 1 : 0), 0), [fields]);
    const cnFieldCountMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const field of fields) {
            for (const cnId of field.cnIds ?? []) map.set(cnId, (map.get(cnId) ?? 0) + 1);
        }
        return map;
    }, [fields]);
    const fieldToSetIds = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const fieldSet of fieldSets) {
            for (const fieldId of fieldSet.fieldIds) {
                if (!map.has(fieldId)) map.set(fieldId, new Set());
                map.get(fieldId)?.add(fieldSet.id);
            }
        }
        return map;
    }, [fieldSets]);
    const assignedFieldIds = useMemo(() => new Set(fieldToSetIds.keys()), [fieldToSetIds]);
    const fieldMap = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
    const editingField = editingFieldId ? fieldMap.get(editingFieldId) : undefined;

    const filteredFields = useMemo(() => {
        const lowerSearch = deferredSearch.toLowerCase().trim();
        const next = fields.filter((field) => {
            if (lowerSearch && !field.label.toLowerCase().includes(lowerSearch) && !field.key.toLowerCase().includes(lowerSearch)) return false;
            if (selectedTypes.size > 0 && !selectedTypes.has(field.type)) return false;
            if (requiredFilter === 'required' && !field.required) return false;
            if (requiredFilter === 'optional' && field.required) return false;
            if (visibleCnSet.size > 0 && field.cnIds && field.cnIds.length > 0 && !field.cnIds.some((cnId) => visibleCnSet.has(cnId))) return false;
            if (showOrphans) {
                if (assignedFieldIds.has(field.id)) return false;
            } else if (selectedSetIds.size > 0) {
                const setIds = fieldToSetIds.get(field.id);
                if (!setIds) return false;
                let matched = false;
                for (const selectedId of selectedSetIds) {
                    if (setIds.has(selectedId)) { matched = true; break; }
                }
                if (!matched) return false;
            }
            if (showNoCn) {
                if (field.cnIds && field.cnIds.length > 0) return false;
            } else if (selectedCnIds.size > 0) {
                if (!field.cnIds || field.cnIds.length === 0) return false;
                let matchedCn = false;
                for (const selectedCnId of selectedCnIds) {
                    if (field.cnIds.includes(selectedCnId)) { matchedCn = true; break; }
                }
                if (!matchedCn) return false;
            }
            return true;
        });
        next.sort((a, b) => {
            if (sortKey === 'label') return a.label.localeCompare(b.label, 'vi');
            if (sortKey === 'key') return a.key.localeCompare(b.key);
            return a.type.localeCompare(b.type);
        });
        return next;
    }, [assignedFieldIds, deferredSearch, fieldToSetIds, fields, requiredFilter, selectedCnIds, selectedSetIds, selectedTypes, showNoCn, showOrphans, sortKey, visibleCnSet]);

    const filteredSetsForFilter = useMemo(() => {
        const lower = deferredFsSearch.toLowerCase().trim();
        if (!lower) return fieldSets;
        return fieldSets.filter((fieldSet) => fieldSet.name.toLowerCase().includes(lower));
    }, [deferredFsSearch, fieldSets]);

    const virtualizer = useVirtualizer({ count: filteredFields.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_HEIGHT, overscan: OVERSCAN });
    const fieldSetFilterVirtualizer = useVirtualizer({
        count: filteredSetsForFilter.length,
        getScrollElement: () => setFilterScrollRef.current,
        estimateSize: () => FILTER_ROW_HEIGHT,
        overscan: 10,
    });
    const cnFilterVirtualizer = useVirtualizer({
        count: allowedCnOptions.length,
        getScrollElement: () => cnFilterScrollRef.current,
        estimateSize: () => FILTER_ROW_HEIGHT,
        overscan: 10,
    });

    const handleAddField = useCallback(() => {
        const id = `field_${Math.random().toString(36).slice(2, 9)}`;
        setFields((prev) => [...prev, {
            id,
            key: '',
            label: 'Truong moi',
            type: 'text',
            required: false,
            validation: {},
            gridUserConfig: { showInGrid: false, displayOrder: 9999 },
            gridTechConfig: { renderType: 'text', widthPreset: 'medium', sortable: true, filterable: true },
        }]);
        setEditableKeyIds((prev) => { const next = new Set(prev); next.add(id); return next; });
        setEditingFieldId(id);
    }, [setFields]);
    const handleQuickAddCategoryFieldBundle = useCallback(() => {
        let nextEditingFieldId: string | null = null;

        setFields((prev) => {
            const existingKeyMap = new Map(prev.map((field) => [field.key.trim().toLowerCase(), field]));
            const additions: DynamicField[] = [];

            for (const preset of QUICK_CATEGORY_FIELD_PRESETS) {
                const existing = existingKeyMap.get(preset.key);
                if (existing) {
                    if (!nextEditingFieldId) {
                        nextEditingFieldId = existing.id;
                    }
                    continue;
                }

                const id = `field_${Math.random().toString(36).slice(2, 9)}`;
                additions.push({
                    ...preset,
                    id,
                    validation: { ...preset.validation },
                });

                if (!nextEditingFieldId) {
                    nextEditingFieldId = id;
                }
            }

            if (additions.length === 0) {
                return prev;
            }

            return [...prev, ...additions];
        });

        if (nextEditingFieldId) {
            setEditingFieldId(nextEditingFieldId);
        }
    }, [setFields]);
    const handleSaveField = useCallback((nextField: DynamicField) => {
        setFields((prev) => prev.map((field) => (field.id === nextField.id ? nextField : field)));
        setEditableKeyIds((prev) => { if (!prev.has(nextField.id)) return prev; const next = new Set(prev); next.delete(nextField.id); return next; });
        setEditingFieldId(null);
    }, [setFields]);
    const handleDeleteField = useCallback((fieldId: string) => {
        setFields((prev) => prev.filter((field) => field.id !== fieldId));
        setEditableKeyIds((prev) => { if (!prev.has(fieldId)) return prev; const next = new Set(prev); next.delete(fieldId); return next; });
        setFieldSets((prev) => prev.map((fieldSet) => ({ ...fieldSet, fieldIds: fieldSet.fieldIds.filter((id) => id !== fieldId), fields: (fieldSet.fields ?? []).filter((field) => field.id !== fieldId) })));
        setEditingFieldId((prev) => (prev === fieldId ? null : prev));
    }, [setFields, setFieldSets]);
    const handleToggleEditingField = useCallback((fieldId: string) => { setEditingFieldId((prev) => (prev === fieldId ? null : fieldId)); }, []);
    const toggleType = useCallback((type: string) => { setSelectedTypes((prev) => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; }); }, []);
    const toggleSetFilter = useCallback((setId: string) => { setShowOrphans(false); setSelectedSetIds((prev) => { const next = new Set(prev); if (next.has(setId)) next.delete(setId); else next.add(setId); return next; }); }, []);
    const handleShowOrphans = useCallback(() => { setShowOrphans((prev) => !prev); if (!showOrphans) setSelectedSetIds(new Set()); }, [showOrphans]);
    const toggleCnFilter = useCallback((cnId: string) => { setShowNoCn(false); setSelectedCnIds((prev) => { const next = new Set(prev); if (next.has(cnId)) next.delete(cnId); else next.add(cnId); return next; }); }, []);
    const handleShowNoCn = useCallback(() => { setShowNoCn((prev) => !prev); if (!showNoCn) setSelectedCnIds(new Set()); }, [showNoCn]);
    const clearAllFilters = useCallback(() => { setSearch(''); setSelectedTypes(new Set()); setSelectedSetIds(new Set()); setSelectedCnIds(new Set()); setShowNoCn(false); setRequiredFilter('all'); setShowOrphans(false); }, []);
    const hasActiveFilters = Boolean(search || selectedTypes.size > 0 || selectedSetIds.size > 0 || selectedCnIds.size > 0 || showNoCn || requiredFilter !== 'all' || showOrphans);

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden', gap: 1.5 }}>
            <Card sx={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CardContent sx={{ p: 1.5, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField fullWidth size="small" placeholder="Tim theo nhan / key..." value={search} onChange={(event) => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>, endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : undefined } }} />

                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>Kieu du lieu</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {FIELD_TYPES.map((fieldType) => {
                                const active = selectedTypes.has(fieldType.value);
                                return <Chip key={fieldType.value} size="small" label={fieldType.label} icon={<Box sx={{ display: 'flex', pl: 0.5 }}>{fieldType.icon}</Box> as any} onClick={() => toggleType(fieldType.value)} sx={{ fontSize: 10, height: 22, bgcolor: active ? `${fieldType.color}22` : undefined, color: active ? fieldType.color : undefined, borderColor: active ? fieldType.color : undefined }} variant={active ? 'outlined' : 'filled'} />;
                            })}
                        </Box>
                    </Box>

                    <Divider />
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>Loc theo bo du lieu</Typography>
                        {fieldSets.length > 8 && <TextField fullWidth size="small" placeholder="Tim bo..." value={fsSearch} onChange={(event) => setFsSearch(event.target.value)} sx={{ mb: 0.5, '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }} />}
                        <Box onClick={handleShowOrphans} sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.25, borderRadius: 1, cursor: 'pointer', bgcolor: showOrphans ? 'warning.main' : 'transparent', color: showOrphans ? 'warning.contrastText' : 'text.secondary', '&:hover': { bgcolor: showOrphans ? 'warning.dark' : 'action.hover' } }}>
                            <Checkbox size="small" checked={showOrphans} sx={{ p: 0.25, mr: 0.5, color: 'inherit', '&.Mui-checked': { color: 'inherit' } }} />
                            <Typography variant="caption" fontWeight={600} noWrap>Chua thuoc bo nao</Typography>
                            <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.8 }}>{fields.length - assignedFieldIds.size}</Typography>
                        </Box>
                        <Box ref={setFilterScrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                            <Box sx={{ height: fieldSetFilterVirtualizer.getTotalSize(), position: 'relative' }}>
                                {fieldSetFilterVirtualizer.getVirtualItems().map((vRow) => {
                                    const fieldSet = filteredSetsForFilter[vRow.index];
                                    const active = selectedSetIds.has(fieldSet.id);
                                    const setColor = fieldSet.color ?? '#3b82f6';
                                    return (
                                        <Box
                                            key={fieldSet.id}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${vRow.start}px)`,
                                            }}
                                        >
                                            <Box onClick={() => toggleSetFilter(fieldSet.id)} sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.25, borderRadius: 1, cursor: 'pointer', bgcolor: active ? `${setColor}11` : 'transparent', '&:hover': { bgcolor: active ? `${setColor}22` : 'action.hover' } }}>
                                                <Checkbox size="small" checked={active} sx={{ p: 0.25, mr: 0.5 }} />
                                                <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>{fieldSet.name || '(chua dat ten)'}</Typography>
                                                <Typography variant="caption" color="text.disabled">{fieldSet.fieldIds.length}</Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>

                    <Divider />
                    {allowedCnOptions.length > 0 && <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.5 }}>Chuyen nganh</Typography>
                        <Box onClick={handleShowNoCn} sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.25, borderRadius: 1, cursor: 'pointer', bgcolor: showNoCn ? 'warning.main' : 'transparent', color: showNoCn ? 'warning.contrastText' : 'text.secondary', '&:hover': { bgcolor: showNoCn ? 'warning.dark' : 'action.hover' } }}>
                            <Checkbox size="small" checked={showNoCn} sx={{ p: 0.25, mr: 0.5, color: 'inherit', '&.Mui-checked': { color: 'inherit' } }} />
                            <Typography variant="caption" fontWeight={600} noWrap>Chua gan CN</Typography>
                            <Typography variant="caption" sx={{ ml: 'auto', opacity: 0.8 }}>{noCnCount}</Typography>
                        </Box>
                        <Box ref={cnFilterScrollRef} sx={{ maxHeight: 140, overflowY: 'auto' }}>
                            <Box sx={{ height: cnFilterVirtualizer.getTotalSize(), position: 'relative' }}>
                                {cnFilterVirtualizer.getVirtualItems().map((vRow) => {
                                    const cn = allowedCnOptions[vRow.index];
                                    const active = selectedCnIds.has(cn.id);
                                    const count = cnFieldCountMap.get(cn.id) ?? 0;
                                    return (
                                        <Box
                                            key={cn.id}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${vRow.start}px)`,
                                            }}
                                        >
                                            <Box onClick={() => toggleCnFilter(cn.id)} sx={{ display: 'flex', alignItems: 'center', px: 0.5, py: 0.25, borderRadius: 1, cursor: 'pointer', bgcolor: active ? 'primary.50' : getStripedRowBackground(theme, cn.id.charCodeAt(0)), '&:hover': { bgcolor: active ? 'primary.100' : getStripedHoverBackground(theme) } }}>
                                                <Checkbox size="small" checked={active} sx={{ p: 0.25, mr: 0.5 }} />
                                                <Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>{cn.ten}{cn.vietTat ? ` (${cn.vietTat})` : ''}</Typography>
                                                <Typography variant="caption" color="text.disabled">{count}</Typography>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>}

                    <Divider />
                    <Box>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', mb: 0.25 }}>Bat buoc</Typography>
                        <RadioGroup value={requiredFilter} onChange={(event) => setRequiredFilter(event.target.value as RequiredFilter)}>
                            {(['all', 'required', 'optional'] as const).map((value) => <FormControlLabel key={value} value={value} control={<Radio size="small" sx={{ p: 0.25 }} />} label={<Typography variant="caption">{value === 'all' ? 'Tat ca' : value === 'required' ? 'Bat buoc' : 'Tuy chon'}</Typography>} sx={{ m: 0, height: 24 }} />)}
                        </RadioGroup>
                    </Box>
                    {hasActiveFilters && <Button size="small" variant="text" color="inherit" onClick={clearAllFilters} sx={{ fontSize: 11, textTransform: 'none' }}>Xoa bo loc</Button>}
                    {deletedFields.length > 0 && <><Divider /><Box><Box onClick={() => setShowDeleted(!showDeleted)} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', py: 0.5 }}><RestoreIcon fontSize="small" sx={{ mr: 0.5, color: 'warning.main' }} /><Typography variant="caption" fontWeight={700} color="warning.main">Da xoa ({deletedFields.length})</Typography><ExpandMoreIcon fontSize="small" sx={{ ml: 'auto', transform: showDeleted ? 'rotate(180deg)' : 'none', transition: '0.2s' }} /></Box><Collapse in={showDeleted}><Stack spacing={0.5} sx={{ mt: 0.5 }}>{deletedFields.map((field) => <Box key={field.id} sx={{ p: 0.75, borderRadius: 1, border: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center' }}><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="caption" fontWeight={600} noWrap display="block">{field.label}</Typography><Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'inherit' }}>{field.key}</Typography></Box><Button size="small" variant="text" sx={{ fontSize: 10, minWidth: 0 }} onClick={() => void onRestoreField(field.id)}>Phuc hoi</Button><Tooltip title="Xoa vinh vien"><IconButton size="small" color="error" onClick={() => void onHardDeleteField(field.id)}><WarningAmberIcon fontSize="small" /></IconButton></Tooltip></Box>)}</Stack></Collapse></Box></>}
                </CardContent>
            </Card>

            <Profiler id="FieldLibraryList" onRender={handleProfilerRender}>
            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={800}>{filteredFields.length.toLocaleString('vi')}</Typography>
                    <Typography variant="caption" color="text.secondary">/ {fields.length.toLocaleString('vi')} truong</Typography>
                    <Box sx={{ flex: 1 }} />
                    <TextField select size="small" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} sx={{ minWidth: 130, '& .MuiInputBase-input': { fontSize: 12, py: 0.5 } }} label="Sap xep">
                        <MenuItem value="label">Nhan (A-Z)</MenuItem>
                        <MenuItem value="key">Key (A-Z)</MenuItem>
                        <MenuItem value="type">Kieu</MenuItem>
                    </TextField>
                    <Tooltip title="Tạo nhanh bộ 3 field: mã danh mục, tên danh mục, mã cấp trên">
                        <Button variant="outlined" size="small" startIcon={<InventoryIcon fontSize="small" />} onClick={handleQuickAddCategoryFieldBundle}>
                            Bo 3 danh muc
                        </Button>
                    </Tooltip>
                    <Tooltip title="Them truong moi"><Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddField}>Them truong</Button></Tooltip>
                </Box>
                <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((vRow) => {
                            const field = filteredFields[vRow.index];
                            return <FieldLibraryRow key={vRow.key} field={field} index={vRow.index} start={vRow.start} active={editingFieldId === field.id} cnMap={cnMap} onToggle={handleToggleEditingField} onDelete={handleDeleteField} />;
                        })}
                    </Box>
                    {filteredFields.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary" mb={1}>{hasActiveFilters ? 'Khong co truong nao phu hop bo loc.' : 'Chua co truong du lieu nao.'}</Typography>{hasActiveFilters ? <Button size="small" onClick={clearAllFilters}>Xoa bo loc</Button> : <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddField}>Them truong dau tien</Button>}</Box>}
                </Box>
            </Card>
            </Profiler>

            <Box sx={{ width: editingField ? 380 : 0, flexShrink: 0, overflow: 'hidden', transition: 'width 0.2s ease' }}>
                <Profiler id="FieldConfigPanel" onRender={handleProfilerRender}>
                    {editingField ? <FieldConfigPanel key={editingField.id} field={editingField} onSave={handleSaveField} onClose={() => setEditingFieldId(null)} cnOptions={allowedCnOptions} keyEditable={editableKeyIds.has(editingField.id)} /> : null}
                </Profiler>
            </Box>
        </Box>
    );
};

export default PageFieldLibrary;
