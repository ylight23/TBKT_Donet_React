export const TRANG_BI_FIELD_SET_KEYS = {
    THONG_TIN_CHUNG: 'trang_bi.thong_tin_chung',
    THONG_SO_KY_THUAT: 'trang_bi.thong_so_ky_thuat',
    DONG_BO: 'trang_bi.dong_bo',
    BAO_QUAN: 'trang_bi.bao_quan',
    BAO_DUONG: 'trang_bi.bao_duong',
    SUA_CHUA: 'trang_bi.sua_chua',
    NIEM_CAT: 'trang_bi.niem_cat',
    DIEU_DONG: 'trang_bi.dieu_dong',
    CHUYEN_CAP_CHAT_LUONG: 'trang_bi.chuyen_cap_chat_luong',
} as const;

export type TrangBiFieldSetKey =
    typeof TRANG_BI_FIELD_SET_KEYS[keyof typeof TRANG_BI_FIELD_SET_KEYS];

export const TRANG_BI_FIELD_SET_KEY_OPTIONS: Array<{ value: TrangBiFieldSetKey; label: string }> = [
    { value: TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG, label: 'Thong tin chung' },
    { value: TRANG_BI_FIELD_SET_KEYS.THONG_SO_KY_THUAT, label: 'Thong so ky thuat' },
    { value: TRANG_BI_FIELD_SET_KEYS.DONG_BO, label: 'Trang bi dong bo' },
    { value: TRANG_BI_FIELD_SET_KEYS.BAO_QUAN, label: 'Bao quan' },
    { value: TRANG_BI_FIELD_SET_KEYS.BAO_DUONG, label: 'Bao duong' },
    { value: TRANG_BI_FIELD_SET_KEYS.SUA_CHUA, label: 'Sua chua' },
    { value: TRANG_BI_FIELD_SET_KEYS.NIEM_CAT, label: 'Niem cat' },
    { value: TRANG_BI_FIELD_SET_KEYS.DIEU_DONG, label: 'Dieu dong' },
    { value: TRANG_BI_FIELD_SET_KEYS.CHUYEN_CAP_CHAT_LUONG, label: 'Chuyen cap chat luong' },
];

export const getTrangBiFieldSetLabel = (value?: string): string => {
    const normalized = String(value ?? '').trim();
    return TRANG_BI_FIELD_SET_KEY_OPTIONS.find((option) => option.value === normalized)?.label
        ?? normalized;
};
