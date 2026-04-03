/**
 * ============================================================
 * MIGRATION: TCDT HeSinhThai — Bổ sung ScopeType phân quyền
 * ============================================================
 * Phiên bản : 1.0.0
 * Ngày       : 2026-03-16
 * Môi trường : MongoDB Compass / mongosh
 *
 * BƯỚC CHUẨN BỊ — cập nhật tên collection thực tế bên dưới:
 *   1. Chạy lệnh này trong Compass để xem danh sách collection:
 *        db.getCollectionNames().sort()
 *   2. Điền tên đúng vào phần COLLECTION_NAMES bên dưới
 *   3. Chạy với DRY_RUN = true trước để kiểm tra
 *   4. Khi kết quả ổn, đổi DRY_RUN = false rồi chạy lại
 *
 * Rollback: chạy file migration_scope_v1_rollback.js
 * ============================================================
 */

// ─── ÁNH XẠ TÊN COLLECTION THỰC TẾ (quanly_dmcanbo) ─────────
// Đã xác nhận qua db.getCollectionNames().sort()
// HIỆN CÓ  : CapBac, DynamicField, DynamicMenu, DynamicMenuDataSource,
//             Employee, FieldSet, FormConfig, Office, TemplateLayout
// TẠO MỚI  : tất cả collection phân quyền bên dưới
const COLS = {
    // ── collection ĐÃ TỒN TẠI ───────────────────────────────────
    Office                          : "Office",                          // ✓ đơn vị tổ chức
    NguoiDung                       : "Employee",                        // ✓ người dùng

    // ── collection SẼ ĐƯỢC TẠO MỚI trong migration ──────────────
    NhomNguoiDung                   : "NhomNguoiDung",                   // nhóm / vai trò
    NguoiDungNhomNguoiDung          : "NguoiDungNhomNguoiDung",          // gán user vào nhóm + scope
    PhanQuyenPhanHeNguoiDung        : "PhanQuyenPhanHeNguoiDung",        // quyền truy cập phân hệ / user
    PhanQuyenPhanHeNhomNguoiDung    : "PhanQuyenPhanHeNhomNguoiDung",    // quyền truy cập phân hệ / nhóm
    PhanQuyenNguoiDungNganhDoc      : "PhanQuyenNguoiDungNganhDoc",      // scope ngành dọc / user
    PhanQuyenNhomNguoiDungNganhDoc  : "PhanQuyenNhomNguoiDungNganhDoc",  // scope ngành dọc / nhóm
    LichSuPhanQuyenScope            : "LichSuPhanQuyenScope",            // audit log scope

    // ── collection chức năng — tạo mới (quyền thao tác chi tiết) ─
    PhanQuyenNguoiDung              : "PhanQuyenNguoiDung",              // quyền chức năng / user
    PhanQuyenNhomNguoiDung          : "PhanQuyenNhomNguoiDung",          // quyền chức năng / nhóm
};

// Collection ĐÃ TỒN TẠI — preflight check
const EXISTING_COLS  = [COLS.Office, COLS.NguoiDung];

// Collection CẦN TẠO MỚI — migration sẽ createCollection
const NEW_COLS = [
    COLS.NhomNguoiDung,
    COLS.NguoiDungNhomNguoiDung,
    COLS.PhanQuyenPhanHeNguoiDung,
    COLS.PhanQuyenPhanHeNhomNguoiDung,
    COLS.PhanQuyenNguoiDungNganhDoc,
    COLS.PhanQuyenNhomNguoiDungNganhDoc,
    COLS.PhanQuyenNguoiDung,
    COLS.PhanQuyenNhomNguoiDung,
    COLS.LichSuPhanQuyenScope,
];
// ─────────────────────────────────────────────────────────────

// ─── CẤU HÌNH ────────────────────────────────────────────────
const DB_NAME        = db.getName();        // dùng db hiện tại
const DRY_RUN        = false;                // ĐỔI THÀNH false KHI SẴN SÀNG CHẠY THẬT
const BATCH_SIZE     = 100;                 // số doc xử lý mỗi lần
const LOG_PREFIX     = "[MIGRATION v1.0]";

// ─── TIỆN ÍCH ────────────────────────────────────────────────
function log(msg)  { print(`${LOG_PREFIX} ${msg}`); }
function ok(msg)   { print(`${LOG_PREFIX} ✓ ${msg}`); }
function warn(msg) { print(`${LOG_PREFIX} ⚠ ${msg}`); }
function err(msg)  { print(`${LOG_PREFIX} ✗ ${msg}`); }

function safeUpdate(collection, filter, update, desc) {
    if (DRY_RUN) {
        const count = db[collection].countDocuments(filter);
        log(`DRY_RUN | ${collection} | ${desc} | sẽ cập nhật ${count} doc`);
        return { matchedCount: count, modifiedCount: 0 };
    }
    const result = db[collection].updateMany(filter, update);
    ok(`${collection} | ${desc} | matched=${result.matchedCount} modified=${result.modifiedCount}`);
    return result;
}

