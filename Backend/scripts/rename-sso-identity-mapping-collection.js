const oldName = "TaiKhoanNguoiDungMap";
const newName = "SsoNguoiDungMap";

const existingCollections = db.getCollectionNames();
const hasOld = existingCollections.includes(oldName);
const hasNew = existingCollections.includes(newName);

if (hasOld && !hasNew) {
  db.getCollection(oldName).renameCollection(newName);
} else if (hasOld && hasNew) {
  db.getCollection(oldName).find().forEach((doc) => {
    const updateDoc = {
      $set: {
        UserName: doc.UserName ?? null,
        Provider: doc.Provider ?? "sso",
        Issuer: doc.Issuer ?? "sso",
        Subject: doc.Subject ?? doc.ExternalUserId ?? doc.UserName ?? null,
        EmployeeId: doc.EmployeeId ?? null,
        Role: doc.Role ?? "user",
        Active: doc.Active !== false,
        LastLoginAt: doc.LastLoginAt ?? null,
        UpdatedAt: doc.UpdatedAt ?? new Date(),
      },
      $setOnInsert: {
        CreatedAt: doc.CreatedAt ?? new Date(),
      },
    };

    if (doc.ExternalUserId != null) {
      updateDoc.$set.ExternalUserId = doc.ExternalUserId;
    } else {
      updateDoc.$unset = { ExternalUserId: "" };
    }

    db.getCollection(newName).updateOne(
      { UserName: doc.UserName },
      updateDoc,
      { upsert: true }
    );
  });
  db.getCollection(oldName).drop();
}

printjson({
  oldName,
  newName,
  collections: db.getCollectionNames().filter((name) => name === oldName || name === newName),
  total: db.getCollection(newName).countDocuments(),
  items: db.getCollection(newName).find({}, { _id: 0, UserName: 1, Provider: 1, Issuer: 1, Subject: 1, EmployeeId: 1, Role: 1, Active: 1 }).toArray(),
});
