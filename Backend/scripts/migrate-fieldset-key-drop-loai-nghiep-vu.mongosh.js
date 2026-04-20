// Chuẩn hóa FieldSet:
// - Gán Key runtime chuẩn
// - Bỏ LoaiNghiepVu khỏi document
//
// Keys chốt:
//   trang_bi.thong_tin_chung
//   trang_bi.thong_so_ky_thuat
//   trang_bi.dong_bo
//   trang_bi.bao_quan
//   trang_bi.bao_duong
//   trang_bi.sua_chua
//   trang_bi.niem_cat
//   trang_bi.dieu_dong

const FIELD_SET_KEYS = {
  THONG_TIN_CHUNG: 'trang_bi.thong_tin_chung',
  THONG_SO_KY_THUAT: 'trang_bi.thong_so_ky_thuat',
  DONG_BO: 'trang_bi.dong_bo',
  BAO_QUAN: 'trang_bi.bao_quan',
  BAO_DUONG: 'trang_bi.bao_duong',
  SUA_CHUA: 'trang_bi.sua_chua',
  NIEM_CAT: 'trang_bi.niem_cat',
  DIEU_DONG: 'trang_bi.dieu_dong',
};

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function mapLegacyLoaiNghiepVu(loai) {
  switch (normalizeText(loai)) {
    case 'bao_quan':
      return FIELD_SET_KEYS.BAO_QUAN;
    case 'bao_duong':
      return FIELD_SET_KEYS.BAO_DUONG;
    case 'sua_chua':
      return FIELD_SET_KEYS.SUA_CHUA;
    case 'niem_cat':
      return FIELD_SET_KEYS.NIEM_CAT;
    case 'dieu_dong':
      return FIELD_SET_KEYS.DIEU_DONG;
    default:
      return '';
  }
}

function inferKeyFromName(name) {
  const normalized = normalizeText(name);
  if (!normalized) return '';
  if (normalized.includes('thong tin chung')) return FIELD_SET_KEYS.THONG_TIN_CHUNG;
  if (normalized.includes('dong bo')) return FIELD_SET_KEYS.DONG_BO;
  if (normalized.includes('thong so')) return FIELD_SET_KEYS.THONG_SO_KY_THUAT;
  if (normalized.includes('chi tiet danh muc')) return FIELD_SET_KEYS.THONG_SO_KY_THUAT;
  return '';
}

function inferKeyFromFieldIds(fieldIds, dynamicFieldById) {
  const keys = (fieldIds ?? [])
    .map((id) => normalizeText(dynamicFieldById[id]?.Key))
    .filter(Boolean);

  if (keys.includes('id_nhom_dong_bo') || keys.includes('trang_thai_dong_bo')) {
    return FIELD_SET_KEYS.DONG_BO;
  }

  return '';
}

function inferFieldSetKey(doc, dynamicFieldById) {
  const currentKey = String(doc.Key ?? '').trim();
  if (currentKey) return currentKey;

  const byLoai = mapLegacyLoaiNghiepVu(doc.LoaiNghiepVu);
  if (byLoai) return byLoai;

  if (Array.isArray(doc.MaDanhMucTrangBi) && doc.MaDanhMucTrangBi.length > 0) {
    return FIELD_SET_KEYS.THONG_SO_KY_THUAT;
  }

  const byFieldIds = inferKeyFromFieldIds(doc.FieldIds, dynamicFieldById);
  if (byFieldIds) return byFieldIds;

  const byName = inferKeyFromName(doc.Name);
  if (byName) return byName;

  return '';
}

const fieldSetCollection = db.getCollection('FieldSet');
const dynamicFieldCollection = db.getCollection('DynamicField');

const dynamicFieldById = {};
dynamicFieldCollection.find({}, { _id: 1, Key: 1 }).forEach((doc) => {
  dynamicFieldById[String(doc._id)] = doc;
});

let scanned = 0;
let updated = 0;
let unsetLoai = 0;
const unresolved = [];
const countsByKey = {};

fieldSetCollection.find({ Delete: { $ne: true } }).forEach((doc) => {
  scanned += 1;
  const key = inferFieldSetKey(doc, dynamicFieldById);

  const update = {};
  const unset = {};
  let changed = false;

  if (key && String(doc.Key ?? '').trim() !== key) {
    update.Key = key;
    countsByKey[key] = (countsByKey[key] ?? 0) + 1;
    changed = true;
  } else if (key) {
    countsByKey[key] = (countsByKey[key] ?? 0) + 1;
  }

  if (doc.LoaiNghiepVu !== undefined) {
    unset.LoaiNghiepVu = '';
    unsetLoai += 1;
    changed = true;
  }

  if (changed) {
    const modifier = {};
    if (Object.keys(update).length > 0) modifier.$set = update;
    if (Object.keys(unset).length > 0) modifier.$unset = unset;
    fieldSetCollection.updateOne({ _id: doc._id }, modifier);
    updated += 1;
  }

  if (!key) {
    unresolved.push({
      _id: doc._id,
      Name: doc.Name ?? '',
      MaDanhMucTrangBi: doc.MaDanhMucTrangBi ?? [],
      FieldIds: doc.FieldIds ?? [],
    });
  }
});

print(`Scanned: ${scanned}`);
print(`Updated: ${updated}`);
print(`Removed LoaiNghiepVu: ${unsetLoai}`);
print('Counts by key:');
Object.keys(countsByKey)
  .sort()
  .forEach((key) => print(`  ${key}: ${countsByKey[key]}`));

if (unresolved.length > 0) {
  print(`Unresolved (${unresolved.length}):`);
  unresolved.slice(0, 20).forEach((doc) => printjson(doc));
} else {
  print('All active FieldSet docs resolved successfully.');
}
