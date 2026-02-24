import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box, Typography, Breadcrumbs, Link, Chip,
    CircularProgress, Stack, Paper,
} from '@mui/material';
import { NavigateNext, FolderOutlined } from '@mui/icons-material';
import moment from 'moment';
import ModalOffice from './ModalOffice';
import { OfficeNode } from './OfficeDictionary';
import { useOffice } from '../../../context/OfficeContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
    id:       string | number;
    name:     string;
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

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <Box sx={{
        display: 'flex', gap: 3, alignItems: 'center',
        px: 2, py: 1.25, borderBottom: '1px solid #e4e4e7',
        '&:last-child': { borderBottom: 'none' },
    }}>
        <Typography
            component="span"   // ← đổi từ <p> sang <span>
            sx={{ width: 140, flexShrink: 0, fontSize: '15px', fontWeight: 600, color: '#111', letterSpacing: '-0.01em' }}
        >
            {label}
        </Typography>
        <Typography
            component="span"   // ← đổi từ <p> sang <span>
            sx={{ fontSize: '15px', color: '#444', fontWeight: 400 }}
        >
            {value ?? '-'}
        </Typography>
    </Box>
);

const StyledSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Paper variant="outlined" sx={{ overflow: 'hidden', border: '1px solid #e4e4e7' }}>
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e4e4e7', backgroundColor: '#fafafa' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {title}
            </Typography>
        </Box>
        <Box>{children}</Box>
    </Paper>
);

const BreadcrumbNav: React.FC<{
    path:       BreadcrumbItem[];
    onNavigate: (item: BreadcrumbItem) => void;
}> = ({ path, onNavigate }) => {
    if (!path.length) return null;
    return (
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid #e4e4e7', overflowX: 'auto' }}>
            <Breadcrumbs
                separator={<NavigateNext sx={{ fontSize: 20, color: '#ccc' }} />}
                sx={{ flexWrap: 'nowrap', whiteSpace: 'nowrap' }}
            >
                {path.map((item, index) => {
                    const isLast = index === path.length - 1;
                    return (
                        <Stack key={String(item.id)} direction="row" alignItems="center" spacing={0.5}>
                            {isLast ? (
                                <Typography sx={{ fontSize: '16px', fontWeight: 600, color: '#0070f3', letterSpacing: '-0.01em' }}>
                                    {item.name}
                                </Typography>
                            ) : (
                                <Link component="button" underline="hover" onClick={() => onNavigate(item)}
                                    sx={{ fontSize: '16px', fontWeight: 400, color: '#888', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', '&:hover': { color: '#0070f3' } }}
                                >
                                    {item.name}
                                </Link>
                            )}
                            {item.vietTat && (
                                <Chip label={item.vietTat} size="small" sx={{
                                    height: 18, fontSize: '11px', fontWeight: 500,
                                    backgroundColor: isLast ? '#eff6ff' : '#f4f4f5',
                                    color:           isLast ? '#0070f3' : '#888',
                                    border:          `1px solid ${isLast ? '#bfdbfe' : '#e4e4e7'}`,
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
    const { selectOffice }              = actions;
    const { treeRef }                   = meta;

    const [displayedOffice, setDisplayedOffice] = useState<OfficeNode | null>(selectedOffice);
    const [children,        setChildren]        = useState<OfficeNode[]>([]);
    const [breadcrumbPath,  setBreadcrumbPath]  = useState<BreadcrumbItem[]>([]);

    const lastLoadedIdRef = useRef<string | null>(null);
    const skipNextEffect  = useRef<boolean>(false);

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
        let cur: OfficeNode | null   = currentOffice;

        while (cur) {
            path.unshift({
                id:      cur.id   ?? '',
                name:    String(cur.ten || cur.tenDayDu || cur.id || 'Đơn vị'),
                vietTat: cur.vietTat as string | undefined,
            });
            const parentId: string | undefined =
                String(cur.idcaptren ?? cur.idCapTren ?? cur.IDCapTren ?? '') || undefined;
            if (!parentId) break;
            cur = allOffices.find(o => String(o.id) === parentId) ?? null;
        }
        setBreadcrumbPath(path);
    }, [allOffices]);

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
            allOffices.find(o => String(o.id) === newId) ??
            ({ id: item.id, ten: item.name, vietTat: item.vietTat } as OfficeNode);

        // Set flag TRƯỚC selectOffice để useEffect skip
        skipNextEffect.current = true;
        treeRef?.current?.selectNode?.(newId);

        // ── actions.selectOffice thay vì handleSelectOffice ───────────────────
        selectOffice(fullNode);
        loadNode(fullNode);

    }, [allOffices, loadNode, selectOffice, treeRef]);

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
    return (
        <Box sx={{ backgroundColor: '#fafafa', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', border: '1px solid #e4e4e7' }}>
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
                        <InfoRow label="Mã đơn vị:"  value={String(displayedOffice.id        ?? '-')} />
                        <InfoRow label="Tên đơn vị:" value={String(displayedOffice.ten       ?? displayedOffice.tenDayDu ?? '-')} />
                        <InfoRow label="Tên đầy đủ:" value={String(displayedOffice.tenDayDu  ?? '-')} />
                        <InfoRow label="Viết tắt:"   value={String(displayedOffice.vietTat   ?? '-')} />
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
                        <InfoRow label="Ngày tạo:"  value={formatDate(displayedOffice.ngayTao)} />
                        <InfoRow label="Ngày sửa:"  value={formatDate(displayedOffice.ngaySua)} />
                        <InfoRow label="Người tạo:" value={String(displayedOffice.nguoiTao ?? '-')} />
                    </StyledSection>
                </Box>
            )}
        </Box>
    );
};

export default OfficeDataGrid;
