/**
 * CnGroupedPermissionView — Hiển thị quyền hạn NHÓM THEO CHUYÊN NGÀNH
 *
 * Mỗi CN là một section riêng, bên trong hiện các module permission groups.
 * Với mỗi permission, trạng thái hiển thị:
 *   🟢 Effective — cả checkedCodes lẫn CN đều cho phép
 *   🟡 Blocked by CN — checkedCodes có, nhưng CN không cho phép action này
 *   ⚪ Not granted — checkedCodes không có (chưa cấp quyền chức năng)
 *
 * VD: Nhóm Ra-đa (CN gốc — chỉ Xem)
 *   🔧 Trang bị kỹ thuật
 *     ✅ Xem danh sách trang bị      (equipment.view → action "view" ∈ CN)
 *     🚫 Tiếp nhận trang bị          (equipment.create → action "add" ∉ CN)
 *     🚫 Cập nhật thông tin trang bị  (equipment.edit → action "edit" ∉ CN)
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import BarChartIcon from '@mui/icons-material/BarChart';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import GroupsIcon from '@mui/icons-material/Groups';
import TuneIcon from '@mui/icons-material/Tune';
import { alpha, useTheme } from '@mui/material/styles';

import type { PhamViChuyenNganhConfig, PermissionAction, PermissionGroup } from '../../../types/permission';

// ── Mapping: permission code suffix → CN action ───────────────────

const SUFFIX_TO_CN_ACTION: Record<string, PermissionAction> = {
    view: 'view',
    create: 'add',
    edit: 'edit',
    delete: 'delete',
    export: 'download',
    approve: 'approve',
    unapprove: 'unapprove',
    print: 'print',
};

/**
 * Trích action tương ứng từ permission code.
 * VD: "equipment.view" → "view", "tech.repair.create" → "add"
 * Trả null nếu suffix không map được (vd: "group1" → null → không bị CN chặn)
 */
function codeToAction(code: string): PermissionAction | null {
    const parts = code.split('.');
    const suffix = parts[parts.length - 1];
    return SUFFIX_TO_CN_ACTION[suffix] ?? null;
}

// ── Action label ──────────────────────────────────────────────────

const ACTION_VI: Record<PermissionAction, string> = {
    view: 'Xem', add: 'Thêm', edit: 'Sửa', delete: 'Xoá',
    approve: 'Duyệt', unapprove: 'Huỷ duyệt', download: 'Tải', print: 'In',
};

// ── CN colors ─────────────────────────────────────────────────────

const CN_COLORS: Record<string, string> = {
    radar: '#3b82f6', thongtin: '#0ea5a4', tcdt: '#06b6d4',
    tauthuyen: '#f59e0b', phanhoa: '#8b5cf6', ten_lua: '#ef4444',
    khongquan: '#1d4ed8', haugcan: '#a16207',
};

function getCnColor(id: string): string {
    return CN_COLORS[id] || '#64748b';
}

// ── Group icon map ────────────────────────────────────────────────

const GROUP_ICON_MAP: Record<string, React.ElementType> = {
    'Trang bị kỹ thuật': BuildIcon,
    'Quản lý kỹ thuật': HandymanIcon,
    'Báo cáo & thống kê': BarChartIcon,
    'Quản lý đơn vị': CorporateFareIcon,
    'Nhân viên': GroupsIcon,
    'Cấu hình hệ thống': TuneIcon,
};

// ── Types ─────────────────────────────────────────────────────────

type PermStatus = 'effective' | 'blocked-by-cn' | 'not-granted';

interface CnGroupedPermissionViewProps {
    phamVi: PhamViChuyenNganhConfig;
    checkedCodes: string[];
    permissionGroups: PermissionGroup[];
}

// ── Component ─────────────────────────────────────────────────────

