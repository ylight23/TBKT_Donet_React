// ============================================================
// Trang bị kỹ thuật Nhóm 2 – Phương tiện phụ trợ
// ============================================================
import React from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import { mockTrangBiNhom2 } from '../../data/mockTBData';

const TrangBiNhom2: React.FC = () => (
  <TrangBiDataGrid
    title="TRANG BỊ KỸ THUẬT NHÓM 2"
    subtitle="Quản lý phương tiện phụ trợ – Nhóm trang bị chuyên dụng"
    data={mockTrangBiNhom2}
    activeMenu="tbNhom2"
  />
);

export default TrangBiNhom2;
