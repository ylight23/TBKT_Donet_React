import React, { useEffect, useMemo, useState, useCallback, useRef, useDeferredValue } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { alpha, useTheme } from '@mui/material/styles';
import { getStripedHoverBackground, getStripedRowBackground } from '../../../utils/stripedSurface';

import officeApi from '../../../apis/officeApi';
import { listDanhMucChuyenNganh } from '../../../apis/danhmucChuyenNganhApi';
import type {
    ChuyenNganhDocScope,
    GroupScopeConfig,
    PermissionAction,
    PhamViChuyenNganhConfig,
    Role,
    ScopeType,
} from '../../../types/permission';
import { SCOPE_TYPES, ALL_SCOPE_TYPES } from '../data/permissionData';

type OfficeOption = {
    id: string;
    label: string;
    parentId: string;
    path: string;
    depth: number;
};

type ChuyenNganhOption = {
    id: string;
    label: string;
    color: string;
};

const ACTIONS_ALL: PermissionAction[] = ['view', 'add', 'edit', 'delete', 'approve', 'unapprove', 'download', 'print'];
const ACTIONS_OWN_FULL: PermissionAction[] = [...ACTIONS_ALL];
const ACTIONS_CROSS_DEFAULT: PermissionAction[] = ['view', 'download'];
const BLOCKED_CROSS_ACTIONS = new Set<PermissionAction>(['delete', 'approve', 'unapprove']);

const ACTION_LABELS: Record<PermissionAction, string> = {
    view: 'Xem',
    add: 'Them',
    edit: 'Sua',
    delete: 'Xoa',
    approve: 'Duyet',
    unapprove: 'Huy duyet',
    download: 'Tai',
    print: 'In',
};

const DEFAULT_SCOPE_CONFIG: GroupScopeConfig = {
    scopeType: 'SUBTREE',
    anchorNodeId: '',
    multiNodeIds: [],
    duocTruyCap: true,
    phamViChuyenNganh: undefined,
};

function toPath(id?: string): string {
    return id ? `/${id.replace(/\./g, '/')}/` : '/';
}

function toDepth(id?: string): number {
    return id ? id.split('.').length : 0;
}

function getMode(scopeType: ScopeType) {
    const scope = ALL_SCOPE_TYPES.find((item) => item.value === scopeType) ?? SCOPE_TYPES[0];
    return {
        ...scope,
        needsAnchor: ['NODE_ONLY', 'NODE_AND_CHILDREN', 'SUBTREE', 'SIBLINGS', 'BRANCH', 'DELEGATED'].includes(scopeType),
        needsMultiNode: scopeType === 'MULTI_NODE',
    };
}

function sanitizeActions(actions: PermissionAction[], isOwn: boolean): PermissionAction[] {
    if (isOwn) return [...ACTIONS_OWN_FULL];
    const set = new Set(actions.filter((action) => !BLOCKED_CROSS_ACTIONS.has(action)));
    if (set.size === 0) ACTIONS_CROSS_DEFAULT.forEach((action) => set.add(action));
    return ACTIONS_ALL.filter((action) => set.has(action));
}

function normalizePhamVi(
    phamVi: PhamViChuyenNganhConfig | undefined,
    chuyenNganhOptions: ChuyenNganhOption[],
): PhamViChuyenNganhConfig | undefined {
    if (!phamVi) return undefined;
    if (!chuyenNganhOptions.length && !phamVi) return undefined;
    const entries = [...(phamVi?.idChuyenNganhDoc ?? [])];
    const ownId = phamVi?.idChuyenNganh?.trim()
        || entries[0]?.id
        || '';
    const ownEntry = entries.find((entry) => entry.id === ownId);
    if (!ownId) return undefined;
    const normalized: ChuyenNganhDocScope[] = [
        { id: ownId, actions: sanitizeActions(ownEntry?.actions ?? ACTIONS_OWN_FULL, true) },
    ];
    const seen = new Set<string>([ownId]);
    for (const entry of entries) {
        if (!entry.id || seen.has(entry.id)) continue;
        seen.add(entry.id);
        normalized.push({ id: entry.id, actions: sanitizeActions(entry.actions, false) });
    }
    return { idChuyenNganh: ownId, idChuyenNganhDoc: normalized };
}

