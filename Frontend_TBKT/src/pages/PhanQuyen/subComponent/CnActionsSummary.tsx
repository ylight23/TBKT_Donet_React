/**
 * CnActionsSummary — Hiển thị tóm tắt quyền thao tác THỰC TẾ theo từng Chuyên Ngành.
 *
 * ⭐ Logic giao nhau 2 chiều:
 *   effectiveActions = MIN(checkedCodes[maChucNang], ActionsPerCN[cnId])
 *
 * Mỗi action badge có 3 trạng thái:
 *   🟢 Effective   — cả 2 chiều đều cho phép → user thực sự được làm
 *   🟡 CN-only     — ActionsPerCN có nhưng checkedCodes thiếu → bị chiều 1 chặn
 *   ⚪ Denied       — cả 2 chiều đều không có
 */

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { alpha, useTheme } from '@mui/material/styles';

import type { PhamViChuyenNganhConfig, PermissionAction } from '../../../types/permission';

// ── Action metadata ────────────────────────────────────────────────

const ACTION_META: Record<PermissionAction, { label: string; icon: React.ElementType; color: string }> = {
    view:       { label: 'Xem',       icon: VisibilityIcon,         color: '#3b82f6' },
    add:        { label: 'Thêm',      icon: AddCircleOutlineIcon,   color: '#22c55e' },
    edit:       { label: 'Sửa',       icon: EditIcon,               color: '#f59e0b' },
    delete:     { label: 'Xoá',       icon: DeleteOutlineIcon,      color: '#ef4444' },
    approve:    { label: 'Duyệt',     icon: CheckCircleOutlineIcon, color: '#8b5cf6' },
    unapprove:  { label: 'Huỷ duyệt', icon: CancelOutlinedIcon,    color: '#a855f7' },
    download:   { label: 'Tải',       icon: DownloadIcon,           color: '#06b6d4' },
    print:      { label: 'In',        icon: PrintIcon,              color: '#64748b' },
};

const ALL_ACTIONS: PermissionAction[] = ['view', 'add', 'edit', 'delete', 'approve', 'unapprove', 'download', 'print'];

// ── ChuyenNganh color fallback ────────────────────────────────────

const CN_COLORS: Record<string, string> = {
    radar:      '#3b82f6',
    thongtin:   '#0ea5a4',
    tcdt:       '#06b6d4',
    tauthuyen:  '#f59e0b',
    phanhoa:    '#8b5cf6',
    ten_lua:    '#ef4444',
    khongquan:  '#1d4ed8',
    haugcan:    '#a16207',
};

function getCnColor(id: string): string {
    return CN_COLORS[id] || '#64748b';
}

// ── Component ─────────────────────────────────────────────────────

interface CnActionsSummaryProps {
    phamVi: PhamViChuyenNganhConfig | undefined;
    /** Danh sách quyền chức năng đã tick — từ RolePermissionPanel (checkedPerms) */
    checkedCodes?: string[];
    /** Module prefix hiện tại — dùng để lọc checkedCodes. Mặc định "" = hiện tất cả */
    maChucNang?: string;
}

type BadgeState = 'effective' | 'cn-only' | 'denied';

