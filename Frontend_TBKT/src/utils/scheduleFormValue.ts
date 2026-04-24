export const normalizeScheduleKey = (value: string): string =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .trim();

export const pickScheduleValue = (
    source: Record<string, string> | null | undefined,
    aliases: string[],
    fallback = '',
): string => {
    if (!source || aliases.length === 0) return fallback;

    for (const key of aliases) {
        const value = source[key];
        if (typeof value === 'string' && value.trim() !== '') return value;
    }

    const normalizedMap = new Map<string, string>();
    for (const [key, value] of Object.entries(source)) {
        if (typeof value !== 'string') continue;
        const normalized = normalizeScheduleKey(key);
        if (!normalizedMap.has(normalized)) normalizedMap.set(normalized, value);
    }

    for (const key of aliases) {
        const matched = normalizedMap.get(normalizeScheduleKey(key));
        if (typeof matched === 'string' && matched.trim() !== '') return matched;
    }

    return fallback;
};