function getAffectedOffices(offices: OfficeOption[], scope: GroupScopeConfig): OfficeOption[] {
    const anchor = offices.find((item) => item.id === scope.anchorNodeId);
    switch (scope.scopeType) {
        case 'NODE_ONLY':
            return anchor ? [anchor] : [];
        case 'NODE_AND_CHILDREN':
            return anchor ? offices.filter((item) => item.id === anchor.id || item.parentId === anchor.id) : [];
        case 'SUBTREE':
        case 'DELEGATED':
            return anchor ? offices.filter((item) => item.id === anchor.id || item.path.startsWith(anchor.path)) : [];
        case 'SIBLINGS':
            return anchor ? offices.filter((item) => item.parentId === anchor.parentId && item.depth === anchor.depth) : [];
        case 'BRANCH':
            return anchor
                ? anchor.id.split('.').map((_, idx, parts) => parts.slice(0, idx + 1).join('.'))
                    .map((id) => offices.find((item) => item.id === id))
                    .filter((item): item is OfficeOption => Boolean(item))
                : [];
        case 'MULTI_NODE':
            return offices.filter((item) => scope.multiNodeIds.some((nodeId) => item.id === nodeId || item.path.startsWith(toPath(nodeId))));
        default:
            return [];
    }
}

function buildQuery(
    scope: GroupScopeConfig,
    offices: OfficeOption[],
    phamVi: PhamViChuyenNganhConfig | undefined,
    cnMap: Map<string, ChuyenNganhOption>,
): string[] {
    const anchor = offices.find((item) => item.id === scope.anchorNodeId);
    const parent = anchor ? offices.find((item) => item.id === anchor.parentId) : undefined;
    const unitQuery = (() => {
        switch (scope.scopeType) {
            case 'SELF': return 'WHERE CreatedBy = @userId';
            case 'NODE_ONLY': return `WHERE IDDonVi = '${scope.anchorNodeId || '?'}'`;
            case 'NODE_AND_CHILDREN': return `WHERE IDDonVi = '${scope.anchorNodeId || '?'}' OR IDCapTren = '${scope.anchorNodeId || '?'}'`;
            case 'SUBTREE': return `WHERE IDDonVi LIKE '${scope.anchorNodeId || '?'}%'`;
            case 'SIBLINGS': return `WHERE IDCapTren = '${parent?.id || '?'}' AND Depth = ${anchor?.depth ?? '?'}`;
            case 'BRANCH': return anchor ? `WHERE IDDonVi IN (${anchor.id.split('.').map((_, idx, parts) => `'${parts.slice(0, idx + 1).join('.')}'`).join(', ')})` : 'WHERE IDDonVi IN (?)';
            case 'MULTI_NODE': return scope.multiNodeIds.length > 0 ? `WHERE ${scope.multiNodeIds.map((id) => `IDDonVi LIKE '${id}%'`).join(' OR ')}` : 'WHERE IDDonVi LIKE ?';
            case 'ALL': return '-- Khong ap WHERE IDDonVi';
            case 'DELEGATED': return `WHERE IDDonVi LIKE '${scope.anchorNodeId || '?'}%'`;
            default: return '-- Khong ap WHERE IDDonVi';
        }
    })();

    const cnIds = phamVi?.idChuyenNganhDoc.map((item) => item.id) ?? [];
    const cnQuery = cnIds.length > 0
        ? `AND IDChuyenNganh IN [${cnIds.map((id) => `'${id}'`).join(', ')}]`
        : '-- Khong loc chuyen nganh (toan bo du lieu trong don vi)';
    const own = phamVi?.idChuyenNganhDoc.find((item) => item.id === phamVi.idChuyenNganh);
    const ownText = own ? `Actions(Chuyen nganh goc ${cnMap.get(own.id)?.label || own.id}): ${own.actions.join(', ')}` : '-- Chua cau hinh actions Chuyen nganh goc';
    const cross = (phamVi?.idChuyenNganhDoc ?? []).filter((item) => item.id !== phamVi?.idChuyenNganh);
    const crossText = cross.length > 0
        ? cross.map((item) => `Actions(${cnMap.get(item.id)?.label || item.id}): ${item.actions.join(', ')}`).join(' | ')
        : '-- Chua mo rong Chuyen nganh phu';

    return [unitQuery, cnQuery, ownText, crossText];
}

// ── Optimized ScopeTypeSelector ──────────────────────────────────
interface ScopeTypeSelectorProps {
    config: GroupScopeConfig;
    onSelect: (type: ScopeType) => void;
    theme: any;
}

