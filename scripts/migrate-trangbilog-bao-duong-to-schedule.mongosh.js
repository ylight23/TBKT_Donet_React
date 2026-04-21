/*
  Migration: TrangBiLog (bao_duong) -> BaoDuongSchedule (schedule-first)
  - Source collection: TrangBiLog
  - Target collection: BaoDuongSchedule
  - Grouping key priority:
      1) Parameters.bao_duong_schedule_id
      2) Parameters.id_lich_bao_duong
      3) Parameters.schedule_id
      4) fallback: "legacy:<LogId>"
  - Target _id uses GUID (string)

  Run:
    mongosh "<connection-string>" --file scripts/migrate-trangbilog-bao-duong-to-schedule.mongosh.js
*/

const SOURCE_COLLECTION = "TrangBiLog";
const TARGET_COLLECTION = "BaoDuongSchedule";
const BAO_DUONG_LOG_TYPE = 2;

const DRY_RUN = typeof __dryRun !== "undefined" ? !!__dryRun : false;

function newGuid() {
  const hex = "0123456789ABCDEF";
  const part = (len) => {
    let out = "";
    for (let i = 0; i < len; i += 1) out += hex[Math.floor(Math.random() * 16)];
    return out;
  };
  return `${part(8)}-${part(4)}-${part(4)}-${part(4)}-${part(12)}`;
}

function toIsoOrNull(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  return null;
}

