/**
 * migrate-trangbi-canonical-schema.mongosh.js
 *
 * Canonical schema for TrangBiNhom1 / TrangBiNhom2:
 *   Top-level:
 *     _id, MaDanhMuc, TenDanhMuc, IdCapTren, IdChuyenNganhKT,
 *     NguoiTao, NguoiSua, NgayTao, NgaySua, Parameters
 *
 *   Parameters:
 *     snake_case business/spec fields only
 *
 * Important rule:
 *   - Do not keep Parameters.ma_trang_bi
 *   - Canonical "ma_trang_bi" is now doc.MaDanhMuc at read-model level
 *
 * This script migrates:
 *   1. Legacy seed documents with mixed top-level fields
 *   2. Newer instance documents with non-canonical parameter keys
 *   3. Already canonical documents safely (idempotent)
 *
 * Run:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" \
 *     --file scripts/migrate-trangbi-canonical-schema.mongosh.js
 *
 * Dry run:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" \
 *     --file scripts/migrate-trangbi-canonical-schema.mongosh.js \
 *     --eval "var DRY_RUN = true"
 */

const DRY_RUN = typeof globalThis.DRY_RUN !== 'undefined' ? globalThis.DRY_RUN : false;
const DATABASE_NAME = 'quanly_dmcanbo';
const COLLECTIONS = ['TrangBiNhom1', 'TrangBiNhom2'];
const database = db.getSiblingDB(DATABASE_NAME);

const TOP_LEVEL_KEEP = new Set([
    '_id',
    'MaDanhMuc',
    'TenDanhMuc',
    'IdCapTren',
    'IdChuyenNganhKT',
    'NguoiTao',
    'NguoiSua',
    'NgayTao',
    'NgaySua',
    'Parameters',
    'Delete',
    'Version',
]);

const LEGACY_METADATA_KEYS = [
    'ma_dinh_danh',
    'ten_danh_muc_trang_bi',
    'IDCapTren',
    'IDChuyenNganhKT',
    'IdChuyenNganhKt',
    'IDNganh',
    'IdNganh',
    'CreateDate',
    'ModifyDate',
];

const LEGACY_TOP_LEVEL_TO_PARAMS = {
    KyHieu: 'ky_hieu',
    SoSerial: 'so_hieu',
    DonViQuanLy: 'don_vi_quan_ly',
    TinhTrangSuDung: 'trang_thai',
    TinhTrangKyThuat: 'tinh_trang_ky_thuat',
    ChatLuong: 'chat_luong',
    NamSanXuat: 'nam_san_xuat',
    NamSuDung: 'nam_su_dung',
    NienHan: 'nien_han_su_dung',
    NuocSanXuat: 'nuoc_san_xuat',
    HangSanXuat: 'hang_san_xuat',
    DonVi: 'don_vi',
    PhanNganh: 'phan_nganh',
    Nhom: 'loai',
    GhiChu: 'ghi_chu',
    DaiTanLamViec: 'dai_tan_lam_viec',
    DoCaoTrinhSat: 'do_cao_trinh_sat',
    GocQuet: 'goc_quet',
    MucTieuTheoDoi: 'muc_tieu_theo_doi',
    TamPhatHien: 'tam_phat_hien',
    DoOnDinh: 'do_on_dinh',
    BanKinhHoatDong: 'ban_kinh_hoat_dong',
    CapDoBaoMat: 'cap_do_bao_mat',
    LoaiXe: 'loai_xe',
    TrongLuong: 'trong_luong',
    I101BanKinhQuet: 'i101_ban_kinh_quet',
    I101CheDoCanhGioi: 'i101_che_do_canh_gioi',
    I101SoKenhBamBat: 'i101_so_kenh_bam_bat',
    I102DoChinhXac: 'i102_do_chinh_xac',
    I102KenhDanBan: 'i102_kenh_dan_ban',
    I102TamBat: 'i102_tam_bat',
    I201DoPhanGiai: 'i201_do_phan_giai',
    I201DoSang: 'i201_do_sang',
    I201KichThuocMan: 'i201_kich_thuoc_man',
};

