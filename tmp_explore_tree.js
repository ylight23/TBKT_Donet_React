// Explore DanhMucTrangBi tree structure
const roots = db.DanhMucTrangBi.find({ IdCapTren: 'B.0.00.00.00.00.000' }).sort({ ThuTu: 1 }).limit(10).toArray();
print('=== First-level categories under B ===');
roots.forEach(r => print(r._id, '|', r.Ten, '|', r.TenDayDu));
print('');
if (roots.length > 0) {
    const children = db.DanhMucTrangBi.find({ IdCapTren: roots[0]._id }).sort({ ThuTu: 1 }).limit(5).toArray();
    print('=== Children of', roots[0]._id, '===');
    children.forEach(c => print(c._id, '|', c.Ten, '|', c.TenDayDu));
}
print('');
// Count first-level categories per CN
const pipeline = [
    { $match: { IdCapTren: { $regex: /^[A-Z]\.\d+\.00\.00\.00\.00\.000$/ } } },
    { $group: { _id: { $substr: ['$IdCapTren', 0, 1] }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
];
const cns = db.DanhMucTrangBi.aggregate(pipeline).toArray();
print('=== Category count per CN ===');
cns.forEach(c => print(c._id, ':', c.count, 'categories'));

// Show all root node patterns
print('');
print('=== Root node patterns ===');
const rootPatterns = db.DanhMucTrangBi.find({ _id: /\.0\.00\.00\.00\.00\.000$/ }).sort({ _id: 1 }).toArray();
rootPatterns.forEach(r => print(r._id, '|', r.Ten));

// Show a sample node with all fields
print('');
print('=== Sample doc fields ===');
const sample = db.DanhMucTrangBi.findOne({ IdCapTren: 'B.0.00.00.00.00.000' });
if (sample) printjson(Object.keys(sample));
