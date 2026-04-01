print(`Using database: ${db.getName()}`);

const groups = db.NhomNguoiDung.find().toArray();
const systemGroup = groups.find((g) => g.VaiTroNoiBo === true) ?? groups.find((g) => g.Ten === "Quản trị hệ thống");

function isBlank(value) {
  return value === null || value === undefined || value === "";
}

function normalizeScopeType(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().toUpperCase();
}

const summary = {
  groupScopeBackfilled: 0,
  coreFunctionMigratedToGroup: 0,
  coreFunctionSkippedExisting: 0,
  nullAssignmentsDeleted: 0,
  nullUserFunctionDeleted: 0,
  nullUserSubsystemDeleted: 0,
};

// 1) Backfill group scope from existing group data instead of legacy null-user assignments.
const scopeBackfillFilter = {
  ScopeType: { $nin: [null, "", "ALL", "SELF", "MULTI_NODE", "MULTINODE"] },
  $or: [{ IdDonViUyQuyenQT: null }, { IdDonViUyQuyenQT: "" }, { IdDonViUyQuyenQT: { $exists: false } }],
  IdDonVi: { $nin: [null, ""] },
};
const scopeBackfillResult = db.NhomNguoiDung.updateMany(
  scopeBackfillFilter,
  [{ $set: { IdDonViUyQuyenQT: "$IdDonVi" } }],
);
summary.groupScopeBackfilled = scopeBackfillResult.modifiedCount;

// 2) Migrate meaningful core function permissions from invalid user-level docs to system group.
if (systemGroup) {
  const coreNullUserDocs = db.PhanQuyenNguoiDung.find({ IdNguoiDung: null, MaPhanHe: "core" }).toArray();
  for (const doc of coreNullUserDocs) {
    const filter = {
      IdNhomNguoiDung: systemGroup._id,
      MaChucNang: doc.MaChucNang,
    };
    const exists = db.PhanQuyenNhomNguoiDung.findOne(filter);
    if (exists) {
      summary.coreFunctionSkippedExisting += 1;
      continue;
    }

    db.PhanQuyenNhomNguoiDung.insertOne({
      _id: new ObjectId().valueOf(),
      IdNhomNguoiDung: systemGroup._id,
      MaChucNang: doc.MaChucNang,
      TieuDeChucNang: doc.TieuDeChucNang ?? "",
      MaPhanHe: doc.MaPhanHe ?? "core",
      TieuDeNhomQuyen: doc.TieuDeNhom ?? "Hệ thống",
      Actions: doc.Actions ?? { view: true },
      NguoiTao: doc.NguoiTao ?? "migration",
      NguoiSua: doc.NguoiSua ?? null,
      NgayTao: doc.NgayTao ?? new Date(),
      NgaySua: doc.NgaySua ?? null,
    });
    summary.coreFunctionMigratedToGroup += 1;
  }
}

// 3) Remove invalid null-user docs from collections where ownership must be explicit.
summary.nullAssignmentsDeleted = db.NguoiDungNhomNguoiDung.deleteMany({
  $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }],
}).deletedCount;

summary.nullUserFunctionDeleted = db.PhanQuyenNguoiDung.deleteMany({
  $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }],
}).deletedCount;

summary.nullUserSubsystemDeleted = db.PhanQuyenPhanHeNguoiDung.deleteMany({
  $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }],
}).deletedCount;

print("Summary:");
printjson(summary);

print("Remaining invalid docs:");
printjson({
  NguoiDungNhomNguoiDung: db.NguoiDungNhomNguoiDung.countDocuments({ $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }] }),
  PhanQuyenNguoiDung: db.PhanQuyenNguoiDung.countDocuments({ $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }] }),
  PhanQuyenPhanHeNguoiDung: db.PhanQuyenPhanHeNguoiDung.countDocuments({ $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }] }),
});
