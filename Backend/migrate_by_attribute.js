// ============================================================
// MongoDB Migration: Thêm ScopeAttribute và index cho ByAttribute
// Run: mongosh <connectionString>/<dbName> migrate_by_attribute.js
// ============================================================

print("\n=== Migration: BY_ATTRIBUTE ScopeType ===\n");

// ── 1. Thêm trường ScopeAttribute vào NguoiDungNhomNguoiDung ───────────────
print("1. Thêm trường ScopeAttribute vào NguoiDungNhomNguoiDung...");

var nhomNdCount = db.NguoiDungNhomNguoiDung.countDocuments({ ScopeAttribute: { $exists: false } });
if (nhomNdCount > 0) {
    var result = db.NguoiDungNhomNguoiDung.updateMany(
        { ScopeAttribute: { $exists: false } },
        { $set: { ScopeAttribute: null } }
    );
    print(`  [OK] NguoiDungNhomNguoiDung: đã thêm ScopeAttribute (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
} else {
    print(`  [SKIP] NguoiDungNhomNguoiDung: trường đã tồn tại hoặc không có document cần cập nhật`);
}

// ── 2. Thêm trường ScopeAttribute vào NhomNguoiDung (nếu cần) ─────────────
print("\n2. Thêm trường ScopeAttribute vào NhomNguoiDung...");

var nhomCount = db.NhomNguoiDung.countDocuments({ ScopeAttribute: { $exists: false } });
if (nhomCount > 0) {
    var result = db.NhomNguoiDung.updateMany(
        { ScopeAttribute: { $exists: false } },
        { $set: { ScopeAttribute: null } }
    );
    print(`  [OK] NhomNguoiDung: đã thêm ScopeAttribute (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
} else {
    print(`  [SKIP] NhomNguoiDung: trường đã tồn tại hoặc không có document cần cập nhật`);
}

// ── 3. Tạo index cho Office.Parameters để query nhanh ─────────────────────
print("\n3. Tạo index cho Office.Parameters...");

// Index trên Parameters.Name và Parameters.StringValue (compound index)
var indexName1 = "idx_Office_Parameters_Name_Value";

try {
    // Xóa index cũ nếu tồn tại
    db.Office.dropIndex(indexName1);
    print(`  [DROP] Index cũ ${indexName1} đã bị xóa`);
} catch (e) {
    print(`  [INFO] Index ${indexName1} chưa tồn tại, sẽ tạo mới`);
}

// Tạo compound index cho Parameters.Name + Parameters.StringValue
db.Office.createIndex(
    { "Parameters.Name": 1, "Parameters.StringValue": 1 },
    {
        name: indexName1,
        background: true,
        sparse: true  // Chỉ index documents có Parameters
    }
);
print(`  [OK] Đã tạo index ${indexName1}`);

// Index riêng cho Parameters.Name (dùng cho lọc theo tên parameter)
var indexName2 = "idx_Office_Parameters_Name";

try {
    db.Office.dropIndex(indexName2);
} catch (e) {
    // ignore
}

db.Office.createIndex(
    { "Parameters.Name": 1 },
    {
        name: indexName2,
        background: true,
        sparse: true
    }
);
print(`  [OK] Đã tạo index ${indexName2}`);

// ── 4. Kiểm tra dữ liệu mẫu ────────────────────────────────────────────────
print("\n4. Kiểm tra dữ liệu Parameters trong Office...");

var sampleParams = db.Office.findOne({ "Parameters": { $exists: true, $ne: [] } });
if (sampleParams && sampleParams.Parameters) {
    print(`  [INFO] Sample Parameters: ${JSON.stringify(sampleParams.Parameters.slice(0, 3))}`);
} else {
    print(`  [WARNING] Không tìm thấy Office nào có Parameters`);
}

// ── 5. Liệt kê các index hiện tại của Office ───────────────────────────────
print("\n5. Các index hiện tại của Office:");
var indexes = db.Office.getIndexes();
indexes.forEach(function(idx) {
    print(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
});

print("\n=== Migration complete ===\n");
