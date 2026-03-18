import type { DynamicMenuDataSource } from '../configs/dynamicMenuDataSource';

export interface DynamicMenuConfigItem {
  id: string;
  title: string;
  path: string;
  active: string;
  icon: string;
  dataSource: DynamicMenuDataSource;
  gridCount: number;
  columnCount: number;
  columns: Array<{ key: string; name: string }>;
  templateKey: string;
  enabled: boolean;
}
