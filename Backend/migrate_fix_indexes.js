// ============================================================
// Migration: Fix index field name casing + add missing indexes
//
// Problem: Existing indexes use IDNguoiDung (uppercase ID) but
// actual document fields are IdNguoiDung (PascalCase).
// MongoDB field names are case-sensitive → old indexes are unused.
//
// This script drops mismatched indexes and creates correct ones.
//
// Run:
//   mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_fix_indexes.js
// ============================================================

print("=== migrate_fix_indexes.js ===\n");

const INDEXES = [
    // ── NguoiDungNhomNguoiDung ──
    { col: "NguoiDungNhomNguoiDung", drop: "idx_NDNND_IDNguoiDung",
      spec: { IdNguoiDung: 1 },
      opts: { name: "idx_NDNND_IdNguoiDung", background: true } },
    { col: "NguoiDungNhomNguoiDung", drop: "idx_NDNND_IDNhomNguoiDung",
      spec: { IdNhomNguoiDung: 1 },
      opts: { name: "idx_NDNND_IdNhomNguoiDung", background: true } },
    { col: "NguoiDungNhomNguoiDung", drop: "idx_NDNND_IDDonViScope",
      spec: { IdDonViScope: 1 },
      opts: { name: "idx_NDNND_IdDonViScope", background: true, sparse: true } },
    // Compound: AssignUserToGroup duplicate check (IdNguoiDung + IdNhomNguoiDung)
    { col: "NguoiDungNhomNguoiDung", drop: null,
      spec: { IdNguoiDung: 1, IdNhomNguoiDung: 1 },
      opts: { name: "idx_NDNND_user_nhom", background: true } },

    // ── PhanQuyenPhanHeNguoiDung ──
    { col: "PhanQuyenPhanHeNguoiDung", drop: "idx_PPHNgD_user_phanhe",
      spec: { IdNguoiDung: 1 },
      opts: { name: "idx_PPHNgD_IdNguoiDung", background: true } },
    { col: "PhanQuyenPhanHeNguoiDung", drop: "idx_PPHNgD_IDDonViScope",
      spec: { IdDonViScope: 1 },
      opts: { name: "idx_PPHNgD_IdDonViScope", background: true, sparse: true } },

    // ── PhanQuyenPhanHeNhomNguoiDung ──
    { col: "PhanQuyenPhanHeNhomNguoiDung", drop: "idx_PPHNhom_nhom_phanhe",
      spec: { IdNhomNguoiDung: 1 },
      opts: { name: "idx_PPHNhom_IdNhomNguoiDung", background: true } },
    { col: "PhanQuyenPhanHeNhomNguoiDung", drop: "idx_PPHNhom_IDDonViScope",
      spec: { IdDonViScope: 1 },
      opts: { name: "idx_PPHNhom_IdDonViScope", background: true, sparse: true } },

    // ── PhanQuyenNguoiDung ──
    { col: "PhanQuyenNguoiDung", drop: "idx_PQNgD_user_phanhe",
      spec: { IdNguoiDung: 1 },
      opts: { name: "idx_PQNgD_IdNguoiDung", background: true } },
    { col: "PhanQuyenNguoiDung", drop: "idx_PQNgD_user_chucnang",
      spec: { IdNguoiDung: 1, MaChucNang: 1 },
      opts: { name: "idx_PQNgD_user_chucnang_v2", background: true } },

    // ── PhanQuyenNhomNguoiDung ──
    { col: "PhanQuyenNhomNguoiDung", drop: "idx_PQNhom_nhom_phanhe",
      spec: { IdNhomNguoiDung: 1 },
      opts: { name: "idx_PQNhom_IdNhomNguoiDung", background: true } },

    // ── PhanQuyenNguoiDungNganhDoc ──
    { col: "PhanQuyenNguoiDungNganhDoc", drop: "idx_PQNgNganh_user_phanhe",
      spec: { IdNguoiDung: 1 },
      opts: { name: "idx_PQNgNganh_IdNguoiDung", background: true } },

    // ── PhanQuyenNhomNguoiDungNganhDoc ──
    { col: "PhanQuyenNhomNguoiDungNganhDoc", drop: "idx_PQNhomNganh_nhom_phanhe",
      spec: { IdNhomNguoiDung: 1 },
      opts: { name: "idx_PQNhomNganh_IdNhomNguoiDung", background: true } },
];

let dropped = 0, created = 0, skipped = 0;

INDEXES.forEach(idx => {
    const col = db.getCollection(idx.col);

    // Drop old mismatched index
    if (idx.drop) {
        try {
            const exists = col.getIndexes().some(i => i.name === idx.drop);
            if (exists) {
                col.dropIndex(idx.drop);
                print(`  [DROP]   ${idx.col}.${idx.drop}`);
                dropped++;
            }
        } catch (e) {
            print(`  [WARN]   Drop ${idx.col}.${idx.drop}: ${e.message}`);
        }
    }

    // Create new index with correct field casing
    try {
        const exists = col.getIndexes().some(i => i.name === idx.opts.name);
        if (exists) {
            print(`  [SKIP]   ${idx.col}.${idx.opts.name} (already exists)`);
            skipped++;
        } else {
            col.createIndex(idx.spec, idx.opts);
            print(`  [CREATE] ${idx.col}.${idx.opts.name} → ${JSON.stringify(idx.spec)}`);
            created++;
        }
    } catch (e) {
        print(`  [ERROR]  ${idx.col}.${idx.opts.name}: ${e.message}`);
    }
});

print(`\nSummary: ${dropped} dropped, ${created} created, ${skipped} skipped`);
print("=== Hoàn thành migrate_fix_indexes.js ===");
