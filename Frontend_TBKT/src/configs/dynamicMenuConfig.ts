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

export const normalizeColumnNames = (
  columnCount: number,
  names?: string[],
): string[] => {
  const safeCount = normalizeColumnCount(columnCount);
  const source = Array.isArray(names) ? names : [];
  return Array.from({ length: safeCount }, (_, index) => {
    const value = (source[index] || "").trim();
    return value.length > 0 ? value : `Cot ${index + 1}`;
  });
};

export const normalizeDataSource = (value?: string): DynamicMenuDataSource => {
  const normalized = (value || "").trim();
  if (normalized.length > 0) return normalized;
  const values = DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK.map((item) => item.value);
  return values[0] || "employee";
};

// Thêm tham số dataSources vào normalizeColumnKeys
export const normalizeColumnKeys = (
  source: DynamicMenuDataSource,
  columnCount: number,
  keys?: string[],
  dataSources: Array<{ sourceKey: string; fields: Array<{ key: string }> }> = [], // ← thêm
): string[] => {
  const safeCount = normalizeColumnCount(columnCount);
  const defaults = getDefaultColumnKeysBySource(source, safeCount, dataSources); // ← truyền qua
  const sourceKeys = Array.isArray(keys)
    ? keys.map((key) => (key || '').trim()).filter((key) => key.length > 0)
    : [];
  const normalized = sourceKeys.slice(0, safeCount);
  while (normalized.length < safeCount) {
    normalized.push(defaults[normalized.length]);
  }
  return normalized;
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

export const sanitizeDynamicMenuItem = (
  item: DynamicMenuConfigItem,
): DynamicMenuConfigItem => ({
  ...item,
  title: item.title.trim(),
  path: normalizeMenuPath(item.path, item.id),
  active: item.active.trim(),
  icon: (item.icon || "Assignment").trim(),
  dataSource: normalizeDataSource(item.dataSource),
  gridCount: normalizeGridCount(item.gridCount),
  columnCount: normalizeColumnCount(item.columnCount),
  columnNames: normalizeColumnNames(item.columnCount, item.columnNames),
  columnKeys: normalizeColumnKeys(
    normalizeDataSource(item.dataSource),
    item.columnCount,
    item.columnKeys,
  ),
});

export const createDynamicMenuItem = (
  id: string,
  title: string,
  gridCount: number,
  path?: string,
  icon?: string,
  dataSource?: DynamicMenuDataSource,
  columnCount?: number,
  columnNames?: string[],
  columnKeys?: string[],
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
    dataSource: safeDataSource,
    gridCount: normalizeGridCount(gridCount),
    columnCount: safeColumnCount,
    columnNames: normalizeColumnNames(safeColumnCount, columnNames),
    columnKeys: normalizeColumnKeys(
      safeDataSource,
      safeColumnCount,
      columnKeys,
    ),
    enabled: true,
  };
};
