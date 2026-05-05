import React, { useCallback, useEffect, useState } from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import trangBiKiThuatApi, { type TrangBiNhom2GridItem } from '../../apis/trangBiKiThuatApi';
import type { OfficeNode } from '../Office/subComponent/OfficeDictionary';
import { useMyPermissions } from '../../hooks/useMyPermissions';

const TrangBiNhom2: React.FC = () => {
  const [data, setData] = useState<TrangBiNhom2GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
  const { canFunc, loaded: permissionLoaded } = useMyPermissions();
  const canViewTrangBiNhom2 = canFunc('equipment.group2', 'view');

  const loadData = useCallback(async () => {
    if (!permissionLoaded || !canViewTrangBiNhom2) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const officeId = String(selectedOffice?.id || '').trim();
      const records = await trangBiKiThuatApi.getListTrangBiNhom2({ idDonVi: officeId || undefined });
      setData(records);
    } catch (err) {
      console.error('[TrangBiNhom2] loadData error', err);
      setData([]);
      setErrorMessage(String((err as Error)?.message || 'Khong the tai danh sach trang bi nhom 2'));
    } finally {
      setLoading(false);
    }
  }, [selectedOffice, permissionLoaded, canViewTrangBiNhom2]);

  useEffect(() => {
    if (!permissionLoaded) return;
    if (!canViewTrangBiNhom2) {
      setData([]);
      setErrorMessage('Khong co quyen xem trang bi nhom 2');
      return;
    }
    void loadData();
  }, [loadData, permissionLoaded, canViewTrangBiNhom2]);

  return (
    <TrangBiDataGrid
      title="TRANG BỊ KỸ THUẬT NHÓM 2"
      subtitle="Quản lý thực lực trang bị kỹ thuật nhóm 2"
      data={data}
      loading={loading}
      errorMessage={errorMessage}
      activeMenu="tbNhom2"
      onRecordSaved={loadData}
      selectedOffice={selectedOffice}
      onOfficeSelect={setSelectedOffice}
    />
  );
};

export default TrangBiNhom2;
