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

import type { Role, ScopeType, PermissionTabKey, PermissionAssignmentRow, PermissionUserRow, GroupScopeConfig } from '../../types/permission';
import { FALLBACK_PERMISSION_GROUPS } from './data/permissionData';
import {
    getPermissionCatalog,
    listNhomNguoiDung,
    saveNhomNguoiDung,
    deleteNhomNguoiDung,
    getGroupPermissions,
    saveGroupPermissions,
    listGroupUsers,
    listAllAssignments,
    removeUserFromGroup,
    assignUserToGroup,
    streamRebuildPermissions,
} from '../../apis/phanQuyenApi';
import type {
    NhomNguoiDungInfo,
    UserInGroupInfo,
    AssignmentDetailInfo,
    RebuildPermissionsProgress,
} from '../../apis/phanQuyenApi';

import RoleSidebar from './subComponent/RoleSidebar';
import RolePermissionPanel from './subComponent/RolePermissionPanel';
import ScopeConfigPanel from './subComponent/ScopeConfigPanel';
import UserAssignmentPanel from './subComponent/UserAssignmentPanel';
import AssignmentListTab from './subComponent/AssignmentListTab';
import CloneRoleDialog from './subComponent/CloneRoleDialog';
import type { AssignUserDialogValue } from './subComponent/AssignUserDialog';
import CnGroupedPermissionView from './subComponent/CnGroupedPermissionView';

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
        id: n.id,
        name: n.ten,
        type: n.loai === 'System' ? 'SYSTEM' : 'CUSTOM',
        clonedFrom: n.clonedFromId || undefined,
        userCount: n.userCount,
        color: n.color,
        description: n.moTa,
    };
}

