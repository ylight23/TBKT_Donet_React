import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';

import CommonDialog from '../../../components/Dialog/CommonDialog';
import type { ScopeType, PhamViChuyenNganhConfig } from '../../../types/permission';
import { SCOPE_TYPES, ALL_SCOPE_TYPES, scopeLookup } from '../data/permissionData';
import employeeApi from '../../../apis/employeeApi';
import type { RootState } from '../../../store';
import { getStripedHoverBackground, getStripedRowBackground } from '../../../utils/stripedSurface';

interface EmployeeOption {
    id: string;
    name: string;
    donVi: string;
    idQuanTriDonVi?: string;
}

function isInManagedUnitScope(employeeDonVi: string, managedDonVi: string): boolean {
    const target = (employeeDonVi || '').trim();
    const managed = (managedDonVi || '').trim();
    if (!managed) return true;
    if (!target) return false;
    if (target === managed) return true;
    return target.startsWith(`${managed}.`);
}

const toDateInputValue = (value?: string): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

export interface AssignUserDialogValue {
    idNguoiDung: string;
    hoTen: string;
    scopeType: ScopeType;
    anchorNodeId?: string;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    phamViChuyenNganh?: PhamViChuyenNganhConfig;
}

export interface AssignUserDialogProps {
    open: boolean;
    onClose: () => void;
    roleName: string;
    roleColor: string;
    editMode?: boolean;
    initialIdNguoiDung?: string;
    initialHoTen?: string;
    initialScope?: ScopeType;
    initialAnchorNodeId?: string;
    initialNgayHetHan?: string;
    initialIdNguoiUyQuyen?: string;
    initialPhamViChuyenNganh?: PhamViChuyenNganhConfig;
    onConfirm: (payload: AssignUserDialogValue) => Promise<void>;
}

