import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SchemaIcon from '@mui/icons-material/Schema';
import { alpha, useTheme } from '@mui/material/styles';

import officeApi from '../../../apis/officeApi';
import { listNhomChuyenNganh } from '../../../apis/nhomChuyenNganhApi';
import type { GroupScopeConfig, Role, ScopeType } from '../../../types/permission';
import { SCOPE_TYPES } from '../data/permissionData';

type OfficeOption = {
    id: string;
    label: string;
    parentId: string;
    path: string;
    depth: number;
};

type NhomChuyenNganhOption = {
    id: string;
    ten: string;
    danhSachCn: string[];
};

const DEFAULT_SCOPE_CONFIG: GroupScopeConfig = {
    scopeType: 'SUBTREE',
    anchorNodeId: '',
    multiNodeIds: [],
    idNhomChuyenNganh: '',
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

function buildQuery(scope: GroupScopeConfig, offices: OfficeOption[]): string[] {
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

    const nganhQuery = scope.idNhomChuyenNganh
        ? `AND IDNhomChuyenNganh = '${scope.idNhomChuyenNganh}'`
        : '-- Khong loc nhom chuyen nganh';
    return [unitQuery, nganhQuery];
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
    const config = { ...DEFAULT_SCOPE_CONFIG, ...scopeConfig, multiNodeIds: scopeConfig.multiNodeIds ?? [] };
    const mode = getMode(config.scopeType);
    const [officeLoading, setOfficeLoading] = useState(true);
    const [nhomLoading, setNhomLoading] = useState(true);
    const [offices, setOffices] = useState<OfficeOption[]>([]);
    const [nhomOptions, setNhomOptions] = useState<NhomChuyenNganhOption[]>([]);

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
                if (!cancelled) setNhomOptions(items);
            } finally {
                if (!cancelled) setNhomLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const affectedOffices = useMemo(() => getAffectedOffices(offices, config), [offices, config]);
    const queryLines = useMemo(() => buildQuery(config, offices), [config, offices]);

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

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(380px, 480px) minmax(360px, 1fr)' }, gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}>
                        Cau hinh pham vi du lieu mac dinh cho role <strong>{selectedRole?.name}</strong>. Pham vi nay se duoc dung lam mac dinh khi gan user vao nhom.
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
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2.5, border: `1.5px solid ${active ? scope.color : theme.palette.divider}`, bgcolor: active ? alpha(scope.color, 0.05) : 'transparent', justifyContent: 'flex-start', textAlign: 'left' }}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary' }}>
                            CHIEU 2 - NHOM CHUYEN NGANH
                        </Typography>
                        <FormControlLabel
                            sx={{ mr: 0 }}
                            control={<Switch checked={Boolean(config.idNhomChuyenNganh)} onChange={(_, checked) => patchConfig({ idNhomChuyenNganh: checked ? (config.idNhomChuyenNganh || nhomOptions[0]?.id || '') : '' })} />}
                            label={config.idNhomChuyenNganh ? 'BAT' : 'TAT'}
                        />
                    </Box>
                    {config.idNhomChuyenNganh ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {nhomOptions.map((item) => {
                                const active = config.idNhomChuyenNganh === item.id;
                                return (
                                    <ButtonBase key={item.id} onClick={() => patchConfig({ idNhomChuyenNganh: item.id })} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, p: 1.5, borderRadius: 2.5, border: `1.5px solid ${active ? theme.palette.secondary.main : theme.palette.divider}`, bgcolor: active ? alpha(theme.palette.secondary.main, 0.05) : 'transparent' }}>
                                        <SchemaIcon sx={{ fontSize: 18, color: active ? 'secondary.main' : 'text.disabled' }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: active ? 'secondary.main' : 'text.primary' }}>{item.ten}</Typography>
                                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{item.danhSachCn.join(', ') || 'Khong co danh sach CN'}</Typography>
                                        </Box>
                                    </ButtonBase>
                                );
                            })}
                        </Box>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            Khi tat bo loc nay, role thay tat ca chuyen nganh trong pham vi don vi da chon.
                        </Typography>
                    )}
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        XEM TRUOC CAU HINH
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.25 }}>
                        <Chip label={mode.label} />
                        {config.anchorNodeId && <Chip label={`Anchor: ${config.anchorNodeId}`} />}
                        {config.multiNodeIds.length > 0 && <Chip label={`${config.multiNodeIds.length} node`} />}
                        {config.idNhomChuyenNganh && <Chip color="secondary" label={`CN: ${config.idNhomChuyenNganh}`} />}
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{mode.example || 'Khong co mo ta bo sung.'}</Typography>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        QUERY PREVIEW
                    </Typography>
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.9, color: 'text.primary' }}>
                        {queryLines[0]}
                    </Typography>
                    <Divider sx={{ my: 1.25 }} />
                    <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.9, color: 'text.primary' }}>
                        {queryLines[1]}
                    </Typography>
                </Box>

                <Box sx={{ p: 2.25, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1.25 }}>
                        VUNG DON VI BI ANH HUONG
                    </Typography>
                    {config.scopeType === 'SELF' || config.scopeType === 'ALL' ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                            {config.scopeType === 'SELF' ? 'SELF loc theo CreatedBy, khong theo Office list.' : 'ALL bo qua gioi han don vi. Neu bat nhom chuyen nganh thi van AND o tang 2.'}
                        </Typography>
                    ) : affectedOffices.length > 0 ? (
                        <>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', mb: 1 }}>
                                {affectedOffices.length} don vi du kien
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                {affectedOffices.slice(0, 24).map((office) => (
                                    <Chip key={office.id} label={`${office.id} - ${office.label}`} size="small" />
                                ))}
                                {affectedOffices.length > 24 && <Chip label={`+${affectedOffices.length - 24} don vi`} size="small" />}
                            </Box>
                        </>
                    ) : (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Chua co du lieu preview. Hay chon anchor node hoac multi-node phu hop.
                        </Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default ScopeConfigPanel;
