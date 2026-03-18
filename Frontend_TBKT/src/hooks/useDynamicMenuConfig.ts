import { useCallback, useEffect, useState } from 'react';
import thamSoApi, { type DataSourceConfig } from '../apis/thamSoApi';
import type { DynamicMenuConfigItem } from '../types/dynamicMenu';
import { sanitizeDynamicMenuItem } from '../configs/dynamicMenuConfig';

export const useDynamicMenuConfig = () => {
  const [items, setItems] = useState<DynamicMenuConfigItem[]>([]);
  const [dataSources, setDataSources] = useState<DataSourceConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const reload = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const [menus, sources] = await Promise.all([
        thamSoApi.getListDynamicMenus(),
        thamSoApi.getListDynamicMenuDataSources(),
      ]);
      setItems(menus.map(sanitizeDynamicMenuItem));
      setDataSources(sources.filter((ds) => ds.enabled));
    } catch (err) {
      setError((err as Error)?.message || 'Không thể tải menu động');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const createItem = useCallback(async (item: DynamicMenuConfigItem): Promise<void> => {
    await thamSoApi.saveDynamicMenu(sanitizeDynamicMenuItem(item), true);
    await reload();
  }, [reload]);

  const updateItem = useCallback(async (item: DynamicMenuConfigItem): Promise<void> => {
    await thamSoApi.saveDynamicMenu(sanitizeDynamicMenuItem(item), false);
    await reload();
  }, [reload]);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    await thamSoApi.deleteDynamicMenu(id);
    await reload();
  }, [reload]);

  return { items, dataSources, loading, error, reload, createItem, updateItem, deleteItem };
};