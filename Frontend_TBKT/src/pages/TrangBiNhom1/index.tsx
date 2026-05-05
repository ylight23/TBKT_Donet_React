import React, { useCallback, useEffect, useState } from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import trangBiKiThuatApi, { type TrangBiNhom1GridItem } from '../../apis/trangBiKiThuatApi';
import type { OfficeNode } from '../Office/subComponent/OfficeDictionary';
import { useMyPermissions } from '../../hooks/useMyPermissions';

const TrangBiNhom1: React.FC = () => {
  const [data, setData] = useState<TrangBiNhom1GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);
  const { canFunc, loaded: permissionLoaded } = useMyPermissions();
  const canViewTrangBiNhom1 = canFunc('equipment.group1', 'view');

  const loadData = useCallback(async () => {
    if (!permissionLoaded || !canViewTrangBiNhom1) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const officeId = String(selectedOffice?.id || '').trim();
      const records = await trangBiKiThuatApi.getListTrangBiNhom1({ idDonVi: officeId || undefined });
      setData(records);
    } catch (err) {
      console.error('[TrangBiNhom1] loadData error', err);
      setData([]);
      setErrorMessage(String((err as Error)?.message || 'Khong the tai danh sach trang bi nhom 1'));
    } finally {
      setLoading(false);
    }
  }, [selectedOffice, permissionLoaded, canViewTrangBiNhom1]);

  useEffect(() => {
    if (!permissionLoaded) return;
    console.info('[TrangBiNhom1] page access state', {
      permissionLoaded,
      canViewTrangBiNhom1,
    });
    if (!canViewTrangBiNhom1) {
      setData([]);
      setErrorMessage('Khong co quyen xem trang bi nhom 1');
      return;
    }
    void loadData();
  }, [loadData, permissionLoaded, canViewTrangBiNhom1]);

  return (
    <TrangBiDataGrid
      title="TRANG BỊ KỸ THUẬT NHÓM 1"
      subtitle="Quản lý thực lực trang bị kỹ thuật nhóm 1"
      data={data}
      loading={loading}
      errorMessage={errorMessage}
      activeMenu="tbNhom1"
      onRecordSaved={loadData}
      selectedOffice={selectedOffice}
      onOfficeSelect={setSelectedOffice}
    />
  );
};

export default TrangBiNhom1;
