// import in project
import { Box, Button, Typography, useTheme, Chip, Stack } from "@mui/material";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { fetchEmployee } from '../../store/reducer/employee'
import officeApi from '../../apis/officeApi';
import employeeApi ,{formatDate}  from '../../apis/employeeApi';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import TableUI from '../../components/Table/index'
import { Check, Close } from "@mui/icons-material";
import ModalEmployee from "./subComponent/ModalEmployee";
import catalogApi from "../../apis/catalogApi";
import FilterEmployee from "./subComponent/FilterEmployee";
import Dialog from "@mui/material/Dialog";
import OfficeDictionary from "../Office/subComponent/OfficeDictionary";
import ExportExcel from "../../components/Buttons/ExportExcel";
import ImportExcel from "../../components/Buttons/ImportExcel";

// [js-cache-function-results] Module-level cache - giữ nguyên giữa các render, chỉ xóa khi data thay đổi
const filterCache = new Map();

// [rerender-memo] Static object - đặt ngoài component để tránh tạo lại mỗi render
const employeeColumnMapping = {
    'STT': 'index',
    'Họ và tên': 'hoVaTen',
    'Ngày sinh': 'ngaySinh',
    'Cấp bậc': 'idCapBac',
    'Chức vụ': 'chucVu',
    'Đơn vị': 'idDonVi',
    'Phạm vi quản trị': 'idQuanTriDonVi',
    'Trạng thái': 'kichHoat'
};

const Employee = (props) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const employee = useSelector(state => state.employeeReducer.employeeApi);
    const dispatch = useDispatch();
    const [officeList, setOfficeList] = useState([]);
    const [officeMap, setOfficeMap] = useState({});
    const [capBacMap, setCapBacMap] = useState({});
    const [capBacList, setCapBacList] = useState([]);

    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [isFiltered, setIsFiltered] = useState(false);

    const [openOfficeDict, setOpenOfficeDict] = useState(false);

    const [filterMode, setFilterMode] = useState('quantri');

    useEffect(() => {
        // [async-parallel] Chạy song song thay vì tuần tự (2-10× nhanh hơn)
        const loadInitialData = async () => {
            dispatch(fetchEmployee());

            const [offices, capBac] = await Promise.all([
                officeApi.getListOffices({ loadAll: true }).catch(err => {
                    console.error('Error loading offices:', err);
                    return [];
                }),
                catalogApi.getListCatalog('CapBac').catch(err => {
                    console.error('Error loading capBac:', err);
                    return [];
                }),
            ]);

            setOfficeList(offices);
            const officeMapData = {};
            offices.forEach(office => {
                officeMapData[office.id] = office.ten || office.tenDayDu || office.id;
            });
            setOfficeMap(officeMapData);

            setCapBacList(capBac);
            const capBacMapData = {};
            capBac.forEach(item => {
                capBacMapData[item.id] = item.ten || item.tenDayDu || item.id;
            });
            setCapBacMap(capBacMapData);
        };

        loadInitialData();
    }, [dispatch]);

    // [js-cache-function-results] Xóa cache khi danh sách nhân viên thay đổi
    // (sau khi thêm/sửa/xóa từ ModalEmployee → Redux state cập nhật → cache lỗi thời)
    useEffect(() => {
        filterCache.clear();
    }, [employee]);


    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const handleFilter = async (filters) => {
        const { searchText, idCapBac, chucVu, idDonVi, idQuanTriDonVi } = filters;

        // Kiểm tra có filter nào đang active không
        const hasActiveFilter = searchText || idCapBac || chucVu || idDonVi || idQuanTriDonVi;

        if (!hasActiveFilter) {
            setIsFiltered(false);
            setFilteredEmployees([]);
            return;
        }

        // [js-cache-function-results] Tạo cache key từ filter params
        const cacheKey = JSON.stringify({ searchText, idCapBac, chucVu, idDonVi, idQuanTriDonVi });

        // Nếu đã có trong cache → dùng luôn, không gửi request
        if (filterCache.has(cacheKey)) {
            setIsFiltered(true);
            setFilteredEmployees(filterCache.get(cacheKey));
            return;
        }

        setLoadingEmployees(true);
        try {
            const searchParams = {
                employee: {
                    hoVaTen: searchText || undefined,
                    idCapBac: idCapBac || undefined,
                    chucVu: chucVu || undefined,
                    idDonVi: idDonVi || undefined,
                    idQuanTriDonVi: idQuanTriDonVi || undefined,
                }
            };
            // [bundle-dynamic-imports] Dùng static import đã có, không cần dynamic import
            const data = await employeeApi.getListEmployees(searchParams);
            let index = 1;
            const list = Array.isArray(data) ? data.map(item => ({
                index: index++,
                ...item,
                id: item.id || item.Id,
            })) : [];

            // Lưu vào cache trước khi set state
            filterCache.set(cacheKey, list);

            setIsFiltered(true);
            setFilteredEmployees(list);
        } catch (error) {
            setIsFiltered(true);
            setFilteredEmployees([]);
            console.error('Lỗi khi tìm kiếm nhân viên:', error);
        } finally {
            setLoadingEmployees(false);
        }
    };

    // [rerender-memo] useCallback tránh tạo lại function mỗi render
    const handleSelectOfficeFromTree = useCallback((office) => {
        if (office) {
            handleFilter({
                searchText: "",
                idCapBac: "",
                chucVu: "",
                idDonVi: office.id,
                idQuanTriDonVi: ""
            });
        }
        setOpenOfficeDict(false);
    }, [handleFilter]);

    const displayEmployees = isFiltered ? filteredEmployees : employee;

    // Xử lý import Excel
    // Replace your handleEmployeeImport function with this corrected version

