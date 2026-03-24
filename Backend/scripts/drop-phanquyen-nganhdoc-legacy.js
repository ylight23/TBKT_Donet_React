const legacyCollections = [
  "PhanQuyenNguoiDungNganhDoc",
  "PhanQuyenNhomNguoiDungNganhDoc",
];

print(`Using database: ${db.getName()}`);

const existingCollections = new Set(db.getCollectionNames());
for (const name of legacyCollections) {
  if (!existingCollections.has(name)) {
    print(`[SKIP] ${name} does not exist`);
    continue;
  }

  const count = db.getCollection(name).countDocuments();
  db.getCollection(name).drop();
  print(`[DROP] ${name}: removed ${count} documents`);
}

const assignmentUnset = db.NguoiDungNhomNguoiDung.updateMany(
  {},
  { $unset: { ScopeAttribute: "" } },
);
print(`[CLEAN] NguoiDungNhomNguoiDung unset ScopeAttribute: matched=${assignmentUnset.matchedCount}, modified=${assignmentUnset.modifiedCount}`);

const permissionUnset = db.UserPermission.updateMany(
  {},
  { $unset: { ScopeAttribute: "" } },
);
print(`[CLEAN] UserPermission unset ScopeAttribute: matched=${permissionUnset.matchedCount}, modified=${permissionUnset.modifiedCount}`);

const summary = {
  legacyCollectionsRemaining: legacyCollections.filter((name) => db.getCollectionNames().includes(name)),
  assignmentScopeAttributeCount: db.NguoiDungNhomNguoiDung.countDocuments({ ScopeAttribute: { $exists: true } }),
  cacheScopeAttributeCount: db.UserPermission.countDocuments({ ScopeAttribute: { $exists: true } }),
};

print("Summary:");
printjson(summary);
