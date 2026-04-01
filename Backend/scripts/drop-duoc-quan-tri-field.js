/* eslint-disable no-undef */
// Remove legacy DuocQuanTri explicit field.
// Policy after migration:
// - Keep DuocTruyCap as module master gate.
// - Derive "admin" state from action grants, do not persist DuocQuanTri.

const dbName = db.getName();
print(`[drop-duoc-quan-tri-field] DB: ${dbName}`);

function countBefore() {
  return {
    phanHeUser: db.PhanQuyenPhanHeNguoiDung.countDocuments({ DuocQuanTri: { $exists: true } }),
    phanHeGroup: db.PhanQuyenPhanHeNhomNguoiDung.countDocuments({ DuocQuanTri: { $exists: true } }),
    userPermissionNested: db.UserPermission.countDocuments({ "PhanHe.DuocQuanTri": { $exists: true } }),
  };
}

const before = countBefore();
print("[before] " + JSON.stringify(before));

const resUser = db.PhanQuyenPhanHeNguoiDung.updateMany(
  { DuocQuanTri: { $exists: true } },
  { $unset: { DuocQuanTri: "" } }
);

const resGroup = db.PhanQuyenPhanHeNhomNguoiDung.updateMany(
  { DuocQuanTri: { $exists: true } },
  { $unset: { DuocQuanTri: "" } }
);

const resUserPermission = db.UserPermission.updateMany(
  { "PhanHe.DuocQuanTri": { $exists: true } },
  { $unset: { "PhanHe.$[].DuocQuanTri": "" } }
);

const after = countBefore();

print("[update] PhanQuyenPhanHeNguoiDung matched=" + resUser.matchedCount + ", modified=" + resUser.modifiedCount);
print("[update] PhanQuyenPhanHeNhomNguoiDung matched=" + resGroup.matchedCount + ", modified=" + resGroup.modifiedCount);
print("[update] UserPermission PhanHe[] matched=" + resUserPermission.matchedCount + ", modified=" + resUserPermission.modifiedCount);
print("[after] " + JSON.stringify(after));
