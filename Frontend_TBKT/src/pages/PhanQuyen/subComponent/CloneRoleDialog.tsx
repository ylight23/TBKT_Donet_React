import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import { alpha } from '@mui/material/styles';

import CommonDialog from '../../../components/Dialog/CommonDialog';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import type { Role } from '../../../types/permission';
import { ROLE_COLORS } from '../data/permissionData';

// ── CloneRoleDialog ───────────────────────────────────────────────────────────

interface CloneRoleDialogProps {
    open: boolean;
    onClose: () => void;
    systemRoles: Role[];
    onClone: (name: string, cloneFrom: string, color: string) => void;
}

const CloneRoleDialog: React.FC<CloneRoleDialogProps> = ({
    open,
    onClose,
    systemRoles,
    onClone,
}) => {
    const [newRoleName, setNewRoleName] = useState('');
    const [cloneFrom, setCloneFrom] = useState<string>(() => systemRoles[0]?.id ?? '');
    const [newRoleColor, setNewRoleColor] = useState(() =>
        ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)]
    );

    const handleConfirm = useCallback(() => {
        if (!newRoleName.trim()) return;
        onClone(newRoleName.trim(), cloneFrom, newRoleColor);
        setNewRoleName('');
        setNewRoleColor(ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)]);
    }, [newRoleName, cloneFrom, newRoleColor, onClone]);

    const handleClose = useCallback(() => {
        setNewRoleName('');
        onClose();
    }, [onClose]);

    return (
        <CommonDialog
            open={open}
            onClose={handleClose}
            title="Tạo custom role"
            subtitle="Clone từ system role rồi tùy chỉnh quyền hạn theo nhu cầu"
            mode="add"
            icon={<ContentCopyIcon />}
            maxWidth="sm"
            onConfirm={handleConfirm}
            confirmText="Tạo role"
            disabled={!newRoleName.trim()}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
                {/* Role name */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                    >
                        TÊN ROLE MỚI
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="VD: Kế toán chi nhánh HN"
                        autoFocus
                    />
                </Box>

                {/* Clone from */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                    >
                        CLONE TỪ SYSTEM ROLE
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {systemRoles.map((r) => {
                            const isActive = cloneFrom === r.id;

                            return (
                                <Box
                                    key={r.id}
                                    onClick={() => setCloneFrom(r.id)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                        p: 1.25,
                                        border: `1.5px solid ${isActive ? r.color : 'divider'}`,
                                        borderColor: isActive ? r.color : 'divider',
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        bgcolor: isActive ? alpha(r.color, 0.04) : 'transparent',
                                        transition: 'all 0.15s',
                                        '&:hover': {
                                            borderColor: r.color,
                                            bgcolor: alpha(r.color, 0.02),
                                        },
                                    }}
                                >
                                    {/* Radio-like indicator */}
                                    <Box
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            border: `2px solid ${isActive ? r.color : 'divider'}`,
                                            borderColor: isActive ? r.color : 'divider',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {isActive && (
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: r.color }} />
                                        )}
                                    </Box>
                                    {/* Color dot */}
                                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: r.color, flexShrink: 0 }} />
                                    {/* Name */}
                                    <Typography sx={{ fontSize: 13, fontWeight: isActive ? 600 : 400, flex: 1 }}>
                                        {r.name}
                                    </Typography>

                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                {/* Color picker */}
                <Box>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}
                    >
                        MÀU NHẬN DIỆN
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {ROLE_COLORS.map((c) => (
                            <Box
                                key={c}
                                onClick={() => setNewRoleColor(c)}
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 1.5,
                                    bgcolor: c,
                                    cursor: 'pointer',
                                    outline: newRoleColor === c ? `2.5px solid ${c}` : 'none',
                                    outlineOffset: 2.5,
                                    transition: 'all 0.15s',
                                    '&:hover': {
                                        transform: 'scale(1.15)',
                                    },
                                }}
                            />
                        ))}
                    </Box>
                </Box>
            </Box>
        </CommonDialog>
    );
};

export default CloneRoleDialog;