const ScopeTypeSelector = React.memo(({ config, onSelect, theme }: ScopeTypeSelectorProps) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {SCOPE_TYPES.map((scope) => {
                const active = config.scopeType === scope.value;
                return (
                    <ButtonBase
                        key={scope.value}
                        onClick={() => onSelect(scope.value as ScopeType)}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1.5,
                            borderRadius: 2.5,
                            border: `1.5px solid ${active ? scope.color : theme.palette.divider}`,
                            bgcolor: active ? alpha(scope.color, 0.05) : 'transparent',
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                                bgcolor: active ? alpha(scope.color, 0.08) : alpha(theme.palette.action.hover, 0.04),
                                borderColor: active ? scope.color : alpha(theme.palette.divider, 0.8),
                            },
                        }}
                    >
                        {active ? (
                            <RadioButtonCheckedIcon sx={{ fontSize: 18, color: scope.color }} />
                        ) : (
                            <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                                sx={{ 
                                    fontWeight: 700, 
                                    fontSize: 13.5, 
                                    color: active ? scope.color : 'text.primary',
                                    lineHeight: 1.2,
                                    mb: 0.25 
                                }}
                            >
                                {scope.label}
                            </Typography>
                            <Typography 
                                sx={{ 
                                    fontSize: 11.5, 
                                    color: 'text.secondary', 
                                    opacity: 0.85,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {scope.desc}
                            </Typography>
                        </Box>
                        {scope.risk && (
                            <Chip 
                                size="small" 
                                label={scope.risk} 
                                sx={{ 
                                    height: 20, 
                                    fontSize: 10, 
                                    fontWeight: 700,
                                    bgcolor: active ? alpha(scope.color, 0.1) : undefined,
                                    color: active ? scope.color : undefined,
                                }} 
                            />
                        )}
                    </ButtonBase>
                );
            })}
        </Box>
    );
});

// ── Optimized OfficeNode ───────────────────────────────────────────

interface OfficeNodeProps {
    office: OfficeOption;
    rowIndex: number;
    depth: number;
    isExpanded: boolean;
    checked: boolean;
    multi: boolean;
    hasChildren: boolean;
    onSelect: (id: string) => void;
    onToggleExpand: (id: string) => void;
    theme: any;
}

