import danhMucTrangBiApi, {
    DANH_MUC_TRANG_BI_TREE_ENDPOINT,
    MA_DINH_DANH_TRANG_BI_LIST_ENDPOINT,
    type MaDinhDanhTrangBiOption,
} from './danhMucTrangBiApi';
import officeApi, { OFFICE_LIST_ENDPOINT } from './officeApi';
import { listDanhMucChuyenNganh } from './danhmucChuyenNganhApi';
import { getListNhomDongBo, NHOM_DONG_BO_LIST_ENDPOINT } from './nhomDongBoApi';

export interface DynamicOptionItem {
    value: string;
    label: string;
    color?: string;
}

export const DYNAMIC_OPTION_API_HINTS = [
    OFFICE_LIST_ENDPOINT,
    DANH_MUC_TRANG_BI_TREE_ENDPOINT,
    MA_DINH_DANH_TRANG_BI_LIST_ENDPOINT,
    '/DanhMucChuyenNganh.DanhMucChuyenNganhService/GetList',
    NHOM_DONG_BO_LIST_ENDPOINT,
    'api/getlist/office',
    'api/getlist/danh-muc-trang-bi',
    'api/getlist/nhom-dong-bo',
] as const;

const MA_DINH_DANH_KEYS = new Set<string>([
    DANH_MUC_TRANG_BI_TREE_ENDPOINT.toLowerCase(),
    'api/getlist/ma-dinh-danh-trang-bi',
    'api/getlist/danh-muc-trang-bi',
    'api/getlist/ma-danh-muc-trang-bi',
    'api/getlistdanhmuctrangbi',
    'api/getlistmadinhdanhtrangbi',
    MA_DINH_DANH_TRANG_BI_LIST_ENDPOINT.toLowerCase(),
]);
const OFFICE_KEYS = new Set<string>([
    'api/getlist/office',
    'api/getlist/don-vi',
    'api/getlistoffice',
    'api/getlistdonvi',
    OFFICE_LIST_ENDPOINT.toLowerCase(),
]);
const CHUYEN_NGANH_KEYS = new Set<string>([
    '/danhmucchuyennganh.danhmucchuyennganhservice/getlist',
    '/danhmucchuyennganh.danhmucchuyennganhservice/getlistdanhmucchuyennganh',
    'api/getlist/chuyen-nganh',
    'api/getlistchuyennganh',
]);
const NHOM_DONG_BO_KEYS = new Set<string>([
    NHOM_DONG_BO_LIST_ENDPOINT.toLowerCase(),
    'api/getlist/nhom-dong-bo',
    'api/getlistnhomdongbo',
]);

const normalizeKey = (value: string | undefined): string => (value ?? '').trim().toLowerCase();
export const isMaDinhDanhTrangBiOptionKey = (value: string | undefined): boolean =>
    MA_DINH_DANH_KEYS.has(normalizeKey(value));
export const isOfficeOptionKey = (value: string | undefined): boolean =>
    OFFICE_KEYS.has(normalizeKey(value));
export const isChuyenNganhOptionKey = (value: string | undefined): boolean =>
    CHUYEN_NGANH_KEYS.has(normalizeKey(value));
export const isDanhMucTrangBiTreeOptionKey = (value: string | undefined): boolean =>
    normalizeKey(value) === DANH_MUC_TRANG_BI_TREE_ENDPOINT.toLowerCase();
export const isMaDinhDanhTrangBiListOptionKey = (value: string | undefined): boolean =>
    normalizeKey(value) === MA_DINH_DANH_TRANG_BI_LIST_ENDPOINT.toLowerCase()
    || normalizeKey(value) === 'api/getlist/ma-dinh-danh-trang-bi'
    || normalizeKey(value) === 'api/getlist/danh-muc-trang-bi'
    || normalizeKey(value) === 'api/getlist/ma-danh-muc-trang-bi'
    || normalizeKey(value) === 'api/getlistdanhmuctrangbi'
    || normalizeKey(value) === 'api/getlistmadinhdanhtrangbi';
export const isNhomDongBoOptionKey = (value: string | undefined): boolean =>
    NHOM_DONG_BO_KEYS.has(normalizeKey(value));

const mapMaDinhDanhOptions = (items: MaDinhDanhTrangBiOption[]): DynamicOptionItem[] =>
    items.map((item) => ({
        value: item.id,
        label: item.label || item.id,
    }));

export async function resolveDynamicOptions(apiKey: string | undefined): Promise<DynamicOptionItem[]> {
    const normalizedKey = normalizeKey(apiKey);
    if (!normalizedKey) {
        return [];
    }

    if (MA_DINH_DANH_KEYS.has(normalizedKey)) {
        if (normalizedKey === DANH_MUC_TRANG_BI_TREE_ENDPOINT.toLowerCase()) {
            return (await danhMucTrangBiApi.getDanhMucTrangBiOptions()).map((item) => ({
                value: item.id,
                label: item.label || item.id,
            }));
        }

        return mapMaDinhDanhOptions(await danhMucTrangBiApi.getListMaDinhDanhTrangBi());
    }

    if (OFFICE_KEYS.has(normalizedKey)) {
        return await officeApi.getListOfficeOptions();
    }

    if (CHUYEN_NGANH_KEYS.has(normalizedKey)) {
        return (await listDanhMucChuyenNganh()).map((item) => ({
            value: item.id,
            label: item.ten || item.id,
        }));
    }

    if (NHOM_DONG_BO_KEYS.has(normalizedKey)) {
        return (await getListNhomDongBo()).map((item) => ({
            value: item.id,
            label: item.tenDonVi
                ? `${item.tenNhom} - ${item.tenDonVi}`
                : (item.tenNhom || item.id),
        }));
    }

    throw new Error(`Chua dang ky frontend api wrapper cho '${apiKey ?? ''}'`);
}
