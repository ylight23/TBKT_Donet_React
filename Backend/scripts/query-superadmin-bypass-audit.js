/* eslint-disable no-undef */
// Usage:
//   mongosh "mongodb://localhost:27017/quanly_dmcanbo" Backend/scripts/query-superadmin-bypass-audit.js
//
// Optional params (before running script):
//   var days = 7;
//   var limit = 200;

const lookbackDays = typeof days === "number" ? days : 7;
const maxRows = typeof limit === "number" ? limit : 200;
const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

print(`[query-superadmin-bypass-audit] db=${db.getName()} days=${lookbackDays} limit=${maxRows}`);

const col = db.getCollection("AuthzAuditLog");

const total = col.countDocuments({
  EventType: "SUPERADMIN_BYPASS",
  At: { $gte: since },
});
print(`total SUPERADMIN_BYPASS since ${since.toISOString()}: ${total}`);

print("\nTop users:");
const topUsers = col.aggregate([
  { $match: { EventType: "SUPERADMIN_BYPASS", At: { $gte: since } } },
  { $group: { _id: { UserId: "$UserId", UserName: "$UserName" }, Count: { $sum: 1 }, LastAt: { $max: "$At" } } },
  { $sort: { Count: -1, LastAt: -1 } },
  { $limit: 20 },
]).toArray();
printjson(topUsers);

print("\nLatest events:");
const latest = col.find(
  { EventType: "SUPERADMIN_BYPASS", At: { $gte: since } },
  { _id: 0, UserId: 1, UserName: 1, Method: 1, Target: 1, At: 1 },
).sort({ At: -1 }).limit(maxRows).toArray();
printjson(latest);