// ─── BƯỚC 0: KIỂM TRA TRƯỚC KHI CHẠY ────────────────────────
log("═══ BẮT ĐẦU MIGRATION ═══════════════════════════════════");
log(`Database : ${DB_NAME}`);
log(`DRY_RUN  : ${DRY_RUN}`);
log(`Thời gian: ${new Date().toISOString()}`);
print("");

// Kiểm tra các collection bắt buộc tồn tại
const REQUIRED_COLLECTIONS = EXISTING_COLS; // chỉ check collection đã tồn tại

const existingCollections = db.getCollectionNames();
let preflight_ok = true;

REQUIRED_COLLECTIONS.forEach(name => {
    if (existingCollections.includes(name)) {
        ok(`Preflight | Collection '${name}' tồn tại`);
    } else {
        err(`Preflight | Collection '${name}' KHÔNG TỒN TẠI`);
        preflight_ok = false;
    }
});

// Kiểm tra office có dữ liệu
const donviCount = db.Office.countDocuments();
if (donviCount === 0) {
    err("Preflight | office rỗng — cần seed dữ liệu đơn vị trước");
    preflight_ok = false;
} else {
    ok(`Preflight | office có ${donviCount} đơn vị`);
}

// Kiểm tra collection mới chưa tồn tại (tránh chạy migration 2 lần)
NEW_COLS.forEach(name => {
    if (existingCollections.includes(name)) {
        warn(`Preflight | '${name}' ĐÃ TỒN TẠI — collection này sẽ bị bỏ qua khi tạo`);
    } else {
        ok(`Preflight | '${name}' chưa tồn tại → sẽ được TẠO MỚI`);
    }
});

if (!preflight_ok) {
    err("Preflight FAILED — dừng migration. Kiểm tra lại collection.");
    throw new Error("Preflight FAILED — xem lỗi ở trên");
}

print("");
log("═══ BƯỚC 1: office — Thêm Path (slash) + Depth ══════════");

/**
 * office._id đã là dot-path (vd: "000.050.017.001")
 * Chỉ bổ sung:
 *   - Path  : string  "/000/050/017/001/"  — dùng cho index LIKE
 *   - Depth : int     4                    — dùng cho Siblings query
 *
 * Các trường hiện có KHÔNG thay đổi:
 *   _id, IDCapTren, Ten, TenIn, VietTat, PhienHieu, TenDayDu,
 *   TenVietTatDayDu, CoCapDuoi, ThuTu, ThuTuSapXep,
 *   TenTaiKhoanChiaSeDuLieu, MatKhauChiaSeDuLieu,
 *   NguoiTao, NguoiSua, NgayTao, NgaySua, Parameters
 */
let step1_updated = 0;
let step1_cursor = db.Office.find({ Path: { $exists: false } });

while (step1_cursor.hasNext()) {
    const batch = [];
    for (let i = 0; i < BATCH_SIZE && step1_cursor.hasNext(); i++) {
        batch.push(step1_cursor.next());
    }

    batch.forEach(doc => {
        const segs  = doc._id.split(".");
        const path  = "/" + segs.join("/") + "/";
        const depth = segs.length;

        if (!DRY_RUN) {
            db.Office.updateOne(
                { _id: doc._id },
                { $set: { Path: path, Depth: depth } }
            );
        }
        step1_updated++;
    });
}

if (DRY_RUN) {
    log(`DRY_RUN | office | sẽ cập nhật ${step1_updated} doc`);
} else {
    ok(`office | Đã thêm Path + Depth cho ${step1_updated} đơn vị`);
}

// Kiểm tra mẫu
if (!DRY_RUN) {
    const sample = db.Office.findOne({ Path: { $exists: true } });
    if (sample) {
        ok(`office | Mẫu: _id="${sample._id}" Path="${sample.Path}" Depth=${sample.Depth}`);
    }
}

print("");
log("═══ BƯỚC 2: Tạo các collection phân quyền mới ═══════════════");

/**
 * Các collection phân quyền chưa tồn tại trong quanly_dmcanbo.
 * Migration tạo mới với validator để đảm bảo tính toàn vẹn.
 * validationAction = "warn" để không block insert từ code cũ.
 *
 * Cấu trúc mỗi collection:
 *   NhomNguoiDung              : nhóm / vai trò — gắn với Office._id
 *   NguoiDungNhomNguoiDung     : gán Employee vào NhomNguoiDung + scope
 *   PhanQuyenPhanHeNguoiDung   : quyền truy cập phân hệ per Employee
 *   PhanQuyenPhanHeNhomNguoiDung: quyền truy cập phân hệ per NhomNguoiDung
 *   PhanQuyenNguoiDungNganhDoc  : scope ngành dọc per Employee
 *   PhanQuyenNhomNguoiDungNganhDoc: scope ngành dọc per NhomNguoiDung
 */

