/**
 * ============================================================
 * SEED: Dữ liệu mẫu cho các collection phân quyền mới
 * ============================================================
 * Phiên bản : 1.0.0
 * Ngày       : 2026-03-16
 *
 * QUAN TRỌNG: Chạy SAU migration_scope_v1.js
 *   Bước 1: DRY_RUN = true → kiểm tra
 *   Bước 2: DRY_RUN = false → ghi thật
 *
 * Dữ liệu được seed dựa trên Employee + Office thực tế
 * trong database quanly_dmcanbo (19 user, 997 đơn vị).
 * ============================================================
 */

// ─── CẤU HÌNH ────────────────────────────────────────────────
const DRY_RUN   = false;   // ĐỔI false KHI SẴN SÀNG GHI THẬT
const OVERWRITE = false;  // true = xóa hết seed cũ rồi insert lại

const COLS = {
    Office                        : "Office",
    NguoiDung                     : "Employee",
    NhomNguoiDung                 : "NhomNguoiDung",
    NguoiDungNhomNguoiDung        : "NguoiDungNhomNguoiDung",
    PhanQuyenPhanHeNguoiDung      : "PhanQuyenPhanHeNguoiDung",
    PhanQuyenPhanHeNhomNguoiDung  : "PhanQuyenPhanHeNhomNguoiDung",
    PhanQuyenNguoiDung            : "PhanQuyenNguoiDung",
    PhanQuyenNhomNguoiDung        : "PhanQuyenNhomNguoiDung",
    PhanQuyenNguoiDungNganhDoc    : "PhanQuyenNguoiDungNganhDoc",
    PhanQuyenNhomNguoiDungNganhDoc: "PhanQuyenNhomNguoiDungNganhDoc",
    LichSuPhanQuyenScope          : "LichSuPhanQuyenScope",
};

// ─── TIỆN ÍCH ────────────────────────────────────────────────
const LOG = "[SEED v1.0]";
function ok(m)   { print(`${LOG} ✓ ${m}`); }
function log(m)  { print(`${LOG} ${m}`); }
function warn(m) { print(`${LOG} ⚠ ${m}`); }
function err(m)  { print(`${LOG} ✗ ${m}`); }

function insertMany(colName, docs, desc) {
    if (!docs.length) { warn(`${colName} | ${desc} | không có doc nào`); return 0; }
    if (DRY_RUN) {
        log(`DRY_RUN | ${colName} | ${desc} | sẽ insert ${docs.length} doc`);
        return docs.length;
    }
    try {
        const r = db[colName].insertMany(docs, { ordered: false });
        ok(`${colName} | ${desc} | inserted=${r.insertedCount}`);
        return r.insertedCount;
    } catch(e) {
        if (e.code === 11000) {
            warn(`${colName} | ${desc} | một số doc đã tồn tại (duplicate) — bỏ qua`);
        } else {
            err(`${colName} | ${desc} | LỖI: ${e.message}`);
        }
        return 0;
    }
}

function now() { return new Date(); }

// ─── ĐỌC DỮ LIỆU THỰC TỪ DB ─────────────────────────────────
log("═══ BẮT ĐẦU SEED ══════════════════════════════════════");
log(`Database : ${db.getName()}`);
log(`DRY_RUN  : ${DRY_RUN}`);
log(`OVERWRITE: ${OVERWRITE}`);
log(`Thời gian: ${now().toISOString()}`);
print("");

// Kiểm tra collection tồn tại
const existingCols = db.getCollectionNames();
const required = [COLS.NguoiDung, COLS.Office, COLS.NhomNguoiDung,
                  COLS.NguoiDungNhomNguoiDung, COLS.PhanQuyenPhanHeNguoiDung,
                  COLS.PhanQuyenPhanHeNhomNguoiDung, COLS.PhanQuyenNguoiDung,
                  COLS.PhanQuyenNhomNguoiDung];