const CnGroupedPermissionView: React.FC<CnGroupedPermissionViewProps> = ({
    phamVi,
    checkedCodes,
    permissionGroups,
}) => {
    const theme = useTheme();
    const checkedSet = useMemo(() => new Set(checkedCodes), [checkedCodes]);

    const cnEntries = useMemo(() => {
        if (!phamVi?.idChuyenNganhDoc) return [];
        return phamVi.idChuyenNganhDoc.map(entry => ({
            ...entry,
            isOwn: entry.id === phamVi.idChuyenNganh,
            actionSet: new Set(entry.actions),
        }));
    }, [phamVi]);

    // Track which CN sections are expanded (all expanded by default)
    const [expandedCns, setExpandedCns] = useState<Record<string, boolean>>(
        () => Object.fromEntries(cnEntries.map(e => [e.id, true]))
    );

    const toggleCn = (id: string) => {
        setExpandedCns(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // ── VIRTUALIZATION LOGIC ──
    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: cnEntries.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const cn = cnEntries[index];
            if (!cn) return 80;
            const expanded = expandedCns[cn.id] ?? true;
            if (!expanded) return 76; // Header height approx
            
            // If expanded, height = header + inner content (estimated)
            // Estimation: header(76) + padding(24) + groups * (groupHeader(36) + (permsRow * 42))
            const innerGroups = permissionGroups.length;
            return 76 + 24 + (innerGroups * 100); 
        },
        overscan: 3,
    });

    // Re-measure when expansion changes
    useEffect(() => {
        rowVirtualizer.measure();
    }, [expandedCns, rowVirtualizer]);

    if (cnEntries.length === 0) return null;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Legend */}
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
                    display: 'flex',
                    gap: 2.5,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary' }}>
                    CHÚ GIẢI:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CheckCircleIcon sx={{ fontSize: 14, color: '#22c55e' }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        Được phép (cả 2 chiều)
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <BlockIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        Bị CN chặn (đã cấp chức năng, nhưng CN không cho action này)
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RemoveCircleOutlineIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        Chưa cấp quyền chức năng
                    </Typography>
                </Box>
            </Box>

            {/* CN sections (Virtualized) */}
            <Box 
                ref={parentRef}
                sx={{ 
                    maxHeight: 'calc(100vh - 420px)', 
                    overflow: 'auto', 
                    pr: 1,
                    position: 'relative',
                    // Custom scrollbar
                    '&::-webkit-scrollbar': { width: 5 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.divider, 0.4), borderRadius: 3 },
                }}
            >
                <Box
                    sx={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const cnEntry = cnEntries[virtualItem.index];
                        if (!cnEntry) return null;

                        const cnColor = getCnColor(cnEntry.id);
                        const isExpanded = expandedCns[cnEntry.id] ?? true;

                        // Count effective permissions across all groups for this CN
                        let effectiveCount = 0;
                        for (const group of permissionGroups) {
                            for (const perm of group.permissions) {
                                const action = codeToAction(perm.code);
                                if (action !== null) {
                                    if (checkedSet.has(perm.code) && cnEntry.actionSet.has(action)) {
                                        effectiveCount++;
                                    }
                                } else if (checkedSet.has(perm.code)) {
                                    effectiveCount++;
                                }
                            }
                        }

                        const allowedActionsText = cnEntry.actions.map(a => ACTION_VI[a] || a).join(', ');

                        return (
                            <Box
                                key={virtualItem.key}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                    pb: 2, // spacing between sections
                                }}
                            >
                                <Box
                                    sx={{
                                        borderRadius: 3,
                                        border: `1.5px solid ${alpha(cnColor, 0.35)}`,
                                        bgcolor: 'background.paper',
                                        overflow: 'hidden',
                                        transition: 'box-shadow 0.2s',
                                        '&:hover': {
                                            boxShadow: `0 2px 12px ${alpha(cnColor, 0.1)}`,
                                        },
                                    }}
                                >
                                    {/* CN Header */}
                                    <Box
                                        onClick={() => toggleCn(cnEntry.id)}
                                        sx={{
                                            px: 2.5,
                                            py: 1.75,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.25,
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            bgcolor: alpha(cnColor, 0.05),
                                            borderBottom: isExpanded ? `1px solid ${alpha(cnColor, 0.15)}` : 'none',
                                        }}
                                    >
                                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: cnColor, flexShrink: 0 }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: 'text.primary' }}>
                                                    Nhóm {cnEntry.id.charAt(0).toUpperCase() + cnEntry.id.slice(1)}
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={cnEntry.isOwn ? 'CN Gốc' : 'Truy cập chéo'}
                                                    sx={{
                                                        height: 20, fontSize: 10, fontWeight: 700,
                                                        bgcolor: cnEntry.isOwn ? alpha(cnColor, 0.15) : alpha(theme.palette.warning.main, 0.12),
                                                        color: cnEntry.isOwn ? cnColor : theme.palette.warning.dark,
                                                    }}
                                                />
                                            </Box>
                                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                                                Thao tác cho phép: <strong>{allowedActionsText}</strong>
                                            </Typography>
                                        </Box>
                                        <Chip
                                            size="small"
                                            label={`${effectiveCount} quyền hiệu lực`}
                                            sx={{
                                                height: 22, fontSize: 10.5, fontWeight: 700,
                                                bgcolor: effectiveCount > 0 ? alpha('#22c55e', 0.1) : alpha(theme.palette.error.main, 0.08),
                                                color: effectiveCount > 0 ? '#16a34a' : theme.palette.error.main,
                                            }}
                                        />
                                        <IconButton size="small" sx={{ ml: 0.5 }}>
                                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>

                                    {/* CN Permission Groups */}
                                    <Collapse in={isExpanded}>
                                        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {permissionGroups.map((group) => {
                                                const GIcon = GROUP_ICON_MAP[group.group];
                                                const permStatuses = group.permissions.map(perm => {
                                                    const action = codeToAction(perm.code);
                                                    const isChecked = checkedSet.has(perm.code);
                                                    let status: PermStatus = !isChecked ? 'not-granted' : (action === null || cnEntry.actionSet.has(action) ? 'effective' : 'blocked-by-cn');
                                                    return { ...perm, status, action };
                                                });
                                                const groupEffective = permStatuses.filter(p => p.status === 'effective').length;
                                                const groupBlocked = permStatuses.filter(p => p.status === 'blocked-by-cn').length;

                                                return (
                                                    <Box key={group.group} sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                                                        <Box sx={{ px: 1.75, py: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(theme.palette.divider, 0.08) }}>
                                                            {GIcon && <GIcon sx={{ fontSize: 15, color: 'text.secondary' }} />}
                                                            <Typography sx={{ fontWeight: 700, fontSize: 12.5, flex: 1, color: 'text.primary' }}>{group.group}</Typography>
                                                            <Chip size="small" label={`${groupEffective}/${group.permissions.length}`} sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha('#22c55e', 0.1), color: '#16a34a' }} />
                                                            {groupBlocked > 0 && <Chip size="small" label={`${groupBlocked} bị CN chặn`} sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: alpha('#f59e0b', 0.08), color: '#92400e' }} />}
                                                        </Box>
                                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1px', bgcolor: theme.palette.divider }}>
                                                            {permStatuses.map((perm) => {
                                                                const sC = {
                                                                    effective: { icon: CheckCircleIcon, iconColor: '#22c55e', textColor: 'text.primary', fontWeight: 600, bg: 'background.paper', opacity: 1 },
                                                                    'blocked-by-cn': { icon: BlockIcon, iconColor: '#f59e0b', textColor: '#92400e', fontWeight: 500, bg: alpha('#f59e0b', 0.04), opacity: 0.75 },
                                                                    'not-granted': { icon: RemoveCircleOutlineIcon, iconColor: '#94a3b8', textColor: 'text.disabled', fontWeight: 400, bg: 'background.paper', opacity: 0.5 },
                                                                }[perm.status];
                                                                const SI = sC.icon;
                                                                return (
                                                                    <Box key={perm.code} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: sC.bg, opacity: sC.opacity }}>
                                                                        <SI sx={{ fontSize: 15, color: sC.iconColor, flexShrink: 0 }} />
                                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                            <Typography sx={{ fontSize: 12, fontWeight: sC.fontWeight, color: sC.textColor, lineHeight: 1.3, textDecoration: perm.status === 'blocked-by-cn' ? 'line-through' : 'none' }}>{perm.name}</Typography>
                                                                            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace" }}>{perm.code}</Typography>
                                                                        </Box>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Collapse>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
};

export default CnGroupedPermissionView;
