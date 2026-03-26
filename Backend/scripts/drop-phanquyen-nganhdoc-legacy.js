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

const summary = {
  legacyCollectionsRemaining: legacyCollections.filter((name) => db.getCollectionNames().includes(name)),
};

print("Summary:");
printjson(summary);
