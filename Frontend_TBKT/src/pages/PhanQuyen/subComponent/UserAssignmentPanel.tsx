import React, { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaceIcon from '@mui/icons-material/Place';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import SortIcon from '@mui/icons-material/Sort';

import type { Role, PermissionUserRow, ScopeType, GroupScopeConfig, PhamViChuyenNganhConfig } from '../../../types/permission';
import { scopeLookup } from '../data/permissionData';
import AssignUserDialog, { type AssignUserDialogValue } from './AssignUserDialog';

const scopeMap = scopeLookup;

type SortMode = 'name_asc' | 'name_desc' | 'office_asc' | 'scope_asc' | 'expiry_asc';

interface EditState {
    idAssignment: string;
    idNguoiDung: string;
    hoTen: string;
    scopeType: ScopeType;
    anchorNodeId?: string;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    phamViChuyenNganh?: PhamViChuyenNganhConfig;
}

interface UserAssignmentPanelProps {
    selectedRole: Role | undefined;
    users: PermissionUserRow[];
    defaultScopeConfig: GroupScopeConfig;
    onAssignUser: (payload: AssignUserDialogValue) => Promise<void>;
    onEditUser: (idAssignment: string, payload: AssignUserDialogValue) => Promise<void>;
    onRemoveUser: (idAssignment: string) => void;
}

const formatDate = (value?: string): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN').format(date);
};

const getAvatar = (name: string): string =>
    name.split(' ').map((part) => part[0] || '').join('').slice(0, 2).toUpperCase() || '?';

const getPhamViSummary = (phamVi?: PhamViChuyenNganhConfig) => ({
    hasCn: Boolean(phamVi?.idChuyenNganh),
    primary: phamVi?.idChuyenNganh ?? '',
    extraCount: Math.max(0, (phamVi?.idChuyenNganhDoc.length ?? 0) - 1),
    actionCount: phamVi?.idChuyenNganhDoc.reduce((sum, entry) => sum + entry.actions.length, 0) ?? 0,
});

