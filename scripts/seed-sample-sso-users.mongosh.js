const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const collections = {
  ssoMap: database.getCollection('SsoNguoiDungMap'),
  userRoleAssignment: database.getCollection('UserRoleAssignment'),
  role: database.getCollection('Role'),
};

const now = new Date();
const systemUser = 'seed-script';

function ensureGroupExists(groupId, groupName) {
  const doc = collections.role.findOne({ _id: groupId }, { projection: { _id: 1, Ten: 1 } });
  if (!doc) {
    throw new Error(`Khong tim thay nhom mau ${groupName} (${groupId}). Hay chay seed-sample-role-groups.mongosh.js truoc.`);
  }
}

const sampleUsers = [
  {
    userName: 'sample.cn.thongtin',
    subject: '8a0c2d6c-2c3b-4d0f-a111-000000000001',
    employeeId: '8a0c2d6c-2c3b-4d0f-a111-000000000001',
    provider: 'wso2',
    issuer: 'wso2',
    role: 'user',
    groupId: 'sample-role-cn-thong-tin',
    groupName: 'Mau - Can bo chuyen nganh Thong tin',
    scopeType: 'SUBTREE',
    anchorNodeId: '000',
    phamViChuyenNganh: {
      IdChuyenNganh: 'O',
      IdChuyenNganhDoc: [
        { Id: 'O', Actions: ['view', 'add', 'edit', 'download', 'print'] },
      ],
    },
  },
  {
    userName: 'sample.cn.rada',
    subject: '8a0c2d6c-2c3b-4d0f-a111-000000000002',
    employeeId: '8a0c2d6c-2c3b-4d0f-a111-000000000002',
    provider: 'wso2',
    issuer: 'wso2',
    role: 'user',
    groupId: 'sample-role-cn-rada',
    groupName: 'Mau - Can bo chuyen nganh Ra da',
    scopeType: 'SUBTREE',
    anchorNodeId: '000',
    phamViChuyenNganh: {
      IdChuyenNganh: 'I',
      IdChuyenNganhDoc: [
        { Id: 'I', Actions: ['view', 'add', 'edit', 'download', 'print'] },
      ],
    },
  },
  {
    userName: 'sample.leader.report',
    subject: '8a0c2d6c-2c3b-4d0f-a111-000000000003',
    employeeId: '8a0c2d6c-2c3b-4d0f-a111-000000000003',
    provider: 'wso2',
    issuer: 'wso2',
    role: 'user',
    groupId: 'sample-role-lanh-dao-da-cn',
    groupName: 'Mau - Lanh dao xem bao cao da chuyen nganh',
    scopeType: 'SUBTREE',
    anchorNodeId: '000',
    phamViChuyenNganh: {
      IdChuyenNganh: 'O',
      IdChuyenNganhDoc: [
        { Id: 'O', Actions: ['view', 'download', 'print'] },
        { Id: 'I', Actions: ['view', 'download', 'print'] },
      ],
    },
  },
  {
    userName: 'sample.config.operator',
    subject: '8a0c2d6c-2c3b-4d0f-a111-000000000004',
    employeeId: '8a0c2d6c-2c3b-4d0f-a111-000000000004',
    provider: 'wso2',
    issuer: 'wso2',
    role: 'user',
    groupId: 'sample-role-config-tham-so',
    groupName: 'Mau - Quan tri cau hinh tham so',
    scopeType: 'ALL',
    anchorNodeId: '',
    phamViChuyenNganh: null,
  },
];

for (const user of sampleUsers) {
  ensureGroupExists(user.groupId, user.groupName);

  collections.ssoMap.updateOne(
    { UserName: user.userName },
    {
      $set: {
        UserName: user.userName,
        Subject: user.subject,
        EmployeeId: user.employeeId,
        Provider: user.provider,
        Issuer: user.issuer,
        Role: user.role,
        Active: true,
        UpdatedAt: now,
      },
      $setOnInsert: {
        CreatedAt: now,
        LastLoginAt: null,
      },
    },
    { upsert: true }
  );

  collections.userRoleAssignment.updateOne(
    {
      IdNguoiDung: user.employeeId,
      IdNhomNguoiDung: user.groupId,
    },
    {
      $set: {
        ScopeType: user.scopeType,
        IdDonViUyQuyenQT: user.anchorNodeId,
        PhamViChuyenNganh: user.phamViChuyenNganh ?? null,
        Loai: 'Direct',
        IdNguoiUyQuyen: '',
        NguoiSua: systemUser,
        NgaySua: now,
      },
      $setOnInsert: {
        _id: `${user.employeeId}::${user.groupId}`,
        NguoiTao: systemUser,
        NgayTao: now,
      },
    },
    { upsert: true }
  );
}

printjson({
  ok: 1,
  db: dbName,
  users: sampleUsers.map((user) => ({
    userName: user.userName,
    subject: user.subject,
    employeeId: user.employeeId,
    role: user.role,
    groupId: user.groupId,
  })),
  note: 'Can tao/cap nhat tai khoan tren WSO2 voi username trung khop de dang nhap thuc te. Backend se resolve qua UserName/Subject trong SsoNguoiDungMap.',
});
