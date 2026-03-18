import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import BarChartIcon from '@mui/icons-material/BarChart';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import GroupsIcon from '@mui/icons-material/Groups';
import TuneIcon from '@mui/icons-material/Tune';

const GROUP_ICON_MAP: Record<string, React.ElementType> = {
    'Trang bị kỹ thuật': BuildIcon,
    'Quản lý kỹ thuật':  HandymanIcon,
    'Báo cáo & thống kê': BarChartIcon,
    'Quản lý đơn vị':    CorporateFareIcon,
    'Nhân viên':         GroupsIcon,
    'Cấu hình hệ thống': TuneIcon,
};

import type { Role, PermissionGroup } from '../../../types/permission';

// ── Permission Item (memoized) ────────────────────────────────────────────────

interface PermissionItemProps {
    code: string;
    name: string;
    checked: boolean;
    disabled: boolean;
    roleColor: string;
    onToggle: (code: string) => void;
}

const PermissionItem = React.memo(function PermissionItem({
    code, name, checked, disabled, roleColor, onToggle,
}: PermissionItemProps) {
    const theme = useTheme();

    return (
        <Box
            onClick={disabled ? undefined : () => onToggle(code)}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 2,
                py: 1.25,
                bgcolor: 'background.paper',
                cursor: disabled ? 'default' : 'pointer',
                transition: 'background 0.15s',
                '&:hover': disabled ? {} : { bgcolor: alpha(roleColor, 0.04) },
            }}
        >
            {/* Checkbox */}
            <Box
                sx={{
                    width: 18,
                    height: 18,
                    borderRadius: 0.75,
                    flexShrink: 0,
                    border: `1.5px solid ${checked ? roleColor : theme.palette.divider}`,
                    bgcolor: checked ? roleColor : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                }}
            >
                {checked && (
                    <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1, mt: '-1px' }}>
                        ✓
                    </Typography>
                )}
            </Box>

            {/* Label */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: 'text.primary', lineHeight: 1.3 }}>
                    {name}
                </Typography>
                <Typography
                    sx={{
                        fontSize: 10,
                        color: 'text.disabled',
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        letterSpacing: '0.02em',
                    }}
                >
                    {code}
                </Typography>
            </Box>
        </Box>
    );
});

// ── Permission Group ──────────────────────────────────────────────────────────

interface PermissionGroupCardProps {
    group: PermissionGroup;
    checkedCodes: string[];
    isSystem: boolean;
    roleColor: string;
    expanded: boolean;
    onToggleExpand: () => void;
    onTogglePerm: (code: string) => void;
    onToggleGroup: (groupName: string) => void;
}