const NEW_COLLECTION_SCHEMAS = {
    [COLS.NhomNguoiDung]: {
        required: ["Ten", "MaPhanHe"],
        properties: {
            Ten          : { bsonType: "string" },
            TrongSo      : { bsonType: ["int", "double", "null"] },
            MaPhanHe     : { bsonType: "string" },
            IDDonVi      : { bsonType: ["string", "null"] },   // FK → Office._id
            VaiTroNoiBo  : { bsonType: ["bool", "null"] },
            NguoiTao     : { bsonType: ["string", "null"] },
            NguoiSua     : { bsonType: ["string", "null"] },
            NgayTao      : { bsonType: ["date", "null"] },
            NgaySua      : { bsonType: ["date", "null"] },
        }
    },
    [COLS.NguoiDungNhomNguoiDung]: {
        required: ["IDNhomNguoiDung", "IDNguoiDung"],
        properties: {
            IDNhomNguoiDung  : { bsonType: "string" },   // FK → NhomNguoiDung._id
            IDNguoiDung      : { bsonType: "string" },   // FK → Employee._id
            ScopeType        : { bsonType: ["string", "null"] },
            IDDonViScope     : { bsonType: ["string", "null"] },  // FK → Office._id
            NgayHetHan       : { bsonType: ["date", "null"] },
            IDNguoiUyQuyen   : { bsonType: ["string", "null"] },  // FK → Employee._id
        }
    },
    [COLS.PhanQuyenPhanHeNguoiDung]: {
        required: ["IDNguoiDung", "MaPhanHe"],
        properties: {
            IDNguoiDung    : { bsonType: "string" },
            MaPhanHe       : { bsonType: "string" },
            TieuDePhanHe   : { bsonType: ["string", "null"] },
            DuocTruyCap    : { bsonType: ["bool", "null"] },
            DuocQuanTri    : { bsonType: ["bool", "null"] },
            ScopeType      : { bsonType: ["string", "null"] },
            IDDonViScope   : { bsonType: ["string", "null"] },
            NguoiTao       : { bsonType: ["string", "null"] },
            NguoiSua       : { bsonType: ["string", "null"] },
            NgayTao        : { bsonType: ["date", "null"] },
            NgaySua        : { bsonType: ["date", "null"] },
        }
    },
    [COLS.PhanQuyenPhanHeNhomNguoiDung]: {
        required: ["IDNhomNguoiDung", "MaPhanHe"],
        properties: {
            IDNhomNguoiDung : { bsonType: "string" },
            MaPhanHe        : { bsonType: "string" },
            TieuDePhanHe    : { bsonType: ["string", "null"] },
            DuocTruyCap     : { bsonType: ["bool", "null"] },
            DuocQuanTri     : { bsonType: ["bool", "null"] },
            ScopeType       : { bsonType: ["string", "null"] },
            IDDonViScope    : { bsonType: ["string", "null"] },
            NguoiTao        : { bsonType: ["string", "null"] },
            NguoiSua        : { bsonType: ["string", "null"] },
            NgayTao         : { bsonType: ["date", "null"] },
            NgaySua         : { bsonType: ["date", "null"] },
        }
    },
    [COLS.PhanQuyenNguoiDungNganhDoc]: {
        required: ["IDNguoiDung", "MaPhanHe"],
        properties: {
            IDNguoiDung        : { bsonType: "string" },
            MaPhanHe           : { bsonType: "string" },
            IDNganhDoc         : { bsonType: "array" },   // array of Office._id strings
            ScopeTypeNganhDoc  : { bsonType: ["string", "null"] },
            NguoiTao           : { bsonType: ["string", "null"] },
            NguoiSua           : { bsonType: ["string", "null"] },
            NgayTao            : { bsonType: ["date", "null"] },
            NgaySua            : { bsonType: ["date", "null"] },
        }
    },
    [COLS.PhanQuyenNhomNguoiDungNganhDoc]: {
        required: ["IDNhomNguoiDung", "MaPhanHe"],
        properties: {
            IDNhomNguoiDung    : { bsonType: "string" },
            MaPhanHe           : { bsonType: "string" },
            IDNganhDoc         : { bsonType: "array" },
            ScopeTypeNganhDoc  : { bsonType: ["string", "null"] },
            NguoiTao           : { bsonType: ["string", "null"] },
            NguoiSua           : { bsonType: ["string", "null"] },
            NgayTao            : { bsonType: ["date", "null"] },
            NgaySua            : { bsonType: ["date", "null"] },
        }
    },
    [COLS.PhanQuyenNguoiDung]: {
        required: ["IDNguoiDung", "MaChucNang", "MaPhanHe"],
        properties: {
            IDNguoiDung      : { bsonType: "string" },   // FK → Employee._id
            IDCapTren        : { bsonType: ["string", "null"] },
            MaChucNang       : { bsonType: "string" },
            TieuDeChucNang   : { bsonType: ["string", "null"] },
            MaPhanHe         : { bsonType: "string" },
            TieuDeNhom       : { bsonType: ["string", "null"] },
            Actions          : { bsonType: ["object", "null"] },
            NguoiTao         : { bsonType: ["string", "null"] },
            NguoiSua         : { bsonType: ["string", "null"] },
            NgayTao          : { bsonType: ["date", "null"] },
            NgaySua          : { bsonType: ["date", "null"] },
        }
    },
    [COLS.PhanQuyenNhomNguoiDung]: {
        required: ["IDNhomNguoiDung", "MaChucNang", "MaPhanHe"],
        properties: {
            IDNhomNguoiDung  : { bsonType: "string" },   // FK → NhomNguoiDung._id
            IDCapTren        : { bsonType: ["string", "null"] },
            MaChucNang       : { bsonType: "string" },
            TieuDeChucNang   : { bsonType: ["string", "null"] },
            MaPhanHe         : { bsonType: "string" },
            TieuDeNhomQuyen  : { bsonType: ["string", "null"] },
            Actions          : { bsonType: ["object", "null"] },
            NguoiTao         : { bsonType: ["string", "null"] },
            NguoiSua         : { bsonType: ["string", "null"] },
            NgayTao          : { bsonType: ["date", "null"] },
            NgaySua          : { bsonType: ["date", "null"] },
        }
    },
};

