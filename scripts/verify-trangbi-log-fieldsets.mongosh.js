const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);
const fs = database.getCollection('FieldSet');
const f = database.getCollection('DynamicField');

print('=== FieldSets by loaiNghiepVu ===');
['bao_quan', 'bao_duong', 'sua_chua', 'niem_cat', 'dieu_dong'].forEach(lnv => {
  const sets = fs.find({ LoaiNghiepVu: lnv, Delete: false }).toArray();
  print(lnv + ': ' + sets.length + ' sets');
  sets.forEach(s => print('  - ' + s.Name + ' (' + s.FieldIds.length + ' fieldIds)'));
});

print('\n=== Total DynamicFields ===');
print(f.find({ Delete: false }).count());

print('\n=== Sample FieldSet ===');
printjson(fs.findOne({ Delete: false, LoaiNghiepVu: 'sua_chua' }));

print('\n=== Sample DynamicField ===');
printjson(f.findOne({ Delete: false }));
