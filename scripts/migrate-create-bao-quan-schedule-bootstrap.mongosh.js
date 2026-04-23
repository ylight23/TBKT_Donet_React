/*
  Bootstrap migration for BaoQuanSchedule when legacy source is empty.
  - Source: TrangBiNhom1, TrangBiNhom2
  - Target: BaoQuanSchedule
  - _id: GUID string
  - Idempotent by BootstrapKey

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-create-bao-quan-schedule-bootstrap.mongosh.js
*/

const TARGET = "BaoQuanSchedule";
const SOURCE_N1 = "TrangBiNhom1";
const SOURCE_N2 = "TrangBiNhom2";

const DRY_RUN = typeof __dryRun !== "undefined" ? !!__dryRun : false;
const FORCE = typeof __force !== "undefined" ? !!__force : false;
const MAX_SOURCE = typeof __maxSource !== "undefined" ? Number(__maxSource) : 18;
const GROUP_SIZE = typeof __groupSize !== "undefined" ? Number(__groupSize) : 4;

function newGuid() {
  const hex = "0123456789ABCDEF";
  const part = (len) => {
    let out = "";
    for (let i = 0; i < len; i += 1) out += hex[Math.floor(Math.random() * 16)];
    return out;
  };
  return `${part(8)}-${part(4)}-${part(4)}-${part(4)}-${part(12)}`;
}

function strOrEmpty(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function pickDonVi(doc) {
  const p = doc.Parameters || {};
  return (
    strOrEmpty(p.don_vi_quan_ly) ||
    strOrEmpty(p.don_vi_su_dung) ||
    strOrEmpty(p.don_vi) ||
    "000"
  );
}

function mapTrangBi(doc, nhom) {
  const p = doc.Parameters || {};
  return {
    IdTrangBi: strOrEmpty(doc._id),
    NhomTrangBi: nhom,
    MaDanhMuc: strOrEmpty(doc.MaDanhMuc),
    TenDanhMuc: strOrEmpty(doc.TenDanhMuc) || strOrEmpty(p.ten_danh_muc),
    SoHieu: strOrEmpty(p.so_hieu),
    IdChuyenNganhKT: strOrEmpty(doc.IdChuyenNganhKT),
    IdNganh: strOrEmpty(doc.IdNganh || p.id_nganh),
    Parameters: {
      ky_hieu: strOrEmpty(p.ky_hieu),
      tinh_trang_su_dung: strOrEmpty(p.trang_thai || p.tinh_trang_su_dung),
    },
  };
}

function* chunk(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

function ensureIndexSafe(coll, keys, options) {
  try {
    coll.createIndex(keys, options || {});
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (msg.includes("Index already exists")) return;
    throw err;
  }
}

const target = db.getCollection(TARGET);
const existingActive = target.countDocuments({ Delete: { $ne: true } });
if (existingActive > 0 && !FORCE) {
  print(`[skip] ${TARGET} already has ${existingActive} active docs. Use __force=true to insert bootstrap set.`);
  quit(0);
}

const n1 = db.getCollection(SOURCE_N1)
  .find({ Delete: { $ne: true }, MaDanhMuc: { $type: "string", $ne: "" } })
  .limit(MAX_SOURCE)
  .toArray()
  .map((d) => mapTrangBi(d, 1));

const n2 = db.getCollection(SOURCE_N2)
  .find({ Delete: { $ne: true }, MaDanhMuc: { $type: "string", $ne: "" } })
  .limit(MAX_SOURCE)
  .toArray()
  .map((d) => mapTrangBi(d, 2));

const all = [...n1, ...n2].filter((x) => x.IdTrangBi && x.MaDanhMuc);
print(`[source] n1=${n1.length}, n2=${n2.length}, merged=${all.length}`);

if (all.length === 0) {
  print("[done] no source equipment found.");
  quit(0);
}

const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();

const schedules = [];
let idx = 0;
for (const members of chunk(all, GROUP_SIZE)) {
  if (members.length === 0) continue;
  idx += 1;

  const idDonVi = pickDonVi({ Parameters: members[0]?.Parameters || {} }) || "000";
  const bootstrapKey = `bootstrap:${year}:${month + 1}:group:${idx}`;
  schedules.push({
    _id: newGuid(),
    BootstrapKey: bootstrapKey,
    TenLichBaoQuan: `Lich bao quan bootstrap ${idx}`,
    CanCu: "Khoi tao tu migration bootstrap",
    IdDonVi: idDonVi,
    TenDonVi: idDonVi,
    NguoiPhuTrach: "admin",
    ThoiGianLap: new Date(Date.UTC(year, month, 1, 8, 0, 0)),
    ThoiGianThucHien: new Date(Date.UTC(year, month, Math.min(4 + idx, 24), 8, 0, 0)),
    ThoiGianKetThuc: new Date(Date.UTC(year, month, Math.min(5 + idx, 25), 17, 0, 0)),
    NoiDungCongViec: "Bao quan trang bi dinh ky theo ke hoach",
    VatChatBaoDam: "Vat tu bao quan theo dinh muc",
    KetQua: "Dang thuc hien",
    DsTrangBi: members,
    Parameters: {
      nguon_du_lieu: "bootstrap_from_trangbi",
      loai_migration: "bao_quan_schedule_seed",
      thang_ke_hoach: `${year}-${String(month + 1).padStart(2, "0")}`,
    },
    Delete: false,
    Version: 1,
    NguoiTao: "migration-bootstrap",
    NguoiSua: "migration-bootstrap",
    NgayTao: now,
    NgaySua: now,
  });
}

let inserted = 0;
let updated = 0;
for (const doc of schedules) {
  const existed = target.findOne({ BootstrapKey: doc.BootstrapKey });
  if (existed) {
    if (!DRY_RUN) {
      target.updateOne(
        { _id: existed._id },
        {
          $set: {
            TenLichBaoQuan: doc.TenLichBaoQuan,
            CanCu: doc.CanCu,
            IdDonVi: doc.IdDonVi,
            TenDonVi: doc.TenDonVi,
            NguoiPhuTrach: doc.NguoiPhuTrach,
            ThoiGianLap: doc.ThoiGianLap,
            ThoiGianThucHien: doc.ThoiGianThucHien,
            ThoiGianKetThuc: doc.ThoiGianKetThuc,
            NoiDungCongViec: doc.NoiDungCongViec,
            VatChatBaoDam: doc.VatChatBaoDam,
            KetQua: doc.KetQua,
            DsTrangBi: doc.DsTrangBi,
            Parameters: doc.Parameters,
            NguoiSua: "migration-bootstrap",
            NgaySua: new Date(),
          },
          $inc: { Version: 1 },
        },
      );
    }
    updated += 1;
    continue;
  }

  if (!DRY_RUN) target.insertOne(doc);
  inserted += 1;
}

if (!DRY_RUN) {
  ensureIndexSafe(target, { BootstrapKey: 1 }, { name: "idx_baoquan_bootstrap_key", unique: true, sparse: true });
  ensureIndexSafe(target, { IdDonVi: 1 }, { name: "idx_baoquan_id_don_vi" });
  ensureIndexSafe(target, { "DsTrangBi.IdTrangBi": 1 }, { name: "idx_baoquan_ds_trang_bi_id" });
  ensureIndexSafe(target, { "DsTrangBi.NhomTrangBi": 1 }, { name: "idx_baoquan_ds_trang_bi_nhom" });
}

print(`[done] dryRun=${DRY_RUN} inserted=${inserted} updated=${updated} totalSchedules=${schedules.length}`);
