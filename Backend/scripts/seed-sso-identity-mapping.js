const collection = db.getCollection("SsoNguoiDungMap");
const now = new Date();

const seedItems = [
  { UserName: "admin", Role: "admin", Provider: "local", Issuer: "local", Subject: "admin" },
  { UserName: "superadmin", Role: "admin", Provider: "local", Issuer: "local", Subject: "superadmin" },
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
        Provider: item.Provider,
        Issuer: item.Issuer,
        Subject: item.Subject,
        Role: item.Role,
        Active: true,
        LastLoginAt: null,
        UpdatedAt: now,
      },
      $setOnInsert: {
        EmployeeId: null,
        CreatedAt: now,
      },
      $unset: {
        ExternalUserId: "", // remove legacy key
      },
    },
    { upsert: true }
  );

  result.upserted += updateResult.upsertedCount || 0;
  result.modified += updateResult.modifiedCount || 0;
});

printjson({
  collection: "SsoNguoiDungMap",
  ...result,
  total: collection.countDocuments(),
  items: collection.find({}, { _id: 0, UserName: 1, Provider: 1, Issuer: 1, Subject: 1, Role: 1, EmployeeId: 1, Active: 1 }).toArray(),
});
