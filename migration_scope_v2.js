/**
 * ============================================================
 * MIGRATION v2.0 — Gộp IdNganhDoc vào NguoIdungNhomNguoIdung
 * ============================================================
 * Phiên bản : 2.0.0 (đã sửa)
 * Ngày       : 2026-03-18
 * Phụ thuộc : migration_scope_v1.js phải chạy TRƯỚC
 *
 * MỤC ĐÍCH:
 *   1. Tạo collection NhomChuyenNganh
 *   2. Thêm IdNganhDoc[] + IdNhomChuyenNganh (string) vào NguoIdungNhomNguoIdung
 *   3. Migrate dữ liệu từ PhanQuyenNguoIdungNganhDoc  → IdNganhDoc + ScopeType=MultiNode
 *   4. Migrate dữ liệu từ PhanQuyenNhomNguoIdungNganhDoc → IdNganhDoc + ScopeType=MultiNode
 *   5. Tạo indexes mới
 *
 * LƯU Ý QUAN TRỌNG:
 *   - IdNhomChuyenNganh là STRING (không phải array) — FK → NhomChuyenNganh._Id
 *   - IdNganhDoc là ARRAY — chỉ dùng khi ScopeType = "MultiNode"
 *   - Khi migrate IdNganhDoc → PHẢI set ScopeType = "MultiNode" cho record đó
 *
 * Rollback: migration_scope_v2_rollback.js
 * ============================================================
 */

// ─── ÁNH XẠ TÊN COLLECTION ───────────────────────────────────
const COLS = {
    Office                          : "Office",
    Employee                        : "Employee",
    NhomNguoIdung                   : "NhomNguoIdung",
    NguoIdungNhomNguoIdung          : "NguoIdungNhomNguoIdung",
    NhomChuyenNganh                 : "NhomChuyenNganh",          // TẠO MỚI
    PhanQuyenNguoIdungNganhDoc      : "PhanQuyenNguoIdungNganhDoc",   // XOÁ SAU MIGRATE
    PhanQuyenNhomNguoIdungNganhDoc  : "PhanQuyenNhomNguoIdungNganhDoc", // XOÁ SAU MIGRATE
};

// ─── CẤU HÌNH ────────────────────────────────────────────────
const DRY_RUN    = true;    // ĐỔI false KHI SẴN SÀNG CHẠY THẬT
const LOG_PREFIX = "[MIGRATION v2.0]";

// ─── TIỆN ÍCH ─────────────────────────────────────────────────
function log(m)  { print(`${LOG_PREFIX} ${m}`); }
function ok(m)   { print(`${LOG_PREFIX} ✓ ${m}`); }
function warn(m) { print(`${LOG_PREFIX} ⚠ ${m}`); }
function err(m)  { print(`${LOG_PREFIX} ✗ ${m}`); }

// ─── BẮT ĐẦU ─────────────────────────────────────────────────
log("═══ BẮT ĐẦU MIGRATION v2.0 ════════════════════════════");
log(`Database : ${db.getName()}`);
log(`DRY_RUN  : ${DRY_RUN}`);
log(`Thời gian: ${new Date().toISOString()}`);
print("");

// ─── PREFLIGHT ────────────────────────────────────────────────
log("═══ PREFLIGHT ══════════════════════════════════════════");

const existingCols = db.getCollectionNames();
let preflight_ok = true;

// 1. Kiểm tra v1 đã chạy chưa (ScopeType phải tồn tại trên NguoIdungNhomNguoIdung)
if (!existingCols.includes(COLS.NguoIdungNhomNguoIdung)) {
    err("NguoIdungNhomNguoIdung không tồn tại — chạy migration_scope_v1.js trước");
    preflight_ok = false;
} else {
    const sampleV1 = db[COLS.NguoIdungNhomNguoIdung].findOne({ ScopeType: { $exists: true } });
    if (!sampleV1) {
        err("ScopeType chưa tồn tại trên NguoIdungNhomNguoIdung — chạy migration_scope_v1.js trước");
        preflight_ok = false;
    } else {
        ok("Preflight | migration v1 đã chạy (ScopeType tồn tại)");
    }
}