let preflight_ok = true;
required.forEach(c => {
    if (existingCols.includes(c)) { ok(`Preflight | '${c}' tồn tại`); }
    else { err(`Preflight | '${c}' KHÔNG TỒN TẠI — chạy migration trước`); preflight_ok = false; }
});
if (!preflight_ok) throw new Error("Chạy migration_scope_v1.js trước");
print("");

// Đọc Employee thực tế
const allUsers = db[COLS.NguoiDung].find(
    { KichHoat: true },
    { _id:1, TenTaiKhoan:1, HoVaTen:1, IDDonVi:1, IDQuanTriDonVi:1 }
).toArray();
ok(`Đọc được ${allUsers.length} Employee đang hoạt động`);

// Map nhanh user theo tên tài khoản
const userMap = {};
allUsers.forEach(u => { userMap[u.TenTaiKhoan] = u; });

const ID_ADMIN   = userMap["admin"]   ?._id || "691c184c0e0721a8bc8dbfd5";
const ID_TCDT    = userMap["tcdt"]    ?._id || "692048b08831f8beddc42dac";
const ID_QK1     = userMap["qk1"]     ?._id || "6911c422043a73d9ff4417e7";
const ID_TT80    = userMap["tt80"]    ?._id || "68da3d2eb0076ef54f7670bb";
const ID_COQUAN1 = userMap["coquan1"] ?._id || "69003cf0806deeaf56937f27";
const ID_LD84    = userMap["ludoan84"]?._id || "69003d2b806deeaf5693803f";
const ID_LD87    = userMap["ludoan87"]?._id || "69003d51806deeaf56938152";
const ID_C1      = userMap["c1"]      ?._id || "68d21db750550dba2bb1a2e5";
const ID_T2      = userMap["T2"]      ?._id || "68da08dcb0076ef54f767047";

// Office anchors
const OFF_ROOT   = "000";
const OFF_QK1    = "000.011";
const OFF_BTTM   = "000.050";
const OFF_CUC    = "000.050.017";
const OFF_KHOI   = "000.050.017.008";
const OFF_LD84   = "000.050.017.009";
const OFF_LD87   = "000.050.017.010";
const OFF_LD96   = "000.050.017.011";
const OFF_LD98   = "000.050.017.012";
const OFF_TT95   = "000.050.017.013";
const OFF_P14    = "000.050.017.014";

log(`ID_ADMIN=${ID_ADMIN}`);
log(`ID_TCDT =${ID_TCDT}`);
print("");

// OVERWRITE: xóa seed cũ
if (OVERWRITE && !DRY_RUN) {
    [COLS.NhomNguoiDung, COLS.NguoiDungNhomNguoiDung,
     COLS.PhanQuyenPhanHeNguoiDung, COLS.PhanQuyenPhanHeNhomNguoiDung,
     COLS.PhanQuyenNguoiDung, COLS.PhanQuyenNhomNguoiDung,
     COLS.PhanQuyenNguoiDungNganhDoc, COLS.PhanQuyenNhomNguoiDungNganhDoc,
    ].forEach(c => {
        const cnt = db[c].countDocuments();
        db[c].deleteMany({});
        warn(`OVERWRITE | ${c} | đã xóa ${cnt} doc`);
    });
}

// ═══════════════════════════════════════════════════════════
// SEED 1: NhomNguoiDung — 4 nhóm vai trò
// ═══════════════════════════════════════════════════════════
log("═══ SEED 1: NhomNguoiDung ══════════════════════════════");

const NHOM_ADMIN_CORE   = "nhom_admin_core";
const NHOM_CHU_HOI      = "nhom_chu_hoi_tacchien";
const NHOM_CANBO_DON_VI = "nhom_canbo_donvi";
const NHOM_PORTAL       = "nhom_portal_admin";