let cols_created  = 0;
let cols_skipped  = 0;
const currentCols = db.getCollectionNames();

Object.entries(NEW_COLLECTION_SCHEMAS).forEach(([colName, schema]) => {
    if (currentCols.includes(colName)) {
        warn(`Tạo collection | '${colName}' đã tồn tại → bỏ qua`);
        cols_skipped++;
        return;
    }
    if (DRY_RUN) {
        log(`DRY_RUN | Sẽ tạo collection '${colName}'`);
        cols_created++;
        return;
    }
    db.createCollection(colName, {
        validator: {
            $jsonSchema: {
                bsonType: "object",
                required: schema.required,
                properties: schema.properties,
            }
        },
        validationAction: "warn",
    });
    ok(`Tạo collection | '${colName}' ✓`);
    cols_created++;
});

print("");
log("═══ BƯỚC 3: NguoiDungNhomNguoiDung — Thêm ScopeType fields ══");

/**
 * Thêm 4 trường mới vào bản ghi gán user vào nhóm:
 *
 *   ScopeType      : enum?     — null = fallback về IDQuanTriDonVi
 *   IDDonViScope   : string?   — FK → office._id; null = dùng IDQuanTriDonVi
 *   NgayHetHan     : date?     — chỉ dùng khi ScopeType = "Delegated"
 *   IDNguoiUyQuyen : string?   — FK → NguoiDung._id; chỉ dùng khi Delegated
 *
 * Chiến lược fallback tại backend:
 *   if (ScopeType == null)
 *     → ScopeType = "Subtree", anchor = NguoiDung.IDQuanTriDonVi
 *   else
 *     → dùng ScopeType + IDDonViScope tường minh
 */
safeUpdate(
    COLS.NguoiDungNhomNguoiDung,
    { ScopeType: { $exists: false } },
    {
        $set: {
            ScopeType      : null,   // null = backward compat (Subtree @ IDQuanTriDonVi)
            IDDonViScope   : null,
            NgayHetHan     : null,
            IDNguoiUyQuyen : null,
        }
    },
    "Thêm ScopeType + IDDonViScope + NgayHetHan + IDNguoiUyQuyen"
);

print("");
log("═══ BƯỚC 4: PhanQuyenPhanHeNguoiDung — Thêm ScopeType fields ══");

/**
 * Bổ sung scope tường minh cho phân quyền truy cập phân hệ (cá nhân).
 *
 * Thêm 2 trường:
 *   ScopeType    : enum?    — null = Subtree @ IDQuanTriDonVi
 *   IDDonViScope : string?  — FK → office._id
 *
 * Trường hiện có KHÔNG đổi:
 *   _id, IDNguoiDung, MaPhanHe, TieuDePhanHe,
 *   DuocTruyCap, DuocQuanTri, NguoiTao, NguoiSua, NgayTao, NgaySua
 */
safeUpdate(
    COLS.PhanQuyenPhanHeNguoiDung,
    { ScopeType: { $exists: false } },
    {
        $set: {
            ScopeType    : null,
            IDDonViScope : null,
        }
    },
    "Thêm ScopeType + IDDonViScope"
);

print("");
log("═══ BƯỚC 5: PhanQuyenPhanHeNhomNguoiDung — Thêm ScopeType fields ══");

