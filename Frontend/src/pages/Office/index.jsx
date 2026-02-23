import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, useTheme, Stack, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { tokens } from '../../theme';
import Header from '../../components/Header';
import OfficeDictionary from './subComponent/OfficeDictionary';
import OfficeDataGrid from './subComponent/OfficeDataGrid';
import ModalOffice from './subComponent/ModalOffice';
import { fetchOffice } from '../../store/reducer/office';
import ExportExcel from '../../components/Buttons/ExportExcel';
import ImportExcel from '../../components/Buttons/ImportExcel';
import officeApi from '../../apis/officeApi';

const Office = () => {
    const [selectedOffice, setSelectedOffice] = useState(null);
    const treeRef = useRef(null);
    const dispatch = useDispatch();
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const { officeApi: allOffices } = useSelector((state) => state.officeReducer);

    const hasFetched = useRef(false);
    const isTreeEmpty = !allOffices || allOffices.length === 0;

    useEffect(() => {
        if (!hasFetched.current) {
            dispatch(fetchOffice());
            hasFetched.current = true;
        }
    }, [dispatch]);

    // ✅ Refresh một node cụ thể (sau khi update)
    const handleRefreshNode = useCallback(async (nodeId) => {
        console.log('[Office] Refresh node:', nodeId);
        
        if (treeRef.current) {
            // Refresh cả node và children trong dictionary
            await treeRef.current.refreshNodeAndChildren(nodeId);
        }
    }, []);
    
    // ✅ Refresh tree hoặc một parent cụ thể (sau khi create/delete)
    const handleRefreshTree = useCallback((parentId = null) => {
        console.log('[Office] Refresh tree, parentId:', parentId);
        
        if (treeRef.current) {
            if (parentId === null || parentId === undefined) {
                // Refresh entire tree
                treeRef.current.refreshTree();
            } else {
                // Refresh specific parent's children
                treeRef.current.refreshChildrenForParent(parentId);
            }
        }
    }, []);

    const officeColumnMapping = {
        'Mã đơn vị': 'id',
        'Tên đơn vị': 'ten',
        'Tên đầy đủ': 'tenDayDu',
        'Viết tắt': 'vietTat',
        'Mã cấp trên': 'idCapTren',
        'Thứ tự': 'thuTu',
        'Có cấp dưới': 'coCapDuoi',
    };

    // Handle import from Excel
    const handleOfficeImport = async (excelData) => {
        try {
            const results = await Promise.allSettled(
                excelData.map(async (row) => {
                    const officeData = {
                        id: row['Mã đơn vị'] || '',
                        ten: row['Tên đơn vị'] || '',
                        tenDayDu: row['Tên đầy đủ'] || '',
                        vietTat: row['Viết tắt'] || '',
                        idCapTren: row['Mã cấp trên'] || '',
                        thuTu: parseInt(row['Thứ tự']) || 0,
                        coCapDuoi: row['Có cấp dưới'] === 'Có',
                    };

                    // Check if exists (update) or new (create)
                    const exists = allOffices.find(o => o.id === officeData.id);
                    
                    if (exists) {
                        return await officeApi.update(officeData.id, officeData);
                    } else {
                        return await officeApi.create(officeData);
                    }
                })
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            return {
                success: failed === 0,
                message: failed > 0 
                    ? `Import thành công ${succeeded}/${excelData.length} bản ghi`
                    : `Import thành công ${succeeded} đơn vị`,
                details: { succeeded, failed, total: excelData.length }
            };
        } catch (error) {
            return {
                success: false,
                message: 'Lỗi khi import: ' + error.message
            };
        }
    };

    const handleImportSuccess = async () => {
        await dispatch(fetchOffice());
        if (treeRef.current) {
            treeRef.current.refreshTree();
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Header
                    title="Quản lý Đơn vị"
                    subtitle="Danh sách các đơn vị trong hệ thống"
                />
                <Stack direction="row" spacing={1}>
                    <ExportExcel
                        buttonText="Tải danh sách"
                        data={allOffices || []}
                        columnMapping={officeColumnMapping}
                        fileName="DanhSachDonVi"
                        sheetName="Danh sách đơn vị"
                    />
                    <ImportExcel
                        buttonText="Nhập từ Excel"
                        onImport={handleOfficeImport}
                        onImportSuccess={handleImportSuccess}
                    />
                    {isTreeEmpty && (
                        <ModalOffice 
                            dispatch={dispatch} 
                            colors={colors} 
                            allOffices={allOffices}
                            onRefresh={handleRefreshTree}
                            createLabel='Tạo mới'
                        />
                    )}
                </Stack>
            </Box>

            {isTreeEmpty && (
                <Box sx={{ 
                    mt: 1, 
                    p: 1, 
                    backgroundColor: '#fff3cd', 
                    borderRadius: 1,
                    border: '1px solid #ffc107'
                }}>
                    <Typography variant="body2" sx={{ color: '#856404', fontWeight: 500 }}>
                        Nhấn "Tạo mới" để tạo đơn vị đầu tiên.
                    </Typography>
                </Box>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '2px',
                    height: 'calc(100vh - 160px)',
                }}
            >
                <OfficeDictionary
                    ref={treeRef}
                    onSelectOffice={setSelectedOffice}
                    selectedOffice={selectedOffice}
                    offices={allOffices}
                />

                {!isTreeEmpty && (
                    <OfficeDataGrid
                        selectedOffice={selectedOffice}
                        dispatch={dispatch}
                        colors={colors}
                        allOffices={allOffices}
                        onRefreshTree={handleRefreshTree}
                        onRefreshNode={handleRefreshNode}  
                    />
                )}
            </Box>
        </Box>
    );
};

export default Office;