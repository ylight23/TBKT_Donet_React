// ============================================================
// TrangBiDataGrid – Bảng dữ liệu trang bị kỹ thuật dùng chung
// Dùng cho cả Nhóm 1 và Nhóm 2
// ============================================================
import React, { useState, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/GridLegacy';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

// Icons
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';

import { ITrangBi, TrangThaiTrangBi, ChatLuong } from '../../data/mockTBData';
import { militaryColors } from '../../theme';
import FilterTrangBi, { FilterTrangBiValues } from './FilterTrangBi';

// ── Màu trạng thái trang bị ──────────────────────────────────
const trangThaiColor: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  [TrangThaiTrangBi.HoatDong]: 'success',
  [TrangThaiTrangBi.SuaChua]: 'warning',
  [TrangThaiTrangBi.NiemCat]: 'info',
  [TrangThaiTrangBi.ChoThanhLy]: 'error',
  [TrangThaiTrangBi.DaThanhLy]: 'default',
};

// ── Màu chất lượng ───────────────────────────────────────────
const chatLuongColor: Record<string, string> = {
  [ChatLuong.Tot]: '#2e7d32',
  [ChatLuong.Kha]: '#1565c0',
  [ChatLuong.TrungBinh]: '#ef6c00',
  [ChatLuong.Xau]: '#c62828',
  [ChatLuong.HỏngHoc]: '#6a1b9a',
};

// ── Props component ──────────────────────────────────────────
interface TrangBiDataGridProps {
  title: string;
  subtitle: string;
  data: ITrangBi[];
}

