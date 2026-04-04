export const normalizeId = (value: string | undefined | null): string =>
  String(value ?? '').trim().toLowerCase();

export const buildByNormalizedId = <T extends { id?: string }>(items: T[]): Map<string, T> => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    const key = normalizeId(item.id);
    if (key) map.set(key, item);
  });
  return map;
};
