// migrate_user_permission.js
// Creates the UserPermission collection with index for precomputed permissions.
// Run: mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_user_permission.js

const db = db.getSiblingDB("quanly_dmcanbo");

// Create collection if not exists
if (!db.getCollectionNames().includes("UserPermission")) {
  db.createCollection("UserPermission");
  print("✅ Created UserPermission collection");
} else {
  print("⏭️  UserPermission collection already exists");
}

// _id is the userId (string) — primary index already exists on _id
// Add TTL-like index on RebuiltAt for monitoring stale entries
db.UserPermission.createIndex(
  { RebuiltAt: 1 },
  { name: "idx_UP_RebuiltAt" }
);
print("✅ Created index idx_UP_RebuiltAt");

// Ensure NguoiDungNhomNguoiDung has proper indexes for rebuild queries
const memberIndexes = [
  { keys: { IdNguoiDung: 1 },       name: "idx_NDNND_user" },
  { keys: { IdNhomNguoiDung: 1 },   name: "idx_NDNND_nhom" },
];

memberIndexes.forEach(({ keys, name }) => {
  try {
    db.NguoiDungNhomNguoiDung.createIndex(keys, { name });
    print(`✅ Ensured index ${name}`);
  } catch (e) {
    if (e.codeName === "IndexOptionsConflict") {
      print(`⏭️  Index ${name} already exists`);
    } else {
      print(`❌ Failed ${name}: ${e.message}`);
    }
  }
});

print("\n🎉 Migration complete.");
