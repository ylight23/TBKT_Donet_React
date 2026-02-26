/**
 * Đệ quy convert tất cả BigInt trong protobuf object sang string
 * Dùng BigInt.toString() để không mất precision
 */
export function serializeProtoObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;

    // BigInt → string để không mất precision
    if (typeof obj === 'bigint') {
        return obj.toString() as unknown as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeProtoObject) as unknown as T;
    }

    if (typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const key of Object.keys(obj as object)) {
            result[key] = serializeProtoObject((obj as Record<string, unknown>)[key]);
        }
        return result as T;
    }

    return obj;
}

/**
 * Convert BigInt timestamp (seconds) sang ISO string
 */
export function bigIntTimestampToISO(seconds: bigint | number | string | undefined): string | undefined {
    if (seconds === undefined || seconds === null) return undefined;
    const ms = Number(seconds.toString()) * 1000;
    return new Date(ms).toISOString();
}

/**
 * Convert BigInt timestamp sang Date object
 */
export function bigIntTimestampToDate(seconds: bigint | number | string | undefined): Date | undefined {
    if (seconds === undefined || seconds === null) return undefined;
    const ms = Number(seconds.toString()) * 1000;
    return new Date(ms);
}

/**
 * Format timestamp sang chuỗi ngày tháng locale
 */
export function formatTimestamp(
    seconds: bigint | number | string | undefined,
    locale = 'vi-VN'
): string {
    const date = bigIntTimestampToDate(seconds);
    if (!date) return '-';
    return date.toLocaleDateString(locale);
}