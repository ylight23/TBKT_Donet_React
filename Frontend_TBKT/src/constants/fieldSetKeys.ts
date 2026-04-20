export const TRANG_BI_FIELD_SET_KEYS = {
    THONG_TIN_CHUNG: 'trang_bi.thong_tin_chung',
    THONG_SO_KY_THUAT: 'trang_bi.thong_so_ky_thuat',
    DONG_BO: 'trang_bi.dong_bo',
    BAO_QUAN: 'trang_bi.bao_quan',
    BAO_DUONG: 'trang_bi.bao_duong',
    SUA_CHUA: 'trang_bi.sua_chua',
    NIEM_CAT: 'trang_bi.niem_cat',
    DIEU_DONG: 'trang_bi.dieu_dong',
} as const;

export type TrangBiFieldSetKey =
    typeof TRANG_BI_FIELD_SET_KEYS[keyof typeof TRANG_BI_FIELD_SET_KEYS];

export const TRANG_BI_FIELD_SET_KEY_OPTIONS: Array<{ value: TrangBiFieldSetKey; label: string }> = [
    { value: TRANG_BI_FIELD_SET_KEYS.THONG_TIN_CHUNG, label: 'Thông tin chung' },
    { value: TRANG_BI_FIELD_SET_KEYS.THONG_SO_KY_THUAT, label: 'Thông số kỹ thuật' },
    { value: TRANG_BI_FIELD_SET_KEYS.DONG_BO, label: 'Trang bị đồng bộ' },
    { value: TRANG_BI_FIELD_SET_KEYS.BAO_QUAN, label: 'Bảo quản' },
    { value: TRANG_BI_FIELD_SET_KEYS.BAO_DUONG, label: 'Bảo dưỡng' },
    { value: TRANG_BI_FIELD_SET_KEYS.SUA_CHUA, label: 'Sửa chữa' },
    { value: TRANG_BI_FIELD_SET_KEYS.NIEM_CAT, label: 'Niêm cất' },
    { value: TRANG_BI_FIELD_SET_KEYS.DIEU_DONG, label: 'Điều động' },
];

export const getTrangBiFieldSetLabel = (value?: string): string => {
    const normalized = String(value ?? '').trim();
    return TRANG_BI_FIELD_SET_KEY_OPTIONS.find((option) => option.value === normalized)?.label
        ?? normalized;
};
