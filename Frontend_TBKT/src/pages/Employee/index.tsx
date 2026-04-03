import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import type { GridColDef } from '@mui/x-data-grid';
import Header from '../../components/Header';
import ModalEmployee from './subComponent/ModalEmployee';
import FilterEmployee from './subComponent/FilterEmployee';
import ExportExcel from '../../components/Buttons/ExportExcel';
import LazyImportExcel from '../../components/Buttons/LazyImportExcel';
import LazyDataGrid from '../../components/LazyDataGrid';
import OfficeDictionary from '../Office/subComponent/OfficeDictionary';
import { EmployeeProvider, useEmployee } from '../../context/EmployeeContext';
import type { EmployeeItem } from '../../context/EmployeeContext';
import { formatDate } from '../../apis/employeeApi';
import { TreeSkeleton, GridSkeleton } from '../../components/Skeletons';
import StatsButton from '../../components/Stats/StatsButton';

const EmployeeInner: React.FC = () => {
    const { state, actions, meta } = useEmployee();
    const {
        displayEmployees,
        officeMap,
        capBacMap,
        officeList,
        loading,
        importProgress,
        importLogs,
    } = state;
    const { selectOffice, importEmployees, onImportSuccess } = actions;
    const { colors, employeeColumnMapping } = meta;

    const officeDictionary = useMemo(() => (
        officeList.length === 0
            ? <TreeSkeleton rows={10} />
            : (
                <Box sx={{ height: 'inherit' }}>
                    <OfficeDictionary offices={officeList} onSelect={selectOffice} />
                </Box>
            )
    ), [officeList, selectOffice]);

    const columns = useMemo((): GridColDef<EmployeeItem>[] => [
        { field: 'index', headerName: 'STT', flex: 0.5, type: 'number' },
        { field: 'hoVaTen', headerName: 'Họ và tên', flex: 1.2 },
        {
            field: 'ngaySinh',
            headerName: 'Ngày sinh',
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '16px' }}>
                    {formatDate(params.row.ngaySinh as any)}
                </Typography>
            ),
        },
        {
            field: 'idCapBac',
            headerName: 'Cấp bậc',
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body1" sx={{ color: colors.greenAccent[400], fontWeight: 600, fontSize: '11px' }}>
                    {capBacMap[params.row.idCapBac as string] || params.row.idCapBac || '-'}
                </Typography>
            ),
        },
        { field: 'chucVu', headerName: 'Chức vụ', flex: 1 },
        {
            field: 'idDonVi',
            headerName: 'Đơn vị',
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body1" sx={{ color: colors.forestAccent[500], fontWeight: 600, fontSize: '16px' }}>
                    {officeMap[params.row.idDonVi as string] || params.row.idDonVi || '-'}
                </Typography>
            ),
        },
        {
            field: 'idQuanTriDonVi',
            headerName: 'Phạm vi quản trị',
            flex: 1,
            renderCell: (params) => (
                <Typography variant="body1" sx={{ color: colors.forestAccent[400], fontWeight: 600, fontSize: '16px' }}>
                    {officeMap[params.row.idQuanTriDonVi as string] || params.row.idQuanTriDonVi || '-'}
                </Typography>
            ),
        },
        {
            field: 'kichHoat',
            headerName: 'Trạng thái',
            flex: 0.8,
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
            field: 'actions',
            type: 'actions',
            headerName: 'Hành động',
            width: 150,
            sortable: false,
            filterable: false,
            renderCell: (params) => <ModalEmployee data={params.row} />,
        },
    ], [capBacMap, officeMap, colors]);

    return (
        <Box sx={{ display: 'grid', gridTemplateRows: 'auto auto auto auto 1fr' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Header title="Quản lý Cán bộ" subtitle="Danh sách cán bộ trong hệ thống" />
                <StatsButton activeMenu="employee" />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', p: 1, gap: 1, width: '100%' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FilterEmployee />
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
                    <ExportExcel
                        buttonText="Xuất Excel"
                        data={displayEmployees}
                        columnMapping={employeeColumnMapping}
                        fileName="DanhSachCanBo"
                        sheetName="Danh sách cán bộ"
                    />
                    <LazyImportExcel
                        buttonText="Nhập từ Excel"
                        onImport={importEmployees}
                        onImportSuccess={onImportSuccess}
                    />
                </Stack>
            </Box>

            <Box sx={{ justifySelf: 'end', mr: 1 }}>
                <ModalEmployee />
            </Box>

            {importProgress && (
                <Alert severity={importProgress.done && !importProgress.success ? 'warning' : 'info'} sx={{ mx: 1, mb: 1 }}>
                    <Stack spacing={1}>
                        <Typography variant="subtitle2" fontWeight={700}>
                            Import Excel
                        </Typography>
                        <Typography variant="body2">{importProgress.message}</Typography>
                        <LinearProgress
                            variant={importProgress.total > 0 ? 'determinate' : 'indeterminate'}
                            value={importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0}
                        />
                        <Typography variant="caption" color="text.secondary">
                            {`${importProgress.processed}/${importProgress.total} | Thành công: ${importProgress.succeeded} | Lỗi: ${importProgress.failed}`}
                        </Typography>
                        {importLogs.length > 0 && (
                            <Box sx={{ maxHeight: 128, overflow: 'auto', bgcolor: 'background.default', borderRadius: 1, p: 1 }}>
                                {importLogs.map((line, idx) => (
                                    <Typography key={`${idx}-${line}`} variant="caption" display="block" color="text.secondary">
                                        {line}
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </Stack>
                </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2px', height: 'calc(100vh - 247px)' }}>
                {officeDictionary}
                {loading
                    ? <GridSkeleton rows={8} cols={9} />
                    : (
                        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: 'inherit' }}>
                            <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', alignSelf: 'center', my: 1 }}>
                                {`Tổng cộng: ${displayEmployees.length} cán bộ`}
                            </Typography>
                            <LazyDataGrid
                                rows={displayEmployees}
                                columns={columns}
                                getRowId={(row) => row.id || row.index || ''}
                                includeToolbar
                                fallbackRows={8}
                                fallbackCols={9}
                                sx={{ fontSize: '14px', fontWeight: 600, width: '100%' }}
                            />
                        </Box>
                    )}
            </Box>
        </Box>
    );
};

const Employee: React.FC = () => (
    <EmployeeProvider>
        <EmployeeInner />
    </EmployeeProvider>
);

export default Employee;