const PermissionGroupCard = React.memo(function PermissionGroupCard({
    group,
    checkedCodes,
    isSystem,
    roleColor,
    expanded,
    onToggleExpand,
    onTogglePerm,
    onToggleGroup,
}: PermissionGroupCardProps) {
    const theme = useTheme();

    const groupCodes = useMemo(() => group.permissions.map(p => p.code), [group.permissions]);
    const checkedCount = useMemo(() => groupCodes.filter(c => checkedCodes.includes(c)).length, [groupCodes, checkedCodes]);
    const allChecked = checkedCount === groupCodes.length;

    return (
        <Box
            sx={{
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                },
            }}
        >
            {/* Group header */}
            <Box
                onClick={onToggleExpand}
                sx={{
                    px: 2,
                    py: 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    cursor: 'pointer',
                    userSelect: 'none',
                    bgcolor: expanded ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
                    transition: 'background 0.15s',
                }}
            >
                {(() => { const IC = GROUP_ICON_MAP[group.group]; return IC ? <IC sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} /> : null; })()}
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, flex: 1, color: 'text.primary' }}>
                    {group.group}
                </Typography>

                {/* Count badge */}
                <Chip
                    label={`${checkedCount}/${groupCodes.length}`}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: allChecked ? alpha(roleColor, 0.12) : alpha(theme.palette.divider, 0.3),
                        color: allChecked ? roleColor : 'text.secondary',
                        '& .MuiChip-label': { px: 1 },
                    }}
                />

                {/* Toggle all */}
                {!isSystem && (
                    <Button
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onToggleGroup(group.group); }}
                        sx={{
                            minWidth: 'auto',
                            px: 1.25,
                            py: 0.25,
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 1.5,
                            textTransform: 'none',
                            bgcolor: allChecked ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.secondary.main, 0.08),
                            color: allChecked ? theme.palette.error.main : theme.palette.secondary.dark,
                            '&:hover': {
                                bgcolor: allChecked ? alpha(theme.palette.error.main, 0.15) : alpha(theme.palette.secondary.main, 0.15),
                            },
                        }}
                    >
                        {allChecked ? 'Bỏ tất cả' : 'Chọn tất cả'}
                    </Button>
                )}

                {/* Expand indicator */}
                <Typography sx={{ color: 'text.disabled', fontSize: 12, ml: 0.25 }}>
                    {expanded ? '▲' : '▼'}
                </Typography>
            </Box>

            {/* Permissions grid */}
            {expanded && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '1px',
                        bgcolor: theme.palette.divider,
                        borderTop: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    {group.permissions.map((perm) => (
                        <PermissionItem
                            key={perm.code}
                            code={perm.code}
                            name={perm.name}
                            checked={checkedCodes.includes(perm.code)}
                            disabled={isSystem}
                            roleColor={roleColor}
                            onToggle={onTogglePerm}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
});

// ── RolePermissionPanel ───────────────────────────────────────────────────────

interface RolePermissionPanelProps {
    selectedRole: Role | undefined;
    permissionGroups: PermissionGroup[];
    checkedPermissions: string[];
    onTogglePermission: (code: string) => void;
    onToggleGroup: (groupName: string) => void;
}

const RolePermissionPanel: React.FC<RolePermissionPanelProps> = ({
    selectedRole,
    permissionGroups,
    checkedPermissions,
    onTogglePermission,
    onToggleGroup,
}) => {
    const theme = useTheme();
    const isSystem = selectedRole?.type === 'SYSTEM';

    const [search, setSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
        () => Object.fromEntries(permissionGroups.map(g => [g.group, true]))
    );

    const allPermCodes = useMemo(
        () => permissionGroups.flatMap(g => g.permissions.map(p => p.code)),
        [permissionGroups],
    );
    const allPermCodesSet = useMemo(() => new Set(allPermCodes), [allPermCodes]);
    const totalPerms = allPermCodes.length;
    const checkedCount = useMemo(
        () => checkedPermissions.filter(c => allPermCodesSet.has(c)).length,
        [checkedPermissions, allPermCodesSet],
    );
    const progress = totalPerms > 0 ? (checkedCount / totalPerms) * 100 : 0;

    const filteredGroups = useMemo(() => {
        if (!search.trim()) return permissionGroups;
        const q = search.toLowerCase();
        return permissionGroups
            .map(g => ({
                ...g,
                permissions: g.permissions.filter(
                    p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
                ),
            }))
            .filter(g => g.permissions.length > 0);
    }, [permissionGroups, search]);

    const handleToggleExpand = useCallback((groupName: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    }, []);

    return (
        <Box>
            {/* Progress bar + search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Tổng quyền được cấp
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            {checkedCount}/{totalPerms}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 5,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.divider, 0.3),
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: selectedRole?.color || theme.palette.primary.main,
                                transition: 'width 0.3s ease',
                            },
                        }}
                    />
                </Box>
                <TextField
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm quyền..."
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
            </Box>

            {/* System role warning */}
            {isSystem && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        mb: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.06),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    }}
                >
                    <LockOpenIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: theme.palette.warning.dark, fontWeight: 600, fontSize: 12 }}>
                        Role hệ thống chỉ xem, không chỉnh sửa. Hãy clone thành custom role để tùy biến.
                    </Typography>
                </Box>
            )}

            {/* Permission groups */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredGroups.map((group) => (
                    <PermissionGroupCard
                        key={group.group}
                        group={group}
                        checkedCodes={checkedPermissions}
                        isSystem={isSystem}
                        roleColor={selectedRole?.color || theme.palette.primary.main}
                        expanded={expandedGroups[group.group] ?? true}
                        onToggleExpand={() => handleToggleExpand(group.group)}
                        onTogglePerm={onTogglePermission}
                        onToggleGroup={onToggleGroup}
                    />
                ))}
            </Box>
        </Box>
    );
};

export default RolePermissionPanel;