/**
 * Tương tự bước 3 nhưng cho nhóm.
 * Khi IDDonViScope khác null: toàn bộ thành viên nhóm bị giới hạn vào IDDonViScope này.
 * Khi null: mỗi thành viên dùng IDQuanTriDonVi của chính họ.
 *
 * Trường hiện có KHÔNG đổi:
 *   _id, IDNhomNguoiDung, MaPhanHe, TieuDePhanHe,
 *   DuocTruyCap, DuocQuanTri, NguoiTao, NguoiSua, NgayTao, NgaySua
 */
safeUpdate(
    COLS.PhanQuyenPhanHeNhomNguoiDung,
    { ScopeType: { $exists: false } },
    {
        $set: {
            ScopeType    : null,
            IDDonViScope : null,
        }
    },
    "Thêm ScopeType + IDDonViScope"
);

print("");
log("═══ BƯỚC 6: PhanQuyenNguoiDungNganhDoc — Thêm ScopeTypeNganhDoc ══");

/**
 * IDNganhDoc[] đã tồn tại nhưng đang rỗng.
 * Thêm ScopeTypeNganhDoc để chỉ định cách áp scope cho từng phần tử IDNganhDoc.
 *
 *   ScopeTypeNganhDoc : "MultiNode" | "Subtree"
 *     - "MultiNode" (default): mỗi IDDonVi trong IDNganhDoc là anchor riêng,
 *       mỗi cái áp Subtree, kết quả UNION tất cả
 *     - "Subtree": chỉ có 1 phần tử trong IDNganhDoc, áp Subtree trực tiếp
 *
 * Trường hiện có KHÔNG đổi:
 *   _id, IDNguoiDung, MaPhanHe, NguoiTao, NguoiSua, NgayTao, NgaySua, IDNganhDoc
 */
safeUpdate(
    COLS.PhanQuyenNguoiDungNganhDoc,
    { ScopeTypeNganhDoc: { $exists: false } },
    {
        $set: {
            ScopeTypeNganhDoc: "MultiNode",
        }
    },
    "Thêm ScopeTypeNganhDoc = 'MultiNode'"
);

print("");
log("═══ BƯỚC 7: PhanQuyenNhomNguoiDungNganhDoc — Thêm ScopeTypeNganhDoc ══");

/**
 * Tương tự bước 5 nhưng cho nhóm người dùng.
 *
 * Trường hiện có KHÔNG đổi:
 *   _id, IDNhomNguoiDung, MaPhanHe, NguoiTao, NguoiSua, NgayTao, NgaySua, IDNganhDoc
 */
safeUpdate(
    COLS.PhanQuyenNhomNguoiDungNganhDoc,
    { ScopeTypeNganhDoc: { $exists: false } },
    {
        $set: {
            ScopeTypeNganhDoc: "MultiNode",
        }
    },
    "Thêm ScopeTypeNganhDoc = 'MultiNode'"
);

print("");
log("═══ BƯỚC 8: Tạo collection LichSuPhanQuyenScope ═════════");

/**
 * Collection mới — ghi nhật ký mọi thay đổi scope.
 * Đặc biệt quan trọng với:
 *   - ScopeType = "Delegated" (ủy quyền có thời hạn)
 *   - ScopeType = "All"       (toàn hệ thống — bắt buộc audit)
 *
 * Schema:
 *   _id                   : ObjectId
 *   IDNguoiDuocPhanQuyen  : string  — FK → NguoiDung._id
 *   IDNhomNguoiDung       : string? — FK → NhomNguoiDung._id (nếu phân quyền nhóm)
 *   IDNguoiThucHien       : string  — FK → NguoiDung._id (người thực hiện thao tác)
 *   MaPhanHe              : string
 *   HanhDong              : "ADD" | "UPDATE" | "REMOVE"
 *   ScopeTypeCu           : string? — giá trị cũ trước thay đổi
 *   IDDonViScopeCu        : string? — FK → office._id
 *   ScopeTypeMoi          : string  — giá trị mới
 *   IDDonViScopeMoi       : string? — FK → office._id
 *   NgayHetHanCu          : date?
 *   NgayHetHanMoi         : date?
 *   IDNguoiUyQuyenCu      : string? — FK → NguoiDung._id
 *   IDNguoiUyQuyenMoi     : string? — FK → NguoiDung._id
 *   NgayThucHien          : date    — timestamp khi ghi log
 *   GhiChu                : string?
 */