// ── TrangBiDataGrid ──────────────────────────────────────────
const TrangBiDataGrid: React.FC<TrangBiDataGridProps> = ({ title, subtitle, data }) => {
  const theme = useTheme();

  // State bộ lọc nâng cao
  const [filterValues, setFilterValues] = useState<FilterTrangBiValues | null>(null);

  // Xóa toàn bộ bộ lọc
  const handleClearFilter = useCallback(() => {
    setFilterValues(null);
  }, []);

  const handleSearch = useCallback((values: FilterTrangBiValues) => {
    setFilterValues(values);
  }, []);

  // Lọc dữ liệu theo các điều kiện
  const filtered = useMemo(() => {
    if (!filterValues) return data;

    const {
      fullTextSearch,
      donVi,
      maTrangBi,
      tenTrangBi,
      capChatLuong,
      tinhTrangSuDung,
      soHieu,
      nhom,
      phanNganh,
      tinhTrangKyThuat,
      donViQuanLy,
      namSanXuat,
      namSuDung
    } = filterValues;

    const q = fullTextSearch.toLowerCase();

    return data.filter(row => {
      // 1. Tìm kiếm tổng hợp (Full text từ ô tìm kiếm nhanh)
      const matchSearch = !q || [
        row.maTrangBi, row.ten, row.loai, row.serial, row.mac, row.donVi,
      ].some(v => v && v.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Lọc chi tiết (Advanced filters)
      if (donVi && !row.donVi.toLowerCase().includes(donVi.toLowerCase())) return false;
      if (maTrangBi && !row.maTrangBi.toLowerCase().includes(maTrangBi.toLowerCase())) return false;
      if (tenTrangBi && !row.ten.toLowerCase().includes(tenTrangBi.toLowerCase())) return false;
      if (capChatLuong && row.chatLuong !== capChatLuong) return false;
      if (tinhTrangSuDung && row.trangThai !== tinhTrangSuDung) return false;
      if (soHieu && row.serial && !row.serial.toLowerCase().includes(soHieu.toLowerCase())) return false;

      // Các trường nâng cao (nếu mock data có hoặc ép kiểu để check)
      const r = row as any;
      if (nhom && r.nhom !== nhom) return false;
      if (phanNganh && r.phanNganh !== phanNganh) return false;
      if (tinhTrangKyThuat && r.tinhTrangKyThuat !== tinhTrangKyThuat) return false;
      if (donViQuanLy && r.donViQuanLy !== donViQuanLy) return false;
      if (namSanXuat && r.namSanXuat !== Number(namSanXuat)) return false;
      if (namSuDung && r.namSuDung !== Number(namSuDung)) return false;

      return true;
    });
  }, [data, filterValues]);

  // Giả lập export Excel
  const handleExport = useCallback(() => {
    alert(`[Giả lập] Xuất ${filtered.length} bản ghi ra Excel`);
  }, [filtered.length]);

  // ── Định nghĩa cột DataGrid ──────────────────────────────
  const columns: GridColDef[] = [
    {
      field: 'maTrangBi', headerName: 'Mã trang bị', width: 140,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={600} sx={{ color: 'var(--mil-text-primary)' }}>
          {p.value}
        </Typography>
      ),
    },
    { field: 'ten', headerName: 'Tên trang bị', flex: 1, minWidth: 200 },
    { field: 'loai', headerName: 'Loại', width: 150 },
    { field: 'serial', headerName: 'Số hiệu / Serial', width: 160 },
    {
      field: 'donVi', headerName: 'Đơn vị', flex: 1, minWidth: 160,
    },
    {
      field: 'trangThai', headerName: 'Trạng thái', width: 150,
      renderCell: (p: GridRenderCellParams<ITrangBi, TrangThaiTrangBi>) => (
        <Chip
          label={p.value}
          color={trangThaiColor[p.value!] ?? 'default'}
          size="small"
          sx={{ fontWeight: 600, fontSize: 11 }}
        />
      ),
    },
    {
      field: 'chatLuong', headerName: 'Chất lượng', width: 130,
      renderCell: (p: GridRenderCellParams<ITrangBi, ChatLuong>) => (
        <Chip
          label={p.value}
          size="small"
          sx={{
            bgcolor: `${chatLuongColor[p.value!]}22`,
            color: chatLuongColor[p.value!],
            fontWeight: 600,
            fontSize: 11,
            border: `1px solid ${chatLuongColor[p.value!]}44`,
          }}
        />
      ),
    },
    { field: 'namSuDung', headerName: 'Năm sử dụng', width: 130, type: 'number' },
    {
      field: 'actions', headerName: 'Thao tác', width: 110, sortable: false, filterable: false,
      renderCell: (p: GridRenderCellParams<ITrangBi>) => (
        <Box display="flex" gap={0.5} justifyContent="center" width="100%">
          <Tooltip title="Xem chi tiết">
            <IconButton
              size="small"
              onClick={() => alert(`Xem: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.navy }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              onClick={() => alert(`Sửa: ${p.row.maTrangBi}`)}
              sx={{ color: militaryColors.warning }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>
      {/* Header Section */}
      <Box
        mb={2}
        display="flex"
        justifyContent="space-between"
        alignItems="flex-end"
        sx={{ flexWrap: 'wrap', gap: 2 }}
      >
        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
            color="primary"
            gutterBottom
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.125rem' },
              letterSpacing: '-0.02em'
            }}
          >
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
            {subtitle} • Hiển thị <strong>{filtered.length}</strong> / <strong>{data.length}</strong> bản ghi
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          sx={{
            bgcolor: militaryColors.deepOlive,
            '&:hover': { bgcolor: militaryColors.midOlive },
            textTransform: 'none',

            fontWeight: 700,
            px: 3,
            height: 40,
            boxShadow: `0 4px 12px ${militaryColors.deepOlive}44`
          }}
        >
          Xuất Excel
        </Button>
      </Box>

      {/* ── Bộ lọc nâng cao ─────────────────────────────────── */}
      <FilterTrangBi onSearch={handleSearch} onClear={handleClearFilter} />

      {/* ── DataGrid Container ───────────────────────────────── */}
      <Box
        sx={{
          height: {
            xs: 500,
            sm: 550,
            md: 'calc(100vh - 300px)', // Co giãn theo chiều cao màn hình cho laptop 12-14 inch
          },
          minHeight: 450,
          width: '100%',
          bgcolor: 'background.paper',
          borderRadius: 0,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          border: `1px solid ${theme.palette.divider}`,
          transition: 'all 0.3s ease',
        }}
      >
        <DataGrid
          rows={filtered}
          columns={columns}
          getRowId={row => row.id}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
        // density, rowHeight, columnHeaderHeight, disableRowSelectionOnClick được lấy từ theme.ts
        />
      </Box>
    </Box>
  );
};

export default TrangBiDataGrid;