const nhomDocs = [
    {
        _id          : NHOM_ADMIN_CORE,
        Ten          : "Quản trị hệ thống",
        TrongSo      : 1,
        MaPhanHe     : "core",
        IDDonVi      : OFF_ROOT,
        VaiTroNoiBo  : true,
        NguoiTao     : ID_ADMIN,
        NguoiSua     : null,
        NgayTao      : now(),
        NgaySua      : null,
    },
    {
        _id          : NHOM_CHU_HOI,
        Ten          : "Quản lý công tác tác chiến",
        TrongSo      : 2,
        MaPhanHe     : "TCDT.TongHopTacChien",
        IDDonVi      : OFF_CUC,
        VaiTroNoiBo  : false,
        NguoiTao     : ID_ADMIN,
        NguoiSua     : null,
        NgayTao      : now(),
        NgaySua      : null,
    },
    {
        _id          : NHOM_CANBO_DON_VI,
        Ten          : "Cán bộ đơn vị",
        TrongSo      : 3,
        MaPhanHe     : "TCDT.TongHopTacChien",
        IDDonVi      : OFF_CUC,
        VaiTroNoiBo  : false,
        NguoiTao     : ID_ADMIN,
        NguoiSua     : null,
        NgayTao      : now(),
        NgaySua      : null,
    },
    {
        _id          : NHOM_PORTAL,
        Ten          : "Cổng thông tin",
        TrongSo      : 4,
        MaPhanHe     : "DiziApp.Portal",
        IDDonVi      : OFF_ROOT,
        VaiTroNoiBo  : false,
        NguoiTao     : ID_ADMIN,
        NguoiSua     : null,
        NgayTao      : now(),
        NgaySua      : null,
    },
];
insertMany(COLS.NhomNguoiDung, nhomDocs, "4 nhóm vai trò");

// ═══════════════════════════════════════════════════════════
// SEED 2: NguoiDungNhomNguoiDung — gán user + scope
// ═══════════════════════════════════════════════════════════
log("═══ SEED 2: NguoiDungNhomNguoiDung ════════════════════");

/**
 * Minh họa đầy đủ 7 ScopeType:
 *   admin    → All        (toàn hệ thống)
 *   tcdt     → Subtree    tại CUC (thấy cả cây con Cục TCĐT)
 *   qk1      → NodeOnly   tại QK1 (chỉ đúng QK1, không xuống con)
 *   tt80     → Siblings   tại P14 (thấy tất cả đơn vị ngang cấp P14)
 *   coquan1  → Self       (chỉ data do chính mình tạo)
 *   ludoan84 → MultiNode  (LD84 + LD87 + LD96 — ngành dọc)
 *   ludoan87 → Delegated  (được tcdt ủy quyền tạm thời)
 *   c1       → Subtree    tại KHOI (cán bộ thuộc Khối Cơ quan)
 *   T2       → Subtree    tại KHOI
 */