const PARAMETER_KEY_ALIASES = {
    maTrangBi: '__drop_ma_trang_bi__',
    ma_trang_bi: '__drop_ma_trang_bi__',
    maDanhMuc: '__drop_metadata__',
    ma_danh_muc: '__drop_metadata__',
    tenDanhMuc: '__drop_metadata__',
    ten_danh_muc: '__drop_metadata__',
    idCapTren: '__drop_metadata__',
    id_cap_tren: '__drop_metadata__',
    idChuyenNganhKt: '__drop_metadata__',
    id_chuyen_nganh_kt: '__drop_metadata__',
    id_dchuyen_nganh_kt: '__drop_metadata__',
    tenTrangBi: 'ten_trang_bi',
    ten: 'ten_trang_bi',
    serial: 'so_hieu',
    serial_number: 'so_hieu',
    soSerial: 'so_hieu',
    donVi: 'don_vi',
    don_vi_su_dung: 'don_vi',
    donViQuanLy: 'don_vi_quan_ly',
    donviquanly: 'don_vi_quan_ly',
    phanNganh: 'phan_nganh',
    chatLuong: 'chat_luong',
    cap_chat_luong: 'chat_luong',
    trangThai: 'trang_thai',
    tinh_trang: 'trang_thai',
    TinhTrangSuDung: 'trang_thai',
    tinhTrangKyThuat: 'tinh_trang_ky_thuat',
    namSanXuat: 'nam_san_xuat',
    namSuDung: 'nam_su_dung',
    nienHanSuDung: 'nien_han_su_dung',
    nien_han: 'nien_han_su_dung',
    nuocSanXuat: 'nuoc_san_xuat',
    hangSanXuat: 'hang_san_xuat',
};

const TRANG_THAI_MAP = {
    'dang su dung': 'Hoat dong',
    'hoat dong': 'Hoat dong',
    'sua chua': 'Sua chua',
    'niem cat': 'Niem cat',
    'bao quan': 'Bao quan',
    'du phong': 'Du phong',
    'cho thanh ly': 'Cho thanh ly',
    'da thanh ly': 'Da thanh ly',
};

function toSnakeCase(value) {
    return String(value)
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[\s\-]+/g, '_')
        .toLowerCase();
}

function trimToNull(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text === '' ? null : text;
}

function normalizeTrangThai(value) {
    const text = trimToNull(value);
    if (!text) return null;
    return TRANG_THAI_MAP[text.toLowerCase()] ?? text;
}

function clonePlainObject(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const result = {};
    for (const [key, value] of Object.entries(input)) {
        result[key] = value;
    }
    return result;
}

function setIfMissing(target, key, value) {
    const normalized = trimToNull(value);
    if (!normalized) return;
    if (!(key in target) || trimToNull(target[key]) === null) {
        target[key] = normalized;
    }
}

function firstNonEmpty(values) {
    for (const value of values) {
        const normalized = trimToNull(value);
        if (normalized) return normalized;
    }

    return null;
}

function resolveTopLevel(doc) {
    const existingParams = clonePlainObject(doc.Parameters);
    return {
        maDanhMuc: firstNonEmpty([
            doc.MaDanhMuc,
            doc.ma_dinh_danh,
            existingParams.ma_danh_muc,
            existingParams.maDanhMuc,
        ]),
        tenDanhMuc: firstNonEmpty([
            doc.TenDanhMuc,
            doc.ten_danh_muc_trang_bi,
            existingParams.ten_danh_muc,
            existingParams.tenDanhMuc,
            existingParams.ten_trang_bi,
        ]),
        idCapTren: firstNonEmpty([
            doc.IdCapTren,
            doc.IDCapTren,
            existingParams.id_cap_tren,
            existingParams.idCapTren,
        ]),
        idChuyenNganhKt: firstNonEmpty([
            doc.IdChuyenNganhKT,
            doc.IDChuyenNganhKT,
            doc.IdChuyenNganhKt,
            doc.IDNganh,
            doc.IdNganh,
            existingParams.id_chuyen_nganh_kt,
            existingParams.idChuyenNganhKt,
            existingParams.id_dchuyen_nganh_kt,
        ]),
        ngayTao: doc.NgayTao ?? doc.CreateDate ?? null,
        ngaySua: doc.NgaySua ?? doc.ModifyDate ?? null,
    };
}

