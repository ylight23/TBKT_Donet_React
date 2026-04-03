// ============================================================
// Trang bị kỹ thuật Nhóm 1 – Phương tiện thông tin
// ============================================================
import React from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import { mockTrangBiNhom1 } from '../../data/mockTBData';

const TrangBiNhom1: React.FC = () => (
  <TrangBiDataGrid
    title="TRANG BỊ KỸ THUẬT NHÓM 1"
    subtitle="Quản lý phương tiện thông tin kỹ thuật – Nhóm trang bị chính"
    data={mockTrangBiNhom1}
    activeMenu="tbNhom1"
  />
);

export default TrangBiNhom1;