const ndNhomDocs = [
    // ADMIN — All
    {
        _id: "assign_admin_core", IDNhomNguoiDung: NHOM_ADMIN_CORE,
        IDNguoiDung: ID_ADMIN, ScopeType: "All",
        IDDonViScope: null, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // TCDT — Subtree @ CUC
    {
        _id: "assign_tcdt_tacchien", IDNhomNguoiDung: NHOM_CHU_HOI,
        IDNguoiDung: ID_TCDT, ScopeType: "Subtree",
        IDDonViScope: OFF_CUC, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // QK1 — NodeOnly @ QK1
    {
        _id: "assign_qk1_tacchien", IDNhomNguoiDung: NHOM_CHU_HOI,
        IDNguoiDung: ID_QK1, ScopeType: "NodeOnly",
        IDDonViScope: OFF_QK1, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // TT80 — Siblings @ P14 (thấy tất cả đơn vị cùng cấp P14)
    {
        _id: "assign_tt80_tacchien", IDNhomNguoiDung: NHOM_CANBO_DON_VI,
        IDNguoiDung: ID_TT80, ScopeType: "Siblings",
        IDDonViScope: OFF_P14, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // COQUAN1 — Self (chỉ data của chính mình)
    {
        _id: "assign_coquan1_tacchien", IDNhomNguoiDung: NHOM_CANBO_DON_VI,
        IDNguoiDung: ID_COQUAN1, ScopeType: "Self",
        IDDonViScope: OFF_KHOI, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // LUDOAN84 — MultiNode (LD84 + LD87 + LD96 qua NganhDoc)
    {
        _id: "assign_ld84_tacchien", IDNhomNguoiDung: NHOM_CANBO_DON_VI,
        IDNguoiDung: ID_LD84, ScopeType: "MultiNode",
        IDDonViScope: OFF_LD84, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // LUDOAN87 — Delegated từ tcdt, hết hạn 31/12/2025
    {
        _id: "assign_ld87_tacchien_delegated", IDNhomNguoiDung: NHOM_CANBO_DON_VI,
        IDNguoiDung: ID_LD87, ScopeType: "Delegated",
        IDDonViScope: OFF_CUC, NgayHetHan: new Date("2025-12-31"),
        IDNguoiUyQuyen: ID_TCDT,
    },
    // C1 — Subtree @ KHOI
    {
        _id: "assign_c1_tacchien", IDNhomNguoiDung: NHOM_CANBO_DON_VI,
        IDNguoiDung: ID_C1, ScopeType: "Subtree",
        IDDonViScope: OFF_KHOI, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // T2 — Subtree @ KHOI
    {
        _id: "assign_t2_tacchien", IDNhomNguoiDung: NHOM_CANBO_DON_VI,
        IDNguoiDung: ID_T2, ScopeType: "Subtree",
        IDDonViScope: OFF_KHOI, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
    // Portal admin
    {
        _id: "assign_tcdt_portal", IDNhomNguoiDung: NHOM_PORTAL,
        IDNguoiDung: ID_TCDT, ScopeType: "Subtree",
        IDDonViScope: OFF_CUC, NgayHetHan: null, IDNguoiUyQuyen: null,
    },
];
insertMany(COLS.NguoiDungNhomNguoiDung, ndNhomDocs, "10 gán user → nhóm + scope");

// ═══════════════════════════════════════════════════════════
// SEED 3: PhanQuyenPhanHeNguoiDung
// ═══════════════════════════════════════════════════════════
log("═══ SEED 3: PhanQuyenPhanHeNguoiDung ══════════════════");

const pphUserDocs = [
    // Admin: truy cập + quản trị toàn bộ
    { IDNguoiDung: ID_ADMIN, MaPhanHe: "core",                   TieuDePhanHe: "Hệ thống",        DuocTruyCap: true,  DuocQuanTri: true,  ScopeType: "All",     IDDonViScope: null,    NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNguoiDung: ID_ADMIN, MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: true,  ScopeType: "All",     IDDonViScope: null,    NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNguoiDung: ID_ADMIN, MaPhanHe: "DiziApp.Portal",         TieuDePhanHe: "Cổng thông tin",  DuocTruyCap: true,  DuocQuanTri: true,  ScopeType: "All",     IDDonViScope: null,    NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    // TCDT: quản trị tác chiến, scope Subtree @ CUC
    { IDNguoiDung: ID_TCDT,  MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: true,  ScopeType: "Subtree", IDDonViScope: OFF_CUC, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNguoiDung: ID_TCDT,  MaPhanHe: "DiziApp.Portal",         TieuDePhanHe: "Cổng thông tin",  DuocTruyCap: true,  DuocQuanTri: true,  ScopeType: "Subtree", IDDonViScope: OFF_CUC, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNguoiDung: ID_TCDT,  MaPhanHe: "core",                   TieuDePhanHe: "Hệ thống",        DuocTruyCap: false, DuocQuanTri: false, ScopeType: null,      IDDonViScope: null,    NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    // QK1: truy cập tác chiến, NodeOnly @ QK1
    { IDNguoiDung: ID_QK1,   MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: false, ScopeType: "NodeOnly",IDDonViScope: OFF_QK1, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNguoiDung: ID_QK1,   MaPhanHe: "core",                   TieuDePhanHe: "Hệ thống",        DuocTruyCap: false, DuocQuanTri: false, ScopeType: null,      IDDonViScope: null,    NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    // Lữ đoàn 84: cán bộ, Subtree @ LD84
    { IDNguoiDung: ID_LD84,  MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: false, ScopeType: "Subtree", IDDonViScope: OFF_LD84,NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    // Lữ đoàn 87: Delegated từ tcdt
    { IDNguoiDung: ID_LD87,  MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: false, ScopeType: "Delegated",IDDonViScope: OFF_CUC,NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    // C1, T2: cán bộ khối cơ quan
    { IDNguoiDung: ID_C1,    MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: false, ScopeType: "Subtree", IDDonViScope: OFF_KHOI,NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNguoiDung: ID_T2,    MaPhanHe: "TCDT.TongHopTacChien",   TieuDePhanHe: "Tổng hợp TC",     DuocTruyCap: true,  DuocQuanTri: false, ScopeType: "Subtree", IDDonViScope: OFF_KHOI,NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
];
insertMany(COLS.PhanQuyenPhanHeNguoiDung, pphUserDocs, "12 bản ghi phân hệ per user");

// ═══════════════════════════════════════════════════════════
// SEED 4: PhanQuyenPhanHeNhomNguoiDung
// ═══════════════════════════════════════════════════════════
log("═══ SEED 4: PhanQuyenPhanHeNhomNguoiDung ══════════════");

const pphNhomDocs = [
    { IDNhomNguoiDung: NHOM_ADMIN_CORE,   MaPhanHe: "core",                 TieuDePhanHe: "Hệ thống",       DuocTruyCap: true, DuocQuanTri: true,  ScopeType: "All",      IDDonViScope: null,     NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNhomNguoiDung: NHOM_CHU_HOI,      MaPhanHe: "TCDT.TongHopTacChien", TieuDePhanHe: "Tổng hợp TC",   DuocTruyCap: true, DuocQuanTri: true,  ScopeType: "Subtree",  IDDonViScope: OFF_CUC,  NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNhomNguoiDung: NHOM_CHU_HOI,      MaPhanHe: "DiziApp.Portal",       TieuDePhanHe: "Cổng thông tin",DuocTruyCap: true, DuocQuanTri: true,  ScopeType: "Subtree",  IDDonViScope: OFF_CUC,  NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNhomNguoiDung: NHOM_CANBO_DON_VI, MaPhanHe: "TCDT.TongHopTacChien", TieuDePhanHe: "Tổng hợp TC",   DuocTruyCap: true, DuocQuanTri: false, ScopeType: null,       IDDonViScope: null,     NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
    { IDNhomNguoiDung: NHOM_PORTAL,       MaPhanHe: "DiziApp.Portal",       TieuDePhanHe: "Cổng thông tin",DuocTruyCap: true, DuocQuanTri: true,  ScopeType: "Subtree",  IDDonViScope: OFF_ROOT, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null },
];
insertMany(COLS.PhanQuyenPhanHeNhomNguoiDung, pphNhomDocs, "5 bản ghi phân hệ per nhóm");

// ═══════════════════════════════════════════════════════════
// SEED 5: PhanQuyenNhomNguoiDung — quyền chức năng per nhóm
// ═══════════════════════════════════════════════════════════
log("═══ SEED 5: PhanQuyenNhomNguoiDung ════════════════════");

/**
 * Actions mặc định theo vai trò:
 *   Admin core    → tất cả true
 *   Chủ trì TC    → view/add/edit/approve = true; delete = false
 *   Cán bộ đơn vị → view/add/edit = true; delete/approve = false
 */
const ACT_FULL    = { view:true, add:true, edit:true, delete:true, approve:true, unapprove:true, download:true, print:true };
const ACT_MANAGER = { view:true, add:true, edit:true, delete:false, approve:true, unapprove:false, download:true, print:true };
const ACT_STAFF   = { view:true, add:true, edit:true, delete:false, approve:false, unapprove:false, download:true, print:false };
const ACT_VIEW    = { view:true, add:false, edit:false, delete:false, approve:false, unapprove:false, download:true, print:false };

// Nhóm admin core — toàn bộ chức năng core
const coreChucNangs = [
    "application","listoffice","nhomnguoidung","phanquyennguoidung",
    "phanquyennhomnguoidung","nguoidung","loginlog","useronline",
    "userlog","errorlog","backendlog","config","catalog","definecatalog",
    "backup","restore","filemanager","exportconfigfile","importconfigfile",
    "importjson","sharedata","sendmessage","sendcommand","acccesskey",
    "apisinfo","configgateway",
];

const pqNhomDocs = [];

coreChucNangs.forEach(cn => {
    pqNhomDocs.push({
        IDNhomNguoiDung: NHOM_ADMIN_CORE, IDCapTren: "", MaChucNang: cn,
        TieuDeChucNang: "", MaPhanHe: "core", TieuDeNhomQuyen: "Quản trị",
        Actions: ACT_FULL, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    });
});

// Nhóm Chủ trì Tác chiến — toàn bộ TCDT + Portal
const tacChienChucNangs = [
    "thtc","thtc/danhsachcanbo","thtc/danhmuclichtruc","thtc/tcdmkhitai",
    "thtc/tclichtructhang","thtc/tcgiaoban","thtc/tcbangiaotrucban",
    "thtc/tcbctinhhinh","thtc/tcnhatky","thtc/tckhitai","thtc/tcluyentap",
    "thtc/tchoatdonguav","thts/danhmucloaimuctieu","thts/danhmucmuctieu",
    "thts/bangiaotrucban","thts/giaobantrinhsat","thts/tonghopmuctieutrinhsat",
    "thts/tonghopmuctieutrinhsatdientu","thts/tonghopmuctieutrinhsatsieucaotan",
    "thts/tonghopmuctieutrenbien","thts/tonghopmuctieutrinhsatdaivotuyendien",
    "thts/nhatkytacchien","thts/nhatkysieucaotan","thts/nhatkytrenbien",
    "thts/nhatkydaivotuyendien","thts/rpttonghopmuctieu",
    "report/rptlichtruc","report/rptquanso","report/rptkhitai",
    "report/RptTongHopTinhHinh","report/RptUav",
];
tacChienChucNangs.forEach(cn => {
    pqNhomDocs.push({
        IDNhomNguoiDung: NHOM_CHU_HOI, IDCapTren: "", MaChucNang: cn,
        TieuDeChucNang: "", MaPhanHe: "TCDT.TongHopTacChien", TieuDeNhomQuyen: "Quản lý TC",
        Actions: ACT_MANAGER, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    });
});

// Nhóm Cán bộ đơn vị — xem + nhập
const canBoChucNangs = [
    "thtc","thtc/tclichtructhang","thtc/tcgiaoban","thtc/tcbangiaotrucban",
    "thtc/tcbctinhhinh","thtc/tcnhatky","thtc/tckhitai","thtc/tcluyentap",
    "thts/bangiaotrucban","thts/nhatkytacchien","report/rptlichtruc",
    "report/rptquanso","report/rptkhitai",
];
canBoChucNangs.forEach(cn => {
    pqNhomDocs.push({
        IDNhomNguoiDung: NHOM_CANBO_DON_VI, IDCapTren: "", MaChucNang: cn,
        TieuDeChucNang: "", MaPhanHe: "TCDT.TongHopTacChien", TieuDeNhomQuyen: "Cán bộ",
        Actions: ACT_STAFF, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    });
});

// Nhóm Portal
const portalChucNangs = [
    "Menu","MenuCategory","News","NewsCategory","Docman","DocmanCategory",
    "Media","MediaCategory","Weblink","WeblinkCategory","Poll","PollCategory",
    "RptTinhHinhHoatDong",
];
portalChucNangs.forEach(cn => {
    pqNhomDocs.push({
        IDNhomNguoiDung: NHOM_PORTAL, IDCapTren: "", MaChucNang: cn,
        TieuDeChucNang: "", MaPhanHe: "DiziApp.Portal", TieuDeNhomQuyen: "Quản lý Portal",
        Actions: ACT_MANAGER, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    });
});

insertMany(COLS.PhanQuyenNhomNguoiDung, pqNhomDocs, `${pqNhomDocs.length} quyền chức năng per nhóm`);

// ═══════════════════════════════════════════════════════════
// SEED 6: PhanQuyenNguoiDung — override quyền cho admin
// ═══════════════════════════════════════════════════════════
log("═══ SEED 6: PhanQuyenNguoiDung ════════════════════════");

// Admin: override toàn bộ core
const pqUserDocs = coreChucNangs.map(cn => ({
    IDNguoiDung: ID_ADMIN, IDCapTren: "", MaChucNang: cn,
    TieuDeChucNang: "", MaPhanHe: "core", TieuDeNhom: "Hệ thống",
    Actions: ACT_FULL, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
}));

// TCDT: toàn bộ TCDT + Portal
tacChienChucNangs.forEach(cn => {
    pqUserDocs.push({
        IDNguoiDung: ID_TCDT, IDCapTren: "", MaChucNang: cn,
        TieuDeChucNang: "", MaPhanHe: "TCDT.TongHopTacChien", TieuDeNhom: "Tổng hợp TC",
        Actions: ACT_FULL, NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    });
});

insertMany(COLS.PhanQuyenNguoiDung, pqUserDocs, `${pqUserDocs.length} quyền chức năng per user (admin + tcdt)`);

// ═══════════════════════════════════════════════════════════
// SEED 7: PhanQuyenNguoiDungNganhDoc — MultiNode ludoan84
// ═══════════════════════════════════════════════════════════
log("═══ SEED 7: PhanQuyenNguoiDungNganhDoc ════════════════");

// ludoan84 phụ trách ngành dọc: LD84 + LD87 + LD96 + LD98
const nganhDocUserDocs = [
    {
        IDNguoiDung: ID_LD84, MaPhanHe: "TCDT.TongHopTacChien",
        IDNganhDoc: [OFF_LD84, OFF_LD87, OFF_LD96, OFF_LD98],
        ScopeTypeNganhDoc: "MultiNode",
        NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    },
    // tcdt phụ trách toàn bộ cây cục + Quân khu 1
    {
        IDNguoiDung: ID_TCDT, MaPhanHe: "TCDT.TongHopTacChien",
        IDNganhDoc: [OFF_CUC, OFF_QK1],
        ScopeTypeNganhDoc: "MultiNode",
        NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    },
];
insertMany(COLS.PhanQuyenNguoiDungNganhDoc, nganhDocUserDocs, "2 bản ghi ngành dọc per user");

// ═══════════════════════════════════════════════════════════
// SEED 8: PhanQuyenNhomNguoiDungNganhDoc
// ═══════════════════════════════════════════════════════════
log("═══ SEED 8: PhanQuyenNhomNguoiDungNganhDoc ════════════");

const nganhDocNhomDocs = [
    {
        IDNhomNguoiDung: NHOM_CHU_HOI, MaPhanHe: "TCDT.TongHopTacChien",
        IDNganhDoc: [OFF_CUC, OFF_QK1],  // Nhóm Chủ trì thấy cả Cục + QK1
        ScopeTypeNganhDoc: "MultiNode",
        NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    },
    {
        IDNhomNguoiDung: NHOM_CANBO_DON_VI, MaPhanHe: "TCDT.TongHopTacChien",
        IDNganhDoc: [],   // mỗi thành viên dùng IDDonViScope riêng
        ScopeTypeNganhDoc: "MultiNode",
        NguoiTao: ID_ADMIN, NguoiSua: null, NgayTao: now(), NgaySua: null,
    },
];
insertMany(COLS.PhanQuyenNhomNguoiDungNganhDoc, nganhDocNhomDocs, "2 bản ghi ngành dọc per nhóm");

// ═══════════════════════════════════════════════════════════
// SEED 9: LichSuPhanQuyenScope — audit log mẫu
// ═══════════════════════════════════════════════════════════
log("═══ SEED 9: LichSuPhanQuyenScope ══════════════════════");

const lichSuDocs = [
    {
        IDNguoiDuocPhanQuyen : ID_TCDT,
        IDNhomNguoiDung      : null,
        IDNguoiThucHien      : ID_ADMIN,
        MaPhanHe             : "TCDT.TongHopTacChien",
        HanhDong             : "ADD",
        ScopeTypeCu          : null,
        IDDonViScopeCu       : null,
        ScopeTypeMoi         : "Subtree",
        IDDonViScopeMoi      : OFF_CUC,
        NgayHetHanCu         : null,
        NgayHetHanMoi        : null,
        IDNguoiUyQuyenCu     : null,
        IDNguoiUyQuyenMoi    : null,
        NgayThucHien         : now(),
        GhiChu               : "Khởi tạo phân quyền ban đầu cho Cục TCĐT",
    },
    {
        IDNguoiDuocPhanQuyen : ID_LD87,
        IDNhomNguoiDung      : null,
        IDNguoiThucHien      : ID_TCDT,
        MaPhanHe             : "TCDT.TongHopTacChien",
        HanhDong             : "ADD",
        ScopeTypeCu          : null,
        IDDonViScopeCu       : null,
        ScopeTypeMoi         : "Delegated",
        IDDonViScopeMoi      : OFF_CUC,
        NgayHetHanCu         : null,
        NgayHetHanMoi        : new Date("2025-12-31"),
        IDNguoiUyQuyenCu     : null,
        IDNguoiUyQuyenMoi    : ID_TCDT,
        NgayThucHien         : now(),
        GhiChu               : "Ủy quyền tạm thời cho Lữ đoàn 87 trong thời gian huấn luyện",
    },
];
insertMany(COLS.LichSuPhanQuyenScope, lichSuDocs, "2 audit log mẫu");

// ═══════════════════════════════════════════════════════════
// TỔNG KẾT
// ═══════════════════════════════════════════════════════════
print("");
log("═══ TỔNG KẾT ══════════════════════════════════════════");
if (!DRY_RUN) {
    const counts = [
        COLS.NhomNguoiDung, COLS.NguoiDungNhomNguoiDung,
        COLS.PhanQuyenPhanHeNguoiDung, COLS.PhanQuyenPhanHeNhomNguoiDung,
        COLS.PhanQuyenNguoiDung, COLS.PhanQuyenNhomNguoiDung,
        COLS.PhanQuyenNguoiDungNganhDoc, COLS.PhanQuyenNhomNguoiDungNganhDoc,
        COLS.LichSuPhanQuyenScope,
    ];
    counts.forEach(c => {
        ok(`${c}: ${db[c].countDocuments()} doc`);
    });
}
log(`DRY_RUN  : ${DRY_RUN}`);
log(`Thời gian: ${now().toISOString()}`);
log("═══ SEED HOÀN THÀNH ════════════════════════════════════");
