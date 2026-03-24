const names = [
  'NhomNguoiDung',
  'NguoiDungNhomNguoiDung',
  'PhanQuyenPhanHeNguoiDung',
  'PhanQuyenPhanHeNhomNguoiDung',
  'PhanQuyenNguoiDung',
  'PhanQuyenNhomNguoiDung',
  'PhanQuyenNguoiDungNganhDoc',
  'PhanQuyenNhomNguoiDungNganhDoc',
  'LichSuPhanQuyenScope'
];
for (const name of names) {
  print('COL=' + name);
  printjson(db.getCollection(name).findOne({}));
}
