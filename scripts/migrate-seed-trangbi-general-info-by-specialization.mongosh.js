/*
 * Seed/repair runtime "Thong tin chung" fieldset ownership by specialization.
 *
 * Why:
 *   AddTrangBiDialog now loads general information fieldsets by selected
 *   MaDanhMucTrangBi. The common fieldset must therefore be attached to the
 *   specialization category nodes, e.g. O.1.00..., O.1.01..., I.1.02...
 *
 * Apply:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-seed-trangbi-general-info-by-specialization.mongosh.js
 */

const DB_NAME = 'quanly_dmcanbo';
const ACTOR = 'migrate-seed-trangbi-general-info-by-specialization';
const COMMON_FIELDSET_ID = '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f0201';
const COMMON_FIELDSET_KEY = 'trang_bi.thong_tin_chung';
const SPECIALIZED_COMMON_FIELDSET_IDS = {
  B: 'f7114f86-c90f-4e9a-a833-a3331b7b100b',
  G: 'f7114f86-c90f-4e9a-a833-a3331b7b100c',
  I: 'f7114f86-c90f-4e9a-a833-a3331b7b100d',
  O: 'f7114f86-c90f-4e9a-a833-a3331b7b100e',
  T: 'f7114f86-c90f-4e9a-a833-a3331b7b100f',
};
const SPECIALIZED_COMMON_NAMES = {
  B: 'Thong tin chung - Chuyen nganh B',
  G: 'Thong tin chung - Chuyen nganh G',
  I: 'Thong tin chung - Chuyen nganh Ra da',
  O: 'Thong tin chung - Chuyen nganh Thong tin',
  T: 'Thong tin chung - Chuyen nganh T',
};

const database = db.getSiblingDB(DB_NAME);
const now = new Date();

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - seconds * 1000) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

function uniqueStrings(values) {
  return Array.from(new Set(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  ));
}

function getSpecializationCategoryCodes() {
  const nhom1Pattern = /^[A-Z]\.1\./;
  const docs = database.DanhMucTrangBi.find(
    {
      Delete: { $ne: true },
      _id: { $type: 'string', $regex: nhom1Pattern },
    },
    { _id: 1 },
  ).toArray();

  return uniqueStrings(docs.map((doc) => doc._id)).sort();
}

const BASE_COMMON_FIELD_IDS = [
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1003', // ma_danh_muc
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1002', // ten_danh_muc
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1004', // IdCapTren
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1005', // idnganh
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1006', // idchuyennganhkt
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1007', // loai
];

const SPECIALIZED_COMMON_FIELD_IDS = [
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1008', // ky_hieu
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1009', // so_hieu
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1010', // hang_san_xuat
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1011', // nuoc_san_xuat
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1012', // nam_san_xuat
  '3f7c1f95-9957-4060-a4ab-0a13551ba267', // nam_su_dung
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1013', // don_vi_quan_ly
  '155bfc4f-0307-40bf-95d4-e890a6916fee', // don_vi_su_dung
  '7f31117e-ad92-4353-c8f3-7c05a5f51104', // chat_luong
  'a18c5504-388a-4b2c-a19d-d719f210efb5', // trang_thai
  '534ee10c-8a40-41c8-a10b-e809d97a7b11', // tinh_trang_ky_thuat
  '0d2a0d55-5f4d-4f8b-a7a4-9fb8f57f1015', // ghi_chu
];

function getExistingCommonFieldIds() {
  const existing = database.FieldSet.findOne(
    {
      Delete: { $ne: true },
      $or: [
        { _id: COMMON_FIELDSET_ID },
        { Key: COMMON_FIELDSET_KEY },
      ],
    },
    { FieldIds: 1 },
  );

  if (Array.isArray(existing?.FieldIds) && existing.FieldIds.length > 0) {
    return uniqueStrings(existing.FieldIds);
  }

  return [...BASE_COMMON_FIELD_IDS, ...SPECIALIZED_COMMON_FIELD_IDS];
}

function getSpecializationPrefix(code) {
  return String(code || '').trim().split('.')[0] || '';
}