if (!existingCollections.includes(COLS.LichSuPhanQuyenScope)) {
    if (!DRY_RUN) {
        db.createCollection(COLS.LichSuPhanQuyenScope, {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: [
                        "IDNguoiDuocPhanQuyen",
                        "IDNguoiThucHien",
                        "MaPhanHe",
                        "HanhDong",
                        "ScopeTypeMoi",
                        "NgayThucHien",
                    ],
                    properties: {
                        IDNguoiDuocPhanQuyen : { bsonType: "string" },
                        IDNhomNguoiDung      : { bsonType: ["string", "null"] },
                        IDNguoiThucHien      : { bsonType: "string" },
                        MaPhanHe             : { bsonType: "string" },
                        HanhDong             : { enum: ["ADD", "UPDATE", "REMOVE"] },
                        ScopeTypeCu          : { bsonType: ["string", "null"] },
                        IDDonViScopeCu       : { bsonType: ["string", "null"] },
                        ScopeTypeMoi         : { bsonType: "string" },
                        IDDonViScopeMoi      : { bsonType: ["string", "null"] },
                        NgayHetHanCu         : { bsonType: ["date", "null"] },
                        NgayHetHanMoi        : { bsonType: ["date", "null"] },
                        IDNguoiUyQuyenCu     : { bsonType: ["string", "null"] },
                        IDNguoiUyQuyenMoi    : { bsonType: ["string", "null"] },
                        NgayThucHien         : { bsonType: "date" },
                        GhiChu               : { bsonType: ["string", "null"] },
                    }
                }
            },
            validationAction: "warn",  // warn thay vì error để không block insert khi backend cũ
        });
        ok(`${COLS.LichSuPhanQuyenScope} | Collection đã được tạo với schema validator`);
    } else {
        log("DRY_RUN | Sẽ tạo collection LichSuPhanQuyenScope");
    }
} else {
    warn(`${COLS.LichSuPhanQuyenScope} | Đã tồn tại — bỏ qua tạo collection`);
}

print("");
log("═══ BƯỚC 9: Tạo Indexes ══════════════════════════════════");

/**
 * Danh sách index cần tạo.
 * Dùng background: true để không lock collection khi có dữ liệu lớn.
 */
