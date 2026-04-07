import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InventoryIcon from '@mui/icons-material/Inventory';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SearchIcon from '@mui/icons-material/Search';

import type { RootState } from '../../../store';
import type { LocalFormConfig } from '../../../types/thamSo';
import type { DanhMucTrangBiTree, TrangBiSpecializationOption } from '../../../apis/danhMucTrangBiApi';
import danhMucTrangBiApi from '../../../apis/danhMucTrangBiApi';
import type { TrangBiSelection } from '../types';
import TrangBiContextEditor from './TrangBiContextEditor';

// ─── types ────────────────────────────────────────────────────────────────────

interface CategoryInfo {
    l1: string;
    id: string;
    label: string;
    childCount: number;
}

// ─── component ────────────────────────────────────────────────────────────────

const PageTrangBiConfigs: React.FC = () => {
    const { formConfigs } = useSelector((s: RootState) => s.thamSoReducer);

    const [cnOptions, setCnOptions] = useState<TrangBiSpecializationOption[]>([]);
    const [cnLoading, setCnLoading] = useState(true);
    const [expandedCns, setExpandedCns] = useState<Set<string>>(new Set());
    const [categories, setCategories] = useState<Map<string, CategoryInfo[]>>(new Map());
    const [catLoading, setCatLoading] = useState<string | null>(null);
    const [selected, setSelected] = useState<TrangBiSelection | null>(null);
    const [search, setSearch] = useState('');

    // Load CN options
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setCnLoading(true);
            try {
                const opts = await danhMucTrangBiApi.getTrangBiSpecializationOptions();
                if (!cancelled) setCnOptions(opts);
            } catch { /* silent */ } finally {
                if (!cancelled) setCnLoading(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, []);

    // ── Config map ──

    const configMap = useMemo(() => {
        const map = new Map<string, LocalFormConfig>();
        formConfigs.forEach((fc) => {
            if (fc.key.startsWith('trangbi-')) {
                map.set(fc.key, fc);
            }
        });
        return map;
    }, [formConfigs]);

    // ── Load categories for a CN ──

    const loadCategories = useCallback(async (cn: string) => {
        if (categories.has(cn)) return;
        setCatLoading(cn);
        try {
            const rootParentId = `${cn}.0.00.00.00.00.000`;
            const children = await danhMucTrangBiApi.getTreeChildren({ parentId: rootParentId });
            const cats: CategoryInfo[] = children
                .filter((c: DanhMucTrangBiTree) => !!c.id)
                .map((c: DanhMucTrangBiTree) => {
                    const nodeId = c.id!;
                    const l1 = nodeId.split('.')[1] ?? '';
                    return {
                        l1,
                        id: nodeId,
                        label: c.tenDayDu || c.ten || nodeId,
                        childCount: c.coCapDuoi ? 1 : 0,
                    };
                });
            cats.sort((a, b) => Number(a.l1) - Number(b.l1));
            setCategories((prev) => new Map(prev).set(cn, cats));
        } catch { /* silent */ } finally {
            setCatLoading(null);
        }
    }, [categories]);

    const handleToggleCn = useCallback((cn: string) => {
        setExpandedCns((prev) => {
            const next = new Set(prev);
            if (next.has(cn)) {
                next.delete(cn);
            } else {
                next.add(cn);
                void loadCategories(cn);
            }
            return next;
        });
    }, [loadCategories]);

    const handleSelectCommon = useCallback((opt: TrangBiSpecializationOption) => {
        const cn = opt.id.toLowerCase();
        setSelected({
            cn: opt.id,
            cnLabel: opt.label,
            configKey: `trangbi-${cn}`,
            configType: 'common',
        });
    }, []);

    const handleSelectCategory = useCallback((cn: string, cnLabel: string, cat: CategoryInfo) => {
        const cnLower = cn.toLowerCase();
        setSelected({
            cn,
            cnLabel,
            l1: cat.l1,
            l1Label: cat.label,
            configKey: `trangbi-${cnLower}-${cat.l1}`,
            configType: 'category',
        });
    }, []);

    // Filter CN options by search
    const filteredCnOptions = useMemo(() => {
        if (!search.trim()) return cnOptions;
        const q = search.toLowerCase();
        return cnOptions.filter((opt) =>
            opt.id.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q),
        );
    }, [cnOptions, search]);

    const configuredCount = useMemo(
        () => cnOptions.filter((opt) => configMap.has(`trangbi-${opt.id.toLowerCase()}`)).length,
        [cnOptions, configMap],
    );

    if (cnLoading) {
        return (
            <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
            gap: 1.5,
            height: '100%',
            overflow: 'hidden',
        }}>
            {/* ═══ Left: CN Navigator ═══ */}
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <CardContent sx={{ p: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <InventoryIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        <Typography variant="subtitle2" fontWeight={700}>Chuyên ngành</Typography>
                        <Chip
                            size="small"
                            label={`${configuredCount}/${cnOptions.length}`}
                            color={configuredCount === cnOptions.length ? 'success' : 'warning'}
                            sx={{ height: 20, fontSize: 11 }}
                        />
                    </Stack>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Tìm CN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                sx: { fontSize: 13 },
                            },
                        }}
                    />
                </CardContent>
                <Box sx={{ flex: 1, overflow: 'auto', p: 0.5 }}>
                    {filteredCnOptions.map((opt) => {
                        const isExpanded = expandedCns.has(opt.id);
                        const cnCats = categories.get(opt.id) ?? [];
                        const hasCommonConfig = configMap.has(`trangbi-${opt.id.toLowerCase()}`);
const isCommonSelected = selected?.configKey === `trangbi-${opt.id.toLowerCase()}`;

                        return (
                            <Box key={opt.id} sx={{ mb: 0.25 }}>
                                {/* CN header row */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1.5,
                                        cursor: 'pointer',
                                        bgcolor: isCommonSelected ? 'primary.main' : 'transparent',
                                        color: isCommonSelected ? 'primary.contrastText' : 'text.primary',
                                        '&:hover': { bgcolor: isCommonSelected ? 'primary.main' : 'action.hover' },
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={(e) => { e.stopPropagation(); handleToggleCn(opt.id); }}
                                        sx={{ mr: 0.5, p: 0.25, color: isCommonSelected ? 'inherit' : undefined }}
                                    >
                                        {isExpanded
                                            ? <ExpandLessIcon sx={{ fontSize: 16 }} />
                                            : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                                    </IconButton>
                                    <Box
                                        sx={{ flex: 1, minWidth: 0 }}
                                        onClick={() => handleSelectCommon(opt)}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={0.5}>
                                            <Typography variant="body2" fontWeight={700} fontFamily="monospace" sx={{ fontSize: 12 }}>
                                                {opt.id}
                                            </Typography>
                                            <Typography variant="body2" noWrap sx={{ fontSize: 12, flex: 1 }}>
                                                {opt.label}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                    {hasCommonConfig ? (
                                        <CheckCircleIcon sx={{ fontSize: 14, color: isCommonSelected ? 'inherit' : 'success.main', ml: 0.5 }} />
                                    ) : (
                                        <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: isCommonSelected ? 'inherit' : 'text.disabled', ml: 0.5 }} />
                                    )}
                                </Box>

                                {/* Expanded: L1 categories */}
                                <Collapse in={isExpanded} timeout="auto">
                                    {catLoading === opt.id && cnCats.length === 0 ? (
                                        <Box display="flex" justifyContent="center" py={1}>
                                            <CircularProgress size={16} />
                                        </Box>
                                    ) : (
                                        <Box sx={{ pl: 2 }}>
                                            {cnCats.map((cat) => {
                                                const catKey = `trangbi-${opt.id.toLowerCase()}-${cat.l1}`;
                                                const hasCatConfig = configMap.has(catKey);
                                                const isCatSelected = selected?.configKey === catKey.toLowerCase();

                                                return (
                                                    <Box
                                                        key={cat.id}
                                                        onClick={() => handleSelectCategory(opt.id, opt.label, cat)}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            px: 1,
                                                            py: 0.375,
                                                            borderRadius: 1,
                                                            cursor: 'pointer',
                                                            bgcolor: isCatSelected ? 'secondary.main' : 'transparent',
                                                            color: isCatSelected ? 'secondary.contrastText' : 'text.secondary',
                                                            '&:hover': { bgcolor: isCatSelected ? 'secondary.main' : 'action.hover' },
                                                        }}
                                                    >
                                                        <Typography variant="caption" fontFamily="monospace"
                                                            sx={{ mr: 0.75, fontSize: 11, minWidth: 24 }}>
                                                            .{cat.l1}
                                                        </Typography>
                                                        <Typography variant="caption" noWrap sx={{ flex: 1, fontSize: 11 }}>
                                                            {cat.label}
                                                        </Typography>
                                                        {hasCatConfig ? (
                                                            <CheckCircleIcon sx={{ fontSize: 12, color: isCatSelected ? 'inherit' : 'success.main', ml: 0.5 }} />
                                                        ) : (
                                                            <RadioButtonUncheckedIcon sx={{ fontSize: 12, color: isCatSelected ? 'inherit' : 'text.disabled', ml: 0.5 }} />
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Collapse>
                            </Box>
                        );
                    })}
                </Box>
            </Card>

            {/* ═══ Right: Context Editor ═══ */}
            {selected ? (
                <TrangBiContextEditor key={selected.configKey} selection={selected} />
            ) : (
                <Card sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Stack alignItems="center" spacing={1.5}>
                        <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                        <Typography color="text.secondary">Chọn một chuyên ngành ở bên trái</Typography>
                        <Typography variant="caption" color="text.disabled" textAlign="center">
                            Nhấn vào tên CN để xem <strong>Thông số chung</strong> · Mở rộng để chọn <strong>Thông số KT riêng</strong> theo nhóm danh mục
                        </Typography>
                    </Stack>
                </Card>
            )}
        </Box>
    );
};

export default PageTrangBiConfigs;