function groupCodesBySpecialization(codes) {
  return codes.reduce((acc, code) => {
    const prefix = getSpecializationPrefix(code);
    if (!prefix) return acc;
    acc[prefix] = acc[prefix] || [];
    acc[prefix].push(code);
    return acc;
  }, {});
}

function fallbackGuidFromPrefix(prefix) {
  const hex = String(prefix || 'x')
    .split('')
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(12, '0')
    .slice(0, 12);
  return `f7114f86-c90f-4e9a-a833-${hex}`;
}

const ownerCodes = getSpecializationCategoryCodes();

if (ownerCodes.length === 0) {
  throw new Error('Khong tim thay danh muc trang bi nhom 1 dang X.1.* trong DanhMucTrangBi.');
}

const existingCommon = database.FieldSet.findOne({
  Delete: { $ne: true },
  $or: [
    { _id: COMMON_FIELDSET_ID },
    { Key: COMMON_FIELDSET_KEY },
  ],
});

const commonId = existingCommon?._id || COMMON_FIELDSET_ID;
const previousOwners = Array.isArray(existingCommon?.MaDanhMucTrangBi)
  ? existingCommon.MaDanhMucTrangBi
  : [];
const owners = uniqueStrings([...previousOwners, ...ownerCodes]).sort();
const existingFieldIds = getExistingCommonFieldIds();
const baseFieldIds = BASE_COMMON_FIELD_IDS.filter((id) => existingFieldIds.includes(id));
const specializedFieldIds = SPECIALIZED_COMMON_FIELD_IDS.filter((id) => existingFieldIds.includes(id));

database.FieldSet.updateOne(
  { _id: commonId },
  {
    $set: {
      Key: COMMON_FIELDSET_KEY,
      Name: existingCommon?.Name || 'Thong tin chung',
      Icon: existingCommon?.Icon || 'Inventory',
      Color: existingCommon?.Color || '#2563eb',
      Desc: 'Thong tin dinh danh chung cua trang bi',
      FieldIds: baseFieldIds,
      MaDanhMucTrangBi: owners,
      Delete: false,
      ModifyDate: toProtoTimestamp(now),
      NguoiSua: ACTOR,
    },
    $setOnInsert: {
      CreateDate: toProtoTimestamp(now),
      NguoiTao: ACTOR,
    },
    $inc: {
      Version: 1,
    },
  },
  { upsert: true },
);

const codesBySpecialization = groupCodesBySpecialization(ownerCodes);
const specializedResults = Object.entries(codesBySpecialization).map(([prefix, codes]) => {
  const fieldSetId = SPECIALIZED_COMMON_FIELDSET_IDS[prefix] || fallbackGuidFromPrefix(prefix);
  const name = SPECIALIZED_COMMON_NAMES[prefix] || `Thong tin chung - Chuyen nganh ${prefix}`;
  const existing = database.FieldSet.findOne({ _id: fieldSetId }, { Version: 1 });

  database.FieldSet.updateOne(
    { _id: fieldSetId },
    {
      $set: {
        Key: COMMON_FIELDSET_KEY,
        Name: name,
        Icon: 'Inventory2',
        Color: '#166534',
        Desc: `Thong tin chung van hanh cua chuyen nganh ${prefix}`,
        FieldIds: specializedFieldIds,
        MaDanhMucTrangBi: uniqueStrings(codes).sort(),
        Delete: false,
        ModifyDate: toProtoTimestamp(now),
        NguoiSua: ACTOR,
      },
      $setOnInsert: {
        CreateDate: toProtoTimestamp(now),
        NguoiTao: ACTOR,
      },
      $inc: {
        Version: 1,
      },
    },
    { upsert: true },
  );

  return {
    id: fieldSetId,
    name,
    specialization: prefix,
    ownerCount: codes.length,
    fieldCount: specializedFieldIds.length,
    inserted: !existing,
  };
});

printjson({
  ok: true,
  baseFieldSetId: commonId,
  key: COMMON_FIELDSET_KEY,
  ownerCount: owners.length,
  baseFieldCount: baseFieldIds.length,
  specializedFieldSets: specializedResults,
});
