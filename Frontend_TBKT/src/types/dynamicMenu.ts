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
  columnNames: string[];
  columnKeys: string[];
  enabled: boolean;
}
