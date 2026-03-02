import React, { useMemo } from 'react';


import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';


import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';


import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

import Header from '../../components/Header';
import ModalEmployee from './subComponent/ModalEmployee';
import FilterEmployee from './subComponent/FilterEmployee';
import ExportExcel from '../../components/Buttons/ExportExcel';
import ImportExcel from '../../components/Buttons/ImportExcel';
import OfficeDictionary from '../Office/subComponent/OfficeDictionary';
import { EmployeeProvider, useEmployee } from '../../context/EmployeeContext';
import type { EmployeeItem } from '../../context/EmployeeContext';
import { formatDate } from '../../apis/employeeApi';
import { TreeSkeleton, GridSkeleton } from '../../components/Skeletons';

// ── Inner component ────────────────────────────────────────────────────────────
const EmployeeInner: React.FC = () => {
    const { state, actions, meta } = useEmployee();
    const { displayEmployees, officeMap, capBacMap, officeList, loading } = state;
    const { selectOffice, importEmployees, onImportSuccess } = actions;
    const { colors, employeeColumnMapping } = meta;

    const isInitialLoading = loading;

    // ── Memo stable: OfficeDictionary không re-init khi columns/employees đổi ─
    const officeDictionary = useMemo(() => (
        officeList.length === 0
            ? <TreeSkeleton rows={10} />
            : (
                <Box sx={{ height: 'inherit' }}>
                    <OfficeDictionary
                        offices={officeList}    // ← stable ref từ context
                        onSelect={selectOffice} // ← stable useCallback([])
                    />
                </Box>
            )
    ), [officeList, selectOffice]);   // ← chỉ re-render khi officeList thực sự thay đổi

    const columns = useMemo((): GridColDef<EmployeeItem>[] => [
        {
            field: 'index', headerName: 'STT',
            align: 'center', headerAlign: 'center', flex: 0.5, type: 'number',
        },
        {
            field: 'hoVaTen', headerName: 'Họ và tên',
            align: 'center', headerAlign: 'center', flex: 1.2,
        },
        {
            field: 'ngaySinh', headerName: 'Ngày sinh',
            flex: 1, align: 'center', headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '16px' }}>
                        {formatDate(params.row.ngaySinh as any)}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'idCapBac', headerName: 'Cấp bậc',
            align: 'center', headerAlign: 'center', flex: 1,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body1" sx={{ color: colors.greenAccent[400], fontWeight: 600, fontSize: '11px' }}>
                        {capBacMap[params.row.idCapBac as string] || params.row.idCapBac || '-'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'chucVu', headerName: 'Chức vụ',
            align: 'center', headerAlign: 'center', flex: 1,
        },
        {
            field: 'idDonVi', headerName: 'Đơn vị',
            align: 'center', headerAlign: 'center', flex: 1,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body1" sx={{ color: colors.forestAccent[500], fontWeight: 600, fontSize: '16px' }}>
                        {officeMap[params.row.idDonVi as string] || params.row.idDonVi || '-'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'idQuanTriDonVi', headerName: 'Phạm vi quản trị',
            align: 'center', headerAlign: 'center', flex: 1,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <Typography variant="body1" sx={{ color: colors.forestAccent[400], fontWeight: 600, fontSize: '16px' }}>
                        {officeMap[params.row.idQuanTriDonVi as string] || params.row.idQuanTriDonVi || '-'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'kichHoat', headerName: 'Trạng thái',
            flex: 0.8, align: 'center', headerAlign: 'center',
            renderCell: (params) => {
                const isActive = params.row.kichHoat ?? (params.row as any).kichhoat ?? false;
                return (
                    <Chip
                        icon={isActive ? <Check /> : <Close />}
                        size="small"
                        label={isActive ? 'Hoạt động' : 'Vô hiệu'}
                        color={isActive ? 'success' : 'default'}
                    />
                );
            },
        },
        {
            field: 'actions', type: 'actions', headerName: 'Hành động',
            width: 150, headerAlign: 'center', align: 'center',
            sortable: false, filterable: false,
            renderCell: (params) => <ModalEmployee data={params.row} />,
            // ← Xóa dispatch, colors, capBacList, officeList — đã dùng context
        },
        // ── capBacMap/officeMap/colors thay đổi khi context update ────────────────
    ], [capBacMap, officeMap, colors]);

    return (
        <Box sx={{ display: 'grid', gridTemplateRows: 'auto auto auto 1fr' }}>

            {/* Header render ngay */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Header title="Quản lý Cán bộ" subtitle="Danh sách cán bộ trong hệ thống" />
            </Box>

            {/* Filter + Toolbar render ngay */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 1, gap: 1, width: '100%' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FilterEmployee />
                    {/* ← Xóa onFilter, capBacList, officeList, colors — đã dùng context */}
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
                    <ExportExcel
                        buttonText="Xuất Excel"
                        data={displayEmployees}
                        columnMapping={employeeColumnMapping}
                        fileName="DanhSachCanBo"
                        sheetName="Danh sách cán bộ"
                    />
                    <ImportExcel
                        buttonText="Nhập từ Excel"
                        onImport={importEmployees}
                        onImportSuccess={onImportSuccess}
                    />
                </Stack>
            </Box>

            {/* Create button render ngay */}
            <Box sx={{ justifySelf: 'end', mr: 1 }}>
                <ModalEmployee />
                {/* Xóa dispatch, colors, capBacList, officeList */}
            </Box>

            {/* Tree + DataGrid: skeleton → real content */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2px', height: 'calc(100vh - 247px)' }}>

                {/* Tree: chỉ re-render khi officeList thay đổi */}
                {officeDictionary}

                {/* DataGrid: skeleton → real */}
                {isInitialLoading
                    ? <GridSkeleton rows={8} cols={9} />
                    : (
                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: 'inherit', border: `1px solid ${colors.grey[800]}`, borderRadius: 0 }}>
                            <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', alignSelf: 'center', my: 1 }}>
                                {`Tổng cộng: ${displayEmployees.length} cán bộ`}
                            </Typography>
                            <DataGrid
                                rows={displayEmployees}
                                columns={columns}
                                getRowId={(row) => row.id || row.index || ''}
                                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                                pageSizeOptions={[10, 25, 50]}
                                slots={{ toolbar: GridToolbar }}
                                sx={{
                                    fontSize: '14px', fontWeight: 600, width: '100%', border: 'none',
                                    borderRadius: 0,
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: colors.primary[400],
                                        borderBottom: `2px solid ${colors.grey[800]}`,
                                    },
                                    '& .MuiDataGrid-cell': { borderBottom: 'none' },
                                    '& .MuiDataGrid-virtualScroller': { backgroundColor: colors.primary[400] },
                                    '& .MuiDataGrid-footerContainer': { borderTop: 'none', backgroundColor: colors.forestAccent[700] },
                                    '& .MuiCheckbox-root': { color: `${colors.greenAccent[200]} !important` },
                                    '& .MuiDataGrid-toolbarContainer .MuiButton-text': { color: `${colors.grey[100]} !important` },
                                }}
                            />
                        </Box>
                    )
                }
            </Box>
        </Box>
    );
};

// ── Page ───────────────────────────────────────────────────────────────────────
const Employee: React.FC = () => (
    <EmployeeProvider>
        <EmployeeInner />
    </EmployeeProvider>
);

export default Employee;