const INDEXES = [
    // office
    {
        col  : "Office",
        spec : { Path: 1 },
        opts : { name: "idx_Office_Path", background: true },
        desc : "Subtree query: office.Path LIKE '/000/050/%'",
    },
    {
        col  : "Office",
        spec : { Depth: 1 },
        opts : { name: "idx_Office_Depth", background: true },
        desc : "Siblings query: lọc đơn vị cùng cấp",
    },
    {
        col  : "Office",
        spec : { IDCapTren: 1 },
        opts : { name: "idx_Office_IDCapTren", background: true },
        desc : "Build tree UI: lấy con của một node cha",
    },

    // NguoiDung — FK indexes
    {
        col  : COLS.NguoiDung,
        spec : { IDDonVi: 1 },
        opts : { name: "idx_NguoiDung_IDDonVi", background: true },
        desc : "Lookup user theo đơn vị",
    },
    {
        col  : COLS.NguoiDung,
        spec : { IDQuanTriDonVi: 1 },
        opts : { name: "idx_NguoiDung_IDQuanTriDonVi", background: true },
        desc : "Fallback scope: lấy anchor từ IDQuanTriDonVi",
    },

    // NguoiDungNhomNguoiDung — compound + scope
    {
        col  : COLS.NguoiDungNhomNguoiDung,
        spec : { IDNguoiDung: 1 },
        opts : { name: "idx_NDNND_IDNguoiDung", background: true },
        desc : "Lấy tất cả nhóm của một user",
    },
    {
        col  : COLS.NguoiDungNhomNguoiDung,
        spec : { IDNhomNguoiDung: 1 },
        opts : { name: "idx_NDNND_IDNhomNguoiDung", background: true },
        desc : "Lấy tất cả thành viên của nhóm",
    },
    {
        col  : COLS.NguoiDungNhomNguoiDung,
        spec : { IDDonViScope: 1 },
        opts : {
            name: "idx_NDNND_IDDonViScope",
            background: true,
            sparse: true,      // bỏ qua doc có IDDonViScope = null
        },
        desc : "Scope filter: lookup bản ghi theo anchor đơn vị",
    },
    {
        col  : COLS.NguoiDungNhomNguoiDung,
        spec : { NgayHetHan: 1 },
        opts : {
            name: "idx_NDNND_NgayHetHan",
            background: true,
            sparse: true,      // chỉ index doc có NgayHetHan != null (Delegated)
        },
        desc : "Tìm scope Delegated sắp hết hạn",
    },

    // PhanQuyenPhanHeNguoiDung
    {
        col  : COLS.PhanQuyenPhanHeNguoiDung,
        spec : { IDNguoiDung: 1, MaPhanHe: 1 },
        opts : { name: "idx_PPHNgD_user_phanhe", background: true },
        desc : "Lookup quyền phân hệ của user",
    },
    {
        col  : COLS.PhanQuyenPhanHeNguoiDung,
        spec : { IDDonViScope: 1 },
        opts : { name: "idx_PPHNgD_IDDonViScope", background: true, sparse: true },
        desc : "Scope lookup phân hệ",
    },

    // PhanQuyenPhanHeNhomNguoiDung
    {
        col  : COLS.PhanQuyenPhanHeNhomNguoiDung,
        spec : { IDNhomNguoiDung: 1, MaPhanHe: 1 },
        opts : { name: "idx_PPHNhom_nhom_phanhe", background: true },
        desc : "Lookup quyền phân hệ của nhóm",
    },
    {
        col  : COLS.PhanQuyenPhanHeNhomNguoiDung,
        spec : { IDDonViScope: 1 },
        opts : { name: "idx_PPHNhom_IDDonViScope", background: true, sparse: true },
        desc : "Scope lookup phân hệ nhóm",
    },

    // PhanQuyenNguoiDung
    {
        col  : COLS.PhanQuyenNguoiDung,
        spec : { IDNguoiDung: 1, MaPhanHe: 1 },
        opts : { name: "idx_PQNgD_user_phanhe", background: true },
        desc : "Lookup quyền chức năng của user theo phân hệ",
    },
    {
        col  : COLS.PhanQuyenNguoiDung,
        spec : { IDNguoiDung: 1, MaChucNang: 1, MaPhanHe: 1 },
        opts : { name: "idx_PQNgD_user_chucnang", background: true, unique: false },
        desc : "Lookup quyền chức năng cụ thể",
    },

    // PhanQuyenNhomNguoiDung
    {
        col  : COLS.PhanQuyenNhomNguoiDung,
        spec : { IDNhomNguoiDung: 1, MaPhanHe: 1 },
        opts : { name: "idx_PQNhom_nhom_phanhe", background: true },
        desc : "Lookup quyền chức năng của nhóm",
    },

    // PhanQuyenNguoiDungNganhDoc
    {
        col  : COLS.PhanQuyenNguoiDungNganhDoc,
        spec : { IDNguoiDung: 1, MaPhanHe: 1 },
        opts : { name: "idx_PQNgNganh_user_phanhe", background: true },
        desc : "Lookup scope ngành dọc của user",
    },

    // PhanQuyenNhomNguoiDungNganhDoc
    {
        col  : COLS.PhanQuyenNhomNguoiDungNganhDoc,
        spec : { IDNhomNguoiDung: 1, MaPhanHe: 1 },
        opts : { name: "idx_PQNhomNganh_nhom_phanhe", background: true },
        desc : "Lookup scope ngành dọc của nhóm",
    },

    // LichSuPhanQuyenScope
    {
        col  : COLS.LichSuPhanQuyenScope,
        spec : { IDNguoiDuocPhanQuyen: 1, NgayThucHien: -1 },
        opts : { name: "idx_LS_user_time", background: true },
        desc : "Xem lịch sử phân quyền của user (mới nhất trước)",
    },
    {
        col  : COLS.LichSuPhanQuyenScope,
        spec : { IDNguoiThucHien: 1, NgayThucHien: -1 },
        opts : { name: "idx_LS_actor_time", background: true },
        desc : "Xem lịch sử thao tác của một admin",
    },
    {
        col  : COLS.LichSuPhanQuyenScope,
        spec : { ScopeTypeMoi: 1, NgayThucHien: -1 },
        opts : { name: "idx_LS_scopetype_time", background: true },
        desc : "Lọc log theo loại scope (ví dụ: tất cả lệnh gán 'All')",
    },
    {
        col  : COLS.LichSuPhanQuyenScope,
        spec : { NgayHetHanMoi: 1 },
        opts : { name: "idx_LS_NgayHetHan", background: true, sparse: true },
        desc : "Tìm scope Delegated sắp hết hạn để cảnh báo",
    },
];

let idx_created = 0;
let idx_skipped = 0;

INDEXES.forEach(idxDef => {
    try {
        const colExists = db.getCollectionNames().includes(idxDef.col);

        if (!colExists) {
            if (DRY_RUN) {
                // Collection chưa tồn tại trong DRY_RUN là bình thường — sẽ tạo ở Bước 2
                log(`DRY_RUN | Index | ${idxDef.col}.${idxDef.opts.name} | (collection sẽ được tạo) | ${idxDef.desc}`);
                idx_created++;
            } else {
                err(`Index | ${idxDef.col}.${idxDef.opts.name} | Collection không tồn tại — bỏ qua`);
            }
            return;
        }

        const existingIndexes = db[idxDef.col].getIndexes();
        const alreadyExists   = existingIndexes.some(i => i.name === idxDef.opts.name);

        if (alreadyExists) {
            warn(`Index | ${idxDef.col}.${idxDef.opts.name} đã tồn tại — bỏ qua`);
            idx_skipped++;
        } else if (DRY_RUN) {
            log(`DRY_RUN | Index | ${idxDef.col}.${idxDef.opts.name} | ${idxDef.desc}`);
            idx_created++;
        } else {
            db[idxDef.col].createIndex(idxDef.spec, idxDef.opts);
            ok(`Index | ${idxDef.col}.${idxDef.opts.name} | ${idxDef.desc}`);
            idx_created++;
        }
    } catch (e) {
        err(`Index | ${idxDef.col}.${idxDef.opts.name} | LỖI: ${e.message}`);
    }
});

