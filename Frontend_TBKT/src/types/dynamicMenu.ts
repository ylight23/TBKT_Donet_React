import type { DynamicMenuDataSource } from '../configs/dynamicMenuDataSource';
import type { LocalAuditMetadata } from '../apis/thamSoApi';

export interface DynamicMenuConfigItem {
  id: string;
  title: string;
  path: string;
  active: string;
  icon: string;
  permissionCode: string;
  dataSource: DynamicMenuDataSource;
  gridCount: number;
  columnCount: number;
  columns: Array<{ key: string; name: string }>;
  templateKey: string;
  enabled: boolean;
  audit?: LocalAuditMetadata;
}