const UserAssignmentPanel: React.FC<UserAssignmentPanelProps> = ({
    selectedRole,
    users,
    defaultScopeConfig,
    onAssignUser,
    onEditUser,
    onRemoveUser,
}) => {
    const theme = useTheme();
    const isSystem = selectedRole?.type === 'SYSTEM';
    const roleColor = selectedRole?.color || theme.palette.primary.main;

    const [assignOpen, setAssignOpen] = useState(false);
    const [editState, setEditState] = useState<EditState | null>(null);
    const [search, setSearch] = useState('');
    const [scopeFilter, setScopeFilter] = useState<'ALL' | string>('ALL');
    const [cnFilter, setCnFilter] = useState<'ALL' | 'WITH_CN' | 'NO_CN'>('ALL');
    const [sortMode, setSortMode] = useState<SortMode>('name_asc');

    const summary = useMemo(() => {
        const now = Date.now();
        return {
            total: users.length,
            withCn: users.filter((user) => !!user.phamViChuyenNganh?.idChuyenNganhDoc?.length).length,
            delegated: users.filter((user) => user.scopeType === 'DELEGATED').length,
            expired: users.filter((user) => user.ngayHetHan && new Date(user.ngayHetHan).getTime() < now).length,
        };
    }, [users]);

    const availableScopes = useMemo(() => {
        const set = new Set<string>();
        users.forEach((user) => {
            if (user.scopeType) set.add(user.scopeType);
        });
        return Array.from(set);
    }, [users]);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        const result = users.filter((user) => {
            if (scopeFilter !== 'ALL' && user.scopeType !== scopeFilter) return false;
            if (cnFilter === 'WITH_CN' && !user.phamViChuyenNganh?.idChuyenNganhDoc?.length) return false;
            if (cnFilter === 'NO_CN' && user.phamViChuyenNganh?.idChuyenNganhDoc?.length) return false;

            if (!normalizedSearch) return true;

            const haystack = [
                user.name,
                user.id,
                user.currentOffice,
                user.currentOfficePath,
                user.anchorNodeId,
                user.anchorNodeName,
                user.phamViChuyenNganh?.idChuyenNganh,
                ...(user.phamViChuyenNganh?.idChuyenNganhDoc.map((entry) => entry.id) ?? []),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalizedSearch);
        });

        const sorted = [...result];
        sorted.sort((a, b) => {
            switch (sortMode) {
                case 'name_desc':
                    return (b.name || '').localeCompare(a.name || '', 'vi');
                case 'office_asc':
                    return (a.currentOffice || '').localeCompare(b.currentOffice || '', 'vi');
                case 'scope_asc':
                    return (a.scopeType || '').localeCompare(b.scopeType || '', 'vi');
                case 'expiry_asc': {
                    const aValue = a.ngayHetHan ? new Date(a.ngayHetHan).getTime() : Number.MAX_SAFE_INTEGER;
                    const bValue = b.ngayHetHan ? new Date(b.ngayHetHan).getTime() : Number.MAX_SAFE_INTEGER;
                    return aValue - bValue;
                }
                case 'name_asc':
                default:
                    return (a.name || '').localeCompare(b.name || '', 'vi');
            }
        });
        return sorted;
    }, [users, search, scopeFilter, cnFilter, sortMode]);

    const handleOpenEdit = useCallback((user: PermissionUserRow) => {
        setEditState({
            idAssignment: user.idAssignment ?? '',
            idNguoiDung: user.id,
            hoTen: user.name,
            scopeType: (user.scopeType as ScopeType) || 'SUBTREE',
            anchorNodeId: user.anchorNodeId,
            ngayHetHan: user.ngayHetHan,
            idNguoiUyQuyen: user.idNguoiUyQuyen,
            phamViChuyenNganh: user.phamViChuyenNganh,
        });
    }, []);

    const handleConfirmEdit = useCallback(async (payload: AssignUserDialogValue) => {
        if (!editState) return;
        await onEditUser(editState.idAssignment, payload);
    }, [editState, onEditUser]);

    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: 2,
                    mb: 2,
                    flexDirection: { xs: 'column', md: 'row' },
                }}
            >
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        Nguoi dung dang duoc gan vao role <strong>{selectedRole?.name}</strong>
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                        Uu tien doc nhanh theo scope, don vi, chuyen nganh va han uy quyen.
                    </Typography>
                </Box>

                {!isSystem && (
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AssignmentIndIcon sx={{ fontSize: '16px !important' }} />}
                        onClick={() => setAssignOpen(true)}
                        sx={{ px: 2, py: 0.75, borderRadius: 2, fontSize: 12, fontWeight: 700, textTransform: 'none' }}
                    >
                        Gan user
                    </Button>
                )}
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' },
                    gap: 1.25,
                    mb: 2,
                }}
            >
                {[
                    { label: 'Tong user', value: summary.total, color: theme.palette.primary.main },
                    { label: 'Co CN', value: summary.withCn, color: theme.palette.success.main },
                    { label: 'Uy quyen', value: summary.delegated, color: theme.palette.warning.main },
                    { label: 'Het han', value: summary.expired, color: theme.palette.error.main },
                ].map((item) => (
                    <Box
                        key={item.label}
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: `1px solid ${alpha(item.color, 0.2)}`,
                            bgcolor: alpha(item.color, 0.05),
                        }}
                    >
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {item.label}
                        </Typography>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: item.color, lineHeight: 1.15 }}>
                            {item.value}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr' },
                    gap: 1.25,
                    mb: 2,
                }}
            >
                <TextField
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tim theo ten, ma user, don vi, anchor..."
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
                <TextField
                    select
                    size="small"
                    label="Loc scope"
                    value={scopeFilter}
                    onChange={(event) => setScopeFilter(event.target.value)}
                >
                    <MenuItem value="ALL">Tat ca scope</MenuItem>
                    {availableScopes.map((scope) => (
                        <MenuItem key={scope} value={scope}>
                            {scopeMap.get(scope as ScopeType)?.label || scope}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    size="small"
                    label="Loc CN"
                    value={cnFilter}
                    onChange={(event) => setCnFilter(event.target.value as typeof cnFilter)}
                >
                    <MenuItem value="ALL">Tat ca CN</MenuItem>
                    <MenuItem value="WITH_CN">Chi user co CN</MenuItem>
                    <MenuItem value="NO_CN">Chi user khong CN</MenuItem>
                </TextField>
                <TextField
                    select
                    size="small"
                    label="Sap xep"
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SortIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                >
                    <MenuItem value="name_asc">Ten A-Z</MenuItem>
                    <MenuItem value="name_desc">Ten Z-A</MenuItem>
                    <MenuItem value="office_asc">Don vi A-Z</MenuItem>
                    <MenuItem value="scope_asc">Scope</MenuItem>
                    <MenuItem value="expiry_asc">Han uy quyen som nhat</MenuItem>
                </TextField>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Dang hien {filteredUsers.length}/{users.length} user
                </Typography>
                {(search || scopeFilter !== 'ALL' || cnFilter !== 'ALL' || sortMode !== 'name_asc') && (
                    <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                            setSearch('');
                            setScopeFilter('ALL');
                            setCnFilter('ALL');
                            setSortMode('name_asc');
                        }}
                    >
                        Xoa loc
                    </Button>
                )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredUsers.map((user) => {
                    const scopeInfo = user.scopeType ? scopeMap.get(user.scopeType as ScopeType) : null;
                    const isExpired = Boolean(user.ngayHetHan && new Date(user.ngayHetHan).getTime() < Date.now());
                    const cnSummary = getPhamViSummary(user.phamViChuyenNganh);

                    return (
                        <Box
                            key={user.idAssignment || user.id}
                            sx={{
                                p: 1.5,
                                bgcolor: 'background.paper',
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: 2.5,
                                transition: 'box-shadow 0.15s, border-color 0.15s',
                                '&:hover': {
                                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.06)}`,
                                    borderColor: alpha(theme.palette.primary.main, 0.22),
                                },
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.3fr) minmax(0, 1fr) auto' },
                                    gap: 1.5,
                                    alignItems: 'center',
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
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
                                            }}
                                        >
                                            {user.avatar || getAvatar(user.name)}
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary' }} noWrap>
                                                {user.name}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: 'text.secondary',
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    display: 'block',
                                                }}
                                                noWrap
                                            >
                                                {user.id}
                                                {user.email ? ` · ${user.email}` : ''}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, minWidth: 0 }}>
                                        <PlaceIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
                                        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                                            {user.currentOffice || 'Chua co don vi'}
                                        </Typography>
                                    </Box>

                                    {(user.anchorNodeName || user.anchorNodeId || user.currentOfficePath) && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4, minWidth: 0 }}>
                                            <AccountTreeIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
                                            <Typography
                                                variant="caption"
                                                sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace" }}
                                                noWrap
                                            >
                                                {user.anchorNodeName || user.anchorNodeId || user.currentOfficePath}
                                            </Typography>
                                        </Box>
                                    )}
                                    {cnSummary.hasCn && (
                                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                                            Chuyen nganh: {user.phamViChuyenNganh?.idChuyenNganhDoc.map((entry) => entry.id).join(', ')}
                                            {cnSummary.actionCount > 0 ? ` Â· ${cnSummary.actionCount} action grants` : ''}
                                        </Typography>
                                    )}
                                </Box>

                                <Box sx={{ minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                                        {scopeInfo && (
                                            <Chip
                                                label={scopeInfo.label}
                                                size="small"
                                                sx={{
                                                    height: 22,
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    bgcolor: alpha(scopeInfo.color, 0.1),
                                                    color: scopeInfo.color,
                                                    border: `1px solid ${alpha(scopeInfo.color, 0.22)}`,
                                                }}
                                            />
                                        )}
                                        {cnSummary.hasCn && (
                                            <Chip
                                                icon={<CategoryIcon sx={{ fontSize: '14px !important' }} />}
                                                label={`CN ${cnSummary.primary}${cnSummary.extraCount > 0 ? ` +${cnSummary.extraCount}` : ''}`}
                                                size="small"
                                                sx={{ height: 22, fontSize: 10.5, fontWeight: 600 }}
                                            />
                                        )}
                                        {user.ngayHetHan && (
                                            <Chip
                                                icon={<AccessTimeIcon sx={{ fontSize: '14px !important' }} />}
                                                label={`${isExpired ? 'Het han' : 'Han'} ${formatDate(user.ngayHetHan)}`}
                                                size="small"
                                                color={isExpired ? 'error' : 'warning'}
                                                variant={isExpired ? 'filled' : 'outlined'}
                                                sx={{ height: 22, fontSize: 10.5, fontWeight: 600 }}
                                            />
                                        )}
                                    </Box>

                                    {(user.idNguoiUyQuyen || user.rank) && (
                                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                            {user.rank ? `Cap bac: ${user.rank}` : ''}
                                            {user.rank && user.idNguoiUyQuyen ? ' · ' : ''}
                                            {user.idNguoiUyQuyen ? `Nguoi uy quyen: ${user.idNguoiUyQuyen}` : ''}
                                        </Typography>
                                    )}
                                </Box>

                                {!isSystem && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: { xs: 'flex-start', lg: 'flex-end' } }}>
                                        <Tooltip title="Chinh pham vi" arrow>
                                            <IconButton
                                                size="small"
                                                aria-label={`Chinh pham vi cua ${user.name}`}
                                                onClick={() => handleOpenEdit(user)}
                                                sx={{
                                                    color: 'text.secondary',
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 1.5,
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                        borderColor: alpha(theme.palette.primary.main, 0.3),
                                                        color: 'primary.main',
                                                    },
                                                }}
                                            >
                                                <ManageAccountsIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xoa khoi nhom" arrow>
                                            <IconButton
                                                size="small"
                                                aria-label={`Xoa ${user.name} khoi nhom`}
                                                onClick={() => user.idAssignment && onRemoveUser(user.idAssignment)}
                                                sx={{
                                                    color: 'text.secondary',
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    borderRadius: 1.5,
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.error.main, 0.08),
                                                        borderColor: alpha(theme.palette.error.main, 0.3),
                                                        color: 'error.main',
                                                    },
                                                }}
                                            >
                                                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {filteredUsers.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                    <PeopleAltIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Khong co user phu hop
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                        Thu doi tu khoa tim kiem hoac bo bot dieu kien loc.
                    </Typography>
                </Box>
            )}

            <Divider sx={{ my: 2.5 }} />

            <AssignUserDialog
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                roleName={selectedRole?.name ?? ''}
                roleColor={roleColor}
                initialScope={defaultScopeConfig.scopeType}
                initialAnchorNodeId={defaultScopeConfig.anchorNodeId}
                initialPhamViChuyenNganh={defaultScopeConfig.phamViChuyenNganh}
                onConfirm={onAssignUser}
            />

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
                    initialPhamViChuyenNganh={editState.phamViChuyenNganh}
                    onConfirm={handleConfirmEdit}
                />
            )}
        </Box>
    );
};

export default UserAssignmentPanel;