// 2. Kiểm tra 2 collection nguồn tồn tại
[COLS.PhanQuyenNguoIdungNganhDoc, COLS.PhanQuyenNhomNguoIdungNganhDoc].forEach(name => {
    if (existingCols.includes(name)) {
        const cnt = db[name].countDocuments();
        ok(`Preflight | '${name}' tồn tại · ${cnt} bản ghi cần migrate`);
    } else {
        warn(`Preflight | '${name}' không tồn tại · bỏ qua bước migrate tương ứng`);
    }
});

// 3. Kiểm tra IdNganhDoc / IdNhomChuyenNganh chưa tồn tại (tránh chạy lại 2 lần)
const sampleNDNND = db[COLS.NguoIdungNhomNguoIdung].findOne();
if (sampleNDNND?.IdNganhDoc !== undefined) {
    warn("Preflight | IdNganhDoc đã tồn tại — migration có thể đã chạy trước đó");
    warn("Preflight | Dùng OVERWRITE = true nếu muốn chạy lại (cẩn thận)");
}

if (!preflight_ok) {
    err("Preflight FAILED — dừng migration");
    throw new Error("Preflight FAILED — xem lỗi ở trên");
}

print("");

// ─── BƯỚC 1: Tạo NhomChuyenNganh collection ──────────────────
log("═══ BƯỚC 1: Tạo collection NhomChuyenNganh ════════════");

/**
 * NhomChuyenNganh: gom các chuyên ngành được phép nhìn thấy dữ liệu của nhau.
 * 40 chuyên ngành → ~8 nhóm → thay thế ma trận 40×40.
 *
 * Schema:
 *   _Id         : string (slug, vd "nhom_tc_dien_tu")
 *   Ten         : string
 *   MoTa        : string?
 *   DanhSachCN  : []string (danh sách IdChuyenNganh trong nhóm)
 *   KichHoat    : bool
 *   NguoiTao, NgayTao : audit
 *
 * Ghi chú: Admin tạo nhóm thủ công qua UI sau migration.
 * Bước này chỉ tạo collection với valIdator — không seed dữ liệu.
 */
if (!existingCols.includes(COLS.NhomChuyenNganh)) {
    if (DRY_RUN) {
        log(`DRY_RUN | Sẽ tạo collection '${COLS.NhomChuyenNganh}'`);
    } else {
        db.createCollection(COLS.NhomChuyenNganh, {
            valIdator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["Ten", "DanhSachCN", "KichHoat"],
                    properties: {
                        Ten        : { bsonType: "string" },
                        MoTa       : { bsonType: ["string", "null"] },
                        DanhSachCN : { bsonType: "array",
                                       description: "Danh sách IdChuyenNganh trong nhóm" },
                        KichHoat   : { bsonType: "bool" },
                        NguoiTao   : { bsonType: ["string", "null"] },
                        NguoiSua   : { bsonType: ["string", "null"] },
                        NgayTao    : { bsonType: ["date", "null"] },
                        NgaySua    : { bsonType: ["date", "null"] },
                    }
                }
            },
            valIdationAction: "warn",
        });
        ok(`NhomChuyenNganh | Collection đã tạo`);
    }
} else {
    warn(`NhomChuyenNganh | Đã tồn tại — bỏ qua`);
}

print("");

// ─── BƯỚC 2: Thêm IdNganhDoc + IdNhomChuyenNganh vào NguoIdungNhomNguoIdung ──
log("═══ BƯỚC 2: Thêm IdNganhDoc[] + IdNhomChuyenNganh vào NguoIdungNhomNguoIdung ══");

