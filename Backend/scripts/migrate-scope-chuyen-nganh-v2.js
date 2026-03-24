/* eslint-disable no-console */
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "quanly_dmcanbo";
const equipmentCollections = (process.env.EQUIPMENT_COLLECTIONS || "TrangBi,TrangBiNhom1,TrangBiNhom2")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const CHUYEN_NGANH_MAP = {
  radar: "radar",
  "ra-da": "radar",
  thongtin: "thongtin",
  "thong tin": "thongtin",
  tcdt: "tcdt",
  "tac chien dt": "tcdt",
  "tau thuyen": "tauthuyen",
  "ten lua": "ten_lua",
  "khong quan": "khongquan",
  "hau can": "haugcan",
  "phong hoa": "phanhoa",
};

const FULL_ACTIONS = ["view", "add", "edit", "delete", "approve", "unapprove", "download", "print"];

function normalizeText(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferChuyenNganhId(rawLoai) {
  const key = normalizeText(rawLoai);
  if (!key) return "";
  if (CHUYEN_NGANH_MAP[key]) return CHUYEN_NGANH_MAP[key];
  return slugify(rawLoai);
}

function sanitizeCrossActions(actions, isOwn) {
  const list = Array.isArray(actions) ? actions.filter((v) => typeof v === "string" && v.trim()) : [];
  const uniq = [...new Set(list.map((v) => v.trim()))];
  if (isOwn) return FULL_ACTIONS.slice();
  const safe = uniq.filter((v) => !["delete", "approve", "unapprove"].includes(v));
  return safe.length > 0 ? safe : ["view", "download"];
}

function buildPhamViDoc(ownId, idChuyenNganhDoc = []) {
  if (!ownId) return null;
  const used = new Set();
  const rows = [{ Id: ownId, Actions: FULL_ACTIONS.slice() }];
  used.add(ownId);
  for (const item of idChuyenNganhDoc) {
    const id = (item || "").toString().trim();
    if (!id || used.has(id)) continue;
    used.add(id);
    rows.push({ Id: id, Actions: ["view", "download"] });
  }
  return {
    IdChuyenNganh: ownId,
    IdChuyenNganhDoc: rows,
  };
}

async function buildOfficePathMap(db) {
  const map = new Map();
  const offices = await db.collection("Office")
    .find({}, { projection: { _id: 1, Ten: 1, TenDayDu: 1, Path: 1 } })
    .toArray();
  for (const item of offices) {
    const id = item._id ? item._id.toString() : "";
    if (!id) continue;
    const byId = id;
    const byTen = normalizeText(item.Ten);
    const byDayDu = normalizeText(item.TenDayDu);
    if (byId) map.set(byId, id);
    if (byTen) map.set(byTen, id);
    if (byDayDu) map.set(byDayDu, id);
  }
  return map;
}

async function migrateEquipment(db, officeMap) {
  const report = [];
  for (const colName of equipmentCollections) {
    const col = db.collection(colName);
    const docs = await col.find(
      {},
      { projection: { _id: 1, loai: 1, phanNganh: 1, donVi: 1, IDChuyenNganh: 1, IDChuyenNganhKT: 1, IDDonVi: 1 } }
    ).toArray();

    let modified = 0;
    for (const doc of docs) {
      const idChuyenNganh = doc.IDChuyenNganh || inferChuyenNganhId(doc.loai);
      const idChuyenNganhKT = doc.IDChuyenNganhKT || slugify(doc.phanNganh);
      const donViRaw = doc.donVi || "";
      const idDonVi = doc.IDDonVi || officeMap.get(normalizeText(donViRaw)) || "";

      const update = {
        $set: {
          IDChuyenNganh: idChuyenNganh,
          IDChuyenNganhKT: idChuyenNganhKT,
          IDDonVi: idDonVi,
        },
      };
      const res = await col.updateOne({ _id: doc._id }, update);
      modified += res.modifiedCount;
    }

    await col.createIndex({ IDDonVi: 1, IDChuyenNganh: 1 });
    await col.createIndex({ IDChuyenNganh: 1, IDChuyenNganhKT: 1 });
    report.push({ collection: colName, processed: docs.length, modified });
  }
  return report;
}

async function migratePermissionCollection(col, idField) {
  const docs = await col.find(
    {},
    { projection: { _id: 1, IdNhomChuyenNganh: 1, IdChuyenNganhDoc: 1, PhamViChuyenNganh: 1 } }
  ).toArray();

  let modified = 0;
  for (const doc of docs) {
    const ownId = (doc.IdNhomChuyenNganh || "").toString().trim();
    const existing = doc.PhamViChuyenNganh && typeof doc.PhamViChuyenNganh === "object" ? doc.PhamViChuyenNganh : null;
    const fallbackDoc = buildPhamViDoc(ownId, doc.IdChuyenNganhDoc || []);
    const phamVi = existing || fallbackDoc;

    const update = {
      $set: {
        IdNhomChuyenNganh: ownId,
        IdChuyenNganhDoc: Array.isArray(doc.IdChuyenNganhDoc)
          ? [...new Set(doc.IdChuyenNganhDoc.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim()))]
          : [],
        PhamViChuyenNganh: phamVi || null,
      },
    };

    if (phamVi && Array.isArray(phamVi.IdChuyenNganhDoc)) {
      update.$set.IdChuyenNganhDoc = phamVi.IdChuyenNganhDoc
        .map((item) => (item && item.Id ? item.Id.toString().trim() : ""))
        .filter(Boolean);
      update.$set.PhamViChuyenNganh = {
        IdChuyenNganh: phamVi.IdChuyenNganh,
        IdChuyenNganhDoc: phamVi.IdChuyenNganhDoc.map((item) => ({
          Id: item.Id,
          Actions: sanitizeCrossActions(item.Actions, item.Id === phamVi.IdChuyenNganh),
        })),
      };
    }

    const res = await col.updateOne({ _id: doc._id }, update);
    modified += res.modifiedCount;
  }

  if (idField) {
    await col.createIndex({ [idField]: 1, IdNhomChuyenNganh: 1 });
    await col.createIndex({ [idField]: 1, "PhamViChuyenNganh.IdChuyenNganh": 1 });
  } else {
    await col.createIndex({ IdNhomChuyenNganh: 1 });
    await col.createIndex({ "PhamViChuyenNganh.IdChuyenNganh": 1 });
  }

  return { collection: col.collectionName, processed: docs.length, modified };
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const officeMap = await buildOfficePathMap(db);
  const equipmentReport = await migrateEquipment(db, officeMap);
  const userGroupsReport = await migratePermissionCollection(db.collection("NhomNguoiDung"), "_id");
  const assignmentsReport = await migratePermissionCollection(db.collection("NguoiDungNhomNguoiDung"), "IdNguoiDung");

  console.log(JSON.stringify({
    database: dbName,
    equipment: equipmentReport,
    permissions: [userGroupsReport, assignmentsReport],
  }, null, 2));

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
