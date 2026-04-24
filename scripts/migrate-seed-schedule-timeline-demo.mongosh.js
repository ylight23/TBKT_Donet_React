/*
  Seed timeline demo data for schedule modules so Gantt week/month/year has dense visible data.
  - Uses GUID _id
  - Source equipment: TrangBiNhom1 + TrangBiNhom2
  - Target collections:
      BaoQuanSchedule
      BaoDuongSchedule
      SuaChuaSchedule
      NiemCatSchedule
      DieuDongSchedule
      ChuyenCapChatLuongSchedule
  - Idempotent via SeedKey (upsert)

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-seed-schedule-timeline-demo.mongosh.js
*/

const DRY_RUN = typeof __dryRun !== "undefined" ? !!__dryRun : false;
const FORCE = typeof __force !== "undefined" ? !!__force : false;
const MAX_SOURCE = typeof __maxSource !== "undefined" ? Number(__maxSource) : 80;
const GROUP_SIZE = typeof __groupSize !== "undefined" ? Number(__groupSize) : 4;
const STEP_WEEKS = typeof __stepWeeks !== "undefined" ? Number(__stepWeeks) : 2;
const RANGE_START_WEEKS = typeof __rangeStartWeeks !== "undefined" ? Number(__rangeStartWeeks) : -14;
const RANGE_END_WEEKS = typeof __rangeEndWeeks !== "undefined" ? Number(__rangeEndWeeks) : 30;

function newGuid() {
  const hex = "0123456789ABCDEF";
  const part = (len) => {
    let out = "";
    for (let i = 0; i < len; i += 1) out += hex[Math.floor(Math.random() * 16)];
    return out;
  };
  return `${part(8)}-${part(4)}-${part(4)}-${part(4)}-${part(12)}`;
}

