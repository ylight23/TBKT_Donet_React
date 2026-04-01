printjson({
  pqGroupHasIdCapTren: db.getCollection("PhanQuyenNhomNguoiDung").countDocuments({ IdCapTren: { $exists: true } }),
  pqUserHasIdCapTren: db.getCollection("PhanQuyenNguoiDung").countDocuments({ IdCapTren: { $exists: true } }),
});
