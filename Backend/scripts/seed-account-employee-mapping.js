const collection = db.getCollection("TaiKhoanNguoiDungMap");
const now = new Date();

const seedItems = [
  { UserName: "admin", Role: "admin" },
  { UserName: "superadmin", Role: "admin" },
];

const result = {
  upserted: 0,
  modified: 0,
};

seedItems.forEach((item) => {
  const updateResult = collection.updateOne(
    { UserName: item.UserName },
    {
      $set: {
        UserName: item.UserName,
        Role: item.Role,
        Active: true,
        UpdatedAt: now,
      },
      $setOnInsert: {
        EmployeeId: null,
        ExternalUserId: null,
        CreatedAt: now,
      },
    },
    { upsert: true }
  );

  result.upserted += updateResult.upsertedCount || 0;
  result.modified += updateResult.modifiedCount || 0;
});

printjson({
  collection: "TaiKhoanNguoiDungMap",
  ...result,
  total: collection.countDocuments(),
  items: collection.find({}, { _id: 0, UserName: 1, Role: 1, EmployeeId: 1, ExternalUserId: 1, Active: 1 }).toArray(),
});
