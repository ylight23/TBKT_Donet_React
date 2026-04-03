// ============================================================
// MongoDB Migration: Rename ID* fields to Id* (camelCase)
// Run: mongosh <connectionString>/<dbName> migrate_id_fields.js
// ============================================================

function renameField(col, oldField, newField) {
  const count = db[col].countDocuments({ [oldField]: { $exists: true } });
  if (count === 0) {
    print(`  [SKIP] ${col}.${oldField} – no documents found`);
    return;
  }
  const result = db[col].updateMany(
    { [oldField]: { $exists: true } },
    { $rename: { [oldField]: newField } }
  );
  print(`  [OK]   ${col}: ${oldField} → ${newField}  (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
}

print("\n=== Starting ID → Id field migration ===\n");

// ── NguoiDungNhomNguoiDung ──────────────────────────────────
print("Collection: NguoiDungNhomNguoiDung");
renameField("NguoiDungNhomNguoiDung", "IDNguoiDung",      "IdNguoiDung");
renameField("NguoiDungNhomNguoiDung", "IDNhomNguoiDung",  "IdNhomNguoiDung");
renameField("NguoiDungNhomNguoiDung", "IDNguoiUyQuyen",  "IdNguoiUyQuyen");
renameField("NguoiDungNhomNguoiDung", "IDDonViScope",  "IdDonViScope");

// ── PhanQuyenPhanHeNguoiDung ────────────────────────────────
print("\nCollection: PhanQuyenPhanHeNguoiDung");
renameField("PhanQuyenPhanHeNguoiDung", "IDNguoiDung",     "IdNguoiDung");
renameField("PhanQuyenPhanHeNguoiDung", "IDNhomNguoiDung", "IdNhomNguoiDung");
renameField("PhanQuyenPhanHeNguoiDung", "IDDonViScope",    "IdDonViScope");

// ── PhanQuyenPhanHeNhomNguoiDung ───────────────────────────
print("\nCollection: PhanQuyenPhanHeNhomNguoiDung");
renameField("PhanQuyenPhanHeNhomNguoiDung", "IDNhomNguoiDung", "IdNhomNguoiDung");
renameField("PhanQuyenPhanHeNhomNguoiDung", "IDDonViScope", "IdDonViScope");

// ── PhanQuyenNguoiDung ─────────────────────────────────────
print("\nCollection: PhanQuyenNguoiDung");
renameField("PhanQuyenNguoiDung", "IDNguoiDung",     "IdNguoiDung");
renameField("PhanQuyenNguoiDung", "IDNhomNguoiDung", "IdNhomNguoiDung");
renameField("PhanQuyenNguoiDung", "IDCapTren", "IdCapTren");

// ── PhanQuyenNhomNguoiDung ─────────────────────────────────
print("\nCollection: PhanQuyenNhomNguoiDung");
renameField("PhanQuyenNhomNguoiDung", "IDNhomNguoiDung", "IdNhomNguoiDung");
renameField("PhanQuyenNhomNguoiDung", "IDCapTren", "IdCapTren");

// ── PhanQuyenNguoiDungNganhDoc ─────────────────────────────
print("\nCollection: PhanQuyenNguoiDungNganhDoc");
renameField("PhanQuyenNguoiDungNganhDoc", "IDNguoiDung",     "IdNguoiDung");
renameField("PhanQuyenNguoiDungNganhDoc", "IDNhomNguoiDung", "IdNhomNguoiDung");
renameField("PhanQuyenNguoiDungNganhDoc", "IDNganhDoc",      "IdNganhDoc");

// ── PhanQuyenNhomNguoiDungNganhDoc ─────────────────────────
print("\nCollection: PhanQuyenNhomNguoiDungNganhDoc");
renameField("PhanQuyenNhomNguoiDungNganhDoc", "IDNhomNguoiDung", "IdNhomNguoiDung");
renameField("PhanQuyenNhomNguoiDungNganhDoc", "IDNganhDoc",      "IdNganhDoc");

// ── NhomNguoiDung ──────────────────────────────────────────
print("\nCollection: NhomNguoiDung");
renameField("NhomNguoiDung", "IDNguoiDung",     "IdNguoiDung");
renameField("NhomNguoiDung", "IDDonVi",     "IdDonVi");

// ── UserParams (ThamSoNguoiDung) ───────────────────────────
print("\nCollection: UserParams");
renameField("UserParams", "IDNguoiDung", "IdNguoiDung");

// ── Employee (nếu tồn tại field cũ với ID prefix) ──────────
print("\nCollection: Employee");
renameField("Employee", "IDDonVi",         "IdDonVi");
renameField("Employee", "IDQuanTriDonVi",  "IdQuanTriDonVi");
print("\nCollection: Office");
renameField("Office", "IDDonVi",         "IdDonVi");
renameField("Office", "IDQuanTriDonVi",  "IdQuanTriDonVi");
renameField("Office", "IDCapBac",        "IdCapBac");
renameField("Office", "IDCapTren",        "IdCapTren");

print("\nCollection: LichSuPhanQuyenScope");
renameField("LichSuPhanQuyenScope", "IDNguoiDuocPhanQuyen",         "IdNguoiDuocPhanQuyen");
renameField("LichSuPhanQuyenScope", "IDNhomNguoiDung",             "IdNhomNguoiDung");
renameField("LichSuPhanQuyenScope", "IDNguoiThucHien",  "IdNguoiThucHien");
renameField("LichSuPhanQuyenScope", "IDNguoiUyQuyenCu",        "IdNguoiUyQuyenCu");
renameField("LichSuPhanQuyenScope", "IDNguoiUyQuyenMoi",        "IdNguoiUyQuyenMoi");
renameField("LichSuPhanQuyenScope", "IDDonViScopeCu",        "IdDonViScopeCu");
renameField("LichSuPhanQuyenScope", "IDDonViScopeMoi",        "IdDonViScopeMoi");

print("\n=== Migration complete ===\n");
