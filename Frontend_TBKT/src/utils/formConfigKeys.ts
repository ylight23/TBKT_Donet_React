const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;
const NON_KEY_CHARS_REGEX = /[^a-z0-9\s_-]/g;
const SPACE_OR_UNDERSCORE_REGEX = /[\s_]+/g;
const MULTI_DASH_REGEX = /-+/g;

export const normalizeFormConfigKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .toLowerCase()
    .trim()
    .replace(NON_KEY_CHARS_REGEX, '')
    .replace(SPACE_OR_UNDERSCORE_REGEX, '-')
    .replace(MULTI_DASH_REGEX, '-')
    .replace(/^-|-$/g, '');

export const getStableFormConfigKey = (form: { key?: string; name?: string }): string =>
  normalizeFormConfigKey(form.key?.trim() || form.name?.trim() || '');

export const getRequiredFormKeyForMenu = (activeMenu?: string): string => {
  if (activeMenu === 'tbNhom1') return 'trang-bi-nhom-1';
  if (activeMenu === 'tbNhom2') return 'trang-bi-nhom-2';
  return '';
};
