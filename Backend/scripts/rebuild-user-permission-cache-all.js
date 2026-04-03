print(`Using database: ${db.getName()}`);

const now = new Date();
const cacheName = "UserPermission";
const employeeCursor = db.Employee.find(
  {},
  { _id: 1, IdQuanTriDonVi: 1 },
);

db.getCollection(cacheName).deleteMany({});

let processed = 0;
const bulkOps = [];

while (employeeCursor.hasNext()) {
  const employee = employeeCursor.next();
  const userId = employee._id;
  const anchorNodeId = employee.IdQuanTriDonVi ?? "";

  bulkOps.push({
    replaceOne: {
      filter: { _id: userId },
      replacement: {
        _id: userId,
        ScopeType: "SUBTREE",
        AnchorNodeId: anchorNodeId,
        AnchorParentId: "",
        PhanHe: [],
        ChucNang: [],
        NganhDocIds: [],
        PhamViChuyenNganh: null,
        RebuiltAt: now,
      },
      upsert: true,
    },
  });

  processed += 1;

  if (bulkOps.length >= 500) {
    db.getCollection(cacheName).bulkWrite(bulkOps);
    bulkOps.length = 0;
  }
}

if (bulkOps.length > 0) {
  db.getCollection(cacheName).bulkWrite(bulkOps);
}

print("Summary:");
printjson({
  processed,
  cacheCount: db.getCollection(cacheName).countDocuments({}),
});
