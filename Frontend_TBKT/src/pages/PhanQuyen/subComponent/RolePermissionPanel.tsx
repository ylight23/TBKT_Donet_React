import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import BarChartIcon from '@mui/icons-material/BarChart';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import GroupsIcon from '@mui/icons-material/Groups';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';

import type { Role, Permission, PermissionGroup } from '../../../types/permission';

const GROUP_ICON_MAP: Record<string, React.ElementType> = {
    'Trang bi ky thuat': BuildIcon,
    'Quan ly ky thuat': HandymanIcon,
    'Bao cao va thong ke': BarChartIcon,
    'Quan ly don vi': CorporateFareIcon,
    'Nhan vien': GroupsIcon,
    'Cau hinh he thong': TuneIcon,
};

function isDefaultViewPermission(permission: Permission): boolean {
    return permission.code.endsWith('.view') || permission.name.toLowerCase().startsWith('xem ');
}

function isSensitivePermission(permission: Permission): boolean {
    const code = permission.code.toLowerCase();
    const name = permission.name.toLowerCase();
    return (
        code.includes('delete')
        || code.includes('approve')
        || code.includes('unapprove')
        || name.includes('xoa')
        || name.includes('huy')
        || name.includes('duyet')
        || name.includes('phe duyet')
    );
}

interface PermissionRowProps {
    permission: Permission;
    checked: boolean;
    disabled: boolean;
    roleColor: string;
    showCode: boolean;
    onToggle: (code: string) => void;
}

function PermissionRow({
    permission,
    checked,
    disabled,
    roleColor,
    showCode,
    onToggle,
}: PermissionRowProps) {
    const theme = useTheme();
    const isView = isDefaultViewPermission(permission);

    return (
        <Box
            sx={{
                px: 1,
                py: 0.75,
                bgcolor: checked
                    ? '#C8E6C9'
                    : '#F3F4F6',
                minHeight: '100%',
                boxShadow: checked
                    ? `inset 0 0 0 1px ${alpha(theme.palette.success.dark, 0.55)}`
                    : `inset 0 0 0 1px ${alpha(theme.palette.grey[500], 0.1)}`,
            }}
        >
            <FormControlLabel
                sx={{
                    m: 0,
                    width: '100%',
                    alignItems: 'flex-start',
                    '.MuiFormControlLabel-label': {
                        width: '100%',
                    },
                }}
                control={(
                    <Checkbox
                        size="small"
                        checked={checked}
                        disabled={disabled || isView}
                        onChange={() => onToggle(permission.code)}
                        sx={{
                            py: 0.25,
                            color: alpha(theme.palette.success.dark, 0.35),
                            '&.Mui-checked': { color: theme.palette.success.dark },
                        }}
                    />
                )}
                label={(
                    <Box sx={{ minWidth: 0, pt: 0.4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: 13, fontWeight: checked ? 700 : 500, color: 'text.primary' }}>
                                {permission.name}
                            </Typography>
                            {isView && (
                                <Chip
                                    size="small"
                                    icon={<VisibilityIcon />}
                                    label="Mac dinh"
                                    sx={{
                                        height: 18,
                                        bgcolor: alpha(roleColor, 0.12),
                                        color: roleColor,
                                        '& .MuiChip-label': { px: 0.75, fontSize: 10, fontWeight: 700 },
                                        '& .MuiChip-icon': { fontSize: 12 },
                                    }}
                                />
                            )}
                        </Box>
                        {showCode && (
                            <Typography
                                sx={{
                                    mt: 0.25,
                                    fontSize: 10,
                                    color: 'text.secondary',
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    wordBreak: 'break-word',
                                }}
                            >
                                {permission.code}
                            </Typography>
                        )}
                    </Box>
                )}
            />
        </Box>
    );
}

