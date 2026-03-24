function buildPath(id) {
  if (!id) return "/";
  return "/" + id.split(".").filter(Boolean).join("/") + "/";
}

function buildDepth(id) {
  if (!id) return 0;
  return id.split(".").filter(Boolean).length;
}

print(`Using database: ${db.getName()}`);

const officeUpdates = [];
db.Office.find({}, { _id: 1 }).forEach((doc) => {
  const path = buildPath(doc._id);
  const depth = buildDepth(doc._id);
  officeUpdates.push({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: { Path: path, Depth: depth } },
    },
  });
});

if (officeUpdates.length > 0) {
  const result = db.Office.bulkWrite(officeUpdates);
  print(`[UPDATE] Office Path/Depth: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
} else {
  print("[SKIP] Office has no documents");
}

if (!db.getCollectionNames().includes("NhomChuyenNganh")) {
  db.createCollection("NhomChuyenNganh");
  print("[CREATE] NhomChuyenNganh collection");
} else {
  print("[KEEP] NhomChuyenNganh collection already exists");
}

printjson({
  officeMissingPath: db.Office.countDocuments({ Path: { $exists: false } }),
  officeMissingDepth: db.Office.countDocuments({ Depth: { $exists: false } }),
  nhomChuyenNganhExists: db.getCollectionNames().includes("NhomChuyenNganh"),
});
