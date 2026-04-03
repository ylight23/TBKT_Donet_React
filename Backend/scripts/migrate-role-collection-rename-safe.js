/* eslint-disable no-undef */
/* global db */

/**
 * Safe migration for permission collection physical names (legacy -> canonical).
 *
 * Run in mongosh, edit MODE as needed:
 *   MODE = "plan"   : print mapping + document counts
 *   MODE = "copy"   : upsert copy from legacy to canonical (idempotent)
 *   MODE = "verify" : compare counts + missing _id samples
 *   MODE = "rollback-copy" : copy canonical back to legacy (safe rollback helper)
 *
 * Notes:
 * - This script does NOT drop any collection.
 * - Keep legacy collections until runtime has switched and stabilized.
 */

const MODE = "plan"; // "plan" | "copy" | "verify" | "rollback-copy"
const SAMPLE_LIMIT = 20;

const MAPPING = [
  { legacy: "NhomNguoiDung", canonical: "Role" },
  { legacy: "NguoiDungNhomNguoiDung", canonical: "UserRoleAssignment" },
  { legacy: "PhanQuyenNhomNguoiDung", canonical: "RolePermission" },
  { legacy: "PhanQuyenNguoiDung", canonical: "UserPermissionOverride" },
  { legacy: "PhanQuyenPhanHeNhomNguoiDung", canonical: "RoleSubsystemPermission" },
  { legacy: "PhanQuyenPhanHeNguoiDung", canonical: "UserSubsystemPermission" },
];

function existsCollection(name) {
  return db.getCollectionNames().includes(name);
}

function printMapping() {
  print("=== Collection mapping (legacy -> canonical) ===");
  MAPPING.forEach((pair) => print(`${pair.legacy} -> ${pair.canonical}`));
}

function countSummary() {
  const rows = MAPPING.map((pair) => {
    const legacyExists = existsCollection(pair.legacy);
    const canonicalExists = existsCollection(pair.canonical);
    const legacyCount = legacyExists ? db.getCollection(pair.legacy).countDocuments({}) : 0;
    const canonicalCount = canonicalExists ? db.getCollection(pair.canonical).countDocuments({}) : 0;
    return {
      legacy: pair.legacy,
      canonical: pair.canonical,
      legacyExists,
      canonicalExists,
      legacyCount,
      canonicalCount,
      delta: canonicalCount - legacyCount,
    };
  });
  printjson(rows);
}

function copyOne(sourceName, targetName) {
  const source = db.getCollection(sourceName);
  const target = db.getCollection(targetName);
  const cursor = source.find({});
  const ops = [];
  let touched = 0;

  while (cursor.hasNext()) {
    const doc = cursor.next();
    ops.push({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    });
    if (ops.length >= 1000) {
      target.bulkWrite(ops, { ordered: false });
      touched += ops.length;
      ops.length = 0;
    }
  }
  if (ops.length > 0) {
    target.bulkWrite(ops, { ordered: false });
    touched += ops.length;
  }
  return touched;
}

function runCopy(direction) {
  print(`=== copy mode: ${direction} ===`);
  MAPPING.forEach((pair) => {
    const sourceName = direction === "legacy-to-canonical" ? pair.legacy : pair.canonical;
    const targetName = direction === "legacy-to-canonical" ? pair.canonical : pair.legacy;
    if (!existsCollection(sourceName)) {
      print(`[skip] source missing: ${sourceName}`);
      return;
    }
    const touched = copyOne(sourceName, targetName);
    print(`[ok] ${sourceName} -> ${targetName}: upserted ${touched} docs`);
  });
}

function verify() {
  print("=== verify mode ===");
  MAPPING.forEach((pair) => {
    const legacyExists = existsCollection(pair.legacy);
    const canonicalExists = existsCollection(pair.canonical);
    if (!legacyExists || !canonicalExists) {
      print(`[warn] missing collection: legacy=${legacyExists} canonical=${canonicalExists} | ${pair.legacy} / ${pair.canonical}`);
      return;
    }

    const legacy = db.getCollection(pair.legacy);
    const canonical = db.getCollection(pair.canonical);
    const legacyCount = legacy.countDocuments({});
    const canonicalCount = canonical.countDocuments({});

    const missingInCanonical = legacy.aggregate([
      { $lookup: { from: pair.canonical, localField: "_id", foreignField: "_id", as: "__new" } },
      { $match: { "__new.0": { $exists: false } } },
      { $project: { _id: 1 } },
      { $limit: SAMPLE_LIMIT },
    ]).toArray();

    const missingInLegacy = canonical.aggregate([
      { $lookup: { from: pair.legacy, localField: "_id", foreignField: "_id", as: "__old" } },
      { $match: { "__old.0": { $exists: false } } },
      { $project: { _id: 1 } },
      { $limit: SAMPLE_LIMIT },
    ]).toArray();

    printjson({
      legacy: pair.legacy,
      canonical: pair.canonical,
      legacyCount,
      canonicalCount,
      missingInCanonicalSample: missingInCanonical.map((x) => x._id),
      missingInLegacySample: missingInLegacy.map((x) => x._id),
    });
  });
}

printMapping();
countSummary();

if (MODE === "copy") {
  runCopy("legacy-to-canonical");
  countSummary();
} else if (MODE === "verify") {
  verify();
} else if (MODE === "rollback-copy") {
  runCopy("canonical-to-legacy");
  countSummary();
} else {
  print("MODE=plan: no data changed.");
}

