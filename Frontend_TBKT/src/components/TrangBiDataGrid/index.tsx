// ============================================================
// TrangBiDataGrid - Bang du lieu trang bi ky thuat dung chung
// Dung cho ca Nhom 1 va Nhom 2
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import AddIcon from '@mui/icons-material/Add';

import type { TrangBiNhom1GridItem, TrangBiNhom2GridItem } from '../../grpc/generated/DanhMucTrangBi_pb';
import { TrangThaiTrangBi, ChatLuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import FilterTrangBi, { type FilterTrangBiValues } from './FilterTrangBi';
import OfficeDictionary, { type OfficeNode } from '../../pages/Office/subComponent/OfficeDictionary';
import { OfficeProvider } from '../../context/OfficeContext';
import StatsButton from '../Stats/StatsButton';
import AddTrangBiDialog from './AddTrangBiDialog';
import LazyDataGrid from '../LazyDataGrid';
import { useMyPermissions } from '../../hooks/useMyPermissions';

const trangThaiColor: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  [TrangThaiTrangBi.HoatDong]: 'success',
  [TrangThaiTrangBi.SuaChua]: 'warning',
  [TrangThaiTrangBi.NiemCat]: 'info',
  [TrangThaiTrangBi.ChoThanhLy]: 'error',
  [TrangThaiTrangBi.DaThanhLy]: 'default',
};

const chatLuongColor: Record<string, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
};

interface TrangBiDataGridProps {
  title: string;
  subtitle: string;
  data: Array<TrangBiNhom1GridItem | TrangBiNhom2GridItem>;
  loading?: boolean;
  errorMessage?: string;
  activeMenu?: 'tbNhom1' | 'tbNhom2' | string;
  onRecordSaved?: () => void;
}

type TrangBiGridRow = TrangBiNhom1GridItem | TrangBiNhom2GridItem;

const isTrangBiGroupMenu = (value?: string): value is 'tbNhom1' | 'tbNhom2' => (
  value === 'tbNhom1' || value === 'tbNhom2'
);

