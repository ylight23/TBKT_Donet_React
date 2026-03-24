import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
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

import officeApi from '../../../apis/officeApi';
import { listNhomChuyenNganh } from '../../../apis/nhomChuyenNganhApi';
import type {
    ChuyenNganhDocScope,
    GroupScopeConfig,
    PermissionAction,
    PhamViChuyenNganhConfig,
    Role,
    ScopeType,
} from '../../../types/permission';
import { SCOPE_TYPES } from '../data/permissionData';

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

const FALLBACK_CHUYEN_NGANH: ChuyenNganhOption[] = [
    { id: 'radar', label: 'Ra-da', color: '#3b82f6' },
    { id: 'thongtin', label: 'Thong tin', color: '#0ea5a4' },
    { id: 'tcdt', label: 'Tac chien DT', color: '#06b6d4' },
    { id: 'tauthuyen', label: 'Tau thuyen', color: '#f59e0b' },
    { id: 'phanhoa', label: 'Phong hoa', color: '#8b5cf6' },
    { id: 'ten_lua', label: 'Ten lua', color: '#ef4444' },
    { id: 'khongquan', label: 'Khong quan', color: '#1d4ed8' },
    { id: 'haugcan', label: 'Hau can', color: '#a16207' },
];

const DEFAULT_SCOPE_CONFIG: GroupScopeConfig = {
    scopeType: 'SUBTREE',
    anchorNodeId: '',
    multiNodeIds: [],
    idNhomChuyenNganh: '',
    phamViChuyenNganh: undefined,
};

function toPath(id?: string): string {
    return id ? `/${id.replace(/\./g, '/')}/` : '/';
}

function toDepth(id?: string): number {
    return id ? id.split('.').length : 0;
}

