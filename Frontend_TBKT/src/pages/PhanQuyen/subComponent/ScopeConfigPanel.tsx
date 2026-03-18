import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { useTheme, alpha } from '@mui/material/styles';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ShareIcon from '@mui/icons-material/Share';
import PublicIcon from '@mui/icons-material/Public';

const SCOPE_ICON_MAP: Record<string, React.ElementType> = {
    SELF:             PersonIcon,
    NODE_ONLY:        PlaceIcon,
    NODE_AND_CHILDREN: KeyboardArrowDownIcon,
    SUBTREE:          AccountTreeIcon,
    BRANCH:           KeyboardArrowUpIcon,
    MULTI_NODE:       ShareIcon,
    ALL:              PublicIcon,
    DELEGATED:        HandshakeIcon,
};

import type { Role, ScopeType, ScopeConfig } from '../../../types/permission';
import { SCOPE_TYPES } from '../data/permissionData';

// ── Risk badge component ──────────────────────────────────────────────────────

const RiskBadge = React.memo(function RiskBadge({ risk }: { risk: string }) {
    const config: Record<string, { label: string; color: string; bg: string }> = {
        LOW: { label: 'AN TOÀN', color: '#059669', bg: '#05966915' },
        MEDIUM: { label: 'TRUNG BÌNH', color: '#d97706', bg: '#d9770615' },
        HIGH: { label: 'CAO', color: '#ea580c', bg: '#ea580c15' },
        CRITICAL: { label: '⚠ NGUY HIỂM', color: '#dc2626', bg: '#dc262620' },
    };
    const c = config[risk] || config.LOW;
    return (
        <Chip
            label={c.label}
            size="small"
            sx={{
                height: 20,
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.05em',
                bgcolor: c.bg,
                color: c.color,
                border: `1px solid ${c.color}30`,
                '& .MuiChip-label': { px: 0.75 },
            }}
        />
    );
});

// ── ScopeConfigPanel ──────────────────────────────────────────────────────────

interface ScopeConfigPanelProps {
    selectedRole: Role | undefined;
    currentScope: ScopeType;
    onScopeChange: (scope: ScopeType) => void;
}

const ScopeConfigPanel: React.FC<ScopeConfigPanelProps> = ({
    selectedRole,
    currentScope,
    onScopeChange,
}) => {
    const theme = useTheme();
    const isSystem = selectedRole?.type === 'SYSTEM';

    return (
        <Box sx={{ maxWidth: 680 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, lineHeight: 1.7 }}>
                Phạm vi dữ liệu mặc định khi gán role <strong>{selectedRole?.name}</strong> cho user.
                Admin có thể ghi đè khi assign từng user cụ thể.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {SCOPE_TYPES.map((scope) => {
                    const active = currentScope === scope.value;

                    return (
                        <Box
                            key={scope.value}
                            onClick={isSystem ? undefined : () => onScopeChange(scope.value)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.75,
                                p: 2,
                                bgcolor: 'background.paper',
                                border: `1.5px solid ${active ? scope.color : theme.palette.divider}`,
                                borderRadius: 2.5,
                                cursor: isSystem ? 'default' : 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: active ? `0 0 0 3px ${scope.color}20` : 'none',
                                '&:hover': isSystem ? {} : {
                                    borderColor: scope.color,
                                    bgcolor: alpha(scope.color, 0.02),
                                },
                            }}
                        >
                            {/* Radio */}
                            <Box
                                sx={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    border: `2px solid ${active ? scope.color : theme.palette.divider}`,
                                    bgcolor: active ? scope.color : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {active && (
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#fff' }} />
                                )}
                            </Box>

                            {/* Icon */}
                            {(() => { const IC = SCOPE_ICON_MAP[scope.value]; return IC ? <IC sx={{ fontSize: 18, flexShrink: 0, color: active ? scope.color : 'text.disabled' }} /> : null; })()}

                            {/* Label + desc */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            fontSize: 14,
                                            color: active ? scope.color : 'text.primary',
                                        }}
                                    >
                                        {scope.label}
                                    </Typography>
                                    <RiskBadge risk={scope.risk} />
                                </Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                    {scope.desc}
                                </Typography>
                            </Box>

                            {/* Scope value */}
                            <Typography
                                sx={{
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 600,
                                    color: 'text.disabled',
                                    bgcolor: alpha(theme.palette.divider, 0.3),
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 0.75,
                                }}
                            >
                                {scope.value}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* ALL scope warning */}
            <Box
                sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                }}
            >
                <ReportProblemIcon sx={{ color: theme.palette.error.main, fontSize: 20, mt: 0.25 }} />
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: theme.palette.error.main, mb: 0.5 }}>
                        Cảnh báo về scope ALL
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.7, display: 'block' }}>
                        Chỉ nên cấp cho Super Admin. Khi gán user vào role có scope ALL,
                        hệ thống sẽ yêu cầu <strong>phê duyệt</strong> từ cấp trên.
                        Custom role không nên sử dụng scope này.
                    </Typography>
                </Box>
            </Box>

            {/* DELEGATED scope info */}
            {currentScope === 'DELEGATED' && (
                <Box
                    sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: alpha(theme.palette.warning.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}`,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'flex-start',
                    }}
                >
                    <HandshakeIcon sx={{ color: theme.palette.warning.main, fontSize: 20, mt: 0.25 }} />
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: theme.palette.warning.main, mb: 0.5 }}>
                            Chế độ Ủy quyền
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.7, display: 'block' }}>
                            Khi gán user, cần chọn <strong>người ủy quyền</strong> và <strong>ngày hết hạn</strong>.
                            Quyền sẽ tự động thu hồi khi hết hạn.
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default ScopeConfigPanel;