const TrangBiDataGrid: React.FC<TrangBiDataGridProps> = ({
  title,
  subtitle,
  data,
  loading = false,
  errorMessage = '',
  activeMenu,
  onRecordSaved,
}) => {
  const { canCnAction, visibleCNs, loaded: permissionLoaded } = useMyPermissions();
  const activeMenuForDialog = isTrangBiGroupMenu(activeMenu) ? activeMenu : undefined;

const [filterValues, setFilterValues] = useState<FilterTrangBiValues | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const handleClearFilter = useCallback(() => {
    setFilterValues(null);
  }, []);

  const handleSearch = useCallback((values: FilterTrangBiValues) => {
    setFilterValues(values);
  }, []);

  const handleOpenCreateDialog = useCallback(() => {
    setEditingRecordId(null);
    setOpenAdd(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setOpenAdd(false);
    setEditingRecordId(null);
  }, []);

  const filtered = useMemo(() => {
    if (!filterValues) return data;

    const {
      fullTextSearch,
      donVi,
      maDanhMuc,
      tenDanhMuc,
      capChatLuong,
      tinhTrangSuDung,
      soHieu,
      nhom,
      phanNganh,
      tinhTrangKyThuat,
      donViQuanLy,
      namSanXuat,
      namSuDung,
    } = filterValues;

    const q = fullTextSearch.toLowerCase();

    return data.filter((row) => {
      const matchSearch = !q || [
        row.maDanhMuc,
        row.tenDanhMuc,
        row.loai,
        row.soHieu,
        row.donVi,
      ].some((value) => value && value.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (donVi && !row.donVi.toLowerCase().includes(donVi.toLowerCase())) return false;
      if (maDanhMuc && !row.maDanhMuc.toLowerCase().includes(maDanhMuc.toLowerCase())) return false;
      if (tenDanhMuc && !row.tenDanhMuc.toLowerCase().includes(tenDanhMuc.toLowerCase())) return false;
      if (capChatLuong && row.chatLuong !== capChatLuong) return false;
      if (tinhTrangSuDung && row.trangThai !== tinhTrangSuDung) return false;
      if (soHieu && !row.soHieu.toLowerCase().includes(soHieu.toLowerCase())) return false;

      const extendedRow = row as Record<string, unknown>;
      if (nhom && extendedRow.nhom !== nhom) return false;
      if (phanNganh && row.idCapTren !== phanNganh) return false;
      if (tinhTrangKyThuat && extendedRow.tinhTrangKyThuat !== tinhTrangKyThuat) return false;
      if (donViQuanLy && extendedRow.donViQuanLy !== donViQuanLy) return false;
      if (namSanXuat && extendedRow.namSanXuat !== Number(namSanXuat)) return false;
      if (namSuDung && extendedRow.namSuDung !== Number(namSuDung)) return false;

      if (selectedOffice) {
        const officeName = selectedOffice.ten || selectedOffice.tenDayDu || '';
        if (!row.donVi.toLowerCase().includes(officeName.toLowerCase())) return false;
      }

      return true;
    });
  }, [data, filterValues, selectedOffice]);

  const handleExport = useCallback(() => {
    alert(`[Gia lap] Xuat ${filtered.length} ban ghi ra Excel`);
  }, [filtered.length]);

  const resolveTrangBiCnId = useCallback((row: TrangBiGridRow): string => (
    String(row.idChuyenNganhKt || '').trim()
  ), []);

  const isRowActionDisabled = useCallback(
    (action: 'view' | 'edit' | 'delete' | 'print' | 'export', row: TrangBiGridRow): boolean => {
      if (!permissionLoaded) return false;
      const cnId = resolveTrangBiCnId(row);
      if (!cnId) return true;
      const mappedAction = action === 'export' ? 'download' : action;
      return !canCnAction(mappedAction, cnId);
    },
    [canCnAction, permissionLoaded, resolveTrangBiCnId],
  );

  const canAddAny = useMemo(() => {
    if (!permissionLoaded) return true;
    if (visibleCNs.length === 0) return true;
    return visibleCNs.some((cnId) => canCnAction('add', cnId));
  }, [canCnAction, permissionLoaded, visibleCNs]);

  const canExportAny = useMemo(() => {
    if (!permissionLoaded) return true;
    return filtered.some((row) => {
      const cnId = resolveTrangBiCnId(row);
      return cnId ? canCnAction('download', cnId) : false;
    });
  }, [canCnAction, filtered, permissionLoaded, resolveTrangBiCnId]);

  const handleEditRow = useCallback((row: TrangBiGridRow) => {
    if (activeMenuForDialog) {
      setEditingRecordId(row.id);
      setOpenAdd(true);
      return;
    }

    alert(`Sua: ${row.maDanhMuc}`);
  }, [activeMenuForDialog]);

  const columns = useMemo<GridColDef<TrangBiGridRow>[]>(() => [
    {
      field: 'stt',
      headerName: 'STT',
      width: 60,
      renderCell: (params) => {
        const index = params.api.getSortedRowIds().indexOf(params.id);
        return <Typography variant="body2">{index + 1}</Typography>;
      },
    },
    {
      field: 'maDanhMuc',
      headerName: 'Mã danh mục',
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'donVi',
      headerName: 'Đơn vị',
      flex: 1,
      minWidth: 160,
    },
    {
      field: 'idCapTren',
      headerName: 'Phân ngành',
      width: 150,
    },
    {
      field: 'donViQuanLy',
      headerName: 'Đơn vị quản lý',
      width: 180,
    },
    {
      field: 'trangThai',
      headerName: 'Tình trạng sử dụng',
      width: 160,
      renderCell: (params: GridRenderCellParams<TrangBiGridRow, string>) => (
        <Chip
          label={params.value}
          color={trangThaiColor[params.value ?? ''] ?? 'default'}
          size="small"
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: 'tinhTrangKyThuat',
      headerName: 'Tình trạng kỹ thuật',
      width: 160,
    },
    {
      field: 'chatLuong',
      headerName: 'Cấp chất lượng',
      width: 140,
      renderCell: (params: GridRenderCellParams<TrangBiGridRow, string>) => {
        const color = chatLuongColor[params.value ?? ''] ?? '#6b7280';
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              bgcolor: `${color}22`,
              color,
              fontWeight: 600,
              fontSize: 11,
              border: `1px solid ${color}44`,
            }}
          />
        );
      },
    },
    {
      field: 'soHieu',
      headerName: 'Số hiệu',
      width: 140,
      renderCell: (params: GridRenderCellParams<TrangBiGridRow>) => params.row.soHieu,
    },
    {
      field: 'namSanXuat',
      headerName: 'Năm sản xuất',
      width: 120,
      type: 'number',
    },
    {
      field: 'namSuDung',
      headerName: 'Năm sử dụng',
      width: 120,
      type: 'number',
    },
    {
      field: 'nienHanSuDung',
      headerName: 'Niên hạn sử dụng',
      width: 150,
      type: 'number',
    },
    {
      field: 'nuocSanXuat',
      headerName: 'Nước sản xuất',
      width: 140,
    },
    {
      field: 'hangSanXuat',
      headerName: 'Hãng sản xuất',
      width: 150,
    },
    {
      field: 'loai',
      headerName: 'Loại trang bị',
      width: 150,
    },
    {
      field: 'actions',
      headerName: 'Thao tác',
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<TrangBiGridRow>) => (
        <Stack direction="row" spacing={0.5} justifyContent="center" width="100%">
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              onClick={() => alert(`Xem: ${params.row.maDanhMuc}`)}
              disabled={isRowActionDisabled('view', params.row)}
              sx={{ color: militaryColors.navy }}
            >
              <VisibilityIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              onClick={() => handleEditRow(params.row)}
              disabled={isRowActionDisabled('edit', params.row)}
              sx={{ color: militaryColors.warning }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>

          <Tooltip title="In chi tiết">
            <IconButton
              size="small"
              onClick={() => alert(`In: ${params.row.maDanhMuc}`)}
              disabled={isRowActionDisabled('print', params.row)}
              sx={{ color: militaryColors.success }}
            >
              <PrintIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Xóa trang bị">
            <IconButton
              size="small"
              onClick={() => alert(`Xoa: ${params.row.maDanhMuc}`)}
              disabled={isRowActionDisabled('delete', params.row)}
              sx={{ color: militaryColors.error }}
            >
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ], [handleEditRow, isRowActionDisabled]);

  return (
    <OfficeProvider>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '270px 1fr',
          height: 'calc(100vh - 120px)',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        <Box
          component="aside"
          sx={{
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            height: '100%',
          }}
        >
          <OfficeDictionary onSelect={setSelectedOffice} selectedOffice={selectedOffice} />
        </Box>

        <Stack
          component="section"
          spacing={1}
          sx={{
            pt: { xs: 1.5, sm: 2, md: 2 },
            px: { xs: 1.5, sm: 2, md: 2 },
            pb: 0,
            overflow: 'hidden',
            height: '100%',
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
            flexWrap="wrap"
            gap={2}
          >
            <Stack spacing={0.25}>
              <Typography
                variant="h4"
                fontWeight={800}
                color="primary"
                sx={{ letterSpacing: '-0.02em' }}
              >
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                {subtitle} • Hiển thị <strong>{filtered.length}</strong> / <strong>{data.length}</strong> bản ghi
                {selectedOffice && (
                  <> • Đang chọn: <strong>{selectedOffice.ten}</strong></>
                )}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              {activeMenu && <StatsButton activeMenu={activeMenu} trangBiData={data} />}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
                disabled={!canAddAny}
                sx={{
                  bgcolor: militaryColors.navy,
                  '&:hover': { bgcolor: militaryColors.navy, filter: 'brightness(1.1)' },
                  '&.Mui-disabled': {
                    bgcolor: `${militaryColors.navy}66`,
                    color: 'rgba(255,255,255,0.8)',
                  },
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  height: 40,
                }}
              >
                Thêm trang bị
              </Button>
              <Button
                variant="contained"
                startIcon={<FileDownloadIcon />}
                onClick={handleExport}
                disabled={!canExportAny}
                sx={{
                  bgcolor: militaryColors.deepOlive,
                  '&:hover': { bgcolor: militaryColors.midOlive },
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  height: 40,
                  boxShadow: `0 4px 12px ${militaryColors.deepOlive}44`,
                }}
              >
                Xuất Excel
              </Button>
            </Stack>
          </Stack>

          <AddTrangBiDialog
            open={openAdd}
            onClose={handleCloseDialog}
            onSaved={() => {
              setEditingRecordId(null);
              onRecordSaved?.();
            }}
            activeMenu={activeMenuForDialog}
            editingRecordId={editingRecordId}
          />

          <FilterTrangBi onSearch={handleSearch} onClear={handleClearFilter} />

          {errorMessage && (
            <Alert severity="error" variant="filled" sx={{ borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <LazyDataGrid
            rows={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            loading={loading}
            fallbackRows={8}
            fallbackCols={8}
            sx={{
              flex: 1,
              minHeight: 450,
              width: '100%',
            }}
          />
        </Stack>
      </Box>
    </OfficeProvider>
  );
};

export default TrangBiDataGrid;
