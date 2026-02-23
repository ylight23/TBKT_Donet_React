import React, {useCallback} from 'react';
import { Box, Typography, Paper, Stack, Chip, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext, Home } from '@mui/icons-material';

import moment from 'moment';
import ModalOffice from './ModalOffice';


import { useEffect, useState } from 'react';
import officeApi from '../../../apis/officeApi';

const formatDate = (value) => {
    if (!value) return '-';
    if (typeof value === 'object' && value.seconds) {
        
        return moment.unix(value.seconds).format('DD/MM/YYYY HH:mm:ss');
    }
    if (typeof value === 'string') {
        return moment(value).format('DD/MM/YYYY HH:mm:ss');
    }
    return '-';
};

const InfoRow = ({ label, value }) => (
    <Box sx={{
        display: 'flex',
        gap: 3,
        alignItems: 'center',
        py: 2,
        px: 2,
        borderBottom: '1px solid #e0e0e0',
        '&:last-child': {
            borderBottom: 'none'
        }
    }}>
        <Typography variant="body1" sx={{ width: 140, color: '#000000', flexShrink: 0, fontSize: 16, fontWeight: 800 }}>
            {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {value ?? '-'}
        </Typography>
    </Box>
);

const StyledSection = ({ title, children }) => (
    <Box
        sx={{
            position: 'relative',
            border: '1px solid #d0d0d0',
            borderRadius: '4px',
            backgroundColor: '#fff',
        }}
    >
        <Typography
            variant="subtitle1"
            sx={{
                position: 'absolute',
                top: '-12px',
                left: '16px',
                backgroundColor: '#fff',
                px: 0.8,
                fontWeight: 1000,
                fontSize: '0.95rem',
                color: '#000',
                zIndex: 1,
            }}
        >
            {title}
        </Typography>
        <Box sx={{ mt: 1 }}>
            {children}
        </Box>
    </Box>
);

const OfficeDataGrid = ({  selectedOffice, dispatch, colors, allOffices, onRefreshTree = null, onRefreshNode = null}) => {
    const office = selectedOffice;
    const [displayedOffice, setDisplayedOffice] = useState(office);
    const [children, setChildren] = useState([]);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [breadcrumbPath, setBreadcrumbPath] = useState([]);

    // ✅ Build breadcrumb path
    const buildBreadcrumbPath = useCallback(async (currentOffice) => {
        if (!currentOffice) {
            setBreadcrumbPath([]);
            return;
        }

        const path = [];
        let office = currentOffice;

        // Traverse up to root
        while (office) {
            path.unshift({
                id: office.id,
                name: office.ten || office.Ten || office.tenDayDu || office.TenDayDu || 'Đơn vị',
                vietTat: office.vietTat
            });

            const parentId = office.idcaptren || office.idCapTren || office.id_cap_tren || office.IDCapTren;
            
            if (!parentId) break;

            // Find parent in allOffices or fetch from API
            let parentOffice = allOffices?.find(o => o.id === parentId);
            
            if (!parentOffice) {
                try {
                    parentOffice = await officeApi.getOffice(parentId);
                } catch (error) {
                    console.error('[Breadcrumb] Error fetching parent:', error);
                    break;
                }
            }

            office = parentOffice;
        }

        console.log('[Breadcrumb] Path:', path);
        setBreadcrumbPath(path);
    }, [allOffices]);

    // Update displayed office when selectedOffice changes (e.g., after tree refresh)
    useEffect(() => {
        console.log('[OfficeDataGrid] selectedOffice updated:', selectedOffice);
        setDisplayedOffice(selectedOffice);

        // Fetch children when office is selected
        if (selectedOffice?.id) {
            fetchChildren(selectedOffice.id);
            buildBreadcrumbPath(selectedOffice);
        } else {
            setChildren([]);
            setBreadcrumbPath([]);
        }
    }, [selectedOffice, buildBreadcrumbPath]);

    const fetchChildren = async (parentId) => {
        setLoadingChildren(true);
        try {
            const result = await officeApi.getListOffices({ parentID: parentId });
            console.log(`[OfficeDataGrid] Fetched ${result?.length || 0} children for parent "${parentId}"`);
            setChildren(result || []);
        } catch (error) {
            console.error('[OfficeDataGrid] Error fetching children:', error);
            setChildren([]);
        } finally {
            setLoadingChildren(false);
        }
    };

    const handleRefreshAfterUpdate = useCallback(async (updatedOffice) => {
        console.log('[OfficeDataGrid] Refresh after update:', updatedOffice);
        
        // 1. Refresh tree node
        if (onRefreshNode && updatedOffice?.id) {
            await onRefreshNode(updatedOffice.id);
        }
        
        // 2. Refresh children list (nếu là parent node)
        if (updatedOffice?.id) {
            await fetchChildren(updatedOffice.id);
        }
        
        // 3. Update displayed office
        setDisplayedOffice(updatedOffice);
        
        // 4. Rebuild breadcrumb
        await buildBreadcrumbPath(updatedOffice);
    }, [onRefreshNode, buildBreadcrumbPath]);

    return (
        <Paper
            sx={{
                backgroundColor: '#fafafa',
                display: 'flex',
                flexDirection: 'column',
                gap: 2
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {/* ✅ Breadcrumb */}
                {displayedOffice && breadcrumbPath.length > 0 && (
                    <Box sx={{ px: 1, pt: 1 }}>
                        <Breadcrumbs
                            separator={<NavigateNext fontSize="small" />}
                            aria-label="breadcrumb"
                            sx={{
                                '& .MuiBreadcrumbs-ol': {
                                    flexWrap: 'nowrap',
                                },
                                '& .MuiBreadcrumbs-li': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }
                            }}
                        >
                            {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Home fontSize="small" sx={{ color: '#757575' }} />
                                <Typography variant="body2" sx={{ color: '#757575', fontSize: '0.875rem' }}>
                                    Gốc
                                </Typography>
                            </Box> */}
                            {breadcrumbPath.map((item, index) => {
                                const isLast = index === breadcrumbPath.length - 1;
                                
                                return (
                                    <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {isLast ? (
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    color: '#1976d2',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {item.name}
                                            </Typography>
                                        ) : (
                                            <Link
                                                component="button"
                                                variant="body2"
                                                onClick={() => {
                                                    // Optional: Navigate to this office when clicked
                                                    console.log('[Breadcrumb] Clicked:', item);
                                                }}
                                                sx={{
                                                    color: '#757575',
                                                    textDecoration: 'none',
                                                    fontSize: '0.875rem',
                                                    '&:hover': {
                                                        textDecoration: 'underline',
                                                        color: '#1976d2',
                                                    },
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {item.name}
                                            </Link>
                                        )}
                                        {item.vietTat && (
                                            <Chip
                                                label={item.vietTat}
                                                size="small"
                                                sx={{
                                                    height: '18px',
                                                    fontSize: '0.7rem',
                                                    backgroundColor: isLast ? '#e3f2fd' : '#f5f5f5',
                                                    color: isLast ? '#1976d2' : '#757575',
                                                    fontWeight: isLast ? 600 : 400,
                                                }}
                                            />
                                        )}
                                    </Box>
                                );
                            })}
                        </Breadcrumbs>
                    </Box>
                )}

                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', p: 1 }}>
                            {displayedOffice ? displayedOffice.ten || displayedOffice.tenDayDu || 'Chi tiết đơn vị' : 'Chọn đơn vị để xem chi tiết'}
                        </Typography>
                        {displayedOffice?.vietTat && (
                            <Chip label={`Viết tắt: ${displayedOffice.vietTat}`} size="medium" sx={{ p: 1, fontSize: '0.95rem' }} />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {displayedOffice && (
                            <ModalOffice data={displayedOffice} dispatch={dispatch} colors={colors} allOffices={allOffices} onRefresh={onRefreshTree} />
                        )}
                        {displayedOffice && (
                            <ModalOffice
                                dispatch={dispatch}
                                colors={colors}
                                allOffices={allOffices}
                                defaultParentId={displayedOffice.id}
                                createLabel="Thêm cấp dưới"
                                onRefresh={onRefreshTree}
                            />
                        )}
                    </Box>
                </Box>
            </Box>
            
            {!displayedOffice ? (
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#353535' }}>
                    <Typography variant="body2">Chọn một đơn vị từ danh sách bên trái</Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, overflow: 'auto', pt: 1 }}>
                    <Stack spacing={3} sx={{ pt: 2 }}>
                        <StyledSection title="Thông tin đơn vị">
                            <InfoRow label="Mã đơn vị:" value={displayedOffice.id || displayedOffice._id || '-'} />
                            <InfoRow label="Tên đơn vị:" value={displayedOffice.ten ?? displayedOffice.Ten ?? displayedOffice.TenDayDu ?? '-'} />
                            <InfoRow label="Tên đầy đủ:" value={displayedOffice.tenDayDu || displayedOffice.TenDayDu} />
                            <InfoRow label="Viết tắt:" value={displayedOffice.vietTat} />
                        </StyledSection>

                        <StyledSection title="Hệ thống">
                            <InfoRow label="Ngày tạo:" value={formatDate(displayedOffice.ngayTao)} />
                            <InfoRow label="Ngày sửa:" value={formatDate(displayedOffice.ngaySua)} />
                        </StyledSection>

                        <StyledSection title="Khác">
                            <InfoRow label="Người tạo:" value={displayedOffice.nguoiTao} />
                            <InfoRow label="Đơn vị cấp dưới:" value={children.length} />
                        </StyledSection>
                    </Stack>
                </Box>
            )}
        </Paper>
    );
};

export default OfficeDataGrid;