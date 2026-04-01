import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import CompareIcon from '@mui/icons-material/Compare';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CloseIcon from '@mui/icons-material/Close';

import type { PermissionAssignmentRow, ScopeConfig } from '../../../types/permission';
import { scopeLookup } from '../data/permissionData';
import CompareScopeDialog from './CompareScopeDialog';

// ── Lookup map (Rule: js-index-maps) ──────────────────────────────────────────
const scopeMap = scopeLookup;

// ── Utility ───────────────────────────────────────────────────────────────────

function isExpired(dateStr?: string): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
    });
}

// ── Assignment Row ────────────────────────────────────────────────────────────

interface AssignmentRowProps {
    assignment: PermissionAssignmentRow;
    onView: (assignment: PermissionAssignmentRow) => void;
    onDelete: (assignmentId: string) => void;
}

const AssignmentRow = React.memo(function AssignmentRow({ assignment, onView, onDelete }: AssignmentRowProps) {
    const theme = useTheme();
    const scopeInfo = scopeMap.get(assignment.scopeType as import('../../../types/permission').ScopeType);
    const expired = isExpired(assignment.expiresAt);

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
                opacity: expired ? 0.5 : 1,
                '&:hover': expired ? {} : {
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.06)}`,
                    borderColor: alpha(scopeInfo?.color || '#666', 0.3),
                },
            }}
        >
            {/* User Avatar */}
            <Box
                sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    bgcolor: assignment.roleColor,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                {assignment.userAvatar}
            </Box>

            {/* User + Role info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 13.5, color: 'text.primary' }}>
                        {assignment.userName}
                    </Typography>
                    {assignment.userRank && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
                            {assignment.userRank}
                        </Typography>
                    )}
                    <Typography sx={{ color: 'text.disabled', fontSize: 11 }}>→</Typography>
                    <Chip
                        label={assignment.roleName}
                        size="small"
                        sx={{
                            height: 18,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: alpha(assignment.roleColor, 0.1),
                            color: assignment.roleColor,
                            '& .MuiChip-label': { px: 0.6 },
                        }}
                    />
                    {expired && (
                        <Chip
                            icon={<TimerOffIcon sx={{ fontSize: '12px !important' }} />}
                            label="HẾT HẠN"
                            size="small"
                            sx={{
                                height: 18,
                                fontSize: 9,
                                fontWeight: 800,
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                color: theme.palette.error.main,
                                '& .MuiChip-label': { px: 0.4 },
                                '& .MuiChip-icon': { color: theme.palette.error.main, ml: 0.25 },
                            }}
                        />
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <PlaceIcon sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0 }} />
                        <Typography
                            variant="caption"
                            sx={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                color: 'text.disabled',
                            }}
                        >
                            {assignment.anchorNodePath}
                        </Typography>
                    </Box>
                    {assignment.delegatedByName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <HandshakeIcon sx={{ fontSize: 11, color: theme.palette.warning.main, flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ fontSize: 10, color: theme.palette.warning.main }}>
                                Ủy quyền từ {assignment.delegatedByName}
                            </Typography>
                        </Box>
                    )}
                    {assignment.expiresAt && !expired && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <ScheduleIcon sx={{ fontSize: 11, color: 'text.disabled', flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                                Đến {formatDate(assignment.expiresAt)}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Scope badge */}
            {scopeInfo && (
                <Chip
                    label={scopeInfo.label}
                    size="small"
                    sx={{
                        height: 24,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: alpha(scopeInfo.color, 0.1),
                        color: scopeInfo.color,
                        border: `1px solid ${alpha(scopeInfo.color, 0.2)}`,
                        '& .MuiChip-label': { px: 0.75 },
                    }}
                />
            )}

            {/* Approval status */}
            {assignment.approvalStatus === 'PENDING' && (
                <Chip
                    icon={<HourglassEmptyIcon sx={{ fontSize: '12px !important' }} />}
                    label="Chờ duyệt"
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: alpha(theme.palette.warning.light, 0.12),
                        color: theme.palette.warning.main,
                        '& .MuiChip-label': { px: 0.5 },
                        '& .MuiChip-icon': { color: theme.palette.warning.main, ml: 0.25 },
                    }}
                />
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Xem scope trên cây" arrow>
                    <IconButton
                        size="small"
                        onClick={() => onView(assignment)}
                        sx={{
                            color: 'text.secondary',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1.5,
                            '&:hover': {
                                bgcolor: alpha(scopeInfo?.color || theme.palette.secondary.main, 0.08),
                                borderColor: alpha(scopeInfo?.color || theme.palette.secondary.main, 0.3),
                                color: scopeInfo?.color || theme.palette.secondary.main,
                            },
                        }}
                    >
                        <AccountTreeIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Xóa assignment" arrow>
                    <IconButton
                        size="small"
                        onClick={() => onDelete(assignment.id)}
                        sx={{
                            color: 'text.secondary',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1.5,
                            '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.08),
                                borderColor: alpha(theme.palette.error.main, 0.3),
                                color: theme.palette.error.main,
                            },
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
});

// ── AssignmentListTab ─────────────────────────────────────────────────────────

interface AssignmentListTabProps {
    assignments: PermissionAssignmentRow[];
    onViewScope?: (assignment: PermissionAssignmentRow) => void;
    onDeleteAssignment: (assignmentId: string) => void;
    onCompareUsers?: () => void;
}

const AssignmentListTab: React.FC<AssignmentListTabProps> = ({
    assignments,
    onViewScope,
    onDeleteAssignment,
    onCompareUsers,
}) => {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [viewAssignment, setViewAssignment] = useState<PermissionAssignmentRow | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);

    const handleView = (assignment: PermissionAssignmentRow) => {
        setViewAssignment(assignment);
        onViewScope?.(assignment);
    };

    const filteredAssignments = useMemo(() => {
        if (!search.trim()) return assignments;
        const q = search.toLowerCase();
        return assignments.filter(a =>
            a.userName.toLowerCase().includes(q) ||
            a.roleName.toLowerCase().includes(q) ||
            a.anchorNodePath.toLowerCase().includes(q)
        );
    }, [assignments, search]);

    // Sort: expired at bottom
    const sortedAssignments = useMemo(() => {
        return [...filteredAssignments].sort((a, b) => {
            const aExpired = isExpired(a.expiresAt) ? 1 : 0;
            const bExpired = isExpired(b.expiresAt) ? 1 : 0;
            if (aExpired !== bExpired) return aExpired - bExpired;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [filteredAssignments]);

    // ── View scope dialog ──────────────────────────────────────────────────────
    const viewScopeInfo = viewAssignment ? scopeMap.get(viewAssignment.scopeType as import('../../../types/permission').ScopeType) : null;
    const viewExpired = viewAssignment ? isExpired(viewAssignment.expiresAt) : false;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TextField
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm user, role, path..."
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                        {sortedAssignments.length} kết quả
                    </Typography>
                </Box>

                <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CompareIcon sx={{ fontSize: '16px !important' }} />}
                    onClick={() => { setCompareOpen(true); onCompareUsers?.(); }}
                    disabled={assignments.length < 2}
                    sx={{
                        px: 2,
                        borderRadius: 2,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'none',
                    }}
                >
                    So sánh scope
                </Button>
            </Box>

            {/* Assignment list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {sortedAssignments.map((assignment) => (
                    <AssignmentRow
                        key={assignment.id}
                        assignment={assignment}
                        onView={handleView}
                        onDelete={onDeleteAssignment}
                    />
                ))}
            </Box>

            {/* Empty state */}
            {sortedAssignments.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6, color: 'text.disabled' }}>
                    <ListAltIcon sx={{ fontSize: 48, mb: 1, color: 'text.disabled' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Không có assignment nào
                    </Typography>
                </Box>
            )}

            {/* ── Compare scope dialog ─────────────────────────────────────── */}
            <CompareScopeDialog
                open={compareOpen}
                onClose={() => setCompareOpen(false)}
                assignments={assignments}
            />

            {/* ── View Scope detail dialog ──────────────────────────────────── */}
            <Dialog
                open={viewAssignment !== null}
                onClose={() => setViewAssignment(null)}
                maxWidth="xs"
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
                        <AccountTreeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                        <Typography fontWeight={700} fontSize={15}>Chi tiết phân quyền</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setViewAssignment(null)}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <Divider />
                {viewAssignment && (
                    <DialogContent sx={{ pt: 2, pb: 1 }}>
                        {/* User avatar + name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    bgcolor: viewAssignment.roleColor,
                                    color: '#fff',
                                    fontWeight: 700,
                                    fontSize: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}
                            >
                                {viewAssignment.userAvatar}
                            </Box>
                            <Box>
                                <Typography fontWeight={700} fontSize={14}>
                                    {viewAssignment.userName}
                                </Typography>
                                {viewAssignment.userRank && (
                                    <Typography variant="caption" color="text.disabled">
                                        {viewAssignment.userRank}
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Detail rows */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {/* Role */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.disabled" fontWeight={600}>Nhóm quyền</Typography>
                                <Chip
                                    label={viewAssignment.roleName}
                                    size="small"
                                    sx={{
                                        height: 20, fontSize: 11, fontWeight: 700,
                                        bgcolor: alpha(viewAssignment.roleColor, 0.1),
                                        color: viewAssignment.roleColor,
                                        '& .MuiChip-label': { px: 0.75 },
                                    }}
                                />
                            </Box>

                            {/* Scope */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.disabled" fontWeight={600}>Phạm vi</Typography>
                                {viewScopeInfo ? (
                                    <Chip
                                        label={viewScopeInfo.label}
                                        size="small"
                                        sx={{
                                            height: 20, fontSize: 11, fontWeight: 700,
                                            bgcolor: alpha(viewScopeInfo.color, 0.1),
                                            color: viewScopeInfo.color,
                                            border: `1px solid ${alpha(viewScopeInfo.color, 0.2)}`,
                                            '& .MuiChip-label': { px: 0.75 },
                                        }}
                                    />
                                ) : (
                                    <Typography variant="caption">{viewAssignment.scopeType || '—'}</Typography>
                                )}
                            </Box>

                            {/* Anchor node */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                                    <PlaceIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                                    <Typography variant="caption" color="text.disabled" fontWeight={600}>Nút neo</Typography>
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 10,
                                        color: 'text.secondary',
                                        textAlign: 'right',
                                        wordBreak: 'break-all',
                                    }}
                                >
                                    {viewAssignment.anchorNodePath || '—'}
                                </Typography>
                            </Box>

                            {/* Delegation */}
                            {viewAssignment.delegatedByName && (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <HandshakeIcon sx={{ fontSize: 13, color: 'warning.main' }} />
                                        <Typography variant="caption" color="text.disabled" fontWeight={600}>Ủy quyền từ</Typography>
                                    </Box>
                                    <Typography variant="caption" color="warning.main" fontWeight={600}>
                                        {viewAssignment.delegatedByName}
                                    </Typography>
                                </Box>
                            )}

                            {/* Expiry */}
                            {viewAssignment.expiresAt && (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ScheduleIcon sx={{ fontSize: 13, color: viewExpired ? 'error.main' : 'text.disabled' }} />
                                        <Typography variant="caption" color="text.disabled" fontWeight={600}>Hết hạn</Typography>
                                    </Box>
                                    <Chip
                                        icon={viewExpired ? <TimerOffIcon sx={{ fontSize: '11px !important' }} /> : undefined}
                                        label={viewExpired ? `Đã hết hạn (${formatDate(viewAssignment.expiresAt)})` : formatDate(viewAssignment.expiresAt)}
                                        size="small"
                                        sx={{
                                            height: 20, fontSize: 10, fontWeight: 700,
                                            bgcolor: viewExpired ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1),
                                            color: viewExpired ? 'error.main' : 'success.main',
                                            '& .MuiChip-label': { px: 0.75 },
                                            '& .MuiChip-icon': { color: 'inherit', ml: 0.25 },
                                        }}
                                    />
                                </Box>
                            )}

                            {/* Approval status */}
                            {viewAssignment.approvalStatus === 'PENDING' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <HourglassEmptyIcon sx={{ fontSize: 13, color: 'warning.main' }} />
                                        <Typography variant="caption" color="text.disabled" fontWeight={600}>Trạng thái</Typography>
                                    </Box>
                                    <Chip
                                        label="Chờ duyệt"
                                        size="small"
                                        sx={{
                                            height: 20, fontSize: 10, fontWeight: 700,
                                            bgcolor: alpha(theme.palette.warning.light, 0.12),
                                            color: 'warning.main',
                                            '& .MuiChip-label': { px: 0.75 },
                                        }}
                                    />
                                </Box>
                            )}

                            {/* Created at */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                                    <Typography variant="caption" color="text.disabled" fontWeight={600}>Ngày gán</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {viewAssignment.createdAt ? formatDate(viewAssignment.createdAt) : '—'}
                                    </Typography>
                                </Box>
                        </Box>
                    </DialogContent>
                )}
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setViewAssignment(null)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                    >
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AssignmentListTab;
