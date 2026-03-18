/**
 * +--------------------------------------------------------------------+
 * |  PERMISSION MANAGEMENT PAGE                                        |
 * |  RBAC + ABAC Scope-based Permission System                         |
 * |  Integrated with existing MUI theme & component patterns           |
 * +--------------------------------------------------------------------+
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import VerifiedIcon from '@mui/icons-material/Verified';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import type { Role, ScopeType, PermissionTabKey, Assignment, SampleUser } from '../../types/permission';
import { PERMISSION_GROUPS } from './data/permissionData';
import {
    listNhomNguoiDung,
    saveNhomNguoiDung,
    deleteNhomNguoiDung,
    getGroupPermissions,
    saveGroupPermissions,
    listGroupUsers,
    listAllAssignments,
    removeUserFromGroup,
    assignUserToGroup,
} from '../../apis/phanQuyenApi';
import type { NhomNguoiDungInfo, UserInGroupInfo, AssignmentDetailInfo } from '../../apis/phanQuyenApi';

import RoleSidebar from './subComponent/RoleSidebar';
import RolePermissionPanel from './subComponent/RolePermissionPanel';
import ScopeConfigPanel from './subComponent/ScopeConfigPanel';
import UserAssignmentPanel from './subComponent/UserAssignmentPanel';
import AssignmentListTab from './subComponent/AssignmentListTab';
import CloneRoleDialog from './subComponent/CloneRoleDialog';

// ── Tab config (hoisted static — Rule: rendering-hoist-jsx) ────────────────────

interface TabDef {
    key: PermissionTabKey;
    label: string;
    getLabel?: (count: number) => string;
}

const TAB_DEFS: TabDef[] = [
    { key: 'permissions', label: 'Quyền hạn' },
    { key: 'scope', label: 'Phạm vi dữ liệu' },
    { key: 'users', label: 'Người dùng', getLabel: (c) => `Người dùng (${c})` },
    { key: 'assignments', label: 'Danh sách gán' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function nhomToRole(n: NhomNguoiDungInfo): Role {
    return {
        id:          n.id,
        name:        n.ten,
        type:        n.loai === 'System' ? 'SYSTEM' : 'CUSTOM',
        clonedFrom:  n.clonedFromId || undefined,
        userCount:   n.userCount,
        color:       n.color,
        description: n.moTa,
    };
}

function usersInGroupToSample(users: UserInGroupInfo[]): SampleUser[] {
    return users.map(u => ({
        id:                u.idNguoiDung,
        name:              u.hoTen || u.idNguoiDung,
        email:             '',
        avatar:            (u.hoTen || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        currentOffice:     u.donVi,
        currentOfficePath: u.anchorNodeId,
        scopeType:         u.scopeType || undefined,
        idAssignment:      u.idAssignment,
    }));
}

function assignmentDetailToAssignment(a: AssignmentDetailInfo): Assignment {
    return {
        id:            a.id,
        userId:        a.idNguoiDung,
        userName:      a.hoTen || a.idNguoiDung,
        userAvatar:    (a.hoTen || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        userOffice:    a.donVi,
        roleId:        a.idNhom,
        roleName:      a.tenNhom,
        roleColor:     a.colorNhom,
        anchorNodeId:  a.anchorNodeId,
        anchorNodeName: a.anchorNodeName || a.anchorNodeId,
        anchorNodePath: a.anchorNodeId,
        scopeType:     (a.scopeType || 'SUBTREE') as ScopeType,
        expiresAt:     a.ngayHetHan,
        isExpired:     a.ngayHetHan ? new Date(a.ngayHetHan) < new Date() : false,
        createdAt:     a.ngayTao ?? new Date(0).toISOString(),
        approvalStatus: 'APPROVED',
    };
}

// ── Main Page Component ───────────────────────────────────────────────────────

const PhanQuyenPage: React.FC = () => {
    const theme = useTheme();

    // ── State ──────────────────────────────────────────────────────────────────
    const [groups, setGroups]                   = useState<NhomNguoiDungInfo[]>([]);
    const [groupsLoading, setGroupsLoading]     = useState(true);
    const [selectedRoleId, setSelectedRoleId]   = useState('');
    const [checkedPerms, setCheckedPerms]       = useState<string[]>([]);
    const [currentScope, setCurrentScope]       = useState<ScopeType>('SUBTREE');
    const [permLoading, setPermLoading]         = useState(false);
    const [usersInGroup, setUsersInGroup]       = useState<UserInGroupInfo[]>([]);
    const [assignments, setAssignments]         = useState<AssignmentDetailInfo[]>([]);
    const [activeTab, setActiveTab]             = useState<PermissionTabKey>('permissions');
    const [unsaved, setUnsaved]                 = useState(false);
    const [savedFlash, setSavedFlash]           = useState(false);
    const [showCloneModal, setShowCloneModal]   = useState(false);
    const [saving, setSaving]                   = useState(false);

    // ── Derived state ──────────────────────────────────────────────────────────
    const allRoles   = useMemo(() => groups.map(nhomToRole), [groups]);
    const selectedRole = useMemo(() => allRoles.find(r => r.id === selectedRoleId), [allRoles, selectedRoleId]);
    const isSystem   = selectedRole?.type === 'SYSTEM';
    const sampleUsers = useMemo(() => usersInGroupToSample(usersInGroup), [usersInGroup]);
    const mappedAssignments = useMemo(() => assignments.map(assignmentDetailToAssignment), [assignments]);

    // ── Load groups on mount ───────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setGroupsLoading(true);
            try {
                const list = await listNhomNguoiDung();
                if (cancelled) return;
                setGroups(list);
                if (list.length > 0) setSelectedRoleId(list[0].id);
            } catch (e) {
                console.error('[PhanQuyen] loadGroups error:', e);
            } finally {
                if (!cancelled) setGroupsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // ── Load permissions + users when selected role changes ────────────────────
    useEffect(() => {
        if (!selectedRoleId) return;
        let cancelled = false;
        (async () => {
            setPermLoading(true);
            try {
                const [perms, users] = await Promise.all([
                    getGroupPermissions(selectedRoleId),
                    listGroupUsers(selectedRoleId),
                ]);
                if (cancelled) return;
                setCheckedPerms(perms.checkedCodes);
                setCurrentScope((perms.scopeType || 'SUBTREE') as ScopeType);
                setUsersInGroup(users);
                setUnsaved(false);
            } catch (e) {
                console.error('[PhanQuyen] loadPermissions error:', e);
            } finally {
                if (!cancelled) setPermLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedRoleId]);

    // ── Load all assignments when tab is active ────────────────────────────────
    useEffect(() => {
        if (activeTab !== 'assignments') return;
        listAllAssignments()
            .then(r => setAssignments(r.items))
            .catch(e => console.error('[PhanQuyen] loadAssignments error:', e));
    }, [activeTab]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    const handleSelectRole = useCallback((roleId: string) => {
        setSelectedRoleId(roleId);
        setActiveTab('permissions');
    }, []);

    const handleTogglePermission = useCallback((code: string) => {
        if (isSystem) return;
        setCheckedPerms(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
        );
        setUnsaved(true);
    }, [isSystem]);

    const handleToggleGroup = useCallback((groupName: string) => {
        if (isSystem) return;
        const groupCodes = PERMISSION_GROUPS.find(g => g.group === groupName)
            ?.permissions.map(p => p.code) ?? [];
        setCheckedPerms(prev => {
            const allChecked = groupCodes.every(c => prev.includes(c));
            return allChecked
                ? prev.filter(c => !groupCodes.includes(c))
                : [...new Set([...prev, ...groupCodes])];
        });
        setUnsaved(true);
    }, [isSystem]);

    const handleScopeChange = useCallback((scope: ScopeType) => {
        if (isSystem) return;
        setCurrentScope(scope);
        setUnsaved(true);
    }, [isSystem]);

    const handleSave = useCallback(async () => {
        if (!selectedRoleId) return;
        setSaving(true);
        try {
            await saveGroupPermissions(selectedRoleId, checkedPerms, currentScope);
            setUnsaved(false);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1800);
        } catch (e) {
            console.error('[PhanQuyen] save error:', e);
        } finally {
            setSaving(false);
        }
    }, [selectedRoleId, checkedPerms, currentScope]);

    const handleDeleteRole = useCallback(async (roleId: string) => {
        const res = await deleteNhomNguoiDung(roleId);
        if (res.success) {
            setGroups(prev => {
                const next = prev.filter(g => g.id !== roleId);
                if (selectedRoleId === roleId && next.length > 0)
                    setSelectedRoleId(next[0].id);
                return next;
            });
        }
    }, [selectedRoleId]);

    const handleCloneRole = useCallback(async (name: string, cloneFrom: string, color: string) => {
        try {
            const newGroup = await saveNhomNguoiDung({ ten: name, color, clonedFromId: cloneFrom, loai: 'Custom' });
            setGroups(prev => [...prev, newGroup]);
            setSelectedRoleId(newGroup.id);
            setShowCloneModal(false);
        } catch (e) {
            console.error('[PhanQuyen] cloneRole error:', e);
        }
    }, []);

    const handleDeleteAssignment = useCallback(async (assignmentId: string) => {
        await removeUserFromGroup(assignmentId);
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    }, []);

    const handleViewScope = useCallback((assignment: Assignment) => {
        console.log('[PhanQuyen] View scope:', assignment);
    }, []);

    const handleAssignUser = useCallback(async (idNguoiDung: string, _hoTen: string, scopeType: ScopeType) => {
        if (!selectedRoleId) return;
        await assignUserToGroup({ idNguoiDung, idNhom: selectedRoleId, scopeType });
        const users = await listGroupUsers(selectedRoleId);
        setUsersInGroup(users);
        setGroups(prev => prev.map(g =>
            g.id === selectedRoleId ? { ...g, userCount: users.length } : g
        ));
    }, [selectedRoleId]);

    const handleEditUserInGroup = useCallback(async (idAssignment: string, idNguoiDung: string, _hoTen: string, scopeType: ScopeType) => {
        if (!selectedRoleId) return;
        // Re-assign with updated scope (upsert)
        await assignUserToGroup({ idNguoiDung, idNhom: selectedRoleId, scopeType });
        const users = await listGroupUsers(selectedRoleId);
        setUsersInGroup(users);
    }, [selectedRoleId]);

    const handleRemoveUserFromPanel = useCallback(async (idAssignment: string) => {
        await removeUserFromGroup(idAssignment);
        setUsersInGroup(prev => prev.filter(u => u.idAssignment !== idAssignment));
        setGroups(prev => prev.map(g =>
            g.id === selectedRoleId ? { ...g, userCount: Math.max(0, g.userCount - 1) } : g
        ));
    }, [selectedRoleId]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <Box>
            {/* ── Page header bar ── */}
            <Box
                sx={{
                    px: 3,
                    py: 1.75,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    bgcolor: 'background.paper',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        QUẢN LÝ PHÂN QUYỀN
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Hệ thống phân quyền RBAC + ABAC — quản lý role, quyền hạn và phạm vi dữ liệu theo cây đơn vị
                    </Typography>
                </Box>
            </Box>

            {/* ── Loading overlay ── */}
            {groupsLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 195px)' }}>
                    <CircularProgress size={40} />
                </Box>
            )}

            {/* ── Main body: sidebar + content ── */}
            {!groupsLoading && (
                <Box sx={{ display: 'flex', height: 'calc(100vh - 195px)', bgcolor: 'background.paper' }}>
                    {/* Sidebar */}
                    <RoleSidebar
                        systemRoles={allRoles.filter(r => r.type === 'SYSTEM')}
                        customRoles={allRoles.filter(r => r.type === 'CUSTOM')}
                        selectedRoleId={selectedRoleId}
                        onSelectRole={handleSelectRole}
                        onDeleteRole={handleDeleteRole}
                        onCreateRole={() => setShowCloneModal(true)}
                    />

                    {/* Content column */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* ── Role info + tabs ── */}
                        <Box
                            sx={{
                                px: 3,
                                flexShrink: 0,
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Box sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 2,
                                        bgcolor: selectedRole?.color || '#64748b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: 800,
                                        flexShrink: 0,
                                        boxShadow: `0 2px 8px ${alpha(selectedRole?.color || '#64748b', 0.35)}`,
                                    }}
                                >
                                    {selectedRole?.name?.[0] || '?'}
                                </Box>
                                <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>
                                    {selectedRole?.name}
                                </Typography>
                                <Chip
                                    label={isSystem ? 'HỆ THỐNG' : 'TÙY CHỈNH'}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: 9.5,
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        bgcolor: isSystem
                                            ? alpha(theme.palette.divider, 0.3)
                                            : alpha(theme.palette.secondary.main, 0.1),
                                        color: isSystem ? 'text.secondary' : theme.palette.secondary.dark,
                                        '& .MuiChip-label': { px: 0.75 },
                                    }}
                                />
                                <Typography variant="caption" sx={{ color: 'text.disabled', ml: 0.5 }}>
                                    {checkedPerms.length}/{PERMISSION_GROUPS.flatMap(g => g.permissions).length} quyền
                                    · {selectedRole?.userCount ?? 0} người dùng
                                    {!isSystem && selectedRole?.clonedFrom && (
                                        <> · Clone từ <Typography component="span" sx={{ color: 'primary.main', fontSize: 'inherit' }}>
                                            {allRoles.find(r => r.id === selectedRole.clonedFrom)?.name}
                                        </Typography></>
                                    )}
                                </Typography>
                                <Box sx={{ flex: 1 }} />
                                {permLoading && <CircularProgress size={16} />}
                                {!isSystem && unsaved && !permLoading && (
                                    <Chip
                                        icon={<FiberManualRecordIcon sx={{ fontSize: '8px !important', color: `${theme.palette.warning.main} !important` }} />}
                                        label="Chưa lưu"
                                        size="small"
                                        sx={{
                                            height: 24, fontSize: 11, fontWeight: 600,
                                            bgcolor: alpha(theme.palette.warning.main, 0.08),
                                            color: theme.palette.warning.main,
                                            '& .MuiChip-label': { px: 0.5 },
                                        }}
                                    />
                                )}
                                {savedFlash && (
                                    <Chip
                                        icon={<VerifiedIcon sx={{ fontSize: '14px !important', color: `${theme.palette.success.main} !important` }} />}
                                        label="Đã lưu"
                                        size="small"
                                        sx={{
                                            height: 24, fontSize: 11, fontWeight: 600,
                                            bgcolor: alpha(theme.palette.success.main, 0.08),
                                            color: theme.palette.success.main,
                                            '& .MuiChip-label': { px: 0.5 },
                                        }}
                                    />
                                )}
                                {!isSystem && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: '16px !important' }} />}
                                        onClick={handleSave}
                                        disabled={saving || !unsaved}
                                        sx={{ px: 2.5, py: 0.75, borderRadius: 2, fontSize: 13, fontWeight: 700, textTransform: 'none' }}
                                    >
                                        Lưu thay đổi
                                    </Button>
                                )}
                            </Box>

                            {/* Tab bar */}
                            <Box sx={{ display: 'flex' }}>
                                {TAB_DEFS.map((tab) => {
                                    const isActive = activeTab === tab.key;
                                    const label = tab.getLabel
                                        ? tab.getLabel(selectedRole?.userCount ?? 0)
                                        : tab.label;
                                    return (
                                        <Box
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            sx={{
                                                px: 2,
                                                py: 1.25,
                                                cursor: 'pointer',
                                                fontSize: 13,
                                                fontWeight: isActive ? 700 : 400,
                                                color: isActive ? 'text.primary' : 'text.secondary',
                                                borderBottom: isActive
                                                    ? `2.5px solid ${selectedRole?.color || theme.palette.primary.main}`
                                                    : '2.5px solid transparent',
                                                mb: '-1px',
                                                transition: 'all 0.15s',
                                                '&:hover': { color: 'text.primary' },
                                            }}
                                        >
                                            {label}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        {/* Tab panel */}
                        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                            {activeTab === 'permissions' && (
                                <RolePermissionPanel
                                    selectedRole={selectedRole}
                                    permissionGroups={PERMISSION_GROUPS}
                                    checkedPermissions={checkedPerms}
                                    onTogglePermission={handleTogglePermission}
                                    onToggleGroup={handleToggleGroup}
                                />
                            )}
                            {activeTab === 'scope' && (
                                <ScopeConfigPanel
                                    selectedRole={selectedRole}
                                    currentScope={currentScope}
                                    onScopeChange={handleScopeChange}
                                />
                            )}
                            {activeTab === 'users' && (
                                <UserAssignmentPanel
                                    selectedRole={selectedRole}
                                    users={sampleUsers}
                                    onAssignUser={handleAssignUser}
                                    onEditUser={handleEditUserInGroup}
                                    onRemoveUser={handleRemoveUserFromPanel}
                                />
                            )}
                            {activeTab === 'assignments' && (
                                <AssignmentListTab
                                    assignments={mappedAssignments}
                                    onViewScope={handleViewScope}
                                    onDeleteAssignment={handleDeleteAssignment}
                                    onCompareUsers={() => console.log('Compare users')}
                                />
                            )}
                        </Box>
                    </Box>
                </Box>
            )}

            {/* Clone role modal */}
            <CloneRoleDialog
                open={showCloneModal}
                onClose={() => setShowCloneModal(false)}
                systemRoles={allRoles}
                onClone={handleCloneRole}
            />
        </Box>
    );
};

export default PhanQuyenPage;