function getMode(scopeType: ScopeType) {
    const scope = SCOPE_TYPES.find((item) => item.value === scopeType) ?? SCOPE_TYPES[0];
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
    if (!chuyenNganhOptions.length && !phamVi) return undefined;
    const ownId = phamVi?.idChuyenNganh || chuyenNganhOptions[0]?.id || '';
    if (!ownId) return undefined;
    const entries = [...(phamVi?.idChuyenNganhDoc ?? [])];
    const ownEntry = entries.find((entry) => entry.id === ownId);
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
    const ownText = own ? `Actions(CN goc ${cnMap.get(own.id)?.label || own.id}): ${own.actions.join(', ')}` : '-- Chua cau hinh actions CN goc';
    const cross = (phamVi?.idChuyenNganhDoc ?? []).filter((item) => item.id !== phamVi?.idChuyenNganh);
    const crossText = cross.length > 0
        ? cross.map((item) => `Actions(${cnMap.get(item.id)?.label || item.id}): ${item.actions.join(', ')}`).join(' | ')
        : '-- Chua mo rong CN cheo';

    return [unitQuery, cnQuery, ownText, crossText];
}

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
    const roots = useMemo(() => offices.filter((item) => !item.parentId).map((item) => item.id), [offices]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set(roots.slice(0, 2)));

    useEffect(() => {
        setExpanded(new Set(roots.slice(0, 2)));
    }, [roots]);

    const childrenMap = useMemo(() => {
        const map = new Map<string, OfficeOption[]>();
        for (const office of offices) {
            const key = office.parentId || '__root__';
            map.set(key, [...(map.get(key) ?? []), office]);
        }
        return map;
    }, [offices]);

    const renderNode = (office: OfficeOption, depth = 0): React.ReactNode => {
        const children = childrenMap.get(office.id) ?? [];
        const isExpanded = expanded.has(office.id);
        const checked = multi ? (selectedIds ?? []).includes(office.id) : selectedId === office.id;
        return (
            <React.Fragment key={office.id}>
                <ButtonBase
                    onClick={() => onSelect(office.id)}
                    sx={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        py: 0.75,
                        px: 1,
                        pl: `${1 + depth * 1.6}rem`,
                        borderRadius: 1.5,
                        bgcolor: checked ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                        borderLeft: `2px solid ${checked ? theme.palette.primary.main : 'transparent'}`,
                    }}
                >
                    <Box
                        component="span"
                        onClick={(event: React.MouseEvent) => {
                            if (children.length === 0) return;
                            event.stopPropagation();
                            setExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(office.id)) next.delete(office.id);
                                else next.add(office.id);
                                return next;
                            });
                        }}
                        sx={{ width: 18, mr: 0.5, display: 'inline-flex', justifyContent: 'center', color: 'text.disabled' }}
                    >
                        {children.length > 0 ? (isExpanded ? <KeyboardArrowDownIcon sx={{ fontSize: 16 }} /> : <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />) : null}
                    </Box>
                    <Box sx={{ mr: 1, color: checked ? 'primary.main' : 'text.disabled' }}>
                        {multi
                            ? (checked ? <CheckBoxIcon sx={{ fontSize: 18 }} /> : <CheckBoxOutlineBlankIcon sx={{ fontSize: 18 }} />)
                            : (checked ? <RadioButtonCheckedIcon sx={{ fontSize: 18 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 18 }} />)}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: checked ? 700 : 500, color: checked ? 'text.primary' : 'text.secondary' }}>
                            {office.label}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace" }}>
                            {office.id}
                        </Typography>
                    </Box>
                </ButtonBase>
                {children.length > 0 && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        {children.map((child) => renderNode(child, depth + 1))}
                    </Collapse>
                )}
            </React.Fragment>
        );
    };

    return (
        <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, bgcolor: 'background.default', maxHeight: 260, overflow: 'auto', p: 0.75 }}>
            {roots.map((rootId) => {
                const office = offices.find((item) => item.id === rootId);
                return office ? renderNode(office) : null;
            })}
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
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState<ChuyenNganhOption[]>(FALLBACK_CHUYEN_NGANH);

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
                const items = await listNhomChuyenNganh(true);
                if (!cancelled && items.length > 0) {
                    const map = new Map<string, ChuyenNganhOption>();
                    for (const fallback of FALLBACK_CHUYEN_NGANH) map.set(fallback.id, fallback);
                    for (const group of items) {
                        for (const cnId of group.danhSachCn) {
                            if (map.has(cnId)) continue;
                            map.set(cnId, { id: cnId, label: cnId, color: '#64748b' });
                        }
                    }
                    setChuyenNganhOptions(Array.from(map.values()));
                }
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
            idNhomChuyenNganh: normalizedPhamVi?.idChuyenNganh || '',
            phamViChuyenNganh: normalizedPhamVi,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedPhamVi, nhomLoading]);

    const cnMap = useMemo(
        () => new Map(chuyenNganhOptions.map((option) => [option.id, option])),
        [chuyenNganhOptions],
    );

    const affectedOffices = useMemo(() => getAffectedOffices(offices, config), [offices, config]);
    const queryLines = useMemo(() => buildQuery(config, offices, normalizedPhamVi, cnMap), [config, offices, normalizedPhamVi, cnMap]);

    const patchConfig = (patch: Partial<GroupScopeConfig>) => {
        const next: GroupScopeConfig = {
            ...config,
            ...patch,
            multiNodeIds: patch.multiNodeIds ?? config.multiNodeIds,
        };
        if (next.scopeType === 'MULTI_NODE') next.anchorNodeId = '';
        else next.multiNodeIds = [];
        if (next.scopeType === 'SELF' || next.scopeType === 'ALL') next.anchorNodeId = '';
        onScopeChange(next);
    };

    const patchPhamVi = (nextPhamVi: PhamViChuyenNganhConfig | undefined) => {
        patchConfig({
            idNhomChuyenNganh: nextPhamVi?.idChuyenNganh || '',
            phamViChuyenNganh: nextPhamVi,
        });
    };

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

    const crossCount = (normalizedPhamVi?.idChuyenNganhDoc ?? []).filter((entry) => entry.id !== normalizedPhamVi?.idChuyenNganh).length;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(400px, 510px) minmax(360px, 1fr)' }, gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
                        Cau hinh pham vi du lieu mac dinh cho role <strong>{selectedRole?.name}</strong>. Chieu 1 loc theo cay don vi, Chieu 2 loc va phan quyen theo tung chuyen nganh.
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        CHIEU 1 - PHAM VI DON VI
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {SCOPE_TYPES.map((scope) => {
                            const active = config.scopeType === scope.value;
                            return (
                                <ButtonBase
                                    key={scope.value}
                                    onClick={() => patchConfig({ scopeType: scope.value as ScopeType })}
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
                                    }}
                                >
                                    {active ? <RadioButtonCheckedIcon sx={{ fontSize: 18, color: scope.color }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: active ? scope.color : 'text.primary' }}>{scope.label}</Typography>
                                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{scope.desc}</Typography>
                                    </Box>
                                    <Chip size="small" label={scope.risk} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                </ButtonBase>
                            );
                        })}
                    </Box>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        CHON DON VI / NHANH
                    </Typography>
                    {(officeLoading || nhomLoading) && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}><CircularProgress size={18} /><Typography variant="body2">Dang tai du lieu...</Typography></Box>}
                    {!officeLoading && mode.needsAnchor && (
                        <OfficeTree offices={offices} selectedId={config.anchorNodeId} onSelect={(id) => patchConfig({ anchorNodeId: id })} />
                    )}
                    {!officeLoading && mode.needsMultiNode && (
                        <OfficeTree
                            offices={offices}
                            multi
                            selectedIds={config.multiNodeIds}
                            onSelect={(id) => patchConfig({
                                multiNodeIds: config.multiNodeIds.includes(id)
                                    ? config.multiNodeIds.filter((item) => item !== id)
                                    : [...config.multiNodeIds, id],
                            })}
                        />
                    )}
                    {!mode.needsAnchor && !mode.needsMultiNode && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            Scope nay khong can anchor node. Delegated se bo sung nguoi uy quyen va ngay het han o luc gan user cu the.
                        </Typography>
                    )}
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        CHIEU 2 - PHAM VI CHUYEN NGANH
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1 }}>
                        Chon CN goc, mo rong CN doc cheo va bo actions rieng theo tung CN.
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
                                    {active && <Chip size="small" label="CN Goc" sx={{ ml: 'auto', height: 18, fontSize: 10 }} />}
                                </ButtonBase>
                            );
                        })}
                    </Box>

                    <Divider sx={{ my: 1.25 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {(normalizedPhamVi?.idChuyenNganhDoc ?? []).map((entry) => {
                            const isOwn = entry.id === normalizedPhamVi?.idChuyenNganh;
                            const option = cnMap.get(entry.id);
                            const color = option?.color || theme.palette.info.main;
                            return (
                                <Box key={entry.id} sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${alpha(color, 0.45)}`, bgcolor: isOwn ? alpha(color, 0.08) : 'background.default' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: 12.5 }}>{option?.label || entry.id}</Typography>
                                        <Chip size="small" label={isOwn ? 'CN Goc' : 'Truy cap cheo'} sx={{ ml: 1, height: 18, fontSize: 10 }} />
                                        {!isOwn && (
                                            <Tooltip title="Xoa CN cheo khoi pham vi">
                                                <IconButton size="small" onClick={() => removeCrossCn(entry.id)} sx={{ ml: 'auto' }}>
                                                    <CloseIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0.65 }}>
                                        {ACTIONS_ALL.map((action) => {
                                            const checked = entry.actions.includes(action);
                                            const disabled = !isOwn && BLOCKED_CROSS_ACTIONS.has(action);
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
                        })}
                    </Box>

                    <Box sx={{ mt: 1.2, display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                        {availableToAdd.slice(0, 8).map((cn) => (
                            <ButtonBase key={cn.id} onClick={() => addCrossCn(cn.id)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, px: 0.9, py: 0.55, border: `1px dashed ${alpha(cn.color, 0.7)}`, borderRadius: 8 }}>
                                <AddIcon sx={{ fontSize: 13, color: cn.color }} />
                                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{cn.label}</Typography>
                            </ButtonBase>
                        ))}
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
                        {normalizedPhamVi?.idChuyenNganh && <Chip color="secondary" label={`CN goc: ${cnMap.get(normalizedPhamVi.idChuyenNganh)?.label || normalizedPhamVi.idChuyenNganh}`} />}
                        {crossCount > 0 && <Chip color="warning" label={`CN cheo: ${crossCount}`} />}
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{mode.example || 'Khong co mo ta bo sung.'}</Typography>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>QUERY PREVIEW</Typography>
                    {queryLines.map((line, idx) => (
                        <React.Fragment key={idx}>
                            <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.8, color: idx < 2 ? 'text.primary' : 'text.secondary' }}>
                                {line}
                            </Typography>
                            {idx < queryLines.length - 1 && <Divider sx={{ my: 1.1 }} />}
                        </React.Fragment>
                    ))}
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>PHAM VI CHUYEN NGANH DOCUMENT</Typography>
                    <Box component="pre" sx={{ m: 0, p: 1.25, borderRadius: 2, bgcolor: 'background.default', border: `1px solid ${theme.palette.divider}`, fontSize: 11, lineHeight: 1.6, overflow: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
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

export default ScopeConfigPanel;
