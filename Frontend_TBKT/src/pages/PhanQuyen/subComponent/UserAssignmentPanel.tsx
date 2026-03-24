import React, { useMemo, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaceIcon from '@mui/icons-material/Place';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import type { Role, PermissionUserRow, ScopeType } from '../../../types/permission';
import { SCOPE_TYPES } from '../data/permissionData';
import AssignUserDialog, { type AssignUserDialogValue } from './AssignUserDialog';

// ── Lookup map ─────────────────────────────────────────────────────────────────
const scopeMap = new Map(SCOPE_TYPES.map(s => [s.value, s]));

// ── User Row ──────────────────────────────────────────────────────────────────

interface UserRowProps {
    user: PermissionUserRow;
    roleColor: string;
    isSystem: boolean;
    scopeType?: ScopeType;
    onEdit: () => void;
    onRemove: () => void;
}

const UserRow = React.memo(function UserRow({ user, roleColor, isSystem, scopeType, onEdit, onRemove }: UserRowProps) {
    const theme = useTheme();
    const scopeInfo = scopeType ? scopeMap.get(scopeType) : null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.75,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                transition: 'all 0.15s',
                '&:hover': {
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.06)}`,
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                },
            }}
        >
            {/* Avatar */}
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: roleColor,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    letterSpacing: '-0.02em',
                }}
            >
                {user.avatar}
            </Box>

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>
                        {user.name}
                    </Typography>
                    {user.rank && (
                        <Chip
                            label={user.rank}
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: 9.5,
                                fontWeight: 700,
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: 'primary.main',
                                '& .MuiChip-label': { px: 0.6 },
                            }}
                        />
                    )}
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {user.email}
                </Typography>
                {user.currentOffice && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.25 }}>
                        <PlaceIcon sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0 }} />
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.disabled',
                                fontSize: 10.5,
                                fontFamily: "'JetBrains Mono', monospace",
                            }}
                        >
                            {user.currentOffice}
                        {user.currentOfficePath && (
                            <Typography
                                component="span"
                                sx={{
                                    ml: 0.75,
                                    fontSize: 9.5,
                                    color: 'text.disabled',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                {user.currentOfficePath}
                            </Typography>
                        )}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Scope badge */}
            {scopeInfo && (
                <Box sx={{ textAlign: 'right' }}>
                    <Chip
                        label={scopeInfo.label}
                        size="small"
                        sx={{
                            height: 22,
                            fontSize: 10.5,
                            fontWeight: 700,
                            bgcolor: alpha(scopeInfo.color, 0.1),
                            color: scopeInfo.color,
                            border: `1px solid ${alpha(scopeInfo.color, 0.2)}`,
                            '& .MuiChip-label': { px: 0.75 },
                        }}
                    />
                </Box>
            )}

            {/* Edit / Remove buttons */}
            {!isSystem && (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Chỉnh phạm vi" arrow>
                        <IconButton
                            size="small"
                            onClick={onEdit}
                            sx={{ color: 'text.secondary', border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), borderColor: alpha(theme.palette.primary.main, 0.3), color: 'primary.main' } }}
                        >
                            <ManageAccountsIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa khỏi nhóm" arrow>
                        <IconButton
                            size="small"
                            onClick={onRemove}
                            sx={{ color: 'text.secondary', border: `1px solid ${theme.palette.divider}`, borderRadius: 1.5, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08), borderColor: alpha(theme.palette.error.main, 0.3), color: 'error.main' } }}
                        >
                            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
});

// ── UserAssignmentPanel ───────────────────────────────────────────────────────

interface EditState {
    idAssignment: string;
    idNguoiDung: string;
    hoTen: string;
    scopeType: ScopeType;
    anchorNodeId?: string;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    idNhomChuyenNganh?: string;
}

interface UserAssignmentPanelProps {
    selectedRole: Role | undefined;
    users: PermissionUserRow[];
    onAssignUser: (payload: AssignUserDialogValue) => Promise<void>;
    onEditUser: (idAssignment: string, payload: AssignUserDialogValue) => Promise<void>;
    onRemoveUser: (idAssignment: string) => void;
}

const UserAssignmentPanel: React.FC<UserAssignmentPanelProps> = ({
    selectedRole,
    users,
    onAssignUser,
    onEditUser,
    onRemoveUser,
}) => {
    const theme = useTheme();
    const isSystem  = selectedRole?.type === 'SYSTEM';
    const roleColor = selectedRole?.color || theme.palette.primary.main;

    const [assignOpen, setAssignOpen] = useState(false);
    const [editState, setEditState]   = useState<EditState | null>(null);

    const handleOpenEdit = useCallback((user: PermissionUserRow) => {
        setEditState({
            idAssignment: user.idAssignment ?? '',
            idNguoiDung:  user.id,
            hoTen:        user.name,
            scopeType:    (user.scopeType as ScopeType) || 'SUBTREE',
            anchorNodeId: user.anchorNodeId,
            ngayHetHan: user.ngayHetHan,
            idNguoiUyQuyen: user.idNguoiUyQuyen,
            idNhomChuyenNganh: user.idNhomChuyenNganh,
        });
    }, []);

    const handleConfirmEdit = useCallback(async (payload: AssignUserDialogValue) => {
        if (!editState) return;
        await onEditUser(editState.idAssignment, payload);
    }, [editState, onEditUser]);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Danh sách người dùng có role <strong>{selectedRole?.name}</strong>
                </Typography>
                {!isSystem && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AssignmentIndIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => setAssignOpen(true)}
                        sx={{ px: 2, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 700, textTransform: 'none' }}
                    >
                        Gán user
                    </Button>
                )}
            </Box>

            {/* User list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {users.map((user) => (
                    <UserRow
                        key={user.idAssignment || user.id}
                        user={user}
                        roleColor={roleColor}
                        isSystem={isSystem}
                        scopeType={(user.scopeType as ScopeType) || 'SUBTREE'}
                        onEdit={() => handleOpenEdit(user)}
                        onRemove={() => user.idAssignment && onRemoveUser(user.idAssignment)}
                    />
                ))}
            </Box>

            {/* Empty state */}
            {users.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                    <PeopleAltIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Chưa có người dùng nào với role này
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                        Nhấn "Gán user" để thêm người dùng mới
                    </Typography>
                </Box>
            )}

            {/* Assign user dialog */}
            <AssignUserDialog
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                roleName={selectedRole?.name ?? ''}
                roleColor={roleColor}
                onConfirm={onAssignUser}
            />

            {/* Edit scope dialog */}
            {editState && (
                <AssignUserDialog
                    open={!!editState}
                    onClose={() => setEditState(null)}
                    roleName={selectedRole?.name ?? ''}
                    roleColor={roleColor}
                    editMode
                    initialIdNguoiDung={editState.idNguoiDung}
                    initialHoTen={editState.hoTen}
                    initialScope={editState.scopeType}
                    initialAnchorNodeId={editState.anchorNodeId}
                    initialNgayHetHan={editState.ngayHetHan}
                    initialIdNguoiUyQuyen={editState.idNguoiUyQuyen}
                    initialIdNhomChuyenNganh={editState.idNhomChuyenNganh}
                    onConfirm={handleConfirmEdit}
                />
            )}
        </Box>
    );
};

export default UserAssignmentPanel;