interface PermissionGroupCardProps {
    group: PermissionGroup;
    checkedCodes: string[];
    isSystem: boolean;
    roleColor: string;
    expanded: boolean;
    showCode: boolean;
    onToggleExpand: () => void;
    onTogglePerm: (code: string) => void;
    onToggleGroup: (groupName: string) => void;
}

function PermissionGroupCard({
    group,
    checkedCodes,
    isSystem,
    roleColor,
    expanded,
    showCode,
    onToggleExpand,
    onTogglePerm,
    onToggleGroup,
}: PermissionGroupCardProps) {
    const theme = useTheme();
    const Icon = GROUP_ICON_MAP[group.group];

    const regularPermissions = useMemo(
        () => group.permissions,
        [group.permissions],
    );
    const actionablePermissions = useMemo(
        () => group.permissions.filter((permission) => !isDefaultViewPermission(permission)),
        [group.permissions],
    );

    const groupCodes = useMemo(() => group.permissions.map((permission) => permission.code), [group.permissions]);
    const actionableCodes = useMemo(() => actionablePermissions.map((permission) => permission.code), [actionablePermissions]);
    const checkedCount = useMemo(
        () => groupCodes.filter((code) => checkedCodes.includes(code)).length,
        [checkedCodes, groupCodes],
    );
    const actionableCheckedCount = useMemo(
        () => actionableCodes.filter((code) => checkedCodes.includes(code)).length,
        [actionableCodes, checkedCodes],
    );
    const totalCount = groupCodes.length;
    const allActionableChecked = actionableCodes.length > 0 && actionableCheckedCount === actionableCodes.length;
    return (
        <Box
            sx={{
                border: `1.5px solid ${alpha(roleColor, 0.22)}`,
                borderRadius: 3,
                bgcolor: 'background.paper',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                    boxShadow: `0 2px 12px ${alpha(roleColor, 0.1)}`,
                },
            }}
        >
            <Box
                sx={{
                    px: 2.25,
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    bgcolor: alpha(roleColor, 0.05),
                    borderBottom: expanded ? `1px solid ${alpha(roleColor, 0.14)}` : 'none',
                }}
            >
                {Icon ? (
                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 1.75,
                            bgcolor: alpha(roleColor, 0.1),
                            color: roleColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <Icon sx={{ fontSize: 16 }} />
                    </Box>
                ) : null}

                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'text.primary' }}>
                        {group.group}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                            Danh sách chức năng
                        </Typography>
                        <Chip
                            size="small"
                            label={`${checkedCount}/${totalCount} quyen`}
                            sx={{
                                height: 20,
                                bgcolor: allActionableChecked ? alpha('#22c55e', 0.1) : alpha(roleColor, 0.12),
                                color: allActionableChecked ? '#16a34a' : roleColor,
                                '& .MuiChip-label': {
                                    px: 0.9,
                                    fontSize: 10,
                                    fontWeight: 700,
                                },
                            }}
                        />
                    </Box>
                </Box>

                {!isSystem && actionablePermissions.length > 0 && (
                    <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        onClick={() => onToggleGroup(group.group)}
                        startIcon={allActionableChecked ? <ClearAllIcon /> : <DoneAllIcon />}
                        sx={{
                            minWidth: 'auto',
                            px: 1.75,
                            py: 0.75,
                            textTransform: 'none',
                            fontSize: 11.5,
                            fontWeight: 800,
                            borderRadius: 2,
                            boxShadow: 'none',
                            ...(allActionableChecked
                                ? {
                                    background: '#c62828 !important',
                                    backgroundColor: '#c62828 !important',
                                    color: '#ffffff !important',
                                    border: '1px solid #8e0000',
                                    '& .MuiButton-startIcon': {
                                        color: 'inherit',
                                    },
                                    '&:hover': {
                                        background: '#8e0000 !important',
                                        backgroundColor: '#8e0000 !important',
                                        color: '#ffffff !important',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    },
                                }
                                : {
                                    background: '#2e7d32 !important',
                                    backgroundColor: '#2e7d32 !important',
                                    color: '#ffffff !important',
                                    border: '1px solid #1b5e20',
                                    '& .MuiButton-startIcon': {
                                        color: 'inherit',
                                    },
                                    '&:hover': {
                                        background: '#1b5e20 !important',
                                        backgroundColor: '#1b5e20 !important',
                                        color: '#ffffff !important',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    },
                                }),
                        }}
                    >
                        {allActionableChecked ? 'Tắt tác vụ' : 'Bật tác vụ'}
                    </Button>
                )}

                <IconButton
                    size="small"
                    onClick={onToggleExpand}
                    aria-label={expanded ? `Thu gon nhom ${group.group}` : `Mo rong nhom ${group.group}`}
                    aria-expanded={expanded}
                    sx={{
                        bgcolor: expanded ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.action.disabled, 0.04),
                        color: expanded ? theme.palette.success.main : theme.palette.text.disabled,
                        border: `1.5px solid ${expanded ? alpha(theme.palette.success.main, 0.3) : theme.palette.divider}`,
                        borderRadius: 2,
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            bgcolor: expanded ? alpha(theme.palette.success.main, 0.15) : alpha(theme.palette.action.disabled, 0.1),
                        }
                    }}
                >
                    <ExpandMoreIcon fontSize="small" />
                </IconButton>
            </Box>

            {expanded && (
                <>
                    <Divider />
                    {regularPermissions.length > 0 && (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                                gap: '2px',
                                bgcolor: alpha(theme.palette.text.primary, 0.14),
                                borderTop: `1px solid ${alpha(theme.palette.text.primary, 0.18)}`,
                            }}
                        >
                            {regularPermissions.map((permission) => (
                                <PermissionRow
                                    key={permission.code}
                                    permission={permission}
                                    checked={checkedCodes.includes(permission.code)}
                                    disabled={isSystem}
                                    roleColor={roleColor}
                                    showCode={showCode}
                                    onToggle={onTogglePerm}
                                />
                            ))}
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
}

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
    const roleColor = selectedRole?.color || theme.palette.primary.main;
    const isSystem = selectedRole?.type === 'SYSTEM';

    const [search, setSearch] = useState('');
    const [showCode, setShowCode] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
        () => Object.fromEntries(permissionGroups.map((group) => [group.group, true])),
    );

    const filteredGroups = useMemo(() => {
        if (!search.trim()) return permissionGroups;
        const query = search.trim().toLowerCase();
        return permissionGroups
            .map((group) => ({
                ...group,
                permissions: group.permissions.filter((permission) => (
                    permission.name.toLowerCase().includes(query)
                    || permission.code.toLowerCase().includes(query)
                    || group.group.toLowerCase().includes(query)
                )),
            }))
            .filter((group) => group.permissions.length > 0);
    }, [permissionGroups, search]);

    const allCodes = useMemo(
        () => permissionGroups.flatMap((group) => group.permissions.map((permission) => permission.code)),
        [permissionGroups],
    );
    const allCodeSet = useMemo(() => new Set(allCodes), [allCodes]);
    const totalPermissions = allCodes.length;
    const checkedCount = useMemo(
        () => checkedPermissions.filter((code) => allCodeSet.has(code)).length,
        [allCodeSet, checkedPermissions],
    );
    const defaultViewCount = useMemo(
        () => permissionGroups.flatMap((group) => group.permissions).filter(isDefaultViewPermission).length,
        [permissionGroups],
    );
    const sensitiveCount = useMemo(
        () => permissionGroups.flatMap((group) => group.permissions).filter(isSensitivePermission).length,
        [permissionGroups],
    );
    const progress = totalPermissions > 0 ? (checkedCount / totalPermissions) * 100 : 0;

    const setAllExpanded = (expanded: boolean) => {
        setExpandedGroups(Object.fromEntries(permissionGroups.map((group) => [group.group, expanded])));
    };

    return (
        <Box>
            <Box
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 3,
                    border: `1px solid ${alpha(roleColor, 0.18)}`,
                    bgcolor: alpha(roleColor, 0.04),
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                            Danh sách quyền hệ thống
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                            Bật tắt thao tác với chức năng.
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {/* <Chip label={`${defaultViewCount} view mac dinh`} size="small" />
                        <Chip label={`${sensitiveCount} quyen nhay cam`} size="small" color="warning" variant="outlined" /> */}
                        <Chip label={`${checkedCount}/${totalPermissions} quyền`} size="small" sx={{ bgcolor: alpha(roleColor, 0.12), color: roleColor }} />
                    </Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 8,
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.divider, 0.45),
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: roleColor,
                        },
                    }}
                />
            </Box>

            <Box
                sx={{
                    display: 'flex',
                    gap: 1.5,
                    alignItems: { xs: 'stretch', md: 'center' },
                    flexDirection: { xs: 'column', md: 'row' },
                    mb: 2,
                }}
            >
                <TextField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm quyền..."
                    size="small"
                    fullWidth
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2.5,
                        },
                    }}
                />

                {/* <FormControlLabel
                    sx={{ m: 0, whiteSpace: 'nowrap' }}
                    control={<Switch size="small" checked={showCode} onChange={(event) => setShowCode(event.target.checked)} />}
                    label={<Typography sx={{ fontSize: 12 }}>Hien ma quyen</Typography>}
                /> */}

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        color="success"
                        startIcon={<ExpandMoreIcon sx={{ fontSize: '18px !important' }} />}
                        onClick={() => setAllExpanded(true)}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2.5,
                            fontWeight: 700,
                            px: 2,
                            bgcolor: alpha(theme.palette.success.main, 0.04),
                            borderColor: alpha(theme.palette.success.main, 0.3),
                            '&:hover': {
                                bgcolor: alpha(theme.palette.success.main, 0.08),
                                borderColor: theme.palette.success.main,
                            }
                        }}
                    >
                        Mở rộng
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ExpandLessIcon sx={{ fontSize: '18px !important' }} />}
                        onClick={() => setAllExpanded(false)}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2.5,
                            fontWeight: 700,
                            px: 2,
                            color: 'text.secondary',
                            borderColor: theme.palette.divider,
                            bgcolor: theme.palette.grey[100],
                            '&:hover': {
                                bgcolor: theme.palette.grey[200],
                                borderColor: theme.palette.text.disabled,
                                color: 'text.primary',
                            }
                        }}
                    >
                        Thu gọn
                    </Button>
                </Box>
            </Box>

            {isSystem && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        mb: 2,
                        borderRadius: 2.5,
                        bgcolor: alpha(theme.palette.warning.main, 0.07),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.22)}`,
                    }}
                >
                    <LockOpenIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                    <Typography sx={{ color: theme.palette.warning.dark, fontWeight: 700, fontSize: 12.5 }}>
                        Role he thong chi xem, khong chinh sua.
                    </Typography>
                </Box>
            )}

            {filteredGroups.length === 0 ? (
                <Box
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        border: `1px dashed ${theme.palette.divider}`,
                        bgcolor: 'background.paper',
                        textAlign: 'center',
                    }}
                >
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>
                        Khong tim thay quyen phu hop
                    </Typography>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {filteredGroups.map((group) => (
                        <PermissionGroupCard
                            key={group.group}
                            group={group}
                            checkedCodes={checkedPermissions}
                            isSystem={isSystem}
                            roleColor={roleColor}
                            expanded={expandedGroups[group.group] ?? true}
                            showCode={showCode}
                            onToggleExpand={() => setExpandedGroups((current) => ({
                                ...current,
                                [group.group]: !(current[group.group] ?? true),
                            }))}
                            onTogglePerm={onTogglePermission}
                            onToggleGroup={onToggleGroup}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default RolePermissionPanel;
