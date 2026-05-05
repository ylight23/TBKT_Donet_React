import { useCallback, useEffect, useState } from 'react';
import trangBiKiThuatApi, {
    type TrangBiNhom1GridItem,
    type TrangBiNhom2GridItem,
} from '../apis/trangBiKiThuatApi';
import { useMyPermissions } from './useMyPermissions';

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
    const { canFunc, loaded: permLoaded } = useMyPermissions();

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
            const canNhom1 = canFunc('equipment.group1', 'view');
            const canNhom2 = canFunc('equipment.group2', 'view');

            const [nhom1, nhom2] = await Promise.all([
                canNhom1 ? trangBiKiThuatApi.getListTrangBiNhom1() : Promise.resolve([] as TrangBiNhom1GridItem[]),
                canNhom2 ? trangBiKiThuatApi.getListTrangBiNhom2() : Promise.resolve([] as TrangBiNhom2GridItem[]),
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
    }, [enabled, canFunc]);

    useEffect(() => {
        if (!permLoaded) return;
        void loadData();
    }, [loadData, permLoaded]);

    return {
        data,
        loading,
        errorMessage,
        reload: loadData,
    };
}
