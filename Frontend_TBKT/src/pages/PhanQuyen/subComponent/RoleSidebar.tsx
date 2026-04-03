import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
    const parentRef = useRef<HTMLDivElement>(null);

    // ── VIRTUALIZATION LOGIC ──
    // 1. Flatten roles into a single list of rows (Headers + Items)
    const sidebarRows = useMemo(() => {
        const rows: ({ type: 'header'; label: string; count?: number } | { type: 'role'; data: Role; isSystem: boolean })[] = [];
        
        if (systemRoles.length > 0) {
            rows.push({ type: 'header', label: 'HỆ THỐNG' });
            systemRoles.forEach(r => rows.push({ type: 'role', data: r, isSystem: true }));
        }
        
        if (customRoles.length > 0) {
            rows.push({ type: 'header', label: 'TÙY CHỈNH', count: customRoles.length });
            customRoles.forEach(r => rows.push({ type: 'role', data: r, isSystem: false }));
        }
        
        return rows;
    }, [systemRoles, customRoles]);

    // 2. Initialize virtualizer
    const rowVirtualizer = useVirtualizer({
        count: sidebarRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => (sidebarRows[index]?.type === 'header' ? 32 : 44),
        overscan: 10,
    });

    // Sync measurement when list structure changes
    useEffect(() => {
        rowVirtualizer.measure();
    }, [sidebarRows, rowVirtualizer]);

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

            {/* Scrollable role list (Virtual) */}
            <Box 
                ref={parentRef}
                sx={{ 
                    flex: 1, 
                    overflow: 'auto', 
                    px: 1, 
                    py: 1,
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
                        const row = sidebarRows[virtualItem.index];
                        if (!row) return null;

                        if (row.type === 'header') {
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
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        px: 1.25,
                                        pt: virtualItem.index === 0 ? 0.5 : 2,
                                        pb: 0.5,
                                        zIndex: 1,
                                        bgcolor: isDark ? 'background.paper' : '#ffffff', // Background to prevent overlap during scroll
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
                                        {row.label}
                                    </Typography>
                                    {row.count !== undefined && (
                                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: 'primary.main' }}>
                                            {row.count} role
                                        </Typography>
                                    )}
                                </Box>
                            );
                        }

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
                                <SidebarRole
                                    role={row.data}
                                    selected={selectedRoleId === row.data.id}
                                    onClick={() => onSelectRole(row.data.id)}
                                    onDelete={!row.isSystem ? () => onDeleteRole(row.data.id) : undefined}
                                />
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            {/* Create button */}
            <Box sx={{ p: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Box
                    onClick={onCreateRole}
                    sx={{
                        width: '100%',
                        py: 1.25,
                        px: 1.5,
                        borderRadius: 2.5,
                        border: `1.5px dashed ${theme.palette.divider}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        color: 'text.secondary',
                        fontSize: 12,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                            transform: 'translateY(-1px)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                        }
                    }}
                >
                    <AddCircleOutlineIcon sx={{ fontSize: 18 }} />
                    Tạo custom role
                </Box>
            </Box>
        </Box>
    );
};

export default RoleSidebar;
