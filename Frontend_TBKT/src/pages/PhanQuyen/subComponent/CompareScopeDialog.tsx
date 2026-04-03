import React, { useState, useMemo } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { useTheme, alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CompareIcon from '@mui/icons-material/Compare';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import HandshakeIcon from '@mui/icons-material/Handshake';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

import type { PermissionAssignmentRow } from '../../../types/permission';
import { scopeLookup } from '../data/permissionData';

const scopeMap = scopeLookup;

function formatDate(d?: string) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function isExpired(d?: string) {
    return !!d && new Date(d) < new Date();
}

interface PickerProps {
    label: string;
    accentColor: string;
    options: PermissionAssignmentRow[];
    value: PermissionAssignmentRow | null;
    onChange: (a: PermissionAssignmentRow | null) => void;
    exclude?: string;
}

const UserPicker: React.FC<PickerProps> = ({ label, accentColor, options, value, onChange, exclude }) => {
    const theme = useTheme();
    const filtered = useMemo(() => options.filter(a => a.id !== exclude), [options, exclude]);

    return (
        <Box
            sx={{
                flex: 1,
                borderRadius: 2.5,
                border: `2px solid ${value ? accentColor : theme.palette.divider}`,
                p: 1.5,
                transition: 'border-color 0.2s',
            }}
        >
            <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: accentColor, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}
            >
                {label}
            </Typography>

            <Autocomplete
                options={filtered}
                value={value}
                onChange={(_e, v) => onChange(v)}
                getOptionLabel={a => a.userName}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                size="small"
                sx={{ mt: 0.75 }}
                renderInput={(params) => (
                    <TextField {...params} placeholder="Chọn người dùng…" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                )}
                renderOption={(props, a) => (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: '6px !important' }}>
                        <Box
                            sx={{
                                width: 30, height: 30, borderRadius: '50%',
                                bgcolor: a.roleColor, color: '#fff',
                                fontWeight: 700, fontSize: 11,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {a.userAvatar}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{a.userName}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>{a.roleName}</Typography>
                        </Box>
                    </Box>
                )}
            />

            {value && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Box
                        sx={{
                            width: 34, height: 34, borderRadius: '50%',
                            bgcolor: value.roleColor, color: '#fff',
                            fontWeight: 700, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {value.userAvatar}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{value.userName}</Typography>
                        {value.userRank && (
                            <Typography variant="caption" color="text.disabled">{value.userRank}</Typography>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

interface CompareRowProps {
    label: string;
    valA: React.ReactNode;
    valB: React.ReactNode;
    same: boolean;
}

const CompareRow: React.FC<CompareRowProps> = ({ label, valA, valB, same }) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 28px 1fr',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.75,
                borderRadius: 2,
                bgcolor: same
                    ? alpha(theme.palette.success.main, 0.04)
                    : alpha(theme.palette.warning.main, 0.08),
                border: `1px solid ${same
                    ? alpha(theme.palette.success.main, 0.12)
                    : alpha(theme.palette.warning.main, 0.2)}`,
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: 10 }}>
                        {label}
                    </Typography>
                </Box>
                <Box>{valA}</Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {same ? (
                    <Tooltip title="Giống nhau" arrow>
                        <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                    </Tooltip>
                ) : (
                    <Tooltip title="Khác nhau" arrow>
                        <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                    </Tooltip>
                )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: 10 }}>
                        {label}
                    </Typography>
                </Box>
                <Box>{valB}</Box>
            </Box>
        </Box>
    );
};

function RoleChip({ a }: { a: PermissionAssignmentRow }) {
    return (
        <Chip
            label={a.roleName}
            size="small"
            sx={{
                height: 20, fontSize: 11, fontWeight: 700,
                bgcolor: alpha(a.roleColor, 0.12),
                color: a.roleColor,
                '& .MuiChip-label': { px: 0.75 },
            }}
        />
    );
}

function ScopeChip({ scopeType }: { scopeType: string }) {
    const info = scopeMap.get(scopeType as import('../../../types/permission').ScopeType);
    if (!info) return <Typography variant="caption">{scopeType || '—'}</Typography>;
    return (
        <Chip
            label={`${info.icon ?? ''} ${info.label}`}
            size="small"
            sx={{
                height: 20, fontSize: 11, fontWeight: 700,
                bgcolor: alpha(info.color, 0.1),
                color: info.color,
                border: `1px solid ${alpha(info.color, 0.2)}`,
                '& .MuiChip-label': { px: 0.75 },
            }}
        />
    );
}

function ExpiryChip({ expiresAt }: { expiresAt?: string }) {
    if (!expiresAt) return <Typography variant="caption" sx={{ color: 'text.disabled' }}>Không có</Typography>;
    const expired = isExpired(expiresAt);
    return (
        <Chip
            icon={expired ? <TimerOffIcon sx={{ fontSize: '11px !important' }} /> : <ScheduleIcon sx={{ fontSize: '11px !important' }} />}
            label={expired ? `Đã hết hạn (${formatDate(expiresAt)})` : formatDate(expiresAt)}
            size="small"
            sx={{
                height: 20, fontSize: 10, fontWeight: 700,
                bgcolor: expired ? alpha('#f44336', 0.1) : alpha('#4caf50', 0.1),
                color: expired ? 'error.main' : 'success.main',
                '& .MuiChip-label': { px: 0.6 },
                '& .MuiChip-icon': { color: 'inherit', ml: 0.25 },
            }}
        />
    );
}

function PathText({ path }: { path: string }) {
    return (
        <Typography
            variant="caption"
            sx={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'text.secondary',
                wordBreak: 'break-all', lineHeight: 1.4,
            }}
        >
            {path || '—'}
        </Typography>
    );
}

export interface CompareScopeDialogProps {
    open: boolean;
    onClose: () => void;
    assignments: PermissionAssignmentRow[];
}

const CompareScopeDialog: React.FC<CompareScopeDialogProps> = ({ open, onClose, assignments }) => {
    const theme = useTheme();
    const [selA, setSelA] = useState<PermissionAssignmentRow | null>(null);
    const [selB, setSelB] = useState<PermissionAssignmentRow | null>(null);

    const colorA = theme.palette.primary.main;
    const colorB = theme.palette.secondary.main;

    const canCompare = selA !== null && selB !== null;

    const rows = useMemo(() => {
        if (!selA || !selB) return [];
        return [
            {
                label: 'Nhóm quyền',
                valA: <RoleChip a={selA} />,
                valB: <RoleChip a={selB} />,
                same: selA.roleId === selB.roleId,
            },
            {
                label: 'Phạm vi',
                valA: <ScopeChip scopeType={selA.scopeType} />,
                valB: <ScopeChip scopeType={selB.scopeType} />,
                same: selA.scopeType === selB.scopeType,
            },
            {
                label: 'Nút neo',
                valA: <PathText path={selA.anchorNodePath} />,
                valB: <PathText path={selB.anchorNodePath} />,
                same: selA.anchorNodeId === selB.anchorNodeId,
            },
            {
                label: 'Hết hạn',
                valA: <ExpiryChip expiresAt={selA.expiresAt} />,
                valB: <ExpiryChip expiresAt={selB.expiresAt} />,
                same: (selA.expiresAt ?? '') === (selB.expiresAt ?? ''),
            },
            {
                label: 'Ủy quyền từ',
                valA: <Typography variant="caption" sx={{ color: selA.delegatedByName ? 'warning.main' : 'text.disabled', fontWeight: selA.delegatedByName ? 600 : 400 }}>{selA.delegatedByName || 'Không'}</Typography>,
                valB: <Typography variant="caption" sx={{ color: selB.delegatedByName ? 'warning.main' : 'text.disabled', fontWeight: selB.delegatedByName ? 600 : 400 }}>{selB.delegatedByName || 'Không'}</Typography>,
                same: (selA.delegatedBy ?? '') === (selB.delegatedBy ?? ''),
            },
            {
                label: 'Trạng thái duyệt',
                valA: (
                    <Chip
                        label={selA.approvalStatus ?? 'APPROVED'}
                        size="small"
                        sx={{ height: 18, fontSize: 10, fontWeight: 700, '& .MuiChip-label': { px: 0.6 },
                            bgcolor: selA.approvalStatus === 'PENDING' ? alpha(theme.palette.warning.main, 0.12) : alpha(theme.palette.success.main, 0.12),
                            color: selA.approvalStatus === 'PENDING' ? 'warning.main' : 'success.main',
                        }}
                    />
                ),
                valB: (
                    <Chip
                        label={selB.approvalStatus ?? 'APPROVED'}
                        size="small"
                        sx={{ height: 18, fontSize: 10, fontWeight: 700, '& .MuiChip-label': { px: 0.6 },
                            bgcolor: selB.approvalStatus === 'PENDING' ? alpha(theme.palette.warning.main, 0.12) : alpha(theme.palette.success.main, 0.12),
                            color: selB.approvalStatus === 'PENDING' ? 'warning.main' : 'success.main',
                        }}
                    />
                ),
                same: (selA.approvalStatus ?? '') === (selB.approvalStatus ?? ''),
            },
            {
                label: 'Ngày gán',
                valA: <Typography variant="caption" color="text.secondary">{formatDate(selA.createdAt)}</Typography>,
                valB: <Typography variant="caption" color="text.secondary">{formatDate(selB.createdAt)}</Typography>,
                same: selA.createdAt === selB.createdAt,
            },
        ];
    }, [selA, selB, theme]);

    const diffCount = rows.filter(r => !r.same).length;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle
                sx={{
                    pb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.06)} 100%)`,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompareIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography fontWeight={700} fontSize={15}>So sánh phạm vi phân quyền</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {canCompare && (
                        <Chip
                            label={diffCount === 0 ? 'Giống hoàn toàn' : `${diffCount} điểm khác`}
                            size="small"
                            sx={{
                                height: 22, fontWeight: 700, fontSize: 11,
                                bgcolor: diffCount === 0 ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.12),
                                color: diffCount === 0 ? 'success.main' : 'warning.main',
                            }}
                        />
                    )}
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            </DialogTitle>
            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch', mb: 2 }}>
                    <UserPicker
                        label="Người dùng A"
                        accentColor={colorA}
                        options={assignments}
                        value={selA}
                        onChange={setSelA}
                        exclude={selB?.id}
                    />

                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, width: 28,
                    }}>
                        <DragHandleIcon sx={{ fontSize: 22, color: 'text.disabled', transform: 'rotate(90deg)' }} />
                    </Box>

                    <UserPicker
                        label="Người dùng B"
                        accentColor={colorB}
                        options={assignments}
                        value={selB}
                        onChange={setSelB}
                        exclude={selA?.id}
                    />
                </Box>

                {canCompare ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {rows.map((row, i) => (
                            <CompareRow
                                key={i}
                                label={row.label}
                                valA={row.valA}
                                valB={row.valB}
                                same={row.same}
                            />
                        ))}
                    </Box>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.disabled' }}>
                        <CompareIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body2" fontWeight={600}>
                            Chọn hai người dùng để xem so sánh
                        </Typography>
                        <Typography variant="caption">
                            So sánh nhóm quyền, phạm vi, nút neo và các thuộc tính phân quyền
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2, pb: 2 }}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => { setSelA(null); setSelB(null); }}
                    disabled={!selA && !selB}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    Đặt lại
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    onClick={onClose}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CompareScopeDialog;
