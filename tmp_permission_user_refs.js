function isGuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '')); }
const employeeIds = db.Employee.find({}, {_id:1}).toArray().map(d => String(d._id));
const nonGuidEmployees = employeeIds.filter(id => !isGuid(id));
const permissionUserIds = new Set();
['NguoiDungNhomNguoiDung','PhanQuyenPhanHeNguoiDung','PhanQuyenNguoiDung','PhanQuyenNguoiDungNganhDoc','LichSuPhanQuyenScope'].forEach(name => {
  db.getCollection(name).find({}, {IdNguoiDung:1, IdNguoiDuocPhanQuyen:1, IdNguoiThucHien:1, IdNguoiUyQuyenCu:1, IdNguoiUyQuyenMoi:1}).toArray().forEach(doc => {
    ['IdNguoiDung','IdNguoiDuocPhanQuyen','IdNguoiThucHien','IdNguoiUyQuyenCu','IdNguoiUyQuyenMoi'].forEach(key => {
      if (doc[key]) permissionUserIds.add(String(doc[key]));
    });
  });
});
const missingUsers = [...permissionUserIds].filter(id => !employeeIds.includes(id));
const nonGuidPermissionRefs = [...permissionUserIds].filter(id => !isGuid(id));
printjson({ employeeCount: employeeIds.length, nonGuidEmployees, nonGuidPermissionRefs, missingUsers });
