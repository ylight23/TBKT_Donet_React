const employeeCollection = db.getCollection("Employee");

const beforeUpper = employeeCollection.countDocuments({ IDNhomNguoiDungs: { $exists: true } });
const beforeCamel = employeeCollection.countDocuments({ IdNhomNguoiDungs: { $exists: true } });

const updateResult = employeeCollection.updateMany(
  {
    $or: [
      { IDNhomNguoiDungs: { $exists: true } },
      { IdNhomNguoiDungs: { $exists: true } },
    ],
  },
  {
    $unset: {
      IDNhomNguoiDungs: "",
      IdNhomNguoiDungs: "",
    },
  },
);

const afterUpper = employeeCollection.countDocuments({ IDNhomNguoiDungs: { $exists: true } });
const afterCamel = employeeCollection.countDocuments({ IdNhomNguoiDungs: { $exists: true } });

printjson({
  migration: "unset-employee-legacy-group-ids",
  beforeUpper,
  beforeCamel,
  modified: updateResult.modifiedCount,
  afterUpper,
  afterCamel,
});
