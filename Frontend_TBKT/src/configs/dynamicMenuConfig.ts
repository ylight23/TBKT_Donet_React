import type { DynamicMenuConfigItem } from "../types/dynamicMenu";
import {
  DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK,
  getDefaultColumnKeysBySource,
  type DynamicMenuDataSource,
} from "./dynamicMenuDataSource";

export const normalizeGridCount = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.min(6, Math.max(1, Math.floor(value)));
};

export const normalizeColumnCount = (value: number): number => {
  if (!Number.isFinite(value)) return 4;
  return Math.min(12, Math.max(1, Math.floor(value)));
};

export const normalizeColumns = (
  source: DynamicMenuDataSource,
  columnCount: number,
  columns?: Array<{ key: string; name: string }>,
  dataSources: Array<{ sourceKey: string; fields: Array<{ key: string }> }> = [],
): Array<{ key: string; name: string }> => {
  const safeCount = normalizeColumnCount(columnCount);
  const defaults = getDefaultColumnKeysBySource(source, safeCount, dataSources);
  const src = Array.isArray(columns) ? columns : [];
  return Array.from({ length: safeCount }, (_, i) => {
    const col = src[i];
    const key = (col?.key || '').trim() || defaults[i] || 'id';
    const name = (col?.name || '').trim() || `Cot ${i + 1}`;
    return { key, name };
  });
};

export const normalizeDataSource = (value?: string): DynamicMenuDataSource => {
  const normalized = (value || "").trim();
  if (normalized.length > 0) return normalized;
  const values = DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK.map((item) => item.value);
  return values[0] || "employee";
};

export const normalizeMenuPath = (
  value: string,
  fallbackId: string,
): string => {
  const raw = value.trim();
  if (!raw) return `/menu-dong/${fallbackId}`;
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\s+/g, "-");
};

export const normalizePermissionCode = (
  value: string | undefined,
  fallbackId: string,
): string => {
  const normalized = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_');

  if (normalized.length > 0) return normalized;
  return `dynamicmenu_${fallbackId}`;
};

export const sanitizeDynamicMenuItem = (
  item: DynamicMenuConfigItem,
): DynamicMenuConfigItem => ({
  ...item,
  title: item.title.trim(),
  path: normalizeMenuPath(item.path, item.id),
  active: item.active.trim(),
  icon: (item.icon || "Assignment").trim(),
  permissionCode: normalizePermissionCode(item.permissionCode, item.id),
  dataSource: normalizeDataSource(item.dataSource),
  gridCount: normalizeGridCount(item.gridCount),
  columnCount: normalizeColumnCount(item.columnCount),
  columns: normalizeColumns(
    normalizeDataSource(item.dataSource),
    item.columnCount,
    item.columns,
  ),
  templateKey: (item.templateKey || '').trim(),
});

export const createDynamicMenuItem = (
  id: string,
  title: string,
  gridCount: number,
  path?: string,
  icon?: string,
  dataSource?: DynamicMenuDataSource,
  columnCount?: number,
  columns?: Array<{ key: string; name: string }>,
): DynamicMenuConfigItem => {
  const safeId = id.trim();
  const safeColumnCount = normalizeColumnCount(columnCount ?? 4);
  const safeDataSource = normalizeDataSource(dataSource);
  return {
    id: safeId,
    title: title.trim(),
    path: normalizeMenuPath(path ?? "", safeId),
    active: `menuDong_${safeId}`,
    icon: (icon || "Assignment").trim(),
    permissionCode: normalizePermissionCode('', safeId),
    dataSource: safeDataSource,
    gridCount: normalizeGridCount(gridCount),
    columnCount: safeColumnCount,
    columns: normalizeColumns(
      safeDataSource,
      safeColumnCount,
      columns,
    ),
    templateKey: '',
    enabled: true,
  };
};
