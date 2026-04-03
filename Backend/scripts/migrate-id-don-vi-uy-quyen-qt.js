/*
Rename legacy unit-scope fields to IdDonViUyQuyenQT.

Usage:
  mongosh "mongodb://localhost:27017/quanly_dmcanbo" --quiet Backend/scripts/migrate-id-don-vi-uy-quyen-qt.js
*/

const targets = [
  "NguoiDungNhomNguoiDung",
  "NhomNguoiDung",
  "PhanQuyenPhanHeNguoiDung",
  "PhanQuyenPhanHeNhomNguoiDung",
];

const summary = {};

for (const name of targets) {
  const col = db.getCollection(name);
  // 1) Prefer old IdDonViUyQuyen -> new IdDonViUyQuyenQT if new is missing/empty.
  const fromUyQuyen = col.updateMany(
    {
      $and: [
        {
          $or: [
            { IdDonViUyQuyenQT: { $exists: false } },
            { IdDonViUyQuyenQT: null },
            { IdDonViUyQuyenQT: "" },
          ],
        },
        { IdDonViUyQuyen: { $type: "string", $nin: [""] } },
      ],
    },
    [
      { $set: { IdDonViUyQuyenQT: "$IdDonViUyQuyen" } },
      { $unset: "IdDonViUyQuyen" },
    ]
  );

  // 2) Then old IdDonViScope -> new IdDonViUyQuyenQT if new still missing/empty.
  const fromScope = col.updateMany(
    {
      $and: [
        {
          $or: [
            { IdDonViUyQuyenQT: { $exists: false } },
            { IdDonViUyQuyenQT: null },
            { IdDonViUyQuyenQT: "" },
          ],
        },
        { IdDonViScope: { $type: "string", $nin: [""] } },
      ],
    },
    [
      { $set: { IdDonViUyQuyenQT: "$IdDonViScope" } },
      { $unset: "IdDonViScope" },
    ]
  );

  // 3) Cleanup any remaining legacy keys (null/empty or duplicated).
  const cleanup = col.updateMany(
    { $or: [{ IdDonViUyQuyen: { $exists: true } }, { IdDonViScope: { $exists: true } }] },
    { $unset: { IdDonViUyQuyen: "", IdDonViScope: "" } }
  );

  summary[name] = {
    updatedFromIdDonViUyQuyen: fromUyQuyen.modifiedCount || 0,
    updatedFromIdDonViScope: fromScope.modifiedCount || 0,
    cleanupUnsetModified: cleanup.modifiedCount || 0,
    withNewField: col.countDocuments({ IdDonViUyQuyenQT: { $exists: true, $nin: [null, ""] } }),
  };
}

printjson({
  migration: "migrate-id-don-vi-uy-quyen-qt",
  summary,
});