function strOrNull(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function cleanParameters(params) {
  const skipKeys = new Set([
    "bao_duong_schedule_id",
    "id_lich_bao_duong",
    "schedule_id",
    "id_trang_bi",
    "ma_danh_muc",
    "ten_trang_bi",
    "so_hieu_trang_bi",
  ]);
  const out = {};
  if (!params || typeof params !== "object") return out;
  Object.keys(params).forEach((k) => {
    if (skipKeys.has(k)) return;
    const v = params[k];
    if (v === null || v === undefined) return;
    out[k] = String(v);
  });
  return out;
}

function getScheduleKey(logDoc) {
  const p = logDoc.Parameters || {};
  return (
    strOrNull(p.bao_duong_schedule_id) ||
    strOrNull(p.id_lich_bao_duong) ||
    strOrNull(p.schedule_id) ||
    `legacy:${String(logDoc._id)}`
  );
}

function getScheduleName(logDoc) {
  const p = logDoc.Parameters || {};
  return (
    strOrNull(p.ten_lich_bao_duong) ||
    strOrNull(p.ten_lich) ||
    strOrNull(logDoc.Ten) ||
    `Lich bao duong ${String(logDoc._id)}`
  );
}

function getNhomTrangBi(logDoc) {
  const p = logDoc.Parameters || {};
  const raw = p.nhom_trang_bi ?? p.nhom ?? logDoc.Nhom ?? 1;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function mapTrangBiMember(logDoc) {
  const p = logDoc.Parameters || {};
  return {
    IdTrangBi: strOrNull(logDoc.IdTrangBi),
    NhomTrangBi: getNhomTrangBi(logDoc),
    MaDanhMuc: strOrNull(logDoc.MaDanhMuc),
    TenDanhMuc: strOrNull(logDoc.TenTrangBi),
    SoHieu: strOrNull(logDoc.SoHieuTrangBi),
    IdChuyenNganhKT: strOrNull(logDoc.IdChuyenNganhKT),
    IdNganh: strOrNull(p.id_nganh),
    Parameters: cleanParameters(p),
  };
}

function toTargetDoc(scheduleKey, docs) {
  const first = docs[0];
  const p = first.Parameters || {};
  const membersByEquipment = {};
  docs.forEach((doc) => {
    const member = mapTrangBiMember(doc);
    if (!member.IdTrangBi) return;
    membersByEquipment[member.IdTrangBi] = member;
  });

  const now = new Date();
  const createdAt =
    toIsoOrNull(first.NgayTao) ||
    toIsoOrNull(first.NgayLapKeHoach) ||
    toIsoOrNull(first.NgayDuKien) ||
    now;
  const updatedAt = toIsoOrNull(first.NgaySua) || now;

  return {
    _id: newGuid(),
    LegacyScheduleKey: scheduleKey,
    TenLichBaoDuong: getScheduleName(first),
    CanCu: strOrNull(p.can_cu) || strOrNull(first.GhiChu),
    IdDonVi: strOrNull(p.id_don_vi) || strOrNull(first.DonViChuQuan),
    TenDonVi: strOrNull(p.ten_don_vi),
    NguoiPhuTrach: strOrNull(p.nguoi_phu_trach) || strOrNull(first.KtvChinh),
    ThoiGianLap: toIsoOrNull(first.NgayLapKeHoach) || createdAt,
    ThoiGianThucHien: toIsoOrNull(first.NgayThucHien) || toIsoOrNull(first.NgayDuKien),
    ThoiGianKetThuc: toIsoOrNull(first.NgayHoanThanh),
    NoiDungCongViec: strOrNull(p.noi_dung_cong_viec),
    VatChatBaoDam: strOrNull(p.vat_chat_bao_dam),
    KetQua: strOrNull(p.ket_qua),
    DsTrangBi: Object.values(membersByEquipment),
    Parameters: cleanParameters(p),
    SourceLogIds: docs.map((d) => String(d._id)),
    Delete: false,
    Version: 1,
    NguoiTao: strOrNull(first.NguoiTao),
    NguoiSua: strOrNull(first.NguoiSua),
    NgayTao: createdAt,
    NgaySua: updatedAt,
  };
}

const source = db.getCollection(SOURCE_COLLECTION);
const target = db.getCollection(TARGET_COLLECTION);

const sourceDocs = source
  .find({
    Delete: { $ne: true },
    LogType: BAO_DUONG_LOG_TYPE,
  })
  .toArray();

print(`[scan] ${SOURCE_COLLECTION} bao_duong logs: ${sourceDocs.length}`);

const groups = {};
sourceDocs.forEach((doc) => {
  const key = getScheduleKey(doc);
  if (!groups[key]) groups[key] = [];
  groups[key].push(doc);
});

const keys = Object.keys(groups);
print(`[group] schedules inferred: ${keys.length}`);

let inserted = 0;
let updated = 0;
let skipped = 0;

keys.forEach((key) => {
  const docs = groups[key];
  const candidate = toTargetDoc(key, docs);

  const existing = target.findOne({ LegacyScheduleKey: key });
  if (existing) {
    if (DRY_RUN) {
      updated += 1;
      return;
    }

    target.updateOne(
      { _id: existing._id },
      {
        $set: {
          TenLichBaoDuong: candidate.TenLichBaoDuong,
          CanCu: candidate.CanCu,
          IdDonVi: candidate.IdDonVi,
          TenDonVi: candidate.TenDonVi,
          NguoiPhuTrach: candidate.NguoiPhuTrach,
          ThoiGianLap: candidate.ThoiGianLap,
          ThoiGianThucHien: candidate.ThoiGianThucHien,
          ThoiGianKetThuc: candidate.ThoiGianKetThuc,
          NoiDungCongViec: candidate.NoiDungCongViec,
          VatChatBaoDam: candidate.VatChatBaoDam,
          KetQua: candidate.KetQua,
          DsTrangBi: candidate.DsTrangBi,
          Parameters: candidate.Parameters,
          SourceLogIds: candidate.SourceLogIds,
          NguoiSua: candidate.NguoiSua,
          NgaySua: new Date(),
        },
        $inc: { Version: 1 },
      },
    );
    updated += 1;
    return;
  }

  if (!candidate.DsTrangBi || candidate.DsTrangBi.length === 0) {
    skipped += 1;
    return;
  }

  if (DRY_RUN) {
    inserted += 1;
    return;
  }

  target.insertOne(candidate);
  inserted += 1;
});

if (!DRY_RUN) {
  target.createIndex({ LegacyScheduleKey: 1 }, { name: "idx_legacy_schedule_key", unique: true, sparse: true });
  target.createIndex({ IdDonVi: 1 }, { name: "idx_bds_id_don_vi" });
  target.createIndex({ "DsTrangBi.IdTrangBi": 1 }, { name: "idx_bds_ds_trang_bi_id" });
  target.createIndex({ "DsTrangBi.NhomTrangBi": 1 }, { name: "idx_bds_ds_trang_bi_nhom" });
  target.createIndex({ NgaySua: -1 }, { name: "idx_bds_ngay_sua_desc" });
}

print(`[done] dryRun=${DRY_RUN} inserted=${inserted} updated=${updated} skipped=${skipped}`);