// Phiên bản cải tiến - hỗ trợ cả ID và tên cho Cấp bậc, Đơn vị

const handleEmployeeImport = async (excelData) => {
    try {
        console.log('[Import] Starting import of', excelData.length, 'records');

        // Parse và validate data
        const parsedData = excelData.map((row, index) => {
            // ✅ FIXED: Parse ngày sinh - hỗ trợ cả Date object và string
            let ngaySinh = '';
            if (row['Ngày sinh']) {
                const dateValue = row['Ngày sinh'];
                
                // Case 1: Date object từ Excel
                if (dateValue instanceof Date) {
                    const year = dateValue.getFullYear();
                    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                    const day = String(dateValue.getDate()).padStart(2, '0');
                    ngaySinh = `${year}-${month}-${day}`; // YYYY-MM-DD
                    console.log(`[Import] Parsed Date object: ${dateValue} -> ${ngaySinh}`);
                }
                // Case 2: String format "DD/MM/YYYY"
                else if (typeof dateValue === 'string') {
                    const parts = dateValue.split('/');
                    if (parts.length === 3) {
                        ngaySinh = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
                        console.log(`[Import] Parsed string: ${dateValue} -> ${ngaySinh}`);
                    }
                }
                // Case 3: Number (Excel serial date)
                else if (typeof dateValue === 'number') {
                    // Excel date serial number (days since 1900-01-01)
                    const excelEpoch = new Date(1900, 0, 1);
                    const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 86400000);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    ngaySinh = `${year}-${month}-${day}`;
                    console.log(`[Import] Parsed Excel serial: ${dateValue} -> ${ngaySinh}`);
                }
            }

            // Helper function để normalize text
            const normalizeText = (text) => text?.trim().toLowerCase() || '';

            // Helper để tìm ID từ tên hoặc mã
            const findOfficeId = (value) => {
                if (!value) return '';
                const normalized = normalizeText(value);
                
                // Kiểm tra xem có phải UUID không
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidPattern.test(value.trim())) {
                    return value.trim();
                }
                
                // Tìm theo tên hoặc mã
                const found = officeList.find(o =>
                    normalizeText(o.ten) === normalized ||
                    normalizeText(o.tenDayDu) === normalized ||
                    normalizeText(o.ma) === normalized ||
                    normalizeText(o.id) === normalized || // Thêm tìm theo ID (000, 000.001)
                    o.id === value.trim()
                );
                return found?.id || '';
            };

            const findCapBacId = (value) => {
                if (!value) return '';
                const normalized = normalizeText(value);
                
                // Kiểm tra xem có phải UUID không
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidPattern.test(value.trim())) {
                    return value.trim();
                }
                
                // Tìm theo tên hoặc mã
                const found = capBacList.find(cb =>
                    normalizeText(cb.ten) === normalized ||
                    normalizeText(cb.tenDayDu) === normalized ||
                    normalizeText(cb.ma) === normalized ||
                    cb.id === value.trim()
                );
                return found?.id || '';
            };

            // Parse trạng thái - hỗ trợ nhiều format
            const parseStatus = (value) => {
                if (value === undefined || value === null) return false;
                const normalized = normalizeText(String(value));
                // Hỗ trợ: "Hoạt động", "Có", "Active", "Yes", "1", "True"
                return ['hoạt động', 'có', 'active', 'yes', '1', 'true'].includes(normalized);
            };

            return {
                rowIndex: index + 1,
                hoVaTen: row['Họ và tên']?.trim() || '',
                ngaySinh: ngaySinh,
                idCapBac: findCapBacId(row['Cấp bậc']),
                chucVu: row['Chức vụ']?.trim() || '',
                idDonVi: findOfficeId(row['Đơn vị']),
                idQuanTriDonVi: findOfficeId(row['Phạm vi quản trị']),
                kichHoat: parseStatus(row['Trạng thái']),
                _raw: row // Giữ lại để debug
            };
        });

        console.log('[Import] Parsed data sample:', parsedData.slice(0, 3));
        
        // Validate dữ liệu
        const invalidRows = parsedData.filter(emp => !emp.hoVaTen);
        if (invalidRows.length > 0) {
            console.warn('[Import] Rows without name:', invalidRows.length);
        }

        // Import theo batch
        const BATCH_SIZE = 50;
        const results = [];

        for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
            const batch = parsedData.slice(i, i + BATCH_SIZE);
            console.log(`[Import] Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(parsedData.length / BATCH_SIZE)}`);

            const batchResults = await Promise.allSettled(
                batch.map(async (employeeData) => {
                    try {
                        // Bỏ qua nếu không có tên
                        if (!employeeData.hoVaTen) {
                            throw new Error('Thiếu họ và tên');
                        }

                        // Tìm nhân viên đã tồn tại theo tên
                        const exists = employee.find(e =>
                            e.hoVaTen?.trim().toLowerCase() === employeeData.hoVaTen?.trim().toLowerCase()
                        );

                        // Loại bỏ field _raw trước khi gửi
                        const { _raw, rowIndex, ...cleanData } = employeeData;

                        if (exists) {
                            // Update
                            console.log(`[Import] Updating employee: ${cleanData.hoVaTen}`);
                            return await employeeApi.update({
                                ...cleanData,
                                id: exists.id
                            });
                        } else {
                            // Create
                            console.log(`[Import] Creating employee: ${cleanData.hoVaTen}`);
                            return await employeeApi.create(cleanData);
                        }
                    } catch (error) {
                        console.error(`[Import] Error row ${employeeData.rowIndex}:`, error);
                        throw new Error(`Row ${employeeData.rowIndex}: ${error.message}`);
                    }
                })
            );

            results.push(...batchResults);

            // Delay giữa các batch
            if (i + BATCH_SIZE < parsedData.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Thống kê kết quả
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const failedDetails = results
            .filter(r => r.status === 'rejected')
            .map(r => r.reason?.message)
            .slice(0, 10);

        console.log('[Import] Final results:', { succeeded, failed, total: excelData.length });
        
        if (failedDetails.length > 0) {
            console.error('[Import] First 10 errors:', failedDetails);
        }

        return {
            success: failed === 0,
            message: failed > 0
                ? `Import thành công ${succeeded}/${excelData.length}. ${failed} lỗi.`
                : `Import thành công ${succeeded} cán bộ`,
            details: {
                succeeded,
                failed,
                total: excelData.length,
                errors: failedDetails
            }
        };
    } catch (error) {
        console.error('[Import] Fatal error:', error);
        return {
            success: false,
            message: 'Lỗi khi import: ' + error.message,
            details: { error: error.message }
        };
    }
};

    const handleImportSuccess = async () => {
        // [js-cache-function-results] Xóa cache khi data thay đổi → lần filter tiếp theo sẽ fetch mới
        filterCache.clear();
        await dispatch(fetchEmployee());
    };


    // [rerender-memo] useMemo tránh tạo lại columns array mỗi render
    const columns = useMemo(() => [
        {
            field: "index",
            headerName: "STT",
            align: 'center',
            headerAlign: 'center',
            flex: 0.5,
            type: 'number'
        },
        {
            field: "hoVaTen",
            headerName: "Họ và tên",
            align: 'center',
            headerAlign: 'center',
            flex: 1.2,

        },
        {
            field: "ngaySinh",
            headerName: "Ngày sinh",
            flex: 1,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const date = params.row.ngaySinh;
                // let formatted = '-';
                // if (date) {
                //     formatted = date ? date.toDate().toLocaleDateString("vi-VN") : '-';
                // }
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '16px' }}>{formatDate(date)}</Typography>
                    </Box>
                );
            },
        },
        // {
        //     field: "email",
        //     headerName: "Email",
        //     align: 'center',
        //     headerAlign: 'center',
        //     flex: 1.2,
        //     renderCell: (params) => {
        //         return (
        //             <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', height: '100%', alignItems: 'center' }}>
        //                 <Typography variant="body1" sx={{ color: colors.blueAccent[300], fontWeight: 600, fontSize: '16px' }}>
        //                     {params.row.email || '-'}
        //                 </Typography>
        //             </Box>
        //         )
        //     }
        // },
        {
            field: "idCapBac",
            headerName: "Cấp bậc",
            align: 'center',
            headerAlign: 'center',
            flex: 1,

            renderCell: (params) => {
                const capBacName = capBacMap[params.row.idCapBac] || params.row.idCapBac || '-';
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                        <Typography variant="body1" sx={{ color: colors.greenAccent[400], fontWeight: 600, fontSize: '16px' }}>{capBacName}</Typography>
                    </Box>
                );
            },

        },
        {
            field: "chucVu",
            headerName: "Chức vụ",
            align: 'center',
            headerAlign: 'center',
            flex: 1,

        },
        {
            field: "idDonVi", // Changed from iddonvi
            headerName: "Đơn vị",
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            renderCell: (params) => {
                const officeName = officeMap[params.row.idDonVi] || params.row.idDonVi || '-';
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                        <Typography variant="body1" sx={{ color: colors.blueAccent[500], fontWeight: 600, fontSize: '16px' }}>{officeName}</Typography>
                    </Box>
                );
            },

        },
        {
            field: "idQuanTriDonVi", // Changed from idquantridonvi
            headerName: "Phạm vi quản trị",
            align: 'center',
            headerAlign: 'center',
            flex: 1,
            renderCell: (params) => {
                const officeName = officeMap[params.row.idQuanTriDonVi] || params.row.idQuanTriDonVi || '-';
                return (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                        <Typography variant="body1" sx={{ color: colors.blueAccent[400], fontWeight: 600, fontSize: '16px' }}>{officeName}</Typography>
                    </Box>
                );
            },

        },
        {
            field: "kichHoat", // Changed from kichhoat
            headerName: "Trạng thái",
            flex: 0.8,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const isActive = params.row.kichHoat ?? params.row.kichhoat ?? false;
                return (
                    <Chip
                        icon={isActive ? <Check /> : <Close />}
                        size="small"
                        label={isActive ? 'Hoạt động' : 'Vô hiệu'}
                        color={isActive ? 'success' : 'error'}
                    />
                );
            },
        },

        {
            field: 'actions',
            type: 'actions',
            headerName: "Hành động",
            width: 150,
            headerAlign: 'center',
            align: 'center',
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <ModalEmployee
                    data={params.row}
                    dispatch={dispatch}
                    colors={colors}
                    capBacList={capBacList}
                    officeList={officeList}
                />
            )
        }
    ], [capBacMap, officeMap, colors, capBacList, officeList, dispatch]);

    return (
        <Box sx={{
            
            display: 'grid',
            // Hàng 1: auto, Hàng 2: chiếm còn lại
            gridTemplateRows: 'auto auto auto 1fr',

        }} >
            {/* Header với các nút Export/Import */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Header title="Quản lý Cán bộ" subtitle="Danh sách cán bộ trong hệ thống" />

            </Box>

            {/* Nhóm trên cùng: Filter */}
            <Box sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                p: 1,
                gap: 1,
                width: '100%',
            }}>
                {/* FilterEmployee - chiếm phần lớn không gian */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <FilterEmployee
                        onFilter={handleFilter}
                        capBacList={capBacList}
                        officeList={officeList}
                        colors={colors}
                    />
                </Box>

                {/* Nhóm nút Export/Import - cố định bên phải */}
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
                    <ExportExcel
                        buttonText="Xuất Excel"
                        data={displayEmployees || []}
                        columnMapping={employeeColumnMapping}
                        fileName="DanhSachCanBo"
                        sheetName="Danh sách cán bộ"
                    />
                    <ImportExcel
                        buttonText="Nhập từ Excel"
                        onImport={handleEmployeeImport}
                        onImportSuccess={handleImportSuccess}
                    />
                </Stack>
            </Box>

            {/* Modal thêm mới - vị trí end của Box chính */}
            <Box sx={{

                justifySelf: 'end',
                mr: 1,

            }}>
                <ModalEmployee
                    dispatch={dispatch}
                    colors={colors}
                    capBacList={capBacList}
                    officeList={officeList}
                />
            </Box>

            {/* Phần dưới: Office Dictionary (trái) và DataGrid (phải) */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 3fr',
                gap: '2px',
                height: 'calc(100vh - 247px)', // Chiều cao còn lại sau khi trừ header và filter
            }}>


                <OfficeDictionary
                    sx={{ height: 'inherit' }}
                    offices={officeList}
                    onSelect={handleSelectOfficeFromTree}
                />


                {/* Cột phải: DataGrid */}
                <Box sx={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 'inherit',
                    boxShadow: 1,

                }}>
                    <Typography
                        variant="h6"
                        sx={{
                            whiteSpace: 'nowrap',
                            alignSelf: 'center', // Căn giữa theo chiều dọc
                            mx: 2 // Margin ngang
                        }}
                    >
                        {`Tổng cộng: ${displayEmployees.length} cán bộ`}
                    </Typography>


                    <DataGrid
                        rows={displayEmployees}
                        columns={columns}
                        getRowId={(row) => row.index}
                        pageSize={5}
                        components={{ Toolbar: GridToolbar }}
                        sx={{
                            fontSize: '16px',
                            fontWeight: 600,
                            width: '100%',
                            border: "none",
                            "& .MuiDataGrid-cell": {
                                borderBottom: "none",
                            },
                            "& .name-column--cell": {
                                color: colors.greenAccent[300],
                            },
                            "& .MuiDataGrid-columnHeaders": {
                                backgroundColor: colors.blueAccent[700],
                                borderBottom: "none",
                            },
                            "& .MuiDataGrid-virtualScroller": {
                                backgroundColor: colors.primary[400],
                            },
                            "& .MuiDataGrid-footerContainer": {
                                borderTop: "none",
                                backgroundColor: colors.blueAccent[700],
                            },
                            "& .MuiCheckbox-root": {
                                color: `${colors.greenAccent[200]} !important`,
                            },
                            "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
                                color: `${colors.grey[100]} !important`,
                            },
                        }}
                    />
                </Box>
            </Box>


        </Box>
    );
};

export default Employee;