function usersInGroupToRows(users: UserInGroupInfo[]): PermissionUserRow[] {
    return users.map(u => ({
        id: u.idNguoiDung,
        name: u.hoTen || u.idNguoiDung,
        email: '',
        avatar: (u.hoTen || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        currentOffice: u.donVi,
        currentOfficePath: u.anchorNodeId,
        anchorNodeId: u.anchorNodeId,
        anchorNodeName: u.anchorNodeName || u.anchorNodeId,
        scopeType: u.scopeType || undefined,
        idDanhMucChuyenNganh: u.idDanhMucChuyenNganh,
        ngayHetHan: u.ngayHetHan,
        idNguoiUyQuyen: u.idNguoiUyQuyen,
        idAssignment: u.idAssignment,
    }));
}

function assignmentDetailToRow(a: AssignmentDetailInfo): PermissionAssignmentRow {
    return {
        id: a.id,
        userId: a.idNguoiDung,
        userName: a.hoTen || a.idNguoiDung,
        userAvatar: (a.hoTen || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        userOffice: a.donVi,
        roleId: a.idNhom,
        roleName: a.tenNhom,
        roleColor: a.colorNhom,
        anchorNodeId: a.anchorNodeId || '',
        anchorNodeName: a.anchorNodeName || '',
        anchorNodePath: a.anchorNodeName || a.anchorNodeId || '',
        scopeType: (a.scopeType as ScopeType) || '',
        idDanhMucChuyenNganh: a.idDanhMucChuyenNganh,
        idNguoiUyQuyen: a.idNguoiUyQuyen,
        delegatedBy: a.idNguoiUyQuyen,
        delegatedByName: a.idNguoiUyQuyen,
        expiresAt: a.ngayHetHan,
        isExpired: a.ngayHetHan ? new Date(a.ngayHetHan) < new Date() : false,
        createdAt: a.ngayTao || '',
        approvalStatus: 'APPROVED',
    };
}

function scopeNeedsAnchor(scopeType: ScopeType): boolean {
    return ['NODE_ONLY', 'NODE_AND_CHILDREN', 'SUBTREE', 'SIBLINGS', 'BRANCH', 'DELEGATED'].includes(scopeType);
}

function isScopeConfigReady(scopeConfig: GroupScopeConfig): boolean {
    if (scopeNeedsAnchor(scopeConfig.scopeType) && !scopeConfig.anchorNodeId) return false;
    if (scopeConfig.scopeType === 'MULTI_NODE' && scopeConfig.multiNodeIds.length === 0) return false;
    return true;
}

function getScopeSummary(scopeConfig: GroupScopeConfig): string {
    const unitText = (() => {
        switch (scopeConfig.scopeType) {
            case 'SUBTREE':
                return scopeConfig.anchorNodeId ? `Subtree @ ${scopeConfig.anchorNodeId}` : 'Subtree @ IDQuanTriDonVi';
            case 'DELEGATED':
                return scopeConfig.anchorNodeId ? `Delegated @ ${scopeConfig.anchorNodeId}` : 'Delegated';
            case 'ALL':
                return 'All units';
            case 'MULTI_NODE':
                return scopeConfig.multiNodeIds.length > 0 ? `MultiNode (${scopeConfig.multiNodeIds.length} anchors)` : 'MultiNode';
            case 'NODE_ONLY':
            case 'NODE_AND_CHILDREN':
            case 'SIBLINGS':
            case 'BRANCH':
                return scopeConfig.anchorNodeId ? `${scopeConfig.scopeType} @ ${scopeConfig.anchorNodeId}` : scopeConfig.scopeType;
            default:
                return scopeConfig.scopeType;
        }
    })();
    const cnText = scopeConfig.phamViChuyenNganh?.idChuyenNganh
        ? `CN ${scopeConfig.phamViChuyenNganh.idChuyenNganh}`
        : scopeConfig.idDanhMucChuyenNganh
            ? `Nhom CN ${scopeConfig.idDanhMucChuyenNganh}`
            : 'Tat ca chuyen nganh';
    return `${unitText} · ${cnText}`;
}

// ── Main Page Component ───────────────────────────────────────────────────────

function isDefaultViewPermission(code: string, name?: string): boolean {
    return code.endsWith('.view') || Boolean(name?.toLowerCase().startsWith('xem '));
}

function normalizeCheckedPermissions(codes: string[], permissionGroups: typeof FALLBACK_PERMISSION_GROUPS): string[] {
    const normalized = new Set(codes);
    permissionGroups.forEach((group) => {
        group.permissions.forEach((permission) => {
            if (isDefaultViewPermission(permission.code, permission.name)) {
                normalized.add(permission.code);
            }
        });
    });
    return Array.from(normalized);
}

const PhanQuyenPage: React.FC = () => {
    const theme = useTheme();

    // ── State ──────────────────────────────────────────────────────────────────
    const [groups, setGroups] = useState<NhomNguoiDungInfo[]>([]);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [checkedPerms, setCheckedPerms] = useState<string[]>([]);
    const [currentScopeConfig, setCurrentScopeConfig] = useState<GroupScopeConfig>({
        scopeType: 'SUBTREE',
        anchorNodeId: '',
        multiNodeIds: [],
        idDanhMucChuyenNganh: '',
        phamViChuyenNganh: undefined,
    });
    const [permLoading, setPermLoading] = useState(false);
    const [usersInGroup, setUsersInGroup] = useState<UserInGroupInfo[]>([]);
    const [assignments, setAssignments] = useState<AssignmentDetailInfo[]>([]);
    const [permissionGroups, setPermissionGroups] = useState(FALLBACK_PERMISSION_GROUPS);
    const [activeTab, setActiveTab] = useState<PermissionTabKey>('scope');
    const [scopeReviewed, setScopeReviewed] = useState(false);
    const [unsaved, setUnsaved] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);
    const [rebuildProgress, setRebuildProgress] = useState<RebuildPermissionsProgress | null>(null);

    // ── Derived state ──────────────────────────────────────────────────────────
    const allRoles = useMemo(() => groups.map(nhomToRole), [groups]);
    const selectedRole = useMemo(() => allRoles.find(r => r.id === selectedRoleId), [allRoles, selectedRoleId]);
    const isSystem = selectedRole?.type === 'SYSTEM';
    const userRows = useMemo(() => usersInGroupToRows(usersInGroup), [usersInGroup]);
    const assignmentRows = useMemo(() => assignments.map(assignmentDetailToRow), [assignments]);
    const scopeReady = useMemo(() => isScopeConfigReady(currentScopeConfig), [currentScopeConfig]);
    const scopeSummary = useMemo(() => getScopeSummary(currentScopeConfig), [currentScopeConfig]);
    const orderedTabs = useMemo(
        () => ['scope', 'permissions', 'users', 'assignments']
            .map((key) => TAB_DEFS.find((tab) => tab.key === key))
            .filter((tab): tab is TabDef => Boolean(tab)),
        [],
    );
    const hasCnScope = useMemo(() =>
        Boolean(currentScopeConfig.phamViChuyenNganh?.idChuyenNganhDoc?.length),
        [currentScopeConfig.phamViChuyenNganh]
    );
    const defaultViewPermissionCount = useMemo(
        () => permissionGroups
            .flatMap(group => group.permissions)
            .filter(permission => isDefaultViewPermission(permission.code, permission.name)).length,
        [permissionGroups],
    );
    const sensitivePermissionCount = useMemo(
        () => permissionGroups
            .flatMap(group => group.permissions)
            .filter(permission => {
                const code = permission.code.toLowerCase();
                const name = permission.name.toLowerCase();
                return code.includes('delete')
                    || code.includes('approve')
                    || code.includes('unapprove')
                    || name.includes('xoa')
                    || name.includes('huy')
                    || name.includes('duyet');
            }).length,
        [permissionGroups],
    );
    const cnScopeCount = useMemo(
        () => currentScopeConfig.phamViChuyenNganh?.idChuyenNganhDoc?.length || 0,
        [currentScopeConfig.phamViChuyenNganh],
    );
    const cnActionCount = useMemo(
        () => currentScopeConfig.phamViChuyenNganh?.idChuyenNganhDoc
            ?.reduce((total, entry) => total + entry.actions.length, 0) || 0,
        [currentScopeConfig.phamViChuyenNganh],
    );

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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const groups = await getPermissionCatalog();
                if (!cancelled && groups.length > 0)
                    setPermissionGroups(groups);
            } catch (e) {
                console.warn('[PhanQuyen] getPermissionCatalog fallback to local data:', e);
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
                setCurrentScopeConfig({
                    scopeType: (perms.scopeType || 'SUBTREE') as ScopeType,
                    anchorNodeId: perms.anchorNodeId || '',
                    multiNodeIds: perms.multiNodeIds || [],
                    idDanhMucChuyenNganh: perms.idDanhMucChuyenNganh || '',
                    phamViChuyenNganh: perms.phamViChuyenNganh,
                });
                setUsersInGroup(users);
                setUnsaved(false);
                setScopeReviewed(false);
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
        setActiveTab('scope');
        setScopeReviewed(false);
    }, []);

    const handleTogglePermission = useCallback((code: string) => {
        if (isSystem) return;
        const matchedPermission = permissionGroups
            .flatMap(group => group.permissions)
            .find(permission => permission.code === code);
        if (isDefaultViewPermission(code, matchedPermission?.name)) return;
        setCheckedPerms(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
        );
        setUnsaved(true);
    }, [isSystem, permissionGroups]);

    const handleToggleGroup = useCallback((groupName: string) => {
        if (isSystem) return;
        const groupPermissions = permissionGroups.find(g => g.group === groupName)?.permissions ?? [];
        const groupCodes = groupPermissions.map(p => p.code);
        const baselineCodes = groupPermissions
            .filter(permission => isDefaultViewPermission(permission.code, permission.name))
            .map(permission => permission.code);
        const togglableCodes = groupPermissions
            .filter(permission => !isDefaultViewPermission(permission.code, permission.name))
            .map(permission => permission.code);
        setCheckedPerms(prev => {
            const normalizedPrev = new Set([...prev, ...baselineCodes]);
            const allChecked = groupCodes.every(c => normalizedPrev.has(c));
            return allChecked
                ? Array.from(normalizedPrev).filter(c => !togglableCodes.includes(c))
                : Array.from(new Set([...normalizedPrev, ...togglableCodes]));
        });
        setUnsaved(true);
    }, [isSystem, permissionGroups]);

    const allPermissionCodes = useMemo(
        () => permissionGroups.flatMap(g => g.permissions.map(p => p.code)),
        [permissionGroups],
    );
    const normalizedCheckedPerms = useMemo(
        () => normalizeCheckedPermissions(checkedPerms, permissionGroups),
        [checkedPerms, permissionGroups],
    );
    const allPermissionCodeSet = useMemo(() => new Set(allPermissionCodes), [allPermissionCodes]);
    const visibleCheckedPermCount = useMemo(
        () => normalizedCheckedPerms.filter(code => allPermissionCodeSet.has(code)).length,
        [normalizedCheckedPerms, allPermissionCodeSet],
    );

    const handleScopeChange = useCallback((scopeConfig: GroupScopeConfig) => {
        if (isSystem) return;
        setCurrentScopeConfig(scopeConfig);
        setScopeReviewed(false);
        setUnsaved(true);
    }, [isSystem]);

    const handleConfirmScope = useCallback(() => {
        if (!scopeReady) return;
        setScopeReviewed(true);
        setActiveTab('permissions');
    }, [scopeReady]);

    const handleSave = useCallback(async () => {
        if (!selectedRoleId) return;
        setSaving(true);
        try {
            await saveGroupPermissions(selectedRoleId, normalizedCheckedPerms, currentScopeConfig);
            setCheckedPerms(normalizedCheckedPerms);
            setUnsaved(false);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1800);
        } catch (e) {
            console.error('[PhanQuyen] save error:', e);
        } finally {
            setSaving(false);
        }
    }, [selectedRoleId, normalizedCheckedPerms, currentScopeConfig]);

    const handleRebuildPermissions = useCallback(async () => {
        if (!selectedRoleId) return;
        setRebuilding(true);
        setRebuildProgress(null);
        try {
            await streamRebuildPermissions(
                { idNhom: selectedRoleId },
                (event) => setRebuildProgress(event),
            );
        } catch (e) {
            console.error('[PhanQuyen] rebuild stream error:', e);
        } finally {
            setRebuilding(false);
        }
    }, [selectedRoleId]);

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

    const handleViewScope = useCallback((assignment: PermissionAssignmentRow) => {
        console.log('[PhanQuyen] View scope:', assignment);
    }, []);

    const handleAssignUser = useCallback(async (payload: AssignUserDialogValue) => {
        if (!selectedRoleId) return;
        await assignUserToGroup({
            idNguoiDung: payload.idNguoiDung,
            idNhom: selectedRoleId,
            scopeType: payload.scopeType,
            anchorNodeId: payload.anchorNodeId,
            ngayHetHan: payload.ngayHetHan,
            idNguoiUyQuyen: payload.idNguoiUyQuyen,
            idDanhMucChuyenNganh: payload.idDanhMucChuyenNganh,
            loai: payload.scopeType === 'DELEGATED' ? 'Delegated' : 'Direct',
        });
        const users = await listGroupUsers(selectedRoleId);
        setUsersInGroup(users);
        setGroups(prev => prev.map(g =>
            g.id === selectedRoleId ? { ...g, userCount: users.length } : g
        ));
    }, [selectedRoleId]);

    const handleEditUserInGroup = useCallback(async (idAssignment: string, payload: AssignUserDialogValue) => {
        if (!selectedRoleId) return;
        void idAssignment;
        await assignUserToGroup({
            idNguoiDung: payload.idNguoiDung,
            idNhom: selectedRoleId,
            scopeType: payload.scopeType,
            anchorNodeId: payload.anchorNodeId,
            ngayHetHan: payload.ngayHetHan,
            idNguoiUyQuyen: payload.idNguoiUyQuyen,
            idDanhMucChuyenNganh: payload.idDanhMucChuyenNganh,
            loai: payload.scopeType === 'DELEGATED' ? 'Delegated' : 'Direct',
        });
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
                                    {visibleCheckedPermCount}/{allPermissionCodes.length} quyền
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
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleRebuildPermissions}
                                    disabled={rebuilding || !selectedRoleId}
                                    sx={{ px: 2, py: 0.75, borderRadius: 2, fontSize: 13, fontWeight: 700, textTransform: 'none' }}
                                >
                                    {rebuilding ? 'Dang rebuild...' : 'Rebuild cache'}
                                </Button>
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

                            {rebuildProgress && (
                                <Box
                                    sx={{
                                        mb: 1.5,
                                        p: 1.5,
                                        borderRadius: 2,
                                        bgcolor: alpha(
                                            rebuildProgress.done
                                                ? (rebuildProgress.success ? theme.palette.success.main : theme.palette.warning.main)
                                                : theme.palette.info.main,
                                            0.06,
                                        ),
                                        border: `1px solid ${alpha(
                                            rebuildProgress.done
                                                ? (rebuildProgress.success ? theme.palette.success.main : theme.palette.warning.main)
                                                : theme.palette.info.main,
                                            0.16,
                                        )}`,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                                        {rebuildProgress.message}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {rebuildProgress.processed}/{rebuildProgress.total || '?'} user
                                        {rebuildProgress.currentUserId ? ` · ${rebuildProgress.currentUserId}` : ''}
                                    </Typography>
                                </Box>
                            )}

                            {/* Tab bar */}
                            <Box sx={{ display: 'flex' }}>
                                {orderedTabs.map((tab) => {
                                    const isActive = activeTab === tab.key;
                                    const isLocked = tab.key === 'permissions' && !scopeReviewed && !isSystem;
                                    const label = tab.getLabel
                                        ? tab.getLabel(selectedRole?.userCount ?? 0)
                                        : tab.label;
                                    return (
                                        <Box
                                            key={tab.key}
                                            onClick={() => setActiveTab(isLocked ? 'scope' : tab.key)}
                                            sx={{
                                                px: 2,
                                                py: 1.25,
                                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                                fontSize: 13,
                                                fontWeight: isActive ? 700 : 400,
                                                color: isLocked
                                                    ? 'text.disabled'
                                                    : isActive
                                                        ? 'text.primary'
                                                        : 'text.secondary',
                                                borderBottom: isActive
                                                    ? `2.5px solid ${selectedRole?.color || theme.palette.primary.main}`
                                                    : '2.5px solid transparent',
                                                mb: '-1px',
                                                transition: 'all 0.15s',
                                                opacity: isLocked ? 0.6 : 1,
                                                '&:hover': { color: isLocked ? 'text.disabled' : 'text.primary' },
                                            }}
                                        >
                                            {label}
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>

                        {/* Tab panel */}
                        <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 2.25 }}>
                            {activeTab === 'scope' && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 260 }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                                                Bước 1. Chốt phạm vi dữ liệu trước khi cấu hình quyền thao tác
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Người dùng sẽ đi theo phạm vi đơn vị và chuyên ngành này trước. Sau khi xác nhận xong,
                                                hệ thống mới mở phần vai trò và thao tác chức năng chi tiết.
                                            </Typography>
                                        </Box>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={handleConfirmScope}
                                            disabled={!scopeReady}
                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Xác nhận phạm vi và tiếp tục
                                        </Button>
                                    </Box>
                                    <ScopeConfigPanel
                                        selectedRole={selectedRole}
                                        scopeConfig={currentScopeConfig}
                                        onScopeChange={handleScopeChange}
                                    />
                                </Box>
                            )}
                            {activeTab === 'permissions' && (
                                (scopeReviewed || isSystem) ? (
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: hasCnScope
                                                ? { xs: '1fr', xl: 'minmax(0, 1fr) minmax(0, 1fr)' }
                                                : '1fr',
                                            gap: 1.5,
                                            alignItems: 'start',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                gridColumn: '1 / -1',
                                                py: 1.25,
                                                px: 0,
                                                borderBottom: `1px solid ${alpha(theme.palette.success.main, 0.16)}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1.5,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>
                                                Bước 2. Cấu hình vai trò và thao tác trên dữ liệu đã chốt
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={scopeSummary}
                                                sx={{
                                                    height: 24,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    bgcolor: alpha(theme.palette.success.main, 0.08),
                                                    color: theme.palette.success.main,
                                                }}
                                            />
                                        </Box>
                                        {/* ── Bước 2a: cấu hình quyền chức năng cơ sở ── */}
                                        <Box
                                            sx={{
                                                borderRadius: 2.5,
                                                overflow: 'hidden',
                                                bgcolor: 'background.paper',
                                                border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                                            }}
                                        >
                                            {/* <Box
                                                sx={{
                                                    px: 1.5,
                                                    py: 1.35,
                                                    bgcolor: alpha(theme.palette.info.main, 0.04),
                                                    borderBottom: `1px solid ${alpha(theme.palette.info.main, 0.14)}`,
                                                    display: 'grid',
                                                    gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                                                    gap: 1,
                                                }}
                                            >
                                                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Quyen co so</Typography>
                                                    <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                        {visibleCheckedPermCount}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>View mac dinh</Typography>
                                                    <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                        {defaultViewPermissionCount}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Quyen nhay cam</Typography>
                                                    <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                        {sensitivePermissionCount}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Tong nhom</Typography>
                                                    <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                        {permissionGroups.length}
                                                    </Typography>
                                                </Box>
                                            </Box> */}
                                            <Typography
                                                sx={{
                                                    px: 1.5,
                                                    py: 2,
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    letterSpacing: '0.08em',
                                                    color: theme.palette.info.dark,
                                                    mt: 0,
                                                    mb: 1,
                                                    mx: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',

                                                    width: '100%',
                                                    
                                                    bgcolor: alpha(theme.palette.info.main, 0.08),
                                                    borderLeft: `4px solid ${theme.palette.info.main}`,
                                                    borderRadius: 1,
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                Quyền chức năng cơ sở
                                            </Typography>
                                            <Typography
                                                sx={{ px: 1.5, fontSize: 11.5, color: 'text.secondary', mb: 1.25, lineHeight: 1.6 }}
                                            >
                                                Chọn quyền chức năng mà role này được phép. Đây là chiều 1 — xác định user có quyền gọi chức năng nào.
                                                {hasCnScope && ' Kết hợp với phạm vi CN bên dưới để ra quyền thực tế.'}
                                            </Typography>
                                            <Box sx={{ px: 1, pb: 1 }}>
                                                <RolePermissionPanel
                                                    selectedRole={selectedRole}
                                                    permissionGroups={permissionGroups}
                                                    checkedPermissions={checkedPerms}
                                                    onTogglePermission={handleTogglePermission}
                                                    onToggleGroup={handleToggleGroup}
                                                />
                                            </Box>
                                        </Box>

                                        {/* ── Bước 2b: quyền thực tế theo CN (nếu có) ── */}
                                        {hasCnScope && (
                                            <Box
                                                sx={{
                                                    borderRadius: 3,
                                                    overflow: 'hidden',
                                                    bgcolor: 'background.paper',
                                                    border: `1px solid ${alpha(theme.palette.info.main, 0.18)}`,
                                                }}
                                            >
                                                {/* <Box
                                                    sx={{
                                                        px: 1.5,
                                                        py: 1.35,
                                                        bgcolor: alpha(theme.palette.info.main, 0.04),
                                                        borderBottom: `1px solid ${alpha(theme.palette.info.main, 0.14)}`,
                                                        display: 'grid',
                                                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Quyen thuc te</Typography>
                                                        <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                            {cnActionCount}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Nhom CN</Typography>
                                                        <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                            {cnScopeCount}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Role dang cap</Typography>
                                                        <Typography sx={{ mt: 0.4, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>
                                                            {selectedRole?.userCount ?? 0}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ p: 1.1, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.03), border: `1px solid ${alpha(theme.palette.info.main, 0.14)}` }}>
                                                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>Scope hien tai</Typography>
                                                        <Typography sx={{ mt: 0.4, fontSize: 13, fontWeight: 800, color: 'text.primary' }}>
                                                            {currentScopeConfig.scopeType}
                                                        </Typography>
                                                    </Box>
                                                </Box> */}
                                                <Typography
                                                    sx={{
                                                        px: 1.5,
                                                        py: 2,
                                                        fontSize: 12,
                                                        fontWeight: 800,
                                                        letterSpacing: '0.08em',
                                                        color: theme.palette.info.dark,
                                                        mt: 0,
                                                        mb: 1,
                                                        mx: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                        bgcolor: alpha(theme.palette.info.main, 0.08),
                                                        borderLeft: `4px solid ${theme.palette.info.main}`,
                                                        borderRadius: 1,
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    Quyền thực tế theo từng Chuyên Ngành
                                                </Typography>
                                                <Typography
                                                    sx={{ px: 1.5, fontSize: 11.5, color: 'text.secondary', mb: 1.25, lineHeight: 1.6 }}
                                                >
                                                    Giao nhau giữa quyền chức năng (trên) và phạm vi CN (đã chốt ở Bước 1).
                                                    Mỗi CN hiện rõ module nào được thao tác gì — action bị CN chặn sẽ gạch ngang.
                                                </Typography>
                                                <Box sx={{ px: 1.25, pb: 1.25 }}>
                                                    <CnGroupedPermissionView
                                                        phamVi={currentScopeConfig.phamViChuyenNganh!}
                                                        checkedCodes={checkedPerms}
                                                        permissionGroups={permissionGroups}
                                                    />
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            p: 3,
                                            borderRadius: 2,
                                            bgcolor: 'background.default',
                                            border: `1px dashed ${theme.palette.divider}`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1.5,
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'text.primary' }}>
                                            Cần xác nhận phạm vi dữ liệu trước
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            UI này được đổi theo nghiệp vụ mới: phạm vi đơn vị và chuyên ngành là lớp nền.
                                            Sau khi chốt xong phạm vi, vai trò và action mới có ý nghĩa trên tập dữ liệu cụ thể.
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setActiveTab('scope')}
                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                        >
                                            Quay lại tab phạm vi dữ liệu
                                        </Button>
                                    </Box>
                                )
                            )}
                            {activeTab === 'users' && (
                                <UserAssignmentPanel
                                    selectedRole={selectedRole}
                                    users={userRows}
                                    onAssignUser={handleAssignUser}
                                    onEditUser={handleEditUserInGroup}
                                    onRemoveUser={handleRemoveUserFromPanel}
                                />
                            )}
                            {activeTab === 'assignments' && (
                                <AssignmentListTab
                                    assignments={assignmentRows}
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