/**
 * IdNganhDoc      : []→ Office._Id   — anchor list cho MultiNode
 *                   CHỈ có giá trị khi ScopeType = "MultiNode"
 *
 * IdNhomChuyenNganh: string?         — FK → NhomChuyenNganh._Id
 *                    KHÔNG phải array — 1 user/nhóm thuộc 1 nhóm CN
 *                    null = thấy tất cả chuyên ngành trong phạm vi cây
 */

// 2a. IdNganhDoc (array, mặc định rỗng)
{
    const filter = { IdNganhDoc: { $exists: false } };
    if (DRY_RUN) {
        const cnt = db[COLS.NguoIdungNhomNguoIdung].countDocuments(filter);
        log(`DRY_RUN | Thêm IdNganhDoc: [] vào ${cnt} doc`);
    } else {
        const r = db[COLS.NguoIdungNhomNguoIdung].updateMany(
            filter,
            { $set: { IdNganhDoc: [] } }   // mặc định array rỗng
        );
        ok(`IdNganhDoc | modified=${r.modifiedCount}`);
    }
}

// 2b. IdNhomChuyenNganh (string, mặc định null)
//     QUAN TRỌNG: là STRING, không phải array
{
    const filter = { IdNhomChuyenNganh: { $exists: false } };
    if (DRY_RUN) {
        const cnt = db[COLS.NguoIdungNhomNguoIdung].countDocuments(filter);
        log(`DRY_RUN | Thêm IdNhomChuyenNganh: null vào ${cnt} doc`);
    } else {
        const r = db[COLS.NguoIdungNhomNguoIdung].updateMany(
            filter,
            { $set: { IdNhomChuyenNganh: null } }  // null = thấy tất cả CN
        );
        ok(`IdNhomChuyenNganh | modified=${r.modifiedCount}`);
    }
}

print("");

// ─── BƯỚC 3: Migrate từ PhanQuyenNguoIdungNganhDoc ───────────
log("═══ BƯỚC 3: Migrate PhanQuyenNguoIdungNganhDoc → NguoIdungNhomNguoIdung ══");

/**
 * PhanQuyenNguoIdungNganhDoc: config ngành dọc cấp cá nhân
 * Schema cũ: { IdNguoIdung, IdNganhDoc[], MaPhanHe, ScopeTypeNganhDoc }
 *
 * Chuyển sang:
 *   NguoIdungNhomNguoIdung WHERE IdNguoIdung = x
 *     → IdNganhDoc = [list from old]
 *     → ScopeType  = "MultiNode"    ← PHẢI set, không thể để null
 *
 * Xử lý xung đột ScopeType:
 *   Nếu record đang có ScopeType khác null → cảnh báo, không overrIde
 *   Vì: record đó đã được gán scope có chủ đích → IdNganhDoc là thông tin bổ sung
 *   Trong trường hợp đó: chỉ cập nhật IdNganhDoc, giữ nguyên ScopeType
 */

let step3_count = 0;
let step3_conflict = 0;

