import React, { useCallback, useEffect, useState } from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import trangBiKiThuatApi, { type TrangBiNhom1GridItem } from '../../apis/trangBiKiThuatApi';
import type { OfficeNode } from '../Office/subComponent/OfficeDictionary';

const TrangBiNhom1: React.FC = () => {
  const [data, setData] = useState<TrangBiNhom1GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<OfficeNode | null>(null);

  const loadData = useCallback(async () => {
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
  }, [selectedOffice]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