function resolveKyHieuCandidate(doc, resolvedTopLevel) {
    const existingParams = clonePlainObject(doc.Parameters);
    const candidates = [
        existingParams.ky_hieu,
        doc.KyHieu,
        existingParams.ma_trang_bi,
        existingParams.maTrangBi,
    ];

    for (const candidate of candidates) {
        const text = trimToNull(candidate);
        if (!text) continue;
        if (resolvedTopLevel.maDanhMuc && text === resolvedTopLevel.maDanhMuc) continue;
        return text;
    }

    return null;
}

function buildNormalizedParameters(doc, resolvedTopLevel) {
    const params = {};
    const rawParams = clonePlainObject(doc.Parameters);

    for (const [rawKey, rawValue] of Object.entries(rawParams)) {
        const normalizedValue = trimToNull(rawValue);
        if (!normalizedValue) continue;

        const alias = PARAMETER_KEY_ALIASES[rawKey];
        if (alias === '__drop_ma_trang_bi__') {
            continue;
        }
        if (alias === '__drop_metadata__') {
            continue;
        }

        const canonicalKey = alias ?? toSnakeCase(rawKey);
        if (canonicalKey === 'ma_trang_bi') {
            continue;
        }

        setIfMissing(params, canonicalKey, normalizedValue);
    }

    for (const [topLevelKey, parameterKey] of Object.entries(LEGACY_TOP_LEVEL_TO_PARAMS)) {
        setIfMissing(params, parameterKey, doc[topLevelKey]);
    }

    const kyHieu = resolveKyHieuCandidate(doc, resolvedTopLevel);
    setIfMissing(params, 'ky_hieu', kyHieu);

    if (resolvedTopLevel.tenDanhMuc) {
        setIfMissing(params, 'ten_trang_bi', resolvedTopLevel.tenDanhMuc);
    }

    if (resolvedTopLevel.idCapTren) {
        setIfMissing(params, 'phan_nganh', resolvedTopLevel.idCapTren);
    }

    if (params.trang_thai) {
        params.trang_thai = normalizeTrangThai(params.trang_thai);
    }

    for (const [key, value] of Object.entries(doc)) {
        if (TOP_LEVEL_KEEP.has(key)) continue;
        if (LEGACY_METADATA_KEYS.includes(key)) continue;
        if (key in LEGACY_TOP_LEVEL_TO_PARAMS) continue;

        const normalizedValue = trimToNull(value);
        if (!normalizedValue) continue;

        const snakeKey = toSnakeCase(key);
        if (snakeKey === 'ma_trang_bi') continue;
        setIfMissing(params, snakeKey, normalizedValue);
    }

    return params;
}

function collectUnsetKeys(doc) {
    const keys = {};

    for (const key of LEGACY_METADATA_KEYS) {
        if (doc[key] !== undefined) keys[key] = '';
    }

    for (const key of Object.keys(LEGACY_TOP_LEVEL_TO_PARAMS)) {
        if (doc[key] !== undefined) keys[key] = '';
    }

    return keys;
}

