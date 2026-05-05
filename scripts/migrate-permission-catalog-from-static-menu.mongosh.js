const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const collection = database.getCollection('PermissionCatalog');

const now = new Date();
const source = 'static-menu';

const staticPermissions = [
  { code: 'equipment.group1', name: 'Trang bị nhóm 1', order: 10 },
  { code: 'equipment.group2', name: 'Trang bị nhóm 2', order: 20 },
  { code: 'tech.status', name: 'Tình trạng kỹ thuật', order: 30 },
  { code: 'trangbilog.bao_quan', name: 'Bảo quản', order: 40 },
  { code: 'trangbilog.bao_duong', name: 'Bảo dưỡng', order: 50 },
  { code: 'trangbilog.sua_chua', name: 'Sửa chữa', order: 60 },
  { code: 'trangbilog.niem_cat', name: 'Niêm cất', order: 70 },
  { code: 'trangbilog.dieu_dong', name: 'Điều động', order: 80 },
  { code: 'tech.quality', name: 'Chuyển cấp chất lượng', order: 90 },
  { code: 'report.view', name: 'Thống kê báo cáo', order: 100 },
  { code: 'config.param', name: 'Cấu hình tham số', order: 110 },
  { code: 'config.template', name: 'Cấu hình template', order: 120 },
  { code: 'config.datasource', name: 'Cấu hình datasource', order: 130 },
  { code: 'config.menu', name: 'Cấu hình menu', order: 140 },
  { code: 'config.role', name: 'Phân quyền', order: 150 },
  { code: 'employee.view', name: 'Nhân viên', order: 160 },
];

const activeCodes = staticPermissions.map((item) => item.code);

collection.updateMany(
  {
    Code: { $nin: activeCodes },
    Group: { $ne: 'Menu động' },
  },
  {
    $set: {
      Active: false,
      Source: 'legacy-permission-group',
      ModifyDate: now,
    },
  },
);

for (const item of staticPermissions) {
  collection.updateOne(
    { Code: item.code },
    {
      $set: {
        Code: item.code,
        Name: item.name,
        Group: 'Menu chức năng',
        Icon: 'Menu',
        GroupOrder: 10,
        Order: item.order,
        Active: true,
        Source: source,
        ModifyDate: now,
      },
      $setOnInsert: {
        CreateDate: now,
      },
    },
    { upsert: true },
  );
}

printjson({
  dbName,
  activeStaticMenuPermissions: activeCodes.length,
  inactiveLegacyPermissions: collection.countDocuments({
    Active: false,
    Source: 'legacy-permission-group',
  }),
  activePermissionCatalog: collection.countDocuments({ Active: true }),
});
