const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const rolePermission = database.getCollection('RolePermission');
const userPermissionCache = database.getCollection('UserPermission');

const now = new Date();
const systemUser = 'migration.one-code-per-menu';
const maPhanHe = 'TBKT.ThongTin';

const codeMap = {
  thamso_dynamicfield: 'config.param',
  thamso_fieldset: 'config.param',
  thamso_formconfig: 'config.param',
  thamso_templatelayout: 'config.template',
  thamso_dynamicmenu_datasource: 'config.datasource',
  thamso_dynamicmenu: 'config.menu',
  'tech.preservation': 'trangbilog.bao_quan',
  'tech.maintenance': 'trangbilog.bao_duong',
  'tech.repair': 'trangbilog.sua_chua',
  'tech.repair.view': 'trangbilog.sua_chua',
  'tech.repair.create': 'trangbilog.sua_chua',
  'tech.storage': 'trangbilog.niem_cat',
  'tech.storage.view': 'trangbilog.niem_cat',
  'tech.storage.create': 'trangbilog.niem_cat',
  'tech.transfer': 'trangbilog.dieu_dong',
};

const actionNames = ['view', 'add', 'edit', 'delete', 'approve', 'unapprove', 'download', 'print'];

function readActions(doc) {
  const source = doc.Actions || {};
  const actions = {};
  for (const action of actionNames) {
    actions[action] = source[action] === true;
  }
  if (!Object.values(actions).some(Boolean)) actions.view = true;
  return actions;
}

function mergeActions(a, b) {
  const merged = {};
  for (const action of actionNames) {
    merged[action] = a[action] === true || b[action] === true;
  }
  return merged;
}

const grouped = new Map();
let oldDocs = 0;

for (const [oldCode, newCode] of Object.entries(codeMap)) {
  const docs = rolePermission.find({ MaChucNang: oldCode }).toArray();
  for (const doc of docs) {
    oldDocs += 1;
    const key = `${doc.IdNhomNguoiDung}::${newCode}`;
    const existing = grouped.get(key) || {
      idNhom: doc.IdNhomNguoiDung,
      code: newCode,
      actions: {},
    };
    existing.actions = mergeActions(existing.actions, readActions(doc));
    grouped.set(key, existing);
  }
}

let upserted = 0;
for (const item of grouped.values()) {
  const current = rolePermission.findOne({
    IdNhomNguoiDung: item.idNhom,
    MaChucNang: item.code,
  });
  const nextActions = current
    ? mergeActions(readActions(current), item.actions)
    : item.actions;

  rolePermission.updateOne(
    {
      IdNhomNguoiDung: item.idNhom,
      MaChucNang: item.code,
    },
    {
      $setOnInsert: {
        _id: `${item.idNhom}::${item.code}`,
        NguoiTao: systemUser,
        NgayTao: now,
      },
      $set: {
        IdNhomNguoiDung: item.idNhom,
        MaChucNang: item.code,
        MaPhanHe: maPhanHe,
        Actions: nextActions,
        NguoiSua: systemUser,
        NgaySua: now,
      },
    },
    { upsert: true },
  );
  upserted += 1;
}

const deletedOld = rolePermission.deleteMany({
  MaChucNang: { $in: Object.keys(codeMap) },
}).deletedCount;

const deletedCache = userPermissionCache.deleteMany({}).deletedCount;

printjson({
  dbName,
  oldDocs,
  upserted,
  deletedOld,
  deletedUserPermissionCache: deletedCache,
});