function resolveCanonicalUpdate(doc) {
    const topLevel = resolveTopLevel(doc);
    const normalizedParameters = buildNormalizedParameters(doc, topLevel);
    const set = {};
    const unset = collectUnsetKeys(doc);

    if (topLevel.maDanhMuc !== trimToNull(doc.MaDanhMuc)) {
        set.MaDanhMuc = topLevel.maDanhMuc;
    }

    if (topLevel.tenDanhMuc !== trimToNull(doc.TenDanhMuc)) {
        set.TenDanhMuc = topLevel.tenDanhMuc;
    }

    if (topLevel.idCapTren !== trimToNull(doc.IdCapTren)) {
        set.IdCapTren = topLevel.idCapTren;
    }

    if (topLevel.idChuyenNganhKt !== trimToNull(doc.IdChuyenNganhKT)) {
        set.IdChuyenNganhKT = topLevel.idChuyenNganhKt;
    }

    if (topLevel.ngayTao && JSON.stringify(doc.NgayTao ?? null) !== JSON.stringify(topLevel.ngayTao)) {
        set.NgayTao = topLevel.ngayTao;
    }

    if (topLevel.ngaySua && JSON.stringify(doc.NgaySua ?? null) !== JSON.stringify(topLevel.ngaySua)) {
        set.NgaySua = topLevel.ngaySua;
    }

    const currentParametersJson = JSON.stringify(clonePlainObject(doc.Parameters));
    const normalizedParametersJson = JSON.stringify(normalizedParameters);
    if (currentParametersJson !== normalizedParametersJson) {
        set.Parameters = normalizedParameters;
    }

    return { set, unset };
}

function isCanonical(doc) {
    if (!trimToNull(doc.MaDanhMuc)) return false;
    if (!trimToNull(doc.TenDanhMuc)) return false;

    for (const key of LEGACY_METADATA_KEYS) {
        if (doc[key] !== undefined) return false;
    }

    for (const key of Object.keys(LEGACY_TOP_LEVEL_TO_PARAMS)) {
        if (doc[key] !== undefined) return false;
    }

    const params = clonePlainObject(doc.Parameters);
    for (const [key, value] of Object.entries(params)) {
        if (PARAMETER_KEY_ALIASES[key] === '__drop_ma_trang_bi__') return false;
        if (PARAMETER_KEY_ALIASES[key] === '__drop_metadata__') return false;
        if (PARAMETER_KEY_ALIASES[key] && PARAMETER_KEY_ALIASES[key] !== key) return false;
        if (toSnakeCase(key) === 'ma_trang_bi') return false;
        if (trimToNull(value) === null) return false;
    }

    return true;
}

function migrateCollection(collectionName) {
    const collection = database.getCollection(collectionName);
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    collection.find({}).forEach((doc) => {
        try {
            if (isCanonical(doc)) {
                skipped += 1;
                return;
            }

            const { set, unset } = resolveCanonicalUpdate(doc);
            const hasSet = Object.keys(set).length > 0;
            const hasUnset = Object.keys(unset).length > 0;

            if (!hasSet && !hasUnset) {
                skipped += 1;
                return;
            }

            if (DRY_RUN) {
                print(`[DRY] ${collectionName} _id=${doc._id}`);
                if (hasSet) {
                    print(`  $set   ${JSON.stringify(set)}`);
                }
                if (hasUnset) {
                    print(`  $unset ${Object.keys(unset).join(', ')}`);
                }
            } else {
                const operation = {};
                if (hasSet) operation.$set = set;
                if (hasUnset) operation.$unset = unset;
                collection.updateOne({ _id: doc._id }, operation);
            }

            updated += 1;
        } catch (error) {
            print(`[ERROR] ${collectionName} _id=${doc._id}: ${error}`);
            errors += 1;
        }
    });

    print(`${collectionName}: updated=${updated}, skipped=${skipped}, errors=${errors}`);
}

print(`\n=== migrate-trangbi-canonical-schema ${DRY_RUN ? '[DRY RUN]' : ''} ===`);
for (const collectionName of COLLECTIONS) {
    migrateCollection(collectionName);
}
print('=== Done ===\n');
