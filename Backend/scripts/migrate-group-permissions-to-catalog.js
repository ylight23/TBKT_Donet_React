const GROUP_COLLECTION = "NhomNguoiDung";
const GROUP_PERMISSION_COLLECTION = "PhanQuyenNhomNguoiDung";
const CATALOG_COLLECTION = "PermissionCatalog";
const MA_PHAN_HE_DEFAULT = "TBKT.ThongTin";
const MIGRATION_USER = "migration.catalog.v1";

const ACTION_KEYS = ["view", "add", "edit", "delete", "approve", "unapprove", "download", "print"];

// 1-1 mapping: legacy MaChucNang -> catalog Code.
// Keep this table explicit so we can evolve safely over time.
const LEGACY_TO_CATALOG = {
  application: "config.view",
  config: "config.view",
  backup: "config.audit",
  restore: "thamso_restore",
  definecatalog: "config.param",
  catalog: "config.param",
  listoffice: "office.view",
  nguoidung: "employee.view",
  nhomnguoidung: "config.role",
  phanquyennguoidung: "config.role",
  phanquyennhomnguoidung: "config.role",
  errorlog: "config.audit",
  userlog: "config.audit",
  loginlog: "config.audit",
  backendlog: "config.audit",
  useronline: "config.audit",
  apisinfo: "config.audit",
  configgateway: "config.param",
  exportconfigfile: "config.param",
  importconfigfile: "config.param",
  importjson: "config.param",
  filemanager: "config.template",
  Menu: "config.menu",
  MenuCategory: "config.menu",
  sharedata: "report.view",
  sendmessage: "report.view",
  sendcommand: "report.view",
  Docman: "config.template",
  DocmanCategory: "config.template",
  Media: "config.template",
  MediaCategory: "config.template",
  News: "config.template",
  NewsCategory: "config.template",
  Poll: "config.template",
  PollCategory: "config.template",
  Weblink: "config.template",
  WeblinkCategory: "config.template",
  acccesskey: "config.audit",
  thtc: "report.view",
  RptTinhHinhHoatDong: "report.view",
  "report/RptTongHopTinhHinh": "report.view",
  "report/RptUav": "report.view",
  "report/rptkhitai": "report.view",
  "report/rptlichtruc": "report.view",
  "report/rptquanso": "report.view",
};

function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === "x" ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

function normalizeActions(actions) {
  const output = {};
  ACTION_KEYS.forEach((key) => {
    output[key] = Boolean(actions && actions[key] === true);
  });
  return output;
}

function mergeActions(target, source) {
  ACTION_KEYS.forEach((key) => {
    target[key] = Boolean(target[key]) || Boolean(source[key]);
  });
}

function resolveCatalogCode(legacyCode) {
  if (!legacyCode) return null;
  if (catalogCodeSet.has(legacyCode)) return legacyCode;
  if (LEGACY_TO_CATALOG[legacyCode]) return LEGACY_TO_CATALOG[legacyCode];
  if (legacyCode.startsWith("thtc/")) return "report.view";
  if (legacyCode.startsWith("thts/")) return "report.view";
  return null;
}

const catalogItems = db
  .getCollection(CATALOG_COLLECTION)
  .find({ Active: true }, { _id: 0, Code: 1, Name: 1, Group: 1 })
  .toArray();

if (catalogItems.length === 0) {
  throw new Error("PermissionCatalog is empty. Abort migration.");
}

const catalogByCode = {};
catalogItems.forEach((item) => {
  catalogByCode[item.Code] = item;
});
const catalogCodeSet = new Set(catalogItems.map((item) => item.Code));

const groups = db.getCollection(GROUP_COLLECTION).find({}, { _id: 1, MaPhanHe: 1 }).toArray();
const now = new Date();

let upserted = 0;
let modified = 0;
let deletedLegacy = 0;
const unresolvedLegacy = {};

groups.forEach((group) => {
  const groupId = group._id;
  const groupMaPhanHe = group.MaPhanHe || MA_PHAN_HE_DEFAULT;
  const existing = db
    .getCollection(GROUP_PERMISSION_COLLECTION)
    .find({ IdNhomNguoiDung: groupId })
    .toArray();

  // Build effective action map from existing docs (catalog-native + mapped legacy)
  const effectiveByCode = {};
  catalogItems.forEach((item) => {
    effectiveByCode[item.Code] = normalizeActions({});
  });

  existing.forEach((doc) => {
    const legacyCode = doc.MaChucNang;
    const targetCode = resolveCatalogCode(legacyCode);
    if (!targetCode) {
      unresolvedLegacy[legacyCode] = (unresolvedLegacy[legacyCode] || 0) + 1;
      return;
    }
    mergeActions(effectiveByCode[targetCode], normalizeActions(doc.Actions || {}));
  });

  // Upsert every catalog code to ensure group permission matrix is complete.
  catalogItems.forEach((item) => {
    const actionDoc = effectiveByCode[item.Code] || normalizeActions({});
    const result = db.getCollection(GROUP_PERMISSION_COLLECTION).updateOne(
      { IdNhomNguoiDung: groupId, MaChucNang: item.Code },
      {
        $set: {
          MaChucNang: item.Code,
          TieuDeChucNang: item.Name || "",
          MaPhanHe: groupMaPhanHe,
          TieuDeNhomQuyen: item.Group || "",
          Actions: actionDoc,
          IdNhomNguoiDung: groupId,
          NguoiSua: MIGRATION_USER,
          NgaySua: now,
        },
        $setOnInsert: {
          _id: generateGuid(),
          NguoiTao: MIGRATION_USER,
          NgayTao: now,
        },
      },
      { upsert: true }
    );
    upserted += result.upsertedCount || 0;
    modified += result.modifiedCount || 0;
  });

  // Remove legacy rows no longer in catalog after migration.
  const deleteResult = db.getCollection(GROUP_PERMISSION_COLLECTION).deleteMany({
    IdNhomNguoiDung: groupId,
    MaChucNang: { $nin: Array.from(catalogCodeSet) },
  });
  deletedLegacy += deleteResult.deletedCount || 0;
});

const unresolvedList = Object.keys(unresolvedLegacy)
  .sort()
  .map((code) => ({ code, count: unresolvedLegacy[code] }));

printjson({
  migration: "group-permissions-to-catalog",
  groups: groups.length,
  catalogCodes: catalogItems.length,
  upserted,
  modified,
  deletedLegacy,
  unresolvedLegacyCount: unresolvedList.length,
  unresolvedLegacy: unresolvedList,
  finalDistinctGroupCodes: db.getCollection(GROUP_PERMISSION_COLLECTION).distinct("MaChucNang").length,
});
