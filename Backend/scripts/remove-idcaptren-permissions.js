const collections = ["PhanQuyenNhomNguoiDung", "PhanQuyenNguoiDung"];

const summary = {};

collections.forEach((name) => {
  const collection = db.getCollection(name);
  const before = collection.countDocuments({ IdCapTren: { $exists: true } });
  const result = collection.updateMany(
    { IdCapTren: { $exists: true } },
    { $unset: { IdCapTren: "" } }
  );
  const after = collection.countDocuments({ IdCapTren: { $exists: true } });

  summary[name] = {
    before,
    modified: result.modifiedCount || 0,
    after,
  };
});

printjson({
  migration: "remove-idcaptren-permissions",
  summary,
});
