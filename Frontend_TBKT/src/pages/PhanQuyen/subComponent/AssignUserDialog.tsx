import React, { useState, useCallback, useEffect, useRef } from 'react';

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
import type { ScopeType } from '../../../types/permission';
import { SCOPE_TYPES } from '../data/permissionData';
import employeeApi from '../../../apis/employeeApi';

interface EmployeeOption {
    id: string;
    name: string;
    donVi: string;
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
    idNhomChuyenNganh?: string;
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
    initialIdNhomChuyenNganh?: string;
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
    initialIdNhomChuyenNganh = '',
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
    const [idNhomChuyenNganh, setIdNhomChuyenNganh] = useState(initialIdNhomChuyenNganh);
    const [saving, setSaving] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) return;
        setSearch('');
        setSelectedId(initialIdNguoiDung);
        setSelectedName(initialHoTen);
        setScope(initialScope);
        setAnchorNodeId(initialAnchorNodeId);
        setNgayHetHan(toDateInputValue(initialNgayHetHan));
        setIdNguoiUyQuyen(initialIdNguoiUyQuyen);
        setIdNhomChuyenNganh(initialIdNhomChuyenNganh);
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
        initialIdNhomChuyenNganh,
    ]);

    useEffect(() => {
        if (!open || editMode) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!search.trim()) {
            setEmployees([]);
            return;
        }

        timerRef.current = setTimeout(async () => {
            setEmpLoading(true);
            try {
                const list = await employeeApi.getListEmployees({ searchText: search });
                setEmployees(list.slice(0, 30).map((e: any) => ({
                    id: e.id,
                    name: e.hoVaTen || e.id,
                    donVi: e.idDonVi || '',
                })));
            } catch {
                setEmployees([]);
            } finally {
                setEmpLoading(false);
            }
        }, 350);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [search, open, editMode]);

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
                idNhomChuyenNganh: idNhomChuyenNganh.trim() || undefined,
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
        idNhomChuyenNganh,
        onConfirm,
        onClose,
    ]);

    const avatarLetters = (name: string) =>
        name.split(' ').map((word) => word[0] || '').join('').slice(0, 2).toUpperCase() || '?';

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            title={editMode ? `Chinh pham vi: ${initialHoTen}` : 'Gan nguoi dung vao role'}
            subtitle={`Role: ${roleName}`}
            mode={editMode ? 'edit' : 'add'}
            icon={editMode ? <EditIcon /> : <PersonAddIcon />}
            color={roleColor}
            maxWidth="sm"
            onConfirm={handleConfirm}
            confirmText={editMode ? 'Cap nhat pham vi' : 'Gan nguoi dung'}
            disabled={!selectedId || saving}
            loading={saving}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>
                {!editMode && (
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            CHON NGUOI DUNG
                        </Typography>

                        {selectedId ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, border: `1.5px solid ${roleColor}`, borderRadius: 2, bgcolor: alpha(roleColor, 0.04) }}>
                                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: roleColor, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {avatarLetters(selectedName)}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'text.primary' }}>{selectedName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{selectedId}</Typography>
                                </Box>
                                <Chip
                                    label="Doi"
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
                                    placeholder="Tim theo ten hoac ma nhan vien..."
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

                                {employees.length > 0 && (
                                    <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {employees.map((employee) => (
                                            <Box
                                                key={employee.id}
                                                onClick={() => { setSelectedId(employee.id); setSelectedName(employee.name); }}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1.25,
                                                    p: 1,
                                                    borderRadius: 1.5,
                                                    cursor: 'pointer',
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    transition: 'all 0.12s',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                        borderColor: alpha(theme.palette.primary.main, 0.3),
                                                    },
                                                }}
                                            >
                                                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: roleColor, color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {avatarLetters(employee.name)}
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'text.primary' }}>{employee.name}</Typography>
                                                    {employee.donVi && (
                                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                                                            {employee.donVi}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                )}

                                {search.trim() && !empLoading && employees.length === 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled', textAlign: 'center' }}>
                                        Khong tim thay ket qua
                                    </Typography>
                                )}
                            </>
                        )}
                    </Box>
                )}

                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        PHAM VI DU LIEU
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
                        THAM SO SCOPE
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                        <TextField
                            size="small"
                            label="Anchor Node ID"
                            value={anchorNodeId}
                            onChange={(e) => setAnchorNodeId(e.target.value)}
                            placeholder="vd: dv1, office-root"
                            disabled={scope === 'SELF' || scope === 'ALL'}
                            helperText={scope === 'SELF' || scope === 'ALL'
                                ? 'Scope nay khong can anchor node'
                                : 'Nhap ID don vi goc cho assignment'}
                        />
                        <TextField
                            size="small"
                            label="Ngay het han"
                            type="date"
                            value={ngayHetHan}
                            onChange={(e) => setNgayHetHan(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            helperText={scope === 'DELEGATED'
                                ? 'Nen khai bao cho scope uy quyen'
                                : 'De trong neu khong gioi han'}
                        />
                        <TextField
                            size="small"
                            label="ID nhom chuyen nganh"
                            value={idNhomChuyenNganh}
                            onChange={(e) => setIdNhomChuyenNganh(e.target.value)}
                            placeholder="vd: nhom_tc_dien_tu"
                            helperText="Bo trong neu khong gioi han chuyen nganh"
                        />
                    </Box>
                </Box>

                {scope === 'DELEGATED' && (
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            UY QUYEN
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="ID nguoi uy quyen"
                            value={idNguoiUyQuyen}
                            onChange={(e) => setIdNguoiUyQuyen(e.target.value)}
                            placeholder="Nhap ID user thuc hien uy quyen"
                            helperText="Dung de audit nguon goc quyen uy quyen"
                        />
                    </Box>
                )}
            </Box>
        </CommonDialog>
    );
};

export default AssignUserDialog;
