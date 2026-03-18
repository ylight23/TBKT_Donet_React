import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type { Role } from '../../../types/permission';

// ── SidebarRole (memoized) ─────────────────────────────────────────────────────

interface SidebarRoleProps {
    role: Role;
    selected: boolean;
    onClick: () => void;
    onDelete?: () => void;
}

const SidebarRole = React.memo(function SidebarRole({ role, selected, onClick, onDelete }: SidebarRoleProps) {
    const [hovered, setHovered] = useState(false);
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.9,
                borderRadius: 1.5,
                cursor: 'pointer',
                mb: 0.25,
                bgcolor: selected
                    ? isDark ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.08)
                    : hovered
                        ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                        : 'transparent',
                transition: 'all 0.15s ease',
                border: selected ? `1px solid ${alpha(theme.palette.primary.main, 0.25)}` : '1px solid transparent',
            }}
        >
            {/* Color dot */}
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: 0.5,
                    bgcolor: role.color,
                    flexShrink: 0,
                    boxShadow: selected ? `0 0 6px ${role.color}80` : 'none',
                    transition: 'box-shadow 0.2s',
                }}
            />
            {/* Role name */}
            <Typography
                noWrap
                sx={{
                    fontSize: 13,
                    flex: 1,
                    color: selected ? 'text.primary' : 'text.secondary',
                    fontWeight: selected ? 600 : 400,
                    letterSpacing: '-0.01em',
                }}
            >
                {role.name}
            </Typography>
            {/* User count */}
            <Typography
                sx={{
                    fontSize: 10,
                    color: 'text.disabled',
                    flexShrink: 0,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                }}
            >
                {role.userCount}
            </Typography>
            {/* Delete button */}
            {onDelete && hovered && !selected && (
                <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    sx={{
                        p: 0.25,
                        color: 'text.disabled',
                        '&:hover': { color: 'error.main' },
                    }}
                >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
            )}
        </Box>
    );
});

// ── RoleSidebar ────────────────────────────────────────────────────────────────

interface RoleSidebarProps {
    systemRoles: Role[];
    customRoles: Role[];
    selectedRoleId: string;
    onSelectRole: (roleId: string) => void;
    onDeleteRole: (roleId: string) => void;
    onCreateRole: () => void;
}

const RoleSidebar: React.FC<RoleSidebarProps> = ({
    systemRoles,
    customRoles,
    selectedRoleId,
    onSelectRole,
    onDeleteRole,
    onCreateRole,
}) => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box
            sx={{
                width: 260,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: isDark ? 'background.paper' : '#ffffff',
                borderRight: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box sx={{ px: 2, pt: 2.5, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography
                    variant="overline"
                    sx={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: 'text.disabled',
                        display: 'block',
                        mb: 0.25,
                    }}
                >
                    PHÂN QUYỀN
                </Typography>
                <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}
                >
                    Quản lý Role
                </Typography>
            </Box>

            {/* Scrollable role list */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1.5 }}>
                {/* System roles */}
                <Typography
                    variant="overline"
                    sx={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        color: 'text.disabled',
                        px: 1,
                        pb: 0.5,
                        display: 'block',
                    }}
                >
                    HỆ THỐNG
                </Typography>
                {systemRoles.map((role) => (
                    <SidebarRole
                        key={role.id}
                        role={role}
                        selected={selectedRoleId === role.id}
                        onClick={() => onSelectRole(role.id)}
                    />
                ))}

                {/* Custom roles */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: 1,
                        pt: 2,
                        pb: 0.5,
                    }}
                >
                    <Typography
                        variant="overline"
                        sx={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            color: 'text.disabled',
                        }}
                    >
                        TÙY CHỈNH
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: 'primary.main',
                        }}
                    >
                        {customRoles.length} role
                    </Typography>
                </Box>
                {customRoles.map((role) => (
                    <SidebarRole
                        key={role.id}
                        role={role}
                        selected={selectedRoleId === role.id}
                        onClick={() => onSelectRole(role.id)}
                        onDelete={() => onDeleteRole(role.id)}
                    />
                ))}
            </Box>

            {/* Create button */}
            <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Box
                    onClick={onCreateRole}
                    sx={{
                        width: '100%',
                        py: 1,
                        px: 1.5,
                        borderRadius: 2,
                        border: `1.5px dashed ${theme.palette.divider}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.75,
                        color: 'text.disabled',
                        fontSize: 12,
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                        },
                    }}
                >
                    <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
                    Tạo custom role
                </Box>
            </Box>
        </Box>
    );
};

export default RoleSidebar;