const OfficeNode = React.memo(({
    office,
    rowIndex,
    depth,
    isExpanded,
    checked,
    multi,
    hasChildren,
    onSelect,
    onToggleExpand,
    theme,
}: OfficeNodeProps) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <ButtonBase
                onClick={() => onSelect(office.id)}
                sx={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    py: 0.75,
                    px: 1,
                    pl: `${0.75 + depth * 1.5}rem`,
                    borderRadius: 1.5,
                    bgcolor: checked ? alpha(theme.palette.primary.main, 0.08) : getStripedRowBackground(theme, rowIndex),
                    borderLeft: `2px solid ${checked ? theme.palette.primary.main : 'transparent'}`,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        bgcolor: checked
                            ? alpha(theme.palette.primary.main, 0.12) 
                            : getStripedHoverBackground(theme),
                    },
                }}
            >
                <Box
                    component="span"
                    onClick={(event: React.MouseEvent) => {
                        if (hasChildren) {
                            event.stopPropagation();
                            onToggleExpand(office.id);
                        }
                    }}
                    sx={{ 
                        width: 24, 
                        height: 24,
                        mr: 0.5, 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        justifyContent: 'center', 
                        color: 'text.disabled',
                        borderRadius: '50%',
                        transition: 'background 0.2s',
                        '&:hover': hasChildren ? { bgcolor: alpha(theme.palette.divider, 0.5) } : {},
                    }}
                >
                    {hasChildren ? (
                        isExpanded ? <KeyboardArrowDownIcon sx={{ fontSize: 18 }} /> : <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
                    ) : null}
                </Box>
                <Box sx={{ mr: 1, color: checked ? 'primary.main' : 'text.disabled', display: 'flex' }}>
                    {multi
                        ? (checked ? <CheckBoxIcon sx={{ fontSize: 20 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 20 }} />)
                        : (checked ? <RadioButtonCheckedIcon sx={{ fontSize: 20 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />)}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography 
                        sx={{ 
                            fontSize: 12.5, 
                            fontWeight: checked ? 700 : 500, 
                            color: checked ? 'text.primary' : 'text.secondary',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {office.label}
                    </Typography>
                    <Typography 
                        sx={{ 
                            fontSize: 10, 
                            color: 'text.disabled', 
                            fontFamily: "inherit",
                            opacity: 0.8,
                        }}
                    >
                        {office.id}
                    </Typography>
                </Box>
            </ButtonBase>
        </Box>
    );
});

// ── Optimized OfficeTree ───────────────────────────────────────────

function OfficeTree({
    offices,
    selectedId,
    selectedIds,
    multi,
    onSelect,
}: {
    offices: OfficeOption[];
    selectedId?: string;
    selectedIds?: string[];
    multi?: boolean;
    onSelect: (id: string) => void;
}) {
    const theme = useTheme();
    const parentRef = useRef<HTMLDivElement>(null);
    
    // Memoize office data structures
    const { roots, childrenMap, officeMap } = useMemo(() => {
        const map = new Map<string, OfficeOption[]>();
        const oMap = new Map<string, OfficeOption>();
        const rootList: string[] = [];
        for (const office of offices) {
            oMap.set(office.id, office);
            if (!office.parentId) {
                rootList.push(office.id);
            }
            const key = office.parentId || '__root__';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(office);
        }
        return { roots: rootList, childrenMap: map, officeMap: oMap };
    }, [offices]);

    // Track expanded state
    const [expanded, setExpanded] = useState<Set<string>>(new Set(roots.slice(0, 3)));

    const handleToggleExpand = React.useCallback((id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    // Selection helper
    const isChecked = React.useCallback((id: string) => {
        return multi ? (selectedIds ?? []).includes(id) : selectedId === id;
    }, [multi, selectedIds, selectedId]);

    // ── VIRTUALIZATION LOGIC ──
    // 1. Flatten the tree into only visible (expanded) nodes
    const visibleNodes = useMemo(() => {
        const list: { office: OfficeOption; depth: number; hasChildren: boolean }[] = [];
        
        const traverse = (ids: string[], depth = 0) => {
            for (const id of ids) {
                const office = officeMap.get(id);
                if (!office) continue;
                const children = childrenMap.get(id) ?? [];
                list.push({ office, depth, hasChildren: children.length > 0 });
                if (expanded.has(id) && children.length > 0) {
                    traverse(children.map(c => c.id), depth + 1);
                }
            }
        };

        traverse(roots);
        return list;
    }, [roots, officeMap, childrenMap, expanded]);

    // 2. Initialize the virtualizer
    const rowVirtualizer = useVirtualizer({
        count: visibleNodes.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 44, // Fixed height for tree rows
        overscan: 10,
    });

    // Re-measure when nodes change
    useEffect(() => {
        rowVirtualizer.measure();
    }, [visibleNodes, rowVirtualizer]);

    return (
        <Box 
            ref={parentRef}
            sx={{ 
                border: `1px solid ${theme.palette.divider}`, 
                borderRadius: 2.5, 
                bgcolor: 'background.default', 
                maxHeight: 320, 
                overflow: 'auto', 
                position: 'relative', // Vital for virtual positioning
                // Custom scrollbar
                '&::-webkit-scrollbar': { width: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.divider, 0.5), borderRadius: 3 },
            }}
        >
            {visibleNodes.length > 0 ? (
                <Box
                    sx={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const node = visibleNodes[virtualItem.index];
                        if (!node) return null;
                        
                        return (
                            <Box
                                key={virtualItem.key}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualItem.size}px`,
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                            >
                                <OfficeNode
                                    office={node.office}
                                    rowIndex={virtualItem.index}
                                    depth={node.depth}
                                    isExpanded={expanded.has(node.office.id)}
                                    checked={isChecked(node.office.id)}
                                    multi={multi || false}
                                    hasChildren={node.hasChildren}
                                    onSelect={onSelect}
                                    onToggleExpand={handleToggleExpand}
                                    theme={theme}
                                />
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Typography variant="body2" sx={{ p: 2, color: 'text.disabled', textAlign: 'center' }}>
                    Khong co du lieu don vi
                </Typography>
            )}
        </Box>
    );
}

interface ScopeConfigPanelProps {
    selectedRole: Role | undefined;
    scopeConfig?: GroupScopeConfig;
    onScopeChange: (scopeConfig: GroupScopeConfig) => void;
}

const ScopeConfigPanel: React.FC<ScopeConfigPanelProps> = ({ selectedRole, scopeConfig = DEFAULT_SCOPE_CONFIG, onScopeChange }) => {
    const theme = useTheme();
    const config = {
        ...DEFAULT_SCOPE_CONFIG,
        ...scopeConfig,
        multiNodeIds: scopeConfig.multiNodeIds ?? [],
    };
    const mode = getMode(config.scopeType);
    const [officeLoading, setOfficeLoading] = useState(true);
    const [nhomLoading, setNhomLoading] = useState(true);
    const [offices, setOffices] = useState<OfficeOption[]>([]);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState<ChuyenNganhOption[]>([]);
    const [crossSearch, setCrossSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setOfficeLoading(true);
            try {
                const items = await officeApi.getListOffices({ loadAll: true });
                if (!cancelled) {
                    setOffices((items ?? []).map((item: any) => ({
                        id: item.id,
                        label: item.tenDayDu || item.ten || item.id,
                        parentId: item.idCapTren || '',
                        path: item.path || toPath(item.id),
                        depth: item.depth || toDepth(item.id),
                    })));
                }
            } finally {
                if (!cancelled) setOfficeLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setNhomLoading(true);
            try {
                const items = await listDanhMucChuyenNganh("");
                if (!cancelled)
                    setChuyenNganhOptions(
                        (items ?? []).map((item) => ({ id: item.id, label: item.ten, color: '#64748b' })),
                    );
            } catch {
                if (!cancelled) setChuyenNganhOptions([]);
            } finally {
                if (!cancelled) setNhomLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const normalizedPhamVi = useMemo(
        () => normalizePhamVi(config.phamViChuyenNganh, chuyenNganhOptions),
        [config.phamViChuyenNganh, chuyenNganhOptions],
    );

    useEffect(() => {
        if (nhomLoading) return;
        if (JSON.stringify(normalizedPhamVi) === JSON.stringify(config.phamViChuyenNganh)) return;
        onScopeChange({
            ...config,
            phamViChuyenNganh: normalizedPhamVi,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedPhamVi, nhomLoading]);

    const cnMap = useMemo(
        () => new Map(chuyenNganhOptions.map((option) => [option.id, option])),
        [chuyenNganhOptions],
    );

    // ── DEFERRED PREVIEW (Optimization) ────────────────────────────────
    // Using deferred values for calculations ensures UI updates (clicks)
    // are prioritized over heavy filtering of large office lists.
    const deferredConfig = useDeferredValue(config);
    const deferredPhamVi = useDeferredValue(normalizedPhamVi);

    const affectedOffices = useMemo(
        () => getAffectedOffices(offices, deferredConfig), 
        [offices, deferredConfig]
    );
    const queryLines = useMemo(
        () => buildQuery(deferredConfig, offices, deferredPhamVi, cnMap), 
        [deferredConfig, offices, deferredPhamVi, cnMap]
    );

    // Track config in ref for stable callbacks
    const configRef = useRef(config);
    configRef.current = config;

    const patchConfig = useCallback((patch: Partial<GroupScopeConfig>) => {
        const current = configRef.current;
        const next: GroupScopeConfig = {
            ...current,
            ...patch,
            multiNodeIds: patch.multiNodeIds ?? current.multiNodeIds,
        };
        if (next.scopeType === 'MULTI_NODE') next.anchorNodeId = '';
        else next.multiNodeIds = [];
        if (next.scopeType === 'SELF' || next.scopeType === 'ALL') next.anchorNodeId = '';
        onScopeChange(next);
    }, [onScopeChange]);

    const patchPhamVi = useCallback((nextPhamVi: PhamViChuyenNganhConfig | undefined) => {
        patchConfig({
            phamViChuyenNganh: nextPhamVi,
        });
    }, [patchConfig]);

    const handleSelectAnchor = useCallback((id: string) => patchConfig({ anchorNodeId: id }), [patchConfig]);

    const handleToggleMulti = useCallback((id: string) => {
        const current = configRef.current;
        patchConfig({
            multiNodeIds: current.multiNodeIds.includes(id)
                ? current.multiNodeIds.filter((item) => item !== id)
                : [...current.multiNodeIds, id],
        });
    }, [patchConfig]);

    const changeCnGoc = (id: string) => {
        const current = normalizePhamVi(normalizedPhamVi, chuyenNganhOptions);
        const source = current?.idChuyenNganhDoc ?? [];
        const next: PhamViChuyenNganhConfig = {
            idChuyenNganh: id,
            idChuyenNganhDoc: [
                { id, actions: [...ACTIONS_OWN_FULL] },
                ...source.filter((entry) => entry.id !== id).map((entry) => ({
                    id: entry.id,
                    actions: sanitizeActions(entry.actions, false),
                })),
            ],
        };
        patchPhamVi(next);
    };

    const addCrossCn = (id: string) => {
        const current = normalizePhamVi(normalizedPhamVi, chuyenNganhOptions);
        if (!current) return;
        if (current.idChuyenNganhDoc.some((entry) => entry.id === id)) return;
        patchPhamVi({
            ...current,
            idChuyenNganhDoc: [...current.idChuyenNganhDoc, { id, actions: [...ACTIONS_CROSS_DEFAULT] }],
        });
    };

    const removeCrossCn = (id: string) => {
        const current = normalizePhamVi(normalizedPhamVi, chuyenNganhOptions);
        if (!current || current.idChuyenNganh === id) return;
        patchPhamVi({
            ...current,
            idChuyenNganhDoc: current.idChuyenNganhDoc.filter((entry) => entry.id !== id),
        });
    };

    const toggleAction = (entry: ChuyenNganhDocScope, action: PermissionAction) => {
        const current = normalizePhamVi(normalizedPhamVi, chuyenNganhOptions);
        if (!current) return;
        const isOwn = entry.id === current.idChuyenNganh;
        if (!isOwn && BLOCKED_CROSS_ACTIONS.has(action)) return;
        const hasAction = entry.actions.includes(action);
        const nextActionsRaw = hasAction
            ? entry.actions.filter((item) => item !== action)
            : [...entry.actions, action];
        const nextActions = sanitizeActions(nextActionsRaw, isOwn);
        patchPhamVi({
            ...current,
            idChuyenNganhDoc: current.idChuyenNganhDoc.map((item) => (
                item.id === entry.id ? { ...item, actions: nextActions } : item
            )),
        });
    };

    const availableToAdd = useMemo(() => {
        const selected = new Set((normalizedPhamVi?.idChuyenNganhDoc ?? []).map((entry) => entry.id));
        return chuyenNganhOptions.filter((option) => !selected.has(option.id));
    }, [chuyenNganhOptions, normalizedPhamVi]);
    const filteredAvailableToAdd = useMemo(() => {
        const keyword = crossSearch.trim().toLowerCase();
        if (!keyword) return availableToAdd;
        return availableToAdd.filter((option) =>
            option.label.toLowerCase().includes(keyword) || option.id.toLowerCase().includes(keyword),
        );
    }, [availableToAdd, crossSearch]);

    const ownCnEntry = useMemo(
        () => (normalizedPhamVi?.idChuyenNganhDoc ?? []).find((entry) => entry.id === normalizedPhamVi?.idChuyenNganh),
        [normalizedPhamVi],
    );
    const crossEntries = useMemo(
        () => (normalizedPhamVi?.idChuyenNganhDoc ?? []).filter((entry) => entry.id !== normalizedPhamVi?.idChuyenNganh),
        [normalizedPhamVi],
    );
    const crossCount = crossEntries.length;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(400px, 510px) minmax(360px, 1fr)' }, gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
                        Cau hinh pham vi du lieu mac dinh cho role <strong>{selectedRole?.name}</strong>. Chieu 1 loc theo cay don vi, Chieu 2 loc va phan quyen theo tung chuyen nganh.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                        <FormControlLabel
                            sx={{ m: 0 }}
                            control={(
                                <Switch
                                    size="small"
                                    checked={Boolean(config.duocTruyCap)}
                                    onChange={(_, checked) => patchConfig({ duocTruyCap: checked })}
                                />
                            )}
                            label={(
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary' }}>
                                    Truy cap phan he
                                </Typography>
                            )}
                        />
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        CHIEU 1 - PHAM VI DON VI
                    </Typography>
                    <ScopeTypeSelector 
                        config={config} 
                        onSelect={(type) => patchConfig({ scopeType: type })} 
                        theme={theme} 
                    />
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        CHON DON VI / NHANH
                    </Typography>
                    {(officeLoading || nhomLoading) && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}><CircularProgress size={18} /><Typography variant="body2">Dang tai du lieu...</Typography></Box>}
                    {!officeLoading && mode.needsAnchor && (
                        <OfficeTree 
                            offices={offices} 
                            selectedId={config.anchorNodeId} 
                            onSelect={handleSelectAnchor} 
                        />
                    )}
                    {!officeLoading && mode.needsMultiNode && (
                        <OfficeTree
                            offices={offices}
                            multi
                            selectedIds={config.multiNodeIds}
                            onSelect={handleToggleMulti}
                        />
                    )}
                    {!mode.needsAnchor && !mode.needsMultiNode && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            Scope nay khong can anchor node. Delegated se bo sung nguoi uy quyen va ngay het han o luc gan user cu the.
                        </Typography>
                    )}
                    {config.scopeType === 'DELEGATED' && (
                        <Box sx={{ mt: 1.25, p: 1.25, borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'warning.main', mb: 0.5 }}>
                                Kiem tra bat buoc cho Uy quyen
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.6 }}>
                                Don vi dang quan tri: lay theo IDQuanTriDonVi cua tung user khi gan.
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: config.anchorNodeId ? 'text.primary' : 'error.main', lineHeight: 1.6 }}>
                                Don vi se duoc uy quyen: {config.anchorNodeId || 'Chua chon'}
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        CHIEU 2 - PHAM VI CHUYEN NGANH
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1 }}>
                        Chon chuyen nganh chinh truoc, sau do moi chon cac chuyen nganh phu can truy cap cheo.
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.primary', mb: 0.8 }}>
                        1. Chon chuyen nganh chinh
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 0.8, mb: 1.5 }}>
                        {chuyenNganhOptions.map((cn) => {
                            const active = normalizedPhamVi?.idChuyenNganh === cn.id;
                            return (
                                <ButtonBase
                                    key={cn.id}
                                    onClick={() => changeCnGoc(cn.id)}
                                    sx={{
                                        justifyContent: 'flex-start',
                                        textAlign: 'left',
                                        p: 1,
                                        borderRadius: 1.5,
                                        border: `1px solid ${active ? cn.color : theme.palette.divider}`,
                                        bgcolor: active ? alpha(cn.color, 0.08) : 'transparent',
                                    }}
                                >
                                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: active ? cn.color : 'text.disabled', mr: 1 }} />
                                    <Typography sx={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? 'text.primary' : 'text.secondary' }}>{cn.label}</Typography>
                                    {active && <Chip size="small" label="Chinh" sx={{ ml: 'auto', height: 18, fontSize: 10 }} />}
                                </ButtonBase>
                            );
                        })}
                    </Box>

                    {ownCnEntry && (
                        <Box sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${alpha(cnMap.get(ownCnEntry.id)?.color || theme.palette.primary.main, 0.45)}`, bgcolor: alpha(cnMap.get(ownCnEntry.id)?.color || theme.palette.primary.main, 0.08), mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>
                                    Chuc nang chuyen nganh chinh: {cnMap.get(ownCnEntry.id)?.label || ownCnEntry.id}
                                </Typography>
                                <Chip size="small" label="Chinh" sx={{ height: 18, fontSize: 10 }} />
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0.65 }}>
                                {ACTIONS_ALL.map((action) => {
                                    const checked = ownCnEntry.actions.includes(action);
                                    const color = cnMap.get(ownCnEntry.id)?.color || theme.palette.primary.main;
                                    return (
                                        <ButtonBase
                                            key={`${ownCnEntry.id}-${action}`}
                                            onClick={() => toggleAction(ownCnEntry, action)}
                                            sx={{
                                                justifyContent: 'flex-start',
                                                textAlign: 'left',
                                                px: 0.75,
                                                py: 0.6,
                                                borderRadius: 1,
                                                border: `1px solid ${checked ? alpha(color, 0.55) : theme.palette.divider}`,
                                                bgcolor: checked ? alpha(color, 0.12) : 'background.paper',
                                                gap: 0.5,
                                            }}
                                        >
                                            {checked ? <CheckBoxIcon sx={{ fontSize: 14 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 14 }} />}
                                            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{ACTION_LABELS[action]}</Typography>
                                        </ButtonBase>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}

                    <Divider sx={{ my: 1.25 }} />


                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.primary' }}>
                            2. Chon chuyen nganh phu
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>
                                Danh sach chuyen nganh phu
                            </Typography>
                            <Chip size="small" label={`${crossEntries.length} Chuyen nganh phu`} sx={{ height: 18, fontSize: 10 }} />
                        </Box>

                        <TextField
                            size="small"
                            placeholder="Tim chuyen nganh phu de chon"
                            value={crossSearch}
                            onChange={(event) => setCrossSearch(event.target.value)}
                            sx={{
                                maxWidth: 320,
                                '& .MuiInputBase-root': {
                                    fontSize: 12,
                                    borderRadius: 2,
                                },
                            }}
                        />

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 0.8,
                                flexWrap: 'wrap',
                                maxHeight: 172,
                                overflowY: 'auto',
                                p: 0.9,
                                borderRadius: 2,
                                border: `1px solid ${theme.palette.divider}`,
                                bgcolor: 'background.default',
                                mb: crossEntries.length > 0 ? 1.2 : 0,
                            }}
                        >
                            {filteredAvailableToAdd.length === 0 ? (
                                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                                    Khong tim thay chuyen nganh phu phu hop.
                                </Typography>
                            ) : (
                                filteredAvailableToAdd.map((cn) => (
                                    <ButtonBase
                                        key={cn.id}
                                        onClick={() => addCrossCn(cn.id)}
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.45,
                                            px: 0.9,
                                            py: 0.55,
                                            border: `1px dashed ${alpha(cn.color, 0.7)}`,
                                            borderRadius: 8,
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        <AddIcon sx={{ fontSize: 13, color: cn.color }} />
                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{cn.label}</Typography>
                                    </ButtonBase>
                                ))
                            )}
                        </Box>

                        {crossEntries.length === 0 ? (
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                                Chua co chuyen nganh phu nao duoc chon.
                            </Typography>
                        ) : (
                            crossEntries.map((entry) => {
                                const option = cnMap.get(entry.id);
                                const color = option?.color || theme.palette.info.main;
                                return (
                                    <Box key={entry.id} sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${alpha(color, 0.45)}`, bgcolor: 'background.default' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>
                                                {option?.label || entry.id}
                                            </Typography>
                                            <Chip size="small" label="Phu" sx={{ ml: 1, height: 18, fontSize: 10 }} />
                                            <Tooltip title="Xoa chuyen nganh phu khoi pham vi">
                                                <IconButton size="small" onClick={() => removeCrossCn(entry.id)} sx={{ ml: 'auto' }}>
                                                    <CloseIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0.65 }}>
                                            {ACTIONS_ALL.map((action) => {
                                                const checked = entry.actions.includes(action);
                                                const disabled = BLOCKED_CROSS_ACTIONS.has(action);
                                                return (
                                                    <ButtonBase
                                                        key={`${entry.id}-${action}`}
                                                        onClick={() => !disabled && toggleAction(entry, action)}
                                                        sx={{
                                                            justifyContent: 'flex-start',
                                                            textAlign: 'left',
                                                            px: 0.75,
                                                            py: 0.6,
                                                            borderRadius: 1,
                                                            border: `1px solid ${checked ? alpha(color, 0.55) : theme.palette.divider}`,
                                                            bgcolor: disabled ? alpha(theme.palette.action.disabled, 0.12) : checked ? alpha(color, 0.12) : 'background.paper',
                                                            opacity: disabled ? 0.5 : 1,
                                                            gap: 0.5,
                                                        }}
                                                    >
                                                        {checked ? <CheckBoxIcon sx={{ fontSize: 14 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 14 }} />}
                                                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{ACTION_LABELS[action]}</Typography>
                                                    </ButtonBase>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                    </Box>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>XEM TRUOC CAU HINH</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                        <Chip label={mode.label} />
                        {config.anchorNodeId && <Chip label={`Anchor: ${config.anchorNodeId}`} />}
                        {config.multiNodeIds.length > 0 && <Chip label={`${config.multiNodeIds.length} node`} />}
                        {normalizedPhamVi?.idChuyenNganh && <Chip color="secondary" label={`Chuyen nganh goc: ${cnMap.get(normalizedPhamVi.idChuyenNganh)?.label || normalizedPhamVi.idChuyenNganh}`} />}
                        {crossCount > 0 && <Chip color="warning" label={`Chuyen nganh phu: ${crossCount}`} />}
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{mode.example || 'Khong co mo ta bo sung.'}</Typography>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>XEM TRUOC TRUY VAN</Typography>
                    {queryLines.map((line, idx) => (
                        <React.Fragment key={idx}>
                            <Typography sx={{ fontFamily: "inherit", fontSize: 11.5, lineHeight: 1.8, color: idx < 2 ? 'text.primary' : 'text.secondary' }}>
                                {line}
                            </Typography>
                            {idx < queryLines.length - 1 && <Divider sx={{ my: 1.1 }} />}
                        </React.Fragment>
                    ))}
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>PHAM VI CHUYEN NGANH (DOCUMENT)</Typography>
                    <Box component="pre" sx={{ m: 0, p: 1.25, borderRadius: 2, bgcolor: 'background.default', border: `1px solid ${theme.palette.divider}`, fontSize: 11, lineHeight: 1.6, overflow: 'auto', fontFamily: "inherit" }}>
                        {JSON.stringify(normalizedPhamVi ?? null, null, 2)}
                    </Box>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`, bgcolor: alpha(theme.palette.warning.main, 0.06) }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                        <WarningAmberIcon sx={{ fontSize: 17, color: 'warning.main' }} />
                        <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: 'warning.main' }}>CAN NHAC THAY DOI SCHEMA</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, lineHeight: 1.7, color: 'text.secondary' }}>
                        Neu bo truong IDChuyenNganh tren entity trang bi, he thong mat kha nang loc chinh xac theo tung CN. Nen giu IDChuyenNganh va bo sung them IDChuyenNganhKT de loc chi tiet.
                    </Typography>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>VUNG DON VI BI ANH HUONG</Typography>
                    {config.scopeType === 'SELF' || config.scopeType === 'ALL' ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            {config.scopeType === 'SELF' ? 'SELF loc theo CreatedBy, khong theo Office list.' : 'ALL bo qua gioi han don vi. Chieu 2 van co hieu luc neu da cau hinh pham vi chuyen nganh.'}
                        </Typography>
                    ) : affectedOffices.length > 0 ? (
                        <>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', mb: 1 }}>{affectedOffices.length} don vi du kien</Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                {affectedOffices.slice(0, 24).map((office) => (
                                    <Chip key={office.id} label={`${office.id} - ${office.label}`} size="small" />
                                ))}
                                {affectedOffices.length > 24 && <Chip label={`+${affectedOffices.length - 24} don vi`} size="small" />}
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Chua co du lieu preview. Hay chon anchor node hoac multi-node phu hop.</Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default React.memo(ScopeConfigPanel);