const CnActionsSummary: React.FC<CnActionsSummaryProps> = ({
    phamVi,
    checkedCodes,
    maChucNang,
}) => {
    const theme = useTheme();

    // Trích tập action từ chiều 1 (checkedCodes) cho module hiện tại
    const funcActionSet = useMemo(() => {
        if (!checkedCodes || !maChucNang) return null; // null = không filter chiều 1
        const prefix = maChucNang + '.';
        const set = new Set<string>();
        for (const code of checkedCodes) {
            if (code.startsWith(prefix)) {
                set.add(code.slice(prefix.length));
            }
        }
        return set;
    }, [checkedCodes, maChucNang]);

    const entries = useMemo(() => {
        if (!phamVi?.idChuyenNganhDoc) return [];
        return phamVi.idChuyenNganhDoc.map((entry) => {
            const cnActionSet = new Set(entry.actions);

            // Tính effective = giao nhau nếu có funcActionSet
            const effectiveSet = funcActionSet
                ? new Set(entry.actions.filter(a => funcActionSet.has(a)))
                : cnActionSet; // không có chiều 1 → effective = raw CN actions

            return {
                ...entry,
                isOwn: entry.id === phamVi.idChuyenNganh,
                cnActionSet,
                effectiveSet,
                effectiveCount: effectiveSet.size,
            };
        });
    }, [phamVi, funcActionSet]);

    if (entries.length === 0) return null;

    const hasIntersectionMode = funcActionSet !== null;

    return (
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                bgcolor: alpha(theme.palette.info.main, 0.03),
            }}
        >
            <Typography
                sx={{
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: 'text.secondary',
                    mb: 1,
                    textTransform: 'uppercase',
                }}
            >
                Quyền thao tác thực tế theo Chuyên Ngành
            </Typography>
            <Typography
                sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1, lineHeight: 1.6 }}
            >
                {hasIntersectionMode
                    ? 'Kết quả = giao nhau giữa quyền chức năng (Bước 2) và phạm vi CN (Bước 1). Chỉ action có ở CẢ HAI mới thực sự được phép.'
                    : 'Dưới đây là danh sách thao tác được phép trên từng chuyên ngành. Muốn thay đổi, quay lại tab Phạm vi.'
                }
            </Typography>
            {hasIntersectionMode && (
                <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Được phép (giao nhau)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>CN cho phép nhưng thiếu quyền chức năng</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Không có quyền</Typography>
                    </Box>
                </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {entries.map((entry) => {
                    const cnColor = getCnColor(entry.id);

                    return (
                        <Box
                            key={entry.id}
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: `1px solid ${alpha(cnColor, 0.3)}`,
                                bgcolor: entry.isOwn
                                    ? alpha(cnColor, 0.06)
                                    : 'background.paper',
                                transition: 'box-shadow 0.15s',
                                '&:hover': {
                                    boxShadow: `0 2px 8px ${alpha(cnColor, 0.12)}`,
                                },
                            }}
                        >
                            {/* Header row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '2px',
                                        bgcolor: cnColor,
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography sx={{ fontWeight: 700, fontSize: 13, flex: 1 }}>
                                    {entry.id}
                                </Typography>
                                <Chip
                                    size="small"
                                    label={entry.isOwn ? 'Chức năng chính' : 'Truy cập chéo'}
                                    sx={{
                                        height: 18,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        bgcolor: entry.isOwn
                                            ? alpha(cnColor, 0.12)
                                            : alpha(theme.palette.warning.main, 0.1),
                                        color: entry.isOwn
                                            ? cnColor
                                            : theme.palette.warning.dark,
                                    }}
                                />
                                <Chip
                                    size="small"
                                    label={hasIntersectionMode
                                        ? `${entry.effectiveCount}/${ALL_ACTIONS.length} effective`
                                        : `${entry.actions.length}/${ALL_ACTIONS.length}`
                                    }
                                    sx={{
                                        height: 18,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        bgcolor: entry.effectiveCount === 0
                                            ? alpha(theme.palette.error.main, 0.08)
                                            : alpha(theme.palette.divider, 0.3),
                                        color: entry.effectiveCount === 0
                                            ? theme.palette.error.main
                                            : 'text.secondary',
                                    }}
                                />
                            </Box>

                            {/* Action badges — 3-state rendering */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {ALL_ACTIONS.map((action) => {
                                    const meta = ACTION_META[action];
                                    const Icon = meta.icon;

                                    // Determine 3-state badge
                                    let state: BadgeState;
                                    if (entry.effectiveSet.has(action)) {
                                        state = 'effective';
                                    } else if (entry.cnActionSet.has(action)) {
                                        state = 'cn-only'; // CN allows but func doesn't
                                    } else {
                                        state = 'denied';
                                    }

                                    const tooltipText = {
                                        effective: `${meta.label}: ✅ Được phép (cả 2 chiều)`,
                                        'cn-only': `${meta.label}: ⚠️ CN cho phép nhưng chưa cấp quyền chức năng`,
                                        denied:    `${meta.label}: ❌ Không được phép`,
                                    }[state];

                                    const borderColor = {
                                        effective: alpha(meta.color, 0.5),
                                        'cn-only': alpha('#f59e0b', 0.5),
                                        denied:    theme.palette.divider,
                                    }[state];

                                    const bgColor = {
                                        effective: alpha(meta.color, 0.1),
                                        'cn-only': alpha('#f59e0b', 0.06),
                                        denied:    alpha(theme.palette.action.disabled, 0.04),
                                    }[state];

                                    const iconColor = {
                                        effective: meta.color,
                                        'cn-only': '#f59e0b',
                                        denied:    theme.palette.text.disabled,
                                    }[state];

                                    return (
                                        <Tooltip key={action} title={tooltipText} arrow>
                                            <Box
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.4,
                                                    px: 0.75,
                                                    py: 0.4,
                                                    borderRadius: 1,
                                                    border: `1px solid ${borderColor}`,
                                                    bgcolor: bgColor,
                                                    opacity: state === 'denied' ? 0.4 : 1,
                                                    transition: 'all 0.12s',
                                                    ...(state === 'cn-only' && {
                                                        borderStyle: 'dashed',
                                                    }),
                                                }}
                                            >
                                                <Icon sx={{ fontSize: 13, color: iconColor }} />
                                                <Typography
                                                    sx={{
                                                        fontSize: 10.5,
                                                        fontWeight: state === 'effective' ? 600 : 400,
                                                        color: state === 'effective'
                                                            ? 'text.primary'
                                                            : state === 'cn-only'
                                                                ? '#92400e'
                                                                : 'text.disabled',
                                                        textDecoration: state === 'cn-only' ? 'line-through' : 'none',
                                                    }}
                                                >
                                                    {meta.label}
                                                </Typography>
                                            </Box>
                                        </Tooltip>
                                    );
                                })}
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default CnActionsSummary;