if (existingCols.includes(COLS.PhanQuyenNguoIdungNganhDoc)) {
    const docs = db[COLS.PhanQuyenNguoIdungNganhDoc].find().toArray();
    log(`Đọc được ${docs.length} doc từ ${COLS.PhanQuyenNguoIdungNganhDoc}`);

    docs.forEach(doc => {
        const { IdNguoIdung, IdNganhDoc } = doc;

        if (!IdNguoIdung || !Array.isArray(IdNganhDoc) || IdNganhDoc.length === 0) {
            warn(`Bỏ qua doc thiếu IdNguoIdung hoặc IdNganhDoc rỗng: ${doc._Id}`);
            return;
        }

        // Tìm tất cả assignment của user này trong NguoIdungNhomNguoIdung
        const assignments = db[COLS.NguoIdungNhomNguoIdung]
            .find({ IdNguoIdung })
            .toArray();

        assignments.forEach(assign => {
            const hasConflict = assign.ScopeType && assign.ScopeType !== "MultiNode";

            if (hasConflict) {
                // ScopeType khác đang được dùng → chỉ lưu IdNganhDoc, KHÔNG đổi ScopeType
                warn(`CONFLICT | assign._Id=${assign._Id} | ScopeType=${assign.ScopeType} đang dùng → chỉ update IdNganhDoc, không đổi ScopeType`);
                step3_conflict++;

                if (!DRY_RUN) {
                    db[COLS.NguoIdungNhomNguoIdung].updateOne(
                        { _Id: assign._Id },
                        { $addToSet: { IdNganhDoc: { $each: IdNganhDoc } } }
                        // KHÔNG $set ScopeType vì đang dùng scope khác có chủ đích
                    );
                }
            } else {
                // ScopeType = null hoặc đã là MultiNode → set đầy đủ
                if (DRY_RUN) {
                    log(`DRY_RUN | assign._Id=${assign._Id} | user=${IdNguoIdung} | ScopeType→MultiNode | IdNganhDoc=[${IdNganhDoc.join(",")}]`);
                } else {
                    db[COLS.NguoIdungNhomNguoIdung].updateOne(
                        { _Id: assign._Id },
                        {
                            $set:       { ScopeType: "MultiNode" },       // ghi đè thành MultiNode
                            $addToSet:  { IdNganhDoc: { $each: IdNganhDoc } },
                        }
                    );
                }
                step3_count++;
            }
        });
    });

    ok(`Bước 3 | Migrate ${step3_count} assignment → MultiNode | ${step3_conflict} conflict giữ nguyên ScopeType`);
} else {
    warn(`${COLS.PhanQuyenNguoIdungNganhDoc} không tồn tại — bỏ qua`);
}

print("");

// ─── BƯỚC 4: Migrate từ PhanQuyenNhomNguoIdungNganhDoc ───────
log("═══ BƯỚC 4: Migrate PhanQuyenNhomNguoIdungNganhDoc → NguoIdungNhomNguoIdung ══");

/**
 * PhanQuyenNhomNguoIdungNganhDoc: config ngành dọc cấp nhóm
 * Schema cũ: { IdNhomNguoIdung, IdNganhDoc[], MaPhanHe }
 *
 * Chuyển sang:
 *   NguoIdungNhomNguoIdung WHERE IdNhomNguoIdung = x
 *     → IdNganhDoc = [list from old]
 *     → ScopeType  = "MultiNode"
 *
 * Logic tương tự bước 3 — xử lý conflict nếu ScopeType đã có giá trị khác
 */

let step4_count = 0;
let step4_conflict = 0;

