export type DynamicMenuDataSource = string;

// DynamicMenuDataSource type được import từ proto gen, không định nghĩa lại ở đây
// import type { DynamicMenuDataSource } from '../gen/protos/tham_so_pb';

export interface DynamicMenuFieldOption {
    key: string;
    label: string;
}

const normalizeKey = (value: string): string => (value || '').trim().toLowerCase();

// Fallback tĩnh chỉ dùng khi chưa load được datasources từ API
export const DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK: Array<{ value: string; label: string }> = [
    { value: 'employee', label: 'Employee' },
    { value: 'office', label: 'Office' },
];

/**
 * Build source options từ danh sách datasources đã load từ API.
 * Fallback về DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK nếu rỗng.
 */
export const buildSourceOptions = (
    dataSources: Array<{ sourceKey: string; sourceName: string; enabled: boolean }>,
): Array<{ value: string; label: string }> => {
    const enabled = dataSources.filter((ds) => ds.enabled);
    if (enabled.length === 0) return DYNAMIC_MENU_SOURCE_OPTIONS_FALLBACK;
    return enabled.map((ds) => ({ value: ds.sourceKey, label: ds.sourceName }));
};

/**
 * Build field options cho một source cụ thể từ datasources đã load.
 * Fallback về [{ key: 'id', label: 'ID' }] nếu không tìm thấy.
 */
export const buildFieldOptions = (
    sourceKey: string,
    dataSources: Array<{ sourceKey: string; fields: Array<{ key: string; label: string }> }>,
): DynamicMenuFieldOption[] => {
    const source = normalizeKey(sourceKey);
    const ds = dataSources.find((d) => normalizeKey(d.sourceKey) === source);
    if (ds && ds.fields.length > 0) {
        return ds.fields.map((f) => ({ key: f.key, label: f.label || f.key }));
    }
    return [{ key: 'id', label: 'ID' }];
};

/**
 * Lấy default column keys cho một source, dựa vào fields từ API.
 * Fallback về 'id' nếu không đủ fields.
 */
export const getDefaultColumnKeysBySource = (
    sourceKey: string,
    count: number,
    dataSources: Array<{ sourceKey: string; fields: Array<{ key: string }> }> = [],
): string[] => {
    const source = normalizeKey(sourceKey);
    const ds = dataSources.find((d) => normalizeKey(d.sourceKey) === source);
    const available = ds?.fields ?? [];
    const keys = available.slice(0, count).map((f) => f.key);
    while (keys.length < count) {
        keys.push(available[0]?.key ?? 'id');
    }
    return keys;
};
