const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const collections = {
  roles: database.getCollection('Role'),
  rolePermissions: database.getCollection('RolePermission'),
  roleSubsystemPermissions: database.getCollection('RoleSubsystemPermission'),
};

const now = new Date();
const systemUser = 'seed-script';
const maPhanHe = 'TBKT.ThongTin';
const rootAnchor = '000';

function upsertGroup(group) {
  const roleFilter = { Ten: group.ten };
  const roleUpdate = {
    $set: {
      Ten: group.ten,
      MoTa: group.moTa,
      Color: group.color,
      Loai: 'Custom',
      ScopeType: group.scopeType,
      IsDefault: false,
      IdDonViUyQuyenQT: group.anchorNodeId,
      NguoiSua: systemUser,
      NgaySua: now,
      PhamViChuyenNganh: group.phamViChuyenNganh ?? null,
    },
    $setOnInsert: {
      _id: group.id,
      NguoiTao: systemUser,
      NgayTao: now,
      ClonedFromId: '',
    },
  };

  collections.roles.updateOne(roleFilter, roleUpdate, { upsert: true });
  const roleDoc = collections.roles.findOne(roleFilter, { projection: { _id: 1 } });
  const roleId = roleDoc._id;

  collections.rolePermissions.deleteMany({ IdNhomNguoiDung: roleId });
  collections.roleSubsystemPermissions.deleteMany({ IdNhomNguoiDung: roleId });

  const permissionDocs = group.permissions.map((code, index) => ({
    _id: `${roleId}::${code}`,
    IdNhomNguoiDung: roleId,
    MaChucNang: code,
    MaPhanHe: maPhanHe,
    Actions: { view: true },
    NguoiTao: systemUser,
    NgayTao: now,
    NguoiSua: systemUser,
    NgaySua: now,
    ThuTu: index + 1,
  }));

  if (permissionDocs.length > 0) {
    collections.rolePermissions.insertMany(permissionDocs);
  }

  collections.roleSubsystemPermissions.insertOne({
    _id: `${roleId}::${maPhanHe}`,
    IdNhomNguoiDung: roleId,
    MaPhanHe: maPhanHe,
    TieuDePhanHe: group.ten,
    DuocTruyCap: true,
    ScopeType: group.scopeType,
    IdDonViUyQuyenQT: group.anchorNodeId,
    NguoiTao: systemUser,
    NgayTao: now,
    NguoiSua: systemUser,
    NgaySua: now,
  });

  const cnEntries = group.phamViChuyenNganh && Array.isArray(group.phamViChuyenNganh.IdChuyenNganhDoc)
    ? group.phamViChuyenNganh.IdChuyenNganhDoc
    : [];

  return {
    id: roleId,
    ten: group.ten,
    permissions: group.permissions.length,
    cnIds: cnEntries.map((x) => x.Id),
  };
}

const groups = [
  {
    id: 'sample-role-cn-thong-tin',
    ten: 'Mau - Can bo chuyen nganh Thong tin',
    moTa: 'Nhom mau cho can bo nghiep vu chuyen nganh Thong tin. Duoc xem/them/sua trong chuyen nganh O.',
    color: '#2563eb',
    scopeType: 'SUBTREE',
    anchorNodeId: rootAnchor,
    phamViChuyenNganh: {
      IdChuyenNganh: 'O',
      IdChuyenNganhDoc: [
        { Id: 'O', Actions: ['view', 'add', 'edit', 'download', 'print'] },
      ],
    },
    permissions: [
      'equipment.view',
      'equipment.create',
      'equipment.edit',
      'equipment.export',
      'equipment.group2',
      'tech.status',
      'tech.maintenance',
      'tech.repair.view',
      'tech.repair.create',
      'report.view',
    ],
  },
  {
    id: 'sample-role-cn-rada',
    ten: 'Mau - Can bo chuyen nganh Ra da',
    moTa: 'Nhom mau cho can bo nghiep vu chuyen nganh Ra da. Duoc xem/them/sua trong chuyen nganh I.',
    color: '#0f766e',
    scopeType: 'SUBTREE',
    anchorNodeId: rootAnchor,
    phamViChuyenNganh: {
      IdChuyenNganh: 'I',
      IdChuyenNganhDoc: [
        { Id: 'I', Actions: ['view', 'add', 'edit', 'download', 'print'] },
      ],
    },
    permissions: [
      'equipment.view',
      'equipment.create',
      'equipment.edit',
      'equipment.export',
      'equipment.group1',
      'tech.status',
      'tech.preservation',
      'tech.repair.view',
      'report.view',
    ],
  },
  {
    id: 'sample-role-lanh-dao-da-cn',
    ten: 'Mau - Lanh dao xem bao cao da chuyen nganh',
    moTa: 'Nhom mau cho lanh dao chi xem, in, tai bao cao va danh sach tren nhieu chuyen nganh.',
    color: '#7c3aed',
    scopeType: 'SUBTREE',
    anchorNodeId: rootAnchor,
    phamViChuyenNganh: {
      IdChuyenNganh: 'O',
      IdChuyenNganhDoc: [
        { Id: 'O', Actions: ['view', 'download', 'print'] },
        { Id: 'I', Actions: ['view', 'download', 'print'] },
      ],
    },
    permissions: [
      'equipment.view',
      'tech.status',
      'report.view',
      'report.export',
    ],
  },
  {
    id: 'sample-role-config-tham-so',
    ten: 'Mau - Quan tri cau hinh tham so',
    moTa: 'Nhom mau cho van hanh cau hinh tham so, template, datasource, menu va phan quyen.',
    color: '#ea580c',
    scopeType: 'ALL',
    anchorNodeId: '',
    phamViChuyenNganh: null,
    permissions: [
      'config.view',
      'config.param',
      'config.role',
      'config.template',
      'config.menu',
      'config.audit',
      'thamso_dynamicfield',
      'thamso_fieldset',
      'thamso_formconfig',
      'thamso_dynamicmenu',
      'thamso_dynamicmenu_datasource',
      'thamso_templatelayout',
      'thamso_restore',
    ],
  },
];

const result = groups.map(upsertGroup);
printjson({
  ok: 1,
  db: dbName,
  insertedOrUpdated: result,
});
