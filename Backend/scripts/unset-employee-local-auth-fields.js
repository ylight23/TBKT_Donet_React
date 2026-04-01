const collection = db.getCollection("Employee");

const before = {
  TenTaiKhoan: collection.countDocuments({ TenTaiKhoan: { $exists: true } }),
  tenTaiKhoan: collection.countDocuments({ tenTaiKhoan: { $exists: true } }),
  MatKhau: collection.countDocuments({ MatKhau: { $exists: true } }),
  matKhau: collection.countDocuments({ matKhau: { $exists: true } }),
  HashKey: collection.countDocuments({ HashKey: { $exists: true } }),
  hashKey: collection.countDocuments({ hashKey: { $exists: true } }),
  NgayThietLapMatKhau: collection.countDocuments({ NgayThietLapMatKhau: { $exists: true } }),
  ngayThietLapMatKhau: collection.countDocuments({ ngayThietLapMatKhau: { $exists: true } }),
  DangNhapCuoi: collection.countDocuments({ DangNhapCuoi: { $exists: true } }),
  dangNhapCuoi: collection.countDocuments({ dangNhapCuoi: { $exists: true } }),
  TruyCapCuoi: collection.countDocuments({ TruyCapCuoi: { $exists: true } }),
  truyCapCuoi: collection.countDocuments({ truyCapCuoi: { $exists: true } }),
  AccessLevel: collection.countDocuments({ AccessLevel: { $exists: true } }),
  accessLevel: collection.countDocuments({ accessLevel: { $exists: true } }),
};

const result = collection.updateMany(
  {
    $or: [
      { TenTaiKhoan: { $exists: true } },
      { tenTaiKhoan: { $exists: true } },
      { MatKhau: { $exists: true } },
      { matKhau: { $exists: true } },
      { HashKey: { $exists: true } },
      { hashKey: { $exists: true } },
      { NgayThietLapMatKhau: { $exists: true } },
      { ngayThietLapMatKhau: { $exists: true } },
      { DangNhapCuoi: { $exists: true } },
      { dangNhapCuoi: { $exists: true } },
      { TruyCapCuoi: { $exists: true } },
      { truyCapCuoi: { $exists: true } },
      { AccessLevel: { $exists: true } },
      { accessLevel: { $exists: true } },
    ],
  },
  {
    $unset: {
      TenTaiKhoan: "",
      tenTaiKhoan: "",
      MatKhau: "",
      matKhau: "",
      HashKey: "",
      hashKey: "",
      NgayThietLapMatKhau: "",
      ngayThietLapMatKhau: "",
      DangNhapCuoi: "",
      dangNhapCuoi: "",
      TruyCapCuoi: "",
      truyCapCuoi: "",
      AccessLevel: "",
      accessLevel: "",
    },
  }
);

const after = {
  TenTaiKhoan: collection.countDocuments({ TenTaiKhoan: { $exists: true } }),
  tenTaiKhoan: collection.countDocuments({ tenTaiKhoan: { $exists: true } }),
  MatKhau: collection.countDocuments({ MatKhau: { $exists: true } }),
  matKhau: collection.countDocuments({ matKhau: { $exists: true } }),
  HashKey: collection.countDocuments({ HashKey: { $exists: true } }),
  hashKey: collection.countDocuments({ hashKey: { $exists: true } }),
  NgayThietLapMatKhau: collection.countDocuments({ NgayThietLapMatKhau: { $exists: true } }),
  ngayThietLapMatKhau: collection.countDocuments({ ngayThietLapMatKhau: { $exists: true } }),
  DangNhapCuoi: collection.countDocuments({ DangNhapCuoi: { $exists: true } }),
  dangNhapCuoi: collection.countDocuments({ dangNhapCuoi: { $exists: true } }),
  TruyCapCuoi: collection.countDocuments({ TruyCapCuoi: { $exists: true } }),
  truyCapCuoi: collection.countDocuments({ truyCapCuoi: { $exists: true } }),
  AccessLevel: collection.countDocuments({ AccessLevel: { $exists: true } }),
  accessLevel: collection.countDocuments({ accessLevel: { $exists: true } }),
};

printjson({
  collection: "Employee",
  before,
  matched: result.matchedCount,
  modified: result.modifiedCount,
  after,
});
