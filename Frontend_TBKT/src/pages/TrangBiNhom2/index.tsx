import React, { useCallback, useEffect, useState } from 'react';
import TrangBiDataGrid from '../../components/TrangBiDataGrid';
import trangBiKiThuatApi, { type TrangBiNhom2GridItem } from '../../apis/trangBiKiThuatApi';

const TrangBiNhom2: React.FC = () => {
  const [data, setData] = useState<TrangBiNhom2GridItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const records = await trangBiKiThuatApi.getListTrangBiNhom2();
      setData(records);
    } catch (err) {
      console.error('[TrangBiNhom2] loadData error', err);
      setData([]);
      setErrorMessage(String((err as Error)?.message || 'Khong the tai danh sach trang bi nhom 2'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <TrangBiDataGrid
      title="TRANG BI KY THUAT NHOM 2"
      subtitle="Quan ly phuong tien phu tro ky thuat - nhom trang bi chuyen dung"
      data={data}
      loading={loading}
      errorMessage={errorMessage}
      activeMenu="tbNhom2"
      onRecordSaved={loadData}
    />
  );
};

export default TrangBiNhom2;