function str(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function pickTenDanhMuc(doc) {
  const p = doc.Parameters || {};
  return str(doc.TenDanhMuc) || str(p.ten_danh_muc) || str(doc.MaDanhMuc);
}

function pickSoHieu(doc) {
  const p = doc.Parameters || {};
  return str(p.so_hieu) || str(p.SoHieu) || "";
}

function pickIdNganh(doc) {
  const p = doc.Parameters || {};
  return str(doc.IdNganh) || str(p.id_nganh) || str(doc.IdChuyenNganhKT);
}

function pickIdDonVi(doc) {
  const p = doc.Parameters || {};
  return (
    str(p.id_don_vi) ||
    str(p.id_don_vi_quan_ly) ||
    str(p.don_vi_quan_ly) ||
    str(p.don_vi_su_dung) ||
    "000.000"
  );
}

function mapTrangBi(doc, nhom) {
  const p = doc.Parameters || {};
  return {
    IdTrangBi: str(doc._id),
    NhomTrangBi: nhom,
    MaDanhMuc: str(doc.MaDanhMuc),
    TenDanhMuc: pickTenDanhMuc(doc),
    SoHieu: pickSoHieu(doc),
    IdChuyenNganhKT: str(doc.IdChuyenNganhKT),
    IdNganh: pickIdNganh(doc),
    Parameters: {
      ky_hieu: str(p.ky_hieu),
      tinh_trang_su_dung: str(p.tinh_trang_su_dung || p.trang_thai),
      tinh_trang_ky_thuat: str(p.tinh_trang_ky_thuat),
    },
    _idDonViHint: pickIdDonVi(doc),
  };
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function startOfUtcWeekMonday(date) {
  const d = startOfUtcDay(date);
  const dow = d.getUTCDay(); // 0..6
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function addUtcDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addUtcWeeks(date, weeks) {
  return addUtcDays(date, weeks * 7);
}

function toIsoDate(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function* chunk(arr, size) {
  for (let i = 0; i < arr.length; i += size) {
    yield arr.slice(i, i + size);
  }
}

function upsertBySeedKey(collection, doc) {
  const existing = collection.findOne({ SeedKey: doc.SeedKey });
  if (existing) {
    if (FORCE && !DRY_RUN) {
      const toSet = Object.assign({}, doc);
      delete toSet._id;
      collection.updateOne(
        { _id: existing._id },
        {
          $set: Object.assign({}, toSet, {
            NguoiSua: "migration-schedule-timeline-seed",
            NgaySua: new Date(),
          }),
          $inc: { Version: 1 },
        },
      );
      return "updated";
    }
    return "skipped";
  }
  if (!DRY_RUN) collection.insertOne(doc);
  return "inserted";
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

function buildCommonDsTrangBi(items) {
  return items.map((x) => ({
    IdTrangBi: x.IdTrangBi,
    NhomTrangBi: x.NhomTrangBi,
    MaDanhMuc: x.MaDanhMuc,
    TenDanhMuc: x.TenDanhMuc,
    SoHieu: x.SoHieu,
    IdChuyenNganhKT: x.IdChuyenNganhKT,
    IdNganh: x.IdNganh,
    Parameters: x.Parameters || {},
  }));
}

const modules = [
  {
    key: "bao_quan",
    collection: "BaoQuanSchedule",
    titleField: "TenLichBaoQuan",
    titlePrefix: "Bao quan dinh ky",
    buildDoc: ({ id, seedKey, members, idDonVi, start, end, now, idx }) => ({
      _id: id,
      SeedKey: seedKey,
      TenLichBaoQuan: `Lich ${idx} - ${toIsoDate(start)}`,
      CanCu: "Ke hoach bao quan dinh ky",
      IdDonVi: idDonVi,
      TenDonVi: idDonVi,
      NguoiPhuTrach: "can-bo-bao-quan",
      ThoiGianLap: addUtcDays(start, -7),
      ThoiGianThucHien: start,
      ThoiGianKetThuc: end,
      NoiDungCongViec: "Bao quan tong the theo quy trinh",
      VatChatBaoDam: "Vat tu bao quan cap phat",
      KetQua: end < now ? "Hoan thanh" : "Dang thuc hien",
      DsTrangBi: buildCommonDsTrangBi(members),
      Parameters: {
        module: "bao_quan",
        thoi_gian_thuc_hien: toIsoDate(start),
        thoi_gian_ket_thuc: toIsoDate(end),
      },
      Delete: false,
      Version: 1,
      NguoiTao: "migration-schedule-timeline-seed",
      NguoiSua: "migration-schedule-timeline-seed",
      NgayTao: now,
      NgaySua: now,
    }),
  },
  {
    key: "bao_duong",
    collection: "BaoDuongSchedule",
    titleField: "TenLichBaoDuong",
    titlePrefix: "Bao duong dinh ky",
    buildDoc: ({ id, seedKey, members, idDonVi, start, end, now, idx }) => ({
      _id: id,
      SeedKey: seedKey,
      TenLichBaoDuong: `Lich ${idx} - ${toIsoDate(start)}`,
      CanCu: "Ke hoach bao duong dinh ky",
      IdDonVi: idDonVi,
      TenDonVi: idDonVi,
      NguoiPhuTrach: "can-bo-bao-duong",
      ThoiGianLap: addUtcDays(start, -10),
      ThoiGianThucHien: start,
      ThoiGianKetThuc: end,
      NoiDungCongViec: "Bao duong ky thuat theo cap",
      VatChatBaoDam: "Vat tu, phu tung bao duong",
      KetQua: end < now ? "Hoan thanh" : "Dang thuc hien",
      DsTrangBi: buildCommonDsTrangBi(members),
      Parameters: {
        module: "bao_duong",
        thoi_gian_thuc_hien: toIsoDate(start),
        thoi_gian_ket_thuc: toIsoDate(end),
      },
      Delete: false,
      Version: 1,
      NguoiTao: "migration-schedule-timeline-seed",
      NguoiSua: "migration-schedule-timeline-seed",
      NgayTao: now,
      NgaySua: now,
    }),
  },
  {
    key: "sua_chua",
    collection: "SuaChuaSchedule",
    titleField: "TenSuaChua",
    titlePrefix: "Sua chua theo dot",
    buildDoc: ({ id, seedKey, members, idDonVi, start, end, now, idx }) => ({
      _id: id,
      SeedKey: seedKey,
      TenSuaChua: `Dot ${idx} - ${toIsoDate(start)}`,
      CanCu: "Can cu de nghi sua chua",
      MucSuaChua: idx % 3 === 0 ? "Lon" : (idx % 3 === 1 ? "Vua" : "Nho"),
      CapSuaChua: idx % 2 === 0 ? "Chien dich" : "Chien thuat",
      DonViSuaChua: idDonVi,
      DonViDeNghi: idDonVi,
      NgayDeNghi: start,
      GhiChu: "Lich sua chua tu seed timeline",
      DsTrangBi: buildCommonDsTrangBi(members),
      Parameters: {
        module: "sua_chua",
        thoi_gian_thuc_hien: toIsoDate(start),
        thoi_gian_ket_thuc: toIsoDate(end),
      },
      Delete: false,
      Version: 1,
      NguoiTao: "migration-schedule-timeline-seed",
      NguoiSua: "migration-schedule-timeline-seed",
      NgayTao: now,
      NgaySua: now,
    }),
  },
  {
    key: "niem_cat",
    collection: "NiemCatSchedule",
    titleField: "TenNiemCat",
    titlePrefix: "Niem cat theo dot",
    buildDoc: ({ id, seedKey, members, idDonVi, start, end, now, idx }) => ({
      _id: id,
      SeedKey: seedKey,
      TenNiemCat: `Dot ${idx} - ${toIsoDate(start)}`,
      CanCu: "Lenh niem cat dinh ky",
      LoaiDeNghi: idx % 4 === 0 ? "Mo niem cat" : "Niem cat",
      LoaiNiemCat: idx % 2 === 0 ? "Ngan han" : "Dai han",
      DonViThucHien: idDonVi,
      NguoiThucHien: "can-bo-niem-cat",
      NgayNiemCat: start,
      KetQuaThucHien: end < now ? "Da hoan tat" : "Dang thuc hien",
      DsTrangBi: buildCommonDsTrangBi(members),
      Parameters: {
        module: "niem_cat",
        thoi_gian_thuc_hien: toIsoDate(start),
        thoi_gian_ket_thuc: toIsoDate(end),
      },
      Delete: false,
      Version: 1,
      NguoiTao: "migration-schedule-timeline-seed",
      NguoiSua: "migration-schedule-timeline-seed",
      NgayTao: now,
      NgaySua: now,
    }),
  },
  {
    key: "dieu_dong",
    collection: "DieuDongSchedule",
    titleField: "TenDieuDong",
    titlePrefix: "Dieu dong theo dot",
    buildDoc: ({ id, seedKey, members, idDonVi, start, end, now, idx }) => ({
      _id: id,
      SeedKey: seedKey,
      TenDieuDong: `Dot ${idx} - ${toIsoDate(start)}`,
      CanCu: "Lenh dieu dong trang bi",
      DonViGiao: idDonVi,
      DonViNhan: "000.010",
      NguoiPhuTrach: "can-bo-dieu-dong",
      ThoiGianThucHien: start,
      ThoiGianKetThuc: end,
      GhiChu: "Dieu dong theo ke hoach",
      DsTrangBi: buildCommonDsTrangBi(members),
      Parameters: {
        module: "dieu_dong",
        thoi_gian_thuc_hien: toIsoDate(start),
        thoi_gian_ket_thuc: toIsoDate(end),
      },
      Delete: false,
      Version: 1,
      NguoiTao: "migration-schedule-timeline-seed",
      NguoiSua: "migration-schedule-timeline-seed",
      NgayTao: now,
      NgaySua: now,
    }),
  },
  {
    key: "chuyen_cap_chat_luong",
    collection: "ChuyenCapChatLuongSchedule",
    titleField: "TenChuyenCapChatLuong",
    titlePrefix: "Chuyen cap chat luong",
    buildDoc: ({ id, seedKey, members, idDonVi, start, end, now, idx }) => ({
      _id: id,
      SeedKey: seedKey,
      TenChuyenCapChatLuong: `Dot ${idx} - ${toIsoDate(start)}`,
      CanCu: "Lenh chuyen cap chat luong",
      SoMenhLenh: `M-${String(idx).padStart(4, "0")}`,
      CapChatLuong: String(((idx - 1) % 5) + 1),
      DonViThucHien: idDonVi,
      GhiChu: "Chuyen cap theo danh gia ky thuat",
      DsTrangBi: buildCommonDsTrangBi(members),
      Parameters: {
        module: "chuyen_cap_chat_luong",
        thoi_gian_thuc_hien: toIsoDate(start),
        thoi_gian_ket_thuc: toIsoDate(end),
      },
      Delete: false,
      Version: 1,
      NguoiTao: "migration-schedule-timeline-seed",
      NguoiSua: "migration-schedule-timeline-seed",
      NgayTao: now,
      NgaySua: now,
    }),
  },
];

const n1 = db.getCollection("TrangBiNhom1")
  .find({ Delete: { $ne: true }, MaDanhMuc: { $type: "string", $ne: "" } })
  .limit(MAX_SOURCE)
  .toArray()
  .map((d) => mapTrangBi(d, 1));

const n2 = db.getCollection("TrangBiNhom2")
  .find({ Delete: { $ne: true }, MaDanhMuc: { $type: "string", $ne: "" } })
  .limit(MAX_SOURCE)
  .toArray()
  .map((d) => mapTrangBi(d, 2));

const equipment = [...n1, ...n2].filter((x) => x.IdTrangBi && x.MaDanhMuc);
if (equipment.length === 0) {
  print("[done] no source equipment found in TrangBiNhom1/TrangBiNhom2.");
  quit(0);
}

const memberGroups = [...chunk(equipment, GROUP_SIZE)];
const baseline = startOfUtcWeekMonday(new Date());
const seedWindows = [];
for (let w = RANGE_START_WEEKS; w <= RANGE_END_WEEKS; w += STEP_WEEKS) seedWindows.push(w);

print(`[seed] source=${equipment.length}, groups=${memberGroups.length}, windows=${seedWindows.length}, dryRun=${DRY_RUN}, force=${FORCE}`);

for (const moduleConfig of modules) {
  const coll = db.getCollection(moduleConfig.collection);
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  seedWindows.forEach((offsetWeeks, idx0) => {
    const idx = idx0 + 1;
    const start = addUtcWeeks(baseline, offsetWeeks);
    const durationDays = 3 + (idx % 6); // 4..8 days
    const end = addUtcDays(start, durationDays);
    const memberGroup = memberGroups[idx0 % memberGroups.length];
    const idDonVi = str(memberGroup?.[0]?._idDonViHint) || "000.000";
    const seedKey = `timeline_seed:v1:${moduleConfig.key}:${toIsoDate(start)}`;
    const now = new Date();

    const doc = moduleConfig.buildDoc({
      id: newGuid(),
      seedKey,
      members: memberGroup,
      idDonVi,
      start,
      end,
      now,
      idx,
    });

    const action = upsertBySeedKey(coll, doc);
    if (action === "inserted") inserted += 1;
    else if (action === "updated") updated += 1;
    else skipped += 1;
  });

  if (!DRY_RUN) {
    ensureIndexSafe(coll, { SeedKey: 1 }, { name: `idx_${moduleConfig.key}_seedkey`, unique: true, sparse: true });
    ensureIndexSafe(coll, { NgayTao: -1 }, { name: `idx_${moduleConfig.key}_ngaytao` });
    ensureIndexSafe(coll, { "DsTrangBi.IdTrangBi": 1 }, { name: `idx_${moduleConfig.key}_dstb_id` });
  }

  print(`[${moduleConfig.collection}] inserted=${inserted} updated=${updated} skipped=${skipped}`);
}

print("[done] timeline seed completed.");
