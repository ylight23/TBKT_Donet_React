import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';


import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import NavigateNext from '@mui/icons-material/NavigateNext';
import FolderOutlined from '@mui/icons-material/FolderOutlined';

import moment from 'moment';
import ModalOffice from './ModalOffice';
import { OfficeNode } from './OfficeDictionary';
import { useOffice } from '../../../context/OfficeContext';



// ── Types ──────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
    id: string | number;
    name: string;
    vietTat?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatDate = (value: unknown): string => {
    if (!value) return '-';
    if (typeof value === 'object' && value !== null && 'seconds' in value)
        return moment.unix((value as { seconds: number }).seconds).format('DD/MM/YYYY HH:mm:ss');
    if (typeof value === 'string') return moment(value).format('DD/MM/YYYY HH:mm:ss');
    return '-';
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    const theme = useTheme();
    return (
        <Box sx={{
            display: 'flex', gap: 3, alignItems: 'center',
            px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}44`,
            '&:last-child': { borderBottom: 'none' },
        }}>
            <Typography
                component="span"
                sx={{ width: 140, flexShrink: 0, fontSize: '0.875rem', fontWeight: 600, color: 'text.secondary' }}
            >
                {label}
            </Typography>
            <Typography
                component="span"
                sx={{ fontSize: '0.925rem', color: 'text.primary', fontWeight: 500 }}
            >
                {value ?? '-'}
            </Typography>
        </Box>
    );
};

const StyledSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={0}
            sx={{
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fff',
            }}
        >
            <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: theme.palette.primary.main, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {title}
                </Typography>
            </Box>
            <Box>{children}</Box>
        </Paper>
    );
};

const BreadcrumbNav: React.FC<{
    path: BreadcrumbItem[];
    onNavigate: (item: BreadcrumbItem) => void;
}> = ({ path, onNavigate }) => {
    const theme = useTheme();
    if (!path.length) return null;
    return (
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, overflowX: 'auto', bgcolor: 'background.paper' }}>
            <Breadcrumbs
                separator={<NavigateNext sx={{ fontSize: 20, color: 'text.disabled' }} />}
                sx={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}
            >
                {path.map((item, index) => {
                    const isLast = index === path.length - 1;
                    return (
                        <Stack key={String(item.id)} direction="row" alignItems="center" spacing={1}>
                            {isLast ? (
                                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'primary.main', px: 1, py: 0.5, bgcolor: 'primary.light', borderRadius: 1.5, opacity: 0.9 }}>
                                    {item.name}
                                </Typography>
                            ) : (
                                <Link
                                    component="button" underline="none" onClick={() => onNavigate(item)}
                                    sx={{
                                        fontSize: '0.9rem', fontWeight: 500, color: 'text.secondary',
                                        cursor: 'pointer', background: 'none', border: 'none',
                                        fontFamily: 'inherit', px: 1, py: 0.5, borderRadius: 1.5,
                                        '&:hover': { color: 'primary.main', bgcolor: 'action.hover' }
                                    }}
                                >
                                    {item.name}
                                </Link>
                            )}
                            {item.vietTat && (
                                <Chip label={item.vietTat} size="small" variant="outlined" sx={{
                                    height: 18, fontSize: '10px', fontWeight: 600,
                                    color: isLast ? 'primary.main' : 'text.disabled',
                                    borderColor: isLast ? 'primary.light' : 'divider',
                                    '& .MuiChip-label': { px: 0.75 },
                                }} />
                            )}
                        </Stack>
                    );
                })}
            </Breadcrumbs>
        </Box>
    );
};

// ── OfficeDataGrid ─────────────────────────────────────────────────────────────

const OfficeDataGrid: React.FC = () => {

    // ── Dùng { state, actions, meta } thay vì flat ────────────────────────────
    const { state, actions, meta } = useOffice();
    const { selectedOffice, allOffices } = state;
    const { selectOffice } = actions;
    const { treeRef } = meta;

    // ✅ Rule: index-maps — O(1) lookup thay vì O(n) .find() per traversal step
    const allOfficesById = useMemo(
        () => new Map(allOffices.map(o => [String(o.id), o])),
        [allOffices]
    );

    const [displayedOffice, setDisplayedOffice] = useState<OfficeNode | null>(selectedOffice);
    const [children, setChildren] = useState<OfficeNode[]>([]);
    const [breadcrumbPath, setBreadcrumbPath] = useState<BreadcrumbItem[]>([]);

    const lastLoadedIdRef = useRef<string | null>(null);
    const skipNextEffect = useRef<boolean>(false);

    // ── Lấy children từ allOffices (không gọi API) ────────────────────────────
    const fetchChildren = useCallback((parentId: string | number) => {
        const pid = String(parentId);
        setChildren(
            allOffices.filter(o =>
                String(o.idCapTren ?? o.idcaptren ?? o.IDCapTren ?? '') === pid
            )
        );
    }, [allOffices]);

    // ── Build breadcrumb từ allOffices (không gọi API) ────────────────────────
    const buildBreadcrumbPath = useCallback((currentOffice: OfficeNode | null): void => {
        if (!currentOffice) { setBreadcrumbPath([]); return; }
        const path: BreadcrumbItem[] = [];
        let cur: OfficeNode | null = currentOffice;

        while (cur) {
            path.unshift({
                id: cur.id ?? '',
                name: String(cur.ten || cur.tenDayDu || cur.id || 'Đơn vị'),
                vietTat: cur.vietTat as string | undefined,
            });
            // ← Fix: thêm type annotation rõ ràng
            const parentId: string | undefined =
                (String(cur.idcaptren ?? cur.idCapTren ?? cur.IDCapTren ?? '') || undefined) as string | undefined;
            if (!parentId) break;
            cur = allOfficesById.get(parentId) ?? null;
        }
        setBreadcrumbPath(path);
    }, [allOfficesById]);

    // ── Load 1 node ───────────────────────────────────────────────────────────
    const loadNode = useCallback((node: OfficeNode | null) => {
        lastLoadedIdRef.current = node?.id != null ? String(node.id) : null;
        setDisplayedOffice(node);
        if (node?.id) {
            fetchChildren(node.id);
            buildBreadcrumbPath(node);
        } else {
            setChildren([]);
            setBreadcrumbPath([]);
        }
    }, [fetchChildren, buildBreadcrumbPath]);

    // ── Breadcrumb navigate ────────────────────────────────────────────────────
    const handleBreadcrumbNavigate = useCallback((item: BreadcrumbItem) => {
        const newId = String(item.id);
        if (newId === lastLoadedIdRef.current) return;

        const fullNode: OfficeNode =
            allOfficesById.get(newId) ??
            ({ id: item.id, ten: item.name, vietTat: item.vietTat } as OfficeNode);

        // Set flag TRƯỚC selectOffice để useEffect skip
        skipNextEffect.current = true;
        treeRef?.current?.selectNode?.(newId);

        // ── actions.selectOffice thay vì handleSelectOffice ─────────────────────
        selectOffice(fullNode);
        loadNode(fullNode);

    }, [allOfficesById, loadNode, selectOffice, treeRef]);

    // ── Sync khi selectedOffice thay đổi từ tree ──────────────────────────────
    useEffect(() => {
        // Skip khi breadcrumb vừa navigate
        if (skipNextEffect.current) {
            skipNextEffect.current = false;
            return;
        }
        const newId = selectedOffice?.id != null ? String(selectedOffice.id) : null;
        if (newId === lastLoadedIdRef.current) return;
        loadNode(selectedOffice);
    }, [selectedOffice, loadNode]);

    // ── Render ─────────────────────────────────────────────────────────────────
    const theme = useTheme();
    return (
        <Box sx={{ backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.01)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderLeft: `1px solid ${theme.palette.divider}` }}>
            <BreadcrumbNav path={breadcrumbPath} onNavigate={handleBreadcrumbNavigate} />

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid #e4e4e7', backgroundColor: '#fff', flexShrink: 0 }}>
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#111', letterSpacing: '-0.02em' }}>
                            {displayedOffice
                                ? String(displayedOffice.ten || displayedOffice.tenDayDu || 'Chi tiết đơn vị')
                                : 'Chọn đơn vị để xem chi tiết'}
                        </Typography>
                        {displayedOffice?.vietTat && (
                            <Chip label={String(displayedOffice.vietTat)} size="medium" sx={{
                                height: 20, fontSize: '13px', fontWeight: 500,
                                backgroundColor: '#eff6ff', color: '#0070f3',
                                border: '1px solid #bfdbfe', '& .MuiChip-label': { px: 1 },
                            }} />
                        )}
                    </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                    {displayedOffice && <ModalOffice data={displayedOffice} />}
                    {displayedOffice && (
                        <ModalOffice
                            defaultParentId={String(displayedOffice.id ?? '')}
                            createLabel="Thêm cấp dưới"
                        />
                    )}
                </Stack>
            </Box>

            {/* Content */}
            {!displayedOffice ? (
                <Stack flex={1} alignItems="center" justifyContent="center" spacing={1}>
                    <FolderOutlined sx={{ fontSize: 48, color: '#d1d5db' }} />
                    <Typography sx={{ fontSize: '14px', color: '#9ca3af' }}>
                        Chọn một đơn vị từ danh sách bên trái
                    </Typography>
                </Stack>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <StyledSection title="Thông tin đơn vị">
                        <InfoRow label="Mã đơn vị:" value={String(displayedOffice.id ?? '-')} />
                        <InfoRow label="Tên đơn vị:" value={String(displayedOffice.ten ?? displayedOffice.tenDayDu ?? '-')} />
                        <InfoRow label="Tên đầy đủ:" value={String(displayedOffice.tenDayDu ?? '-')} />
                        <InfoRow label="Viết tắt:" value={String(displayedOffice.vietTat ?? '-')} />
                    </StyledSection>

                    <StyledSection title="Phân cấp">
                        <InfoRow label="Cấp trên:" value={String(displayedOffice.idCapTren ?? displayedOffice.idcaptren ?? '-')} />
                        <InfoRow
                            label="Đơn vị cấp dưới:"
                            value={children.length > 0
                                ? <Chip label={`${children.length} đơn vị`} size="small" sx={{ height: 22, fontSize: '13px', backgroundColor: '#f4f4f5', color: '#444', '& .MuiChip-label': { px: 1 } }} />
                                : 'Không có'
                            }
                        />
                    </StyledSection>

                    <StyledSection title="Hệ thống">
                        <InfoRow label="Ngày tạo:" value={formatDate(displayedOffice.ngayTao)} />
                        <InfoRow label="Ngày sửa:" value={formatDate(displayedOffice.ngaySua)} />
                        <InfoRow label="Người tạo:" value={String(displayedOffice.nguoiTao ?? '-')} />
                    </StyledSection>
                </Box>
            )}
        </Box>
    );
};

export default OfficeDataGrid;
