// ============================================================
// Migration: BY_ATTRIBUTE scope support
//
// 1. Thêm trường ScopeAttribute (null) vào tất cả bản ghi
//    NguoiDungNhomNguoiDung chưa có trường này.
// 2. Tạo composite index trên Office.Parameters để query
//    ByAttribute nhanh (filter theo Name + StringValue).
//
// Run:
//   mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_by_attribute_scope.js
// ============================================================

print("=== migrate_by_attribute_scope.js ===");

// ─── 1. Thêm ScopeAttribute: null vào bản ghi chưa có trường ───
const colND = db.getCollection("NguoiDungNhomNguoiDung");

const missingCount = colND.countDocuments({ ScopeAttribute: { $exists: false } });
print(`\n[NguoiDungNhomNguoiDung] ${missingCount} tài liệu chưa có trường ScopeAttribute`);

if (missingCount > 0) {
    const result = colND.updateMany(
        { ScopeAttribute: { $exists: false } },
        { $set: { ScopeAttribute: null } }
    );
    print(`  → Đã cập nhật ${result.modifiedCount} tài liệu`);
} else {
    print("  → Bỏ qua (tất cả đã có trường ScopeAttribute)");
}

// ─── 2. Index trên Office.Parameters ────────────────────────────
// Phục vụ query:
//   db.Office.find({ "Parameters.Name": "IDChuyenNganh", "Parameters.StringValue": "radar" })
// MongoDB sẽ dùng multikey index trên array Parameters.
print("\n[Office] Tạo index trên Parameters.Name + Parameters.StringValue ...");

try {
    const officeCol = db.getCollection("Office");

    officeCol.createIndex(
        {
            "Parameters.Name": 1,
            "Parameters.StringValue": 1
        },
        {
            name: "idx_Office_Parameters_Name_Value"
        }
    );

    print("  [OK] Index tạo thành công hoặc đã tồn tại");

} catch (e) {

    if (e.message.includes("already exists")) {
        print("  [SKIP] Index đã tồn tại (khác tên)");
    } else {
        print(`  [ERROR] ${e.message}`);
    }

}