const AssignUserDialog: React.FC<AssignUserDialogProps> = ({
    open,
    onClose,
    roleName,
    roleColor,
    editMode = false,
    initialIdNguoiDung = '',
    initialHoTen = '',
    initialScope = 'SUBTREE',
    initialAnchorNodeId = '',
    initialNgayHetHan = '',
    initialIdNguoiUyQuyen = '',
    initialPhamViChuyenNganh,
    onConfirm,
}) => {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [employees, setEmployees] = useState<EmployeeOption[]>([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(initialIdNguoiDung);
    const [selectedName, setSelectedName] = useState(initialHoTen);
    const [scope, setScope] = useState<ScopeType>(initialScope);
    const [anchorNodeId, setAnchorNodeId] = useState(initialAnchorNodeId);
    const [ngayHetHan, setNgayHetHan] = useState(toDateInputValue(initialNgayHetHan));
    const [idNguoiUyQuyen, setIdNguoiUyQuyen] = useState(initialIdNguoiUyQuyen);
    const [phamViChuyenNganh, setPhamViChuyenNganh] = useState<PhamViChuyenNganhConfig | undefined>(initialPhamViChuyenNganh);
    const [managedOfficeId, setManagedOfficeId] = useState('');
    const [workingOfficeId, setWorkingOfficeId] = useState('');
    const [saving, setSaving] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const currentUserId = useSelector((s: RootState) => s.authReducer.currentUser?.id || '');
    const [currentAdminManagedOfficeId, setCurrentAdminManagedOfficeId] = useState('');

    useEffect(() => {
        if (!open) return;
        setSearch('');
        setSelectedId(initialIdNguoiDung);
        setSelectedName(initialHoTen);
        setScope(initialScope);
        setAnchorNodeId(initialAnchorNodeId);
        setNgayHetHan(toDateInputValue(initialNgayHetHan));
        setIdNguoiUyQuyen(initialIdNguoiUyQuyen);
        setPhamViChuyenNganh(initialPhamViChuyenNganh);
        setManagedOfficeId('');
        setWorkingOfficeId('');
        setCurrentAdminManagedOfficeId('');
        setEmployees([]);
        setSaving(false);
    }, [
        open,
        initialIdNguoiDung,
        initialHoTen,
        initialScope,
        initialAnchorNodeId,
        initialNgayHetHan,
        initialIdNguoiUyQuyen,
        initialPhamViChuyenNganh,
    ]);

    useEffect(() => {
        if (!open || !currentUserId) {
            setCurrentAdminManagedOfficeId('');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const me: any = await employeeApi.getEmployee(currentUserId);
                if (cancelled || !me) return;
                const managedOffice =
                    me.idQuanTriDonVi
                    || me.IDQuanTriDonVi
                    || me.idDonVi
                    || me.IDDonVi
                    || '';
                setCurrentAdminManagedOfficeId(managedOffice);
            } catch {
                if (!cancelled) setCurrentAdminManagedOfficeId('');
            }
        })();
        return () => { cancelled = true; };
    }, [open, currentUserId]);

    useEffect(() => {
        if (!open || editMode) return;
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(async () => {
            setEmpLoading(true);
            try {
                const keyword = search.trim();
                const list = await employeeApi.getListEmployees(
                    keyword ? { searchText: keyword } : null,
                );
                const mapped = (list ?? []).map((e: any) => ({
                    id: e.id,
                    name: e.hoVaTen || e.id,
                    donVi: e.idDonVi || e.IDDonVi || '',
                    idQuanTriDonVi: e.idQuanTriDonVi || e.IDQuanTriDonVi || '',
                }));
                const filtered = currentAdminManagedOfficeId
                    ? mapped.filter((e: EmployeeOption) => isInManagedUnitScope(e.donVi, currentAdminManagedOfficeId))
                    : mapped;
                setEmployees(filtered.slice(0, 100));
            } catch {
                setEmployees([]);
            } finally {
                setEmpLoading(false);
            }
        }, 350);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [search, open, editMode, currentAdminManagedOfficeId]);

    useEffect(() => {
        if (!open || !selectedId) {
            setManagedOfficeId('');
            setWorkingOfficeId('');
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const item: any = await employeeApi.getEmployee(selectedId);
                if (cancelled || !item) return;
                const adminOffice =
                    item.idQuanTriDonVi
                    || item.IDQuanTriDonVi
                    || item.idDonVi
                    || item.IDDonVi
                    || '';
                const workingOffice =
                    item.idDonVi
                    || item.IDDonVi
                    || '';
                setManagedOfficeId(adminOffice);
                setWorkingOfficeId(workingOffice);
            } catch {
                if (!cancelled) {
                    setManagedOfficeId('');
                    setWorkingOfficeId('');
                }
            }
        })();
        return () => { cancelled = true; };
    }, [open, selectedId]);

    const handleConfirm = useCallback(async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            await onConfirm({
                idNguoiDung: selectedId,
                hoTen: selectedName,
                scopeType: scope,
                anchorNodeId: anchorNodeId.trim() || undefined,
                ngayHetHan: ngayHetHan || undefined,
                idNguoiUyQuyen: idNguoiUyQuyen.trim() || undefined,
                phamViChuyenNganh,
            });
            onClose();
        } catch (error) {
            console.error('[AssignUserDialog]', error);
        } finally {
            setSaving(false);
        }
    }, [
        selectedId,
        selectedName,
        scope,
        anchorNodeId,
        ngayHetHan,
        idNguoiUyQuyen,
        phamViChuyenNganh,
        onConfirm,
        onClose,
    ]);

    const avatarLetters = (name: string) =>
        name.split(' ').map((word) => word[0] || '').join('').slice(0, 2).toUpperCase() || '?';

    // ── VIRTUALIZATION FOR EMPLOYEES ──
    const empParentRef = useRef<HTMLDivElement>(null);
    const employeeVirtualizer = useVirtualizer({
        count: employees.length,
        getScrollElement: () => empParentRef.current,
        estimateSize: () => 52,
        overscan: 5,
    });

    // Re-measure when employee list changes (search results update)
    useEffect(() => {
        employeeVirtualizer.measure();
    }, [employees, employeeVirtualizer]);

    const delegatedMissingAnchor = scope === 'DELEGATED' && !anchorNodeId.trim();
    const canConfirm = Boolean(selectedId) && !saving && !delegatedMissingAnchor;

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            title={editMode ? `Chỉnh phạm vi: ${initialHoTen}` : 'Gán người dùng vào role'}
            subtitle={`Role: ${roleName}`}
            mode={editMode ? 'edit' : 'add'}
            icon={editMode ? <EditIcon /> : <PersonAddIcon />}
            color={roleColor}
            maxWidth="lg"
            onConfirm={handleConfirm}
            confirmText={editMode ? 'Cập nhật phạm vi' : 'Gán người dùng'}
            disabled={!canConfirm}
            loading={saving}
        >
            <Box
                sx={{
                    display: editMode ? 'flex' : 'grid',
                    gridTemplateColumns: editMode ? undefined : { xs: '1fr', lg: 'minmax(340px, 420px) minmax(520px, 1fr)' },
                    alignItems: 'start',
                    gap: 2.5,
                    py: 1,
                }}
            >
                {!editMode && (
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            CHỌN NGƯỜI DÙNG
                        </Typography>

                        {selectedId ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, border: `1.5px solid ${roleColor}`, borderRadius: 2, bgcolor: alpha(roleColor, 0.04) }}>
                                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: roleColor, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {avatarLetters(selectedName)}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'text.primary' }}>{selectedName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{selectedId}</Typography>
                                    {managedOfficeId && (
                                        <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                                            IDQuanTriDonVi: {managedOfficeId}
                                        </Typography>
                                    )}
                                </Box>
                                <Chip
                                    label="Đổi"
                                    size="small"
                                    onClick={() => { setSelectedId(''); setSelectedName(''); setSearch(''); }}
                                    sx={{ cursor: 'pointer', height: 22, fontSize: 11 }}
                                />
                            </Box>
                        ) : (
                            <>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm theo tên hoặc mã nhân viên..."
                                    autoFocus
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: empLoading ? (
                                            <InputAdornment position="end">
                                                <CircularProgress size={14} />
                                            </InputAdornment>
                                        ) : null,
                                    }}
                                />
                                {currentAdminManagedOfficeId && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontFamily: "'JetBrains Mono', monospace" }}>
                                        Dang loc user theo IDQuanTriDonVi cua ban: {currentAdminManagedOfficeId}
                                    </Typography>
                                )}

                                {employees.length > 0 && (
                                    <Box 
                                        ref={empParentRef}
                                        sx={{ 
                                            mt: 1, 
                                            maxHeight: 260, 
                                            overflow: 'auto', 
                                            position: 'relative',
                                            // Custom scrollbar
                                            '&::-webkit-scrollbar': { width: 5 },
                                            '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.divider, 0.4), borderRadius: 3 },
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ display: 'block', px: 1, pb: 0.5, color: 'text.secondary' }}>
                                            Danh sách người dùng (đã lọc theo đơn vị quản trị)
                                        </Typography>
                                        <Box
                                            sx={{
                                                height: `${employeeVirtualizer.getTotalSize()}px`,
                                                width: '100%',
                                                position: 'relative',
                                            }}
                                        >
                                            {employeeVirtualizer.getVirtualItems().map((virtualItem) => {
                                                const employee = employees[virtualItem.index];
                                                if (!employee) return null;
                                                return (
                                                    <Box
                                                        key={virtualItem.key}
                                                        onClick={() => { setSelectedId(employee.id); setSelectedName(employee.name); }}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            width: '100%',
                                                            height: `${virtualItem.size}px`,
                                                            transform: `translateY(${virtualItem.start}px)`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1.25,
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 1.5,
                                                            cursor: 'pointer',
                                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                                            bgcolor: getStripedRowBackground(theme, virtualItem.index),
                                                            transition: 'all 0.1s ease',
                                                            '&:hover': {
                                                                bgcolor: getStripedHoverBackground(theme),
                                                            },
                                                        }}
                                                    >
                                                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: roleColor, color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {avatarLetters(employee.name)}
                                                        </Box>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography noWrap sx={{ fontWeight: 600, fontSize: 13, color: 'text.primary' }}>{employee.name}</Typography>
                                                            {employee.donVi && (
                                                                <Typography noWrap variant="caption" sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                                                                    {employee.donVi}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                )}

                                {search.trim() && !empLoading && employees.length === 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', textAlign: 'center' }}>
                                        Không tìm thấy kết quả
                                    </Typography>
                                )}
                            </>
                        )}
                    </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        PHẠM VI DỮ LIỆU
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {SCOPE_TYPES.map((scopeOption) => {
                            const active = scope === scopeOption.value;
                            return (
                                <Box
                                    key={scopeOption.value}
                                    onClick={() => setScope(scopeOption.value as ScopeType)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.25,
                                        p: 1.25,
                                        border: `1.5px solid ${active ? scopeOption.color : theme.palette.divider}`,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        bgcolor: active ? alpha(scopeOption.color, 0.04) : 'transparent',
                                        boxShadow: active ? `0 0 0 2px ${scopeOption.color}20` : 'none',
                                        transition: 'all 0.15s',
                                        '&:hover': {
                                            borderColor: scopeOption.color,
                                            bgcolor: alpha(scopeOption.color, 0.02),
                                        },
                                    }}
                                >
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? scopeOption.color : theme.palette.divider}`, bgcolor: active ? scopeOption.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        {active && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />}
                                    </Box>
                                    <Typography sx={{ fontWeight: active ? 700 : 400, fontSize: 13, color: active ? scopeOption.color : 'text.primary', flex: 1 }}>
                                        {scopeOption.label}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'text.disabled', bgcolor: alpha(theme.palette.divider, 0.3), px: 0.75, py: 0.25, borderRadius: 0.75 }}>
                                        {scopeOption.value}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        THAM SỐ SCOPE
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                        <TextField
                            size="small"
                            label="Anchor Node ID"
                            value={anchorNodeId}
                            onChange={(e) => setAnchorNodeId(e.target.value)}
                            placeholder="vd: dv1, office-root"
                            disabled={scope === 'SELF' || scope === 'ALL'}
                            error={delegatedMissingAnchor}
                            helperText={scope === 'SELF' || scope === 'ALL'
                                ? 'Scope này không cần anchor node'
                                : scope === 'DELEGATED'
                                    ? 'Bắt buộc: nhập đơn vị sẽ được ủy quyền quản trị'
                                    : 'Nhập ID đơn vị gốc cho assignment'}
                        />
                        <TextField
                            size="small"
                            label="Ngày hết hạn"
                            type="date"
                            value={ngayHetHan}
                            onChange={(e) => setNgayHetHan(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            helperText={scope === 'DELEGATED'
                                ? 'Nên khai báo cho scope uỷ quyền'
                                : 'Để trống nếu không giới hạn'}
                        />
                        <TextField
                            size="small"
                            label="ID danh mục chuyên ngành"
                            value={phamViChuyenNganh?.idChuyenNganh ?? ''}
                            onChange={(e) => {
                                const nextId = e.target.value.trim();
                                setPhamViChuyenNganh(
                                    nextId
                                        ? {
                                            idChuyenNganh: nextId,
                                            idChuyenNganhDoc: [
                                                {
                                                    id: nextId,
                                                    actions: ['view', 'add', 'edit', 'delete', 'approve', 'unapprove', 'download', 'print'],
                                                },
                                            ],
                                        }
                                        : undefined,
                                );
                            }}
                            placeholder="vd: T, R, ..."
                            helperText="Bỏ trống nếu không giới hạn chuyên ngành"
                        />
                    </Box>
                </Box>

                {scope === 'DELEGATED' && (
                    <Box sx={{ p: 1.25, borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.main', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            ĐỐI CHIẾU ỦY QUYỀN
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                            <Box sx={{ p: 1, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                                <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.25 }}>Đơn vị đang quản trị</Typography>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {managedOfficeId || 'Chưa xác định từ hồ sơ user'}
                                </Typography>
                                {workingOfficeId && (
                                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.25 }}>
                                        Đơn vị công tác: {workingOfficeId}
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ p: 1, borderRadius: 1.5, border: `1px solid ${delegatedMissingAnchor ? theme.palette.error.main : theme.palette.divider}`, bgcolor: delegatedMissingAnchor ? alpha(theme.palette.error.main, 0.06) : 'background.paper' }}>
                                <Typography sx={{ fontSize: 11, color: delegatedMissingAnchor ? 'error.main' : 'text.secondary', mb: 0.25 }}>Đơn vị sẽ được ủy quyền</Typography>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: delegatedMissingAnchor ? 'error.main' : 'text.primary' }}>
                                    {anchorNodeId.trim() || 'Chưa chọn'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                )}

                {scope === 'DELEGATED' && (
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            UỶ QUYỀN
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="ID người uỷ quyền"
                            value={idNguoiUyQuyen}
                            onChange={(e) => setIdNguoiUyQuyen(e.target.value)}
                            placeholder="Nhập ID user thực hiện uỷ quyền"
                            helperText="Dùng để audit nguồn gốc quyền uỷ quyền"
                        />
                    </Box>
                )}
                </Box>
            </Box>
        </CommonDialog>
    );
};

export default AssignUserDialog;
