/* eslint-disable no-undef */
/* global db */

/**
 * Archive legacy role/permission collections after canonical migration.
 * - Only archives when canonical collection exists and count matches.
 * - Uses renameCollection to keep rollback path.
 */

const SUFFIX = "_legacy_archived_20260330";
const MAPPING = [
  { legacy: "NhomNguoiDung", canonical: "Role" },
  { legacy: "NguoiDungNhomNguoiDung", canonical: "UserRoleAssignment" },
  { legacy: "PhanQuyenNhomNguoiDung", canonical: "RolePermission" },
  { legacy: "PhanQuyenNguoiDung", canonical: "UserPermissionOverride" },
  { legacy: "PhanQuyenPhanHeNhomNguoiDung", canonical: "RoleSubsystemPermission" },
  { legacy: "PhanQuyenPhanHeNguoiDung", canonical: "UserSubsystemPermission" },
];

function exists(name) {
  return db.getCollectionNames().includes(name);
}

for (const pair of MAPPING) {
  const { legacy, canonical } = pair;
  if (!exists(legacy)) {
    print(`[skip] legacy not found: ${legacy}`);
    continue;
  }
  if (!exists(canonical)) {
    print(`[skip] canonical not found: ${canonical}`);
    continue;
  }

  const legacyCount = db.getCollection(legacy).countDocuments({});
  const canonicalCount = db.getCollection(canonical).countDocuments({});
  if (legacyCount !== canonicalCount) {
    print(`[skip] count mismatch ${legacy}(${legacyCount}) != ${canonical}(${canonicalCount})`);
    continue;
  }

  const archivedName = `${legacy}${SUFFIX}`;
  if (exists(archivedName)) {
    print(`[skip] archive already exists: ${archivedName}`);
    continue;
  }

  db.getCollection(legacy).renameCollection(archivedName);
  print(`[ok] archived ${legacy} -> ${archivedName}`);
}

