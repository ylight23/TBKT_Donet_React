// Detailed tree exploration
const leaf = db.DanhMucTrangBi.findOne({ CoCapDuoi: false });
if (leaf) { print('=== Leaf node ==='); printjson(leaf); }

print('');
const nhomValues = db.DanhMucTrangBi.distinct('Nhom');
print('=== Distinct Nhom values (count:', nhomValues.length, ') ===');
nhomValues.slice(0, 20).forEach(v => print(' ', v));

print('');
const cnkt = db.DanhMucTrangBi.distinct('IdChuyenNganhKT');
print('=== Distinct IdChuyenNganhKT (count:', cnkt.length, ') ===');
cnkt.forEach(v => print(' ', v));

print('');
const cnRoots = db.DanhMucTrangBi.find({ _id: /^[A-Z]\.0\.00\.00\.00\.00\.000$/ }).toArray();
print('=== CN Root nodes ===');
cnRoots.forEach(r => print(r._id, '|', r.Ten, '| CN:', r.IdChuyenNganhKT));

print('');
const tCategories = db.DanhMucTrangBi.find({ IdCapTren: 'T.0.00.00.00.00.000' }).sort({ ThuTu: 1 }).limit(10).toArray();
print('=== T (Xe May) first-level categories ===');
tCategories.forEach(c => print(c._id, '|', c.Ten, '|', c.TenDayDu));

print('');
const bCategories = db.DanhMucTrangBi.find({ IdCapTren: 'B.0.00.00.00.00.000' }).sort({ ThuTu: 1 }).toArray();
print('=== B (Tau Thuyen) first-level categories ===');
bCategories.forEach(c => print(c._id, '|', c.Ten, '|', c.TenDayDu, '| Nhom:', c.Nhom));