if (existingCols.includes(COLS.PhanQuyenNhomNguoIdungNganhDoc)) {
    const docs = db[COLS.PhanQuyenNhomNguoIdungNganhDoc].find().toArray();
    log(`Đọc được ${docs.length} doc từ ${COLS.PhanQuyenNhomNguoIdungNganhDoc}`);

    docs.forEach(doc => {
        const { IdNhomNguoIdung, IdNganhDoc } = doc;

        if (!IdNhomNguoIdung || !Array.isArray(IdNganhDoc) || IdNganhDoc.length === 0) {
            warn(`Bỏ qua doc thiếu IdNhomNguoIdung hoặc IdNganhDoc rỗng: ${doc._Id}`);
            return;
        }

        // Tìm tất cả assignment của nhóm này
        const assignments = db[COLS.NguoIdungNhomNguoIdung]
            .find({ IdNhomNguoIdung })
            .toArray();

        log(`Nhóm ${IdNhomNguoIdung}: ${assignments.length} assignment cần update`);

        assignments.forEach(assign => {
            const hasConflict = assign.ScopeType && assign.ScopeType !== "MultiNode";

            if (hasConflict) {
                warn(`CONFLICT | assign._Id=${assign._Id} | ScopeType=${assign.ScopeType} → chỉ update IdNganhDoc`);
                step4_conflict++;

                if (!DRY_RUN) {
                    db[COLS.NguoIdungNhomNguoIdung].updateOne(
                        { _Id: assign._Id },
                        { $addToSet: { IdNganhDoc: { $each: IdNganhDoc } } }
                    );
                }
            } else {
                if (DRY_RUN) {
                    log(`DRY_RUN | assign._Id=${assign._Id} | nhom=${IdNhomNguoIdung} | ScopeType→MultiNode | IdNganhDoc=[${IdNganhDoc.join(",")}]`);
                } else {
                    db[COLS.NguoIdungNhomNguoIdung].updateOne(
                        { _Id: assign._Id },
                        {
                            $set:      { ScopeType: "MultiNode" },
                            $addToSet: { IdNganhDoc: { $each: IdNganhDoc } },
                        }
                    );
                }
                step4_count++;
            }
        });
    });

    ok(`Bước 4 | Migrate ${step4_count} assignment → MultiNode | ${step4_conflict} conflict giữ nguyên ScopeType`);
} else {
    warn(`${COLS.PhanQuyenNhomNguoIdungNganhDoc} không tồn tại — bỏ qua`);
}

print("");

// ─── BƯỚC 5: Tạo indexes mới ─────────────────────────────────
log("═══ BƯỚC 5: Tạo indexes ════════════════════════════════");

const NEW_INDEXES = [
    // NhomChuyenNganh
    {
        col  : COLS.NhomChuyenNganh,
        spec : { DanhSachCN: 1 },
        opts : { name: "Idx_NhomCN_DanhSachCN", background: true },
        desc : "multikey — tra nhóm theo IdChuyenNganh",
    },
    // NguoIdungNhomNguoIdung — IdNganhDoc
    {
        col  : COLS.NguoIdungNhomNguoIdung,
        spec : { IdNganhDoc: 1 },
        opts : { name: "Idx_NDNND_IdNganhDoc", background: true, sparse: true },
        desc : "multikey sparse — MultiNode anchor lookup",
    },
    // NguoIdungNhomNguoIdung — IdNhomChuyenNganh
    {
        col  : COLS.NguoIdungNhomNguoIdung,
        spec : { IdNhomChuyenNganh: 1 },
        opts : { name: "Idx_NDNND_IdNhomChuyenNganh", background: true, sparse: true },
        desc : "sparse — tra assignment theo nhóm chuyên ngành",
    },
];

let Idx_created = 0;
NEW_INDEXES.forEach(def => {
    try {
        const existing = db[def.col].getIndexes().some(i => i.name === def.opts.name);
        if (existing) {
            warn(`Index ${def.col}.${def.opts.name} đã tồn tại — bỏ qua`);
            return;
        }
        if (DRY_RUN) {
            log(`DRY_RUN | Index | ${def.col}.${def.opts.name} | ${def.desc}`);
        } else {
            db[def.col].createIndex(def.spec, def.opts);
            ok(`Index | ${def.col}.${def.opts.name} | ${def.desc}`);
        }
        Idx_created++;
    } catch(e) {
        err(`Index | ${def.col}.${def.opts.name} | LỖI: ${e.message}`);
    }
});

print("");

// ─── BƯỚC 6: Kiểm tra kết quả ────────────────────────────────
log("═══ BƯỚC 6: Kiểm tra kết quả ══════════════════════════");