print("");
log("═══ BƯỚC 10: Kiểm tra kết quả ════════════════════════════");

if (!DRY_RUN) {
    // office
    const donvi_ok    = db.Office.countDocuments({ Path: { $exists: true } });
    const donvi_total = db.Office.countDocuments();
    ok(`office | ${donvi_ok}/${donvi_total} đơn vị có trường Path + Depth`);

    // NguoiDungNhomNguoiDung
    const ndnnd_ok    = db[COLS.NguoiDungNhomNguoiDung].countDocuments({ ScopeType: { $exists: true } });
    const ndnnd_total = db[COLS.NguoiDungNhomNguoiDung].countDocuments();
    ok(`NguoiDungNhomNguoiDung | ${ndnnd_ok}/${ndnnd_total} bản ghi có ScopeType`);

    // PhanQuyenPhanHeNguoiDung
    const pphnd_ok    = db[COLS.PhanQuyenPhanHeNguoiDung].countDocuments({ ScopeType: { $exists: true } });
    const pphnd_total = db[COLS.PhanQuyenPhanHeNguoiDung].countDocuments();
    ok(`PhanQuyenPhanHeNguoiDung | ${pphnd_ok}/${pphnd_total} bản ghi có ScopeType`);

    // PhanQuyenPhanHeNhomNguoiDung
    const pphnhom_ok    = db[COLS.PhanQuyenPhanHeNhomNguoiDung].countDocuments({ ScopeType: { $exists: true } });
    const pphnhom_total = db[COLS.PhanQuyenPhanHeNhomNguoiDung].countDocuments();
    ok(`PhanQuyenPhanHeNhomNguoiDung | ${pphnhom_ok}/${pphnhom_total} bản ghi có ScopeType`);

    // NganhDoc
    const pqnd_ok    = db[COLS.PhanQuyenNguoiDungNganhDoc].countDocuments({ ScopeTypeNganhDoc: { $exists: true } });
    const pqnd_total = db[COLS.PhanQuyenNguoiDungNganhDoc].countDocuments();
    ok(`PhanQuyenNguoiDungNganhDoc | ${pqnd_ok}/${pqnd_total} bản ghi có ScopeTypeNganhDoc`);

    const pqnhom_ok    = db[COLS.PhanQuyenNhomNguoiDungNganhDoc].countDocuments({ ScopeTypeNganhDoc: { $exists: true } });
    const pqnhom_total = db[COLS.PhanQuyenNhomNguoiDungNganhDoc].countDocuments();
    ok(`PhanQuyenNhomNguoiDungNganhDoc | ${pqnhom_ok}/${pqnhom_total} bản ghi có ScopeTypeNganhDoc`);

    // LichSuPhanQuyenScope
    const ls_exists = db.getCollectionNames().includes(COLS.LichSuPhanQuyenScope);
    ok(`LichSuPhanQuyenScope | ${ls_exists ? "Tồn tại" : "KHÔNG TỒN TẠI"}`);

    // Mẫu verify office subtree query
    const sampleSubtree = db.Office.find(
        { _id: /^000\.050\.017/ },
        { _id: 1, Ten: 1, Path: 1, Depth: 1 }
    ).limit(3).toArray();
    log("Sample Subtree query (office._id LIKE '000.050.017%'):");
    sampleSubtree.forEach(d => {
        log(`  → _id="${d._id}" Ten="${d.Ten}" Path="${d.Path}" Depth=${d.Depth}`);
    });

    // Mẫu verify Siblings query
    const sampleNode   = db.Office.findOne({ _id: "000.050.017.009" });
    if (sampleNode) {
        const siblings = db.Office.find(
            { IDCapTren: sampleNode.IDCapTren, Depth: sampleNode.Depth },
            { _id: 1, Ten: 1 }
        ).toArray();
        log(`Sample Siblings query (IDCapTren="${sampleNode.IDCapTren}", Depth=${sampleNode.Depth}):`);
        siblings.forEach(s => log(`  → _id="${s._id}" Ten="${s.Ten}"`));
    }
}

print("");
log("═══ TỔNG KẾT ════════════════════════════════════════════");
log(`Index tạo mới : ${idx_created}`);
log(`Index bỏ qua  : ${idx_skipped}`);
log(`DRY_RUN       : ${DRY_RUN}`);
log(`Thời gian xong: ${new Date().toISOString()}`);
log("═══ MIGRATION HOÀN THÀNH ════════════════════════════════");
