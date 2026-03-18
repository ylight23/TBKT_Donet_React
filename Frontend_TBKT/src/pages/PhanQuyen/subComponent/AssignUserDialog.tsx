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

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeOption {
    id: string;
    name: string;
    donVi: string;
}

export interface AssignUserDialogProps {
    open: boolean;
    onClose: () => void;
    roleName: string;
    roleColor: string;
    /** Edit mode: pre-fill user, hide search, only show scope picker */
    editMode?: boolean;
    initialIdNguoiDung?: string;
    initialHoTen?: string;
    initialScope?: ScopeType;
    onConfirm: (idNguoiDung: string, hoTen: string, scopeType: ScopeType) => Promise<void>;
}

// ── AssignUserDialog ──────────────────────────────────────────────────────────

const AssignUserDialog: React.FC<AssignUserDialogProps> = ({
    open,
    onClose,
    roleName,
    roleColor,
    editMode = false,
    initialIdNguoiDung = '',
    initialHoTen = '',
    initialScope = 'SUBTREE',
    onConfirm,
}) => {
    const theme = useTheme();
    const [search, setSearch]           = useState('');
    const [employees, setEmployees]     = useState<EmployeeOption[]>([]);
    const [empLoading, setEmpLoading]   = useState(false);
    const [selectedId, setSelectedId]   = useState(initialIdNguoiDung);
    const [selectedName, setSelectedName] = useState(initialHoTen);
    const [scope, setScope]             = useState<ScopeType>(initialScope);
    const [saving, setSaving]           = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Reset state each time dialog opens
    useEffect(() => {
        if (!open) return;
        setSearch('');
        setSelectedId(initialIdNguoiDung);
        setSelectedName(initialHoTen);
        setScope(initialScope);
        setEmployees([]);
        setSaving(false);
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced employee search (assign mode only)
    useEffect(() => {
        if (!open || editMode) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!search.trim()) { setEmployees([]); return; }

        timerRef.current = setTimeout(async () => {
            setEmpLoading(true);
            try {
                const list = await employeeApi.getListEmployees({ searchText: search });
                setEmployees(list.slice(0, 30).map((e: any) => ({
                    id:    e.id,
                    name:  e.hoVaTen || e.id,
                    donVi: e.idDonVi  || '',
                })));
            } catch { /* ignore search errors */ }
            finally { setEmpLoading(false); }
        }, 350);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [search, open, editMode]);

    const handleConfirm = useCallback(async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            await onConfirm(selectedId, selectedName, scope);
            onClose();
        } catch (e) {
            console.error('[AssignUserDialog]', e);
        } finally {
            setSaving(false);
        }
    }, [selectedId, selectedName, scope, onConfirm, onClose]);

    const avatarLetters = (name: string) =>
        name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';

    return (
        <CommonDialog
            open={open}
            onClose={onClose}
            title={editMode ? `Chỉnh phạm vi: ${initialHoTen}` : 'Gán người dùng vào role'}
            subtitle={`Role: ${roleName}`}
            mode={editMode ? 'edit' : 'add'}
            icon={editMode ? <EditIcon /> : <PersonAddIcon />}
            color={roleColor}
            maxWidth="sm"
            onConfirm={handleConfirm}
            confirmText={editMode ? 'Cập nhật phạm vi' : 'Gán người dùng'}
            disabled={!selectedId || saving}
            loading={saving}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 1 }}>

                {/* ── Employee search / selection (assign mode only) ── */}
                {!editMode && (
                    <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            CHỌN NGƯỜI DÙNG
                        </Typography>

                        {selectedId ? (
                            /* Selected employee card */
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25, border: `1.5px solid ${roleColor}`, borderRadius: 2, bgcolor: alpha(roleColor, 0.04) }}>
                                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: roleColor, color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {avatarLetters(selectedName)}
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'text.primary' }}>{selectedName}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{selectedId}</Typography>
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
                                    onChange={e => setSearch(e.target.value)}
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

                                {employees.length > 0 && (
                                    <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {employees.map(emp => (
                                            <Box
                                                key={emp.id}
                                                onClick={() => { setSelectedId(emp.id); setSelectedName(emp.name); }}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', gap: 1.25, p: 1,
                                                    borderRadius: 1.5, cursor: 'pointer',
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    transition: 'all 0.12s',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                                        borderColor: alpha(theme.palette.primary.main, 0.3),
                                                    },
                                                }}
                                            >
                                                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: roleColor, color: '#fff', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    {avatarLetters(emp.name)}
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'text.primary' }}>{emp.name}</Typography>
                                                    {emp.donVi && (
                                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                                                            {emp.donVi}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
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

                {/* ── Scope type selector ── */}
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        PHẠM VI DỮ LIỆU
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {SCOPE_TYPES.map(s => {
                            const active = scope === s.value;
                            return (
                                <Box
                                    key={s.value}
                                    onClick={() => setScope(s.value as ScopeType)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.25, p: 1.25,
                                        border: `1.5px solid ${active ? s.color : theme.palette.divider}`,
                                        borderRadius: 2, cursor: 'pointer',
                                        bgcolor: active ? alpha(s.color, 0.04) : 'transparent',
                                        boxShadow: active ? `0 0 0 2px ${s.color}20` : 'none',
                                        transition: 'all 0.15s',
                                        '&:hover': { borderColor: s.color, bgcolor: alpha(s.color, 0.02) },
                                    }}
                                >
                                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${active ? s.color : theme.palette.divider}`, bgcolor: active ? s.color : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        {active && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />}
                                    </Box>
                                    <Typography sx={{ fontWeight: active ? 700 : 400, fontSize: 13, color: active ? s.color : 'text.primary', flex: 1 }}>
                                        {s.label}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'text.disabled', bgcolor: alpha(theme.palette.divider, 0.3), px: 0.75, py: 0.25, borderRadius: 0.75 }}>
                                        {s.value}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        </CommonDialog>
    );
};

export default AssignUserDialog;
