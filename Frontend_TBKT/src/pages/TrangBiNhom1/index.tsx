// ============================================================
// Trang bị kỹ thuật Nhóm 1 – Phương tiện thông tin
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import trangBiKiThuatApi, { type TrangBiNhom1Record } from '../../apis/trangBiKiThuatApi';
import type { ITrangBi } from '../../data/mockTBData';
import { ChatLuong, TrangThaiTrangBi } from '../../data/mockTBData';

function pickParam(record: TrangBiNhom1Record, ...keys: string[]): string {
  for (const key of keys) {
    const lower = key.toLowerCase();
    for (const p of record.parameters) {
      if (p.name.toLowerCase() === lower) {
        return p.stringValue ?? '';
      }
    }
  }
  return '';
}

function toInt(val: string): number {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

function recordToITrangBi(rec: TrangBiNhom1Record): ITrangBi {
  return {
    id: rec.id,
    maTrangBi: rec.maDanhMuc || rec.id,
    ten: rec.tenDanhMuc ?? pickParam(rec, 'ten', 'ten_danh_muc_trang_bi'),
    loai: pickParam(rec, 'loai', 'Loai'),
    donVi: pickParam(rec, 'donVi', 'don_vi', 'DonVi'),
    phanNganh: pickParam(rec, 'phanNganh', 'phan_nganh', 'PhanNganh'),
    IDChuyenNganh: pickParam(rec, 'IDChuyenNganh', 'idChuyenNganh') || undefined,
    IDChuyenNganhKT: rec.idChuyenNganhKt || undefined,
    chatLuong: (pickParam(rec, 'chatLuong', 'chat_luong', 'ChatLuong') as ChatLuong) || ChatLuong.TrungBinh,
    trangThai: (pickParam(rec, 'trangThai', 'trang_thai', 'TrangThai') as TrangThaiTrangBi) || TrangThaiTrangBi.HoatDong,
    soLanSuaChua: toInt(pickParam(rec, 'soLanSuaChua', 'so_lan_sua_chua')),
    nienHan: toInt(pickParam(rec, 'nienHan', 'nien_han')),
    namSuDung: toInt(pickParam(rec, 'namSuDung', 'nam_su_dung')),
    serial: pickParam(rec, 'serial', 'Serial') || undefined,
    mac: pickParam(rec, 'mac', 'Mac') || undefined,
    donViQuanLy: pickParam(rec, 'donViQuanLy', 'don_vi_quan_ly', 'DonViQuanLy'),
    tinhTrangKyThuat: pickParam(rec, 'tinhTrangKyThuat', 'tinh_trang_ky_thuat'),
    namSanXuat: toInt(pickParam(rec, 'namSanXuat', 'nam_san_xuat')),
    nienHanSuDung: toInt(pickParam(rec, 'nienHanSuDung', 'nien_han_su_dung')),
    nuocSanXuat: pickParam(rec, 'nuocSanXuat', 'nuoc_san_xuat'),
    hangSanXuat: pickParam(rec, 'hangSanXuat', 'hang_san_xuat'),
  };
}

const TrangBiNhom1: React.FC = () => {
  const [data, setData] = useState<ITrangBi[]>([]);

  const loadData = useCallback(async () => {
    try {
      const records = await trangBiKiThuatApi.getListTrangBiNhom1();
      setData(records.map(recordToITrangBi));
    } catch (err) {
      console.error('[TrangBiNhom1] loadData error', err);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  return (
    <TrangBiDataGrid
      title="TRANG BỊ KỸ THUẬT NHÓM 1"
      subtitle="Quản lý phương tiện thông tin kỹ thuật – Nhóm trang bị chính"
      data={data}
      activeMenu="tbNhom1"
      onRecordSaved={loadData}
    />
  );
};

export default TrangBiNhom1;
