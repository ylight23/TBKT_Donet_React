import React from 'react';

// ✅ Direct imports thay vì barrel
import Box        from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack      from '@mui/material/Stack';

import Header           from '../../components/Header';
import OfficeDictionary from './subComponent/OfficeDictionary';
import OfficeDataGrid   from './subComponent/OfficeDataGrid';
import ModalOffice      from './subComponent/ModalOffice';
import ExportExcel      from '../../components/Buttons/ExportExcel';
import ImportExcel      from '../../components/Buttons/ImportExcel';
import { OfficeProvider, useOffice } from '../../context/OfficeContext';
import { TreeSkeleton, GridSkeleton } from '../../components/Skeletons';

// ── Inner component ────────────────────────────────────────────────────────────
const OfficeInner: React.FC = () => {
    const { state, actions, meta } = useOffice();
    const { allOffices, isTreeEmpty, loading } = state;
    const { importOffices, onImportSuccess } = actions;
    const { treeRef, officeColumnMapping } = meta;

    const isInitialLoading = loading;

    return (
        <Box>
            {/* 1. Header + Toolbar render ngay - không cần data */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Header title="Quản lý Đơn vị" subtitle="Danh sách các đơn vị trong hệ thống" />
                <Stack direction="row" spacing={1}>
                    <ExportExcel
                        buttonText="Tải danh sách"
                        data={allOffices}
                        columnMapping={officeColumnMapping}
                        fileName="DanhSachDonVi"
                        sheetName="Danh sách đơn vị"
                    />
                    <ImportExcel
                        buttonText="Nhập từ Excel"
                        onImport={importOffices}
                        onImportSuccess={onImportSuccess}
                    />
                    {isTreeEmpty && <ModalOffice createLabel="Tạo mới" />}
                </Stack>
            </Box>

            {/* 2. Warning banner render ngay */}
            {isTreeEmpty && (
                <Box sx={{ mt: 1, p: 1, backgroundColor: '#fff3cd', borderRadius: 1, border: '1px solid #ffc107' }}>
                    <Typography variant="body2" sx={{ color: '#856404', fontWeight: 500 }}>
                        Nhấn "Tạo mới" để tạo đơn vị đầu tiên.
                    </Typography>
                </Box>
            )}

            {/* 3. Tree + Grid: skeleton → real content */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2px', height: 'calc(100vh - 160px)' }}>

                {/* Tree: skeleton khi chưa có data */}
                {isInitialLoading
                    ? <TreeSkeleton rows={10} />          // ← giống Suspense fallback
                    : <OfficeDictionary ref={treeRef} />   // ← giống Suspense children
                }

                {/* Grid: skeleton khi chưa có data */}
                {isInitialLoading
                    ? <GridSkeleton rows={8} cols={6} />
                    : !isTreeEmpty && <OfficeDataGrid />
                }

            </Box>
        </Box>
    );
};

// ── Page ───────────────────────────────────────────────────────────────────────
const Office: React.FC = () => (
    <OfficeProvider>
        <OfficeInner />
    </OfficeProvider>
);

export default Office;
