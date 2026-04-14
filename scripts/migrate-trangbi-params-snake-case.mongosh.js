/**
 * migrate-trangbi-params-snake-case.mongosh.js
 *
 * Mục đích:
 *   - Chuyển đổi trường Parameters trong TrangBiNhom1 và TrangBiNhom2 về
 *     dạng chuẩn: BsonDocument với tất cả key là snake_case.
 *   - Xử lý 2 format cũ:
 *       1. BsonArray [{Name: "maTrangBi", StringValue: "..."}]  → BsonDocument snake_case
 *       2. BsonDocument {"maTrangBi": "...", "hangSanXuat": "..."} → BsonDocument snake_case
 *   - Documents đã có đúng format snake_case sẽ bị skip (idempotent).
 *
 * Chạy:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-trangbi-params-snake-case.mongosh.js
 *
 * Dry-run (xem kết quả mà không ghi):
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-trangbi-params-snake-case.mongosh.js --eval "var DRY_RUN = true"
 */

const DRY_RUN = (typeof DRY_RUN !== 'undefined') ? DRY_RUN : false;
const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

// ─── Key mapping: camelCase / legacy alias → snake_case ───────────────────────
const KEY_TO_SNAKE = {
  // identity (already snake_case — kept for merging BsonArray values)
  ma_trang_bi:         'ma_trang_bi',
  ten_trang_bi:        'ten_trang_bi',
  so_hieu:             'so_hieu',
  don_vi:              'don_vi',
  phan_nganh:          'phan_nganh',
  don_vi_quan_ly:      'don_vi_quan_ly',
  loai:                'loai',
  chat_luong:          'chat_luong',
  trang_thai:          'trang_thai',
  tinh_trang_ky_thuat: 'tinh_trang_ky_thuat',
  nam_san_xuat:        'nam_san_xuat',
  nam_su_dung:         'nam_su_dung',
  nien_han_su_dung:    'nien_han_su_dung',
  nuoc_san_xuat:       'nuoc_san_xuat',
  hang_san_xuat:       'hang_san_xuat',
  // camelCase aliases
  maTrangBi:         'ma_trang_bi',
  tenTrangBi:        'ten_trang_bi',
  ten:               'ten_trang_bi',
  serial:            'so_hieu',
  serial_number:     'so_hieu',
  donVi:             'don_vi',
  phanNganh:         'phan_nganh',
  donViQuanLy:       'don_vi_quan_ly',
  chatLuong:         'chat_luong',
  trangThai:         'trang_thai',
  tinhTrangKyThuat:  'tinh_trang_ky_thuat',
  namSanXuat:        'nam_san_xuat',
  namSuDung:         'nam_su_dung',
  nienHanSuDung:     'nien_han_su_dung',
  nuocSanXuat:       'nuoc_san_xuat',
  hangSanXuat:       'hang_san_xuat',
};

const CANONICAL_KEYS = new Set(Object.values(KEY_TO_SNAKE));

function resolveKey(k) {
  return KEY_TO_SNAKE[k] || k; // unknown keys: keep as-is
}

// Returns true if the value is already a plain BsonDocument AND no key needs renaming
// (i.e. every key maps to itself — unknown custom keys are treated as already normalized)
function isAlreadyNormalized(params) {
  if (params === null || typeof params !== 'object' || Array.isArray(params)) return false;
  const keys = Object.keys(params);
  if (keys.length === 0) return true;
  // If any key would be renamed by our mapping, it's not normalized
  return keys.every(k => resolveKey(k) === k && typeof params[k] === 'string');
}

// Converts StringValue field: handles both plain string and old proto binary bug
// (the binary proto wire format for StringValue starts with 0x0A = field tag 1, wire type 2)
// If it's a Buffer/Uint8Array, try to extract the string from proto wire format.
function extractStringValue(val) {
  if (typeof val === 'string') return val;
  // Binary from old WellKnownTypes.StringValue serialization
  // Wire format: \x0A <len> <utf8 string>
  if (val && typeof val === 'object' && (val.buffer || val instanceof Uint8Array || Buffer.isBuffer(val))) {
    try {
      const buf = Buffer.isBuffer(val) ? val : Buffer.from(val);
      if (buf.length > 2 && buf[0] === 0x0A) {
        const len = buf[1];
        if (buf.length >= 2 + len) {
          return buf.slice(2, 2 + len).toString('utf8');
        }
      }
    } catch (_) {}
  }
  return ''; // give up — data already corrupted
}

// Normalizes a Parameters value (BsonArray or BsonDocument) to a canonical snake_case object
function normalizeParams(rawParams) {
  const result = {};

  if (Array.isArray(rawParams)) {
    // Legacy BsonArray: [{Name: "key", StringValue: "value"}]
    for (const item of rawParams) {
      if (!item || typeof item !== 'object') continue;
      const rawKey = item.Name;
      if (!rawKey || typeof rawKey !== 'string') continue;
      const key = resolveKey(rawKey);
      if (key in result) continue; // first-writer wins
      result[key] = extractStringValue(item.StringValue);
    }
  } else if (rawParams && typeof rawParams === 'object') {
    // BsonDocument: {"camelCaseKey": "value"} or already snake_case
    for (const [k, v] of Object.entries(rawParams)) {
      const key = resolveKey(k);
      if (key in result) continue;
      result[key] = typeof v === 'string' ? v : (v !== null && v !== undefined ? String(v) : '');
    }
  }

  return result;
}

function migrateCollection(collName) {
  const coll = database.getCollection(collName);
  let updated = 0;
  let skipped = 0;
  let noParams = 0;
  let errors = 0;

  coll.find({}).forEach(doc => {
    try {
      const rawParams = doc.Parameters;

      // No Parameters field — skip
      if (rawParams === undefined || rawParams === null) {
        noParams++;
        return;
      }

      // Already canonical snake_case BsonDocument — skip
      if (isAlreadyNormalized(rawParams)) {
        skipped++;
        return;
      }

      const normalized = normalizeParams(rawParams);

      if (!DRY_RUN) {
        coll.updateOne({ _id: doc._id }, { $set: { Parameters: normalized } });
      } else {
        print(`  [DRY] _id=${doc._id}  before=${JSON.stringify(rawParams).substring(0, 80)}  after=${JSON.stringify(normalized).substring(0, 80)}`);
      }
      updated++;
    } catch (err) {
      print(`  [ERROR] _id=${doc._id}: ${err}`);
      errors++;
    }
  });

  print(`${collName}: updated=${updated}, skipped=${skipped}, noParams=${noParams}, errors=${errors}`);
}

print(`\n=== migrate-trangbi-params-snake-case${DRY_RUN ? ' [DRY RUN]' : ''} ===`);
migrateCollection('TrangBiNhom1');
migrateCollection('TrangBiNhom2');
print('=== Done ===\n');
