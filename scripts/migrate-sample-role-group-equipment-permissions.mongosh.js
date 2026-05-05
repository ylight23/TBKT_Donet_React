const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const collections = {
  role: database.getCollection('Role'),
  rolePermission: database.getCollection('RolePermission'),
  userRoleAssignment: database.getCollection('UserRoleAssignment'),
  userPermission: database.getCollection('UserPermission'),
};

const now = new Date();
const systemUser = 'migration.sample-role-permissions';
const maPhanHe = 'TBKT.ThongTin';

const migrations = [
  {
    roleId: 'sample-role-cn-thong-tin',
    expectedCode: 'equipment.group1',
    staleCode: 'equipment.group2',
    title: 'Quan ly trang bi nhom 1',
  },
  {
    roleId: 'sample-role-cn-rada',
    expectedCode: 'equipment.group2',
    staleCode: 'equipment.group1',
    title: 'Quan ly trang bi nhom 2',
  },
];

const affectedUserIds = new Set();

for (const item of migrations) {
  const roleDoc = collections.role.findOne({ _id: item.roleId });
  if (!roleDoc) {
    print(`[skip] Role not found: ${item.roleId}`);
    continue;
  }

  collections.role.updateOne(
    { _id: item.roleId },
    {
      $set: {
        MaPhanHe: maPhanHe,
        NguoiSua: systemUser,
        NgaySua: now,
      },
    },
  );

  collections.rolePermission.deleteMany({
    IdNhomNguoiDung: item.roleId,
    MaChucNang: item.staleCode,
  });

  collections.rolePermission.updateOne(
    {
      IdNhomNguoiDung: item.roleId,
      MaChucNang: item.expectedCode,
    },
    {
      $setOnInsert: {
        _id: `${item.roleId}::${item.expectedCode}`,
        NguoiTao: systemUser,
        NgayTao: now,
      },
      $set: {
        IdNhomNguoiDung: item.roleId,
        MaChucNang: item.expectedCode,
        MaPhanHe: maPhanHe,
        Actions: { view: true },
        TieuDeChucNang: item.title,
        TieuDeNhomQuyen: 'Trang bi ky thuat',
        NguoiSua: systemUser,
        NgaySua: now,
      },
    },
    { upsert: true },
  );

  const assignments = collections.userRoleAssignment.find({ IdNhomNguoiDung: item.roleId }).toArray();
  for (const assignment of assignments) {
    if (assignment.IdNguoiDung) affectedUserIds.add(assignment.IdNguoiDung);
  }
}

const affectedUsers = Array.from(affectedUserIds);
if (affectedUsers.length > 0) {
  const deleteResult = collections.userPermission.deleteMany({ _id: { $in: affectedUsers } });
  print(`[done] Invalidated ${deleteResult.deletedCount} UserPermission cache docs for affected users`);
}

printjson({
  migratedRoles: migrations.map((item) => item.roleId),
  affectedUsers,
  nextStep: 'Nguoi dung reload trang hoac de PermissionSync refetch; backend se rebuild cache khi GetMyPermissions gap cache miss.',
});