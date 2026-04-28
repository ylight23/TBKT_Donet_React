export interface ManualOptionConfig {
    value: string;
    label: string;
    color?: string;
}

export const FIELD_OPTION_COLOR_PRESETS = [
    '#16a34a',
    '#2563eb',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#4b5563',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeText = (value: unknown): string => String(value ?? '').trim();

export const parseManualOption = (raw: string): ManualOptionConfig => {
    const trimmed = normalizeText(raw);
    if (!trimmed) {
        return { value: '', label: '' };
    }

    try {
        const parsed = JSON.parse(trimmed);
        if (isRecord(parsed)) {
            const value = normalizeText(parsed.value || parsed.id || parsed.label);
            const label = normalizeText(parsed.label || value);
            const color = normalizeText(parsed.color) || undefined;
            return { value, label, color };
        }
    } catch {
        // Backward compatible with old options stored as plain strings.
    }

    return { value: trimmed, label: trimmed };
};

export const serializeManualOption = (option: ManualOptionConfig): string => {
    const value = normalizeText(option.value);
    const label = normalizeText(option.label) || value;
    const color = normalizeText(option.color);

    if (!color && label === value) {
        return value;
    }

    return JSON.stringify({
        value,
        label,
        ...(color ? { color } : {}),
    });
};

export const parseManualOptions = (options: string[] | undefined): ManualOptionConfig[] =>
    (options ?? [])
        .map(parseManualOption)
        .filter((option) => option.value.length > 0);

export const findManualOption = (
    options: string[] | undefined,
    value: string | undefined,
): ManualOptionConfig | undefined => {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) {
        return undefined;
    }

    return parseManualOptions(options).find((option) => option.value === normalizedValue);
};
