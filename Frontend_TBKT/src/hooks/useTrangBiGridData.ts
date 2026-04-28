import { useCallback, useEffect, useState } from 'react';
import trangBiKiThuatApi, {
    type TrangBiNhom1GridItem,
    type TrangBiNhom2GridItem,
} from '../apis/trangBiKiThuatApi';

export type TrangBiGridItem = (TrangBiNhom1GridItem | TrangBiNhom2GridItem) & {
    nhomTrangBi?: 1 | 2;
};

interface UseTrangBiGridDataResult {
    data: TrangBiGridItem[];
    loading: boolean;
    errorMessage: string;
    reload: () => Promise<void>;
}

export default function useTrangBiGridData(enabled = true): UseTrangBiGridDataResult {
    const [data, setData] = useState<TrangBiGridItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadData = useCallback(async () => {
        if (!enabled) {
            setData([]);
            setErrorMessage('');
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            const [nhom1, nhom2] = await Promise.all([
                trangBiKiThuatApi.getListTrangBiNhom1(),
                trangBiKiThuatApi.getListTrangBiNhom2(),
            ]);
            setData([
                ...nhom1.map((item) => ({ ...item, nhomTrangBi: 1 as const })),
                ...nhom2.map((item) => ({ ...item, nhomTrangBi: 2 as const })),
            ]);
        } catch (err) {
            console.error('[useTrangBiGridData] loadData error', err);
            setData([]);
            setErrorMessage(String((err as Error)?.message || 'Khong the tai du lieu trang bi'));
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    return {
        data,
        loading,
        errorMessage,
        reload: loadData,
    };
}