if (!DRY_RUN) {
    const total     = db[COLS.NguoIdungNhomNguoIdung].countDocuments();
    const hasNganh  = db[COLS.NguoIdungNhomNguoIdung].countDocuments({ IdNganhDoc: { $not: { $size: 0 } } });
    const hasNhomCN = db[COLS.NguoIdungNhomNguoIdung].countDocuments({ IdNhomChuyenNganh: { $ne: null } });
    const isMulti   = db[COLS.NguoIdungNhomNguoIdung].countDocuments({ ScopeType: "MultiNode" });

    ok(`NguoIdungNhomNguoIdung total        : ${total}`);
    ok(`  có IdNganhDoc khác rỗng           : ${hasNganh}`);
    ok(`  có IdNhomChuyenNganh khác null    : ${hasNhomCN}`);
    ok(`  ScopeType = "MultiNode"           : ${isMulti}`);

    // Verify: mọi record ScopeType=MultiNode phải có IdNganhDoc khác rỗng
    const multiNoNganh = db[COLS.NguoIdungNhomNguoIdung].countDocuments({
        ScopeType: "MultiNode",
        $or: [{ IdNganhDoc: { $exists: false } }, { IdNganhDoc: { $size: 0 } }]
    });
    if (multiNoNganh > 0) {
        err(`VERIFY | ${multiNoNganh} record ScopeType=MultiNode nhưng IdNganhDoc rỗng!`);
    } else {
        ok(`VERIFY | Tất cả MultiNode đều có IdNganhDoc ✓`);
    }

    // Verify: IdNhomChuyenNganh phải là string (không phải array)
    const wrongType = db[COLS.NguoIdungNhomNguoIdung].countDocuments({
        IdNhomChuyenNganh: { $type: "array" }
    });
    if (wrongType > 0) {
        err(`VERIFY | ${wrongType} record có IdNhomChuyenNganh là array thay vì string!`);
    } else {
        ok(`VERIFY | IdNhomChuyenNganh đúng kiểu string ✓`);
    }

    // Sample
    const sample = db[COLS.NguoIdungNhomNguoIdung].findOne({ ScopeType: "MultiNode" });
    if (sample) {
        log("Sample MultiNode record sau migrate:");
        log(`  _Id                 : ${sample._Id}`);
        log(`  IdNguoIdung         : ${sample.IdNguoIdung}`);
        log(`  IdNhomNguoIdung     : ${sample.IdNhomNguoIdung}`);
        log(`  ScopeType           : ${sample.ScopeType}`);
        log(`  IdNganhDoc          : [${sample.IdNganhDoc?.join(", ")}]`);
        log(`  IdNhomChuyenNganh   : ${sample.IdNhomChuyenNganh}`);
    }
}

print("");

// ─── TỔNG KẾT ────────────────────────────────────────────────
log("═══ TỔNG KẾT ═══════════════════════════════════════════");
log(`Bước 1 | Tạo NhomChuyenNganh collection`);
log(`Bước 2 | Thêm IdNganhDoc[] + IdNhomChuyenNganh (string)`);
log(`Bước 3 | Migrate từ PhanQuyenNguoIdungNganhDoc  : ${step3_count} MultiNode · ${step3_conflict} conflict`);
log(`Bước 4 | Migrate từ PhanQuyenNhomNguoIdungNganhDoc: ${step4_count} MultiNode · ${step4_conflict} conflict`);
log(`Bước 5 | Tạo indexes : ${Idx_created}`);
log(`DRY_RUN       : ${DRY_RUN}`);
log(`Thời gian xong: ${new Date().toISOString()}`);
log("");
log("Bước tiếp theo sau khi verify:");
log("  1. Kiểm tra dữ liệu migrate đúng trong Compass");
log("  2. Cập nhật NhomChuyenNganh qua UI admin");
log("  3. Gán IdNhomChuyenNganh cho từng assignment qua UI");
if (!DRY_RUN) {
    log("  4. Sau khi xác nhận OK, xoá 2 collection cũ:");
    log(`     db.${COLS.PhanQuyenNguoIdungNganhDoc}.drop()`);
    log(`     db.${COLS.PhanQuyenNhomNguoIdungNganhDoc}.drop()`);
}
log("═══ MIGRATION v2.0 HOÀN THÀNH ═════════════════════════");