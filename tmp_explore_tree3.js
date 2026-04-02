// Get all first-level categories per CN with counts
const cns = ['B', 'T', 'O', 'I', 'G', 'F'];
cns.forEach(cn => {
    const parent = cn + '.0.00.00.00.00.000';
    const cats = db.DanhMucTrangBi.find({ IdCapTren: parent }).sort({ _id: 1 }).toArray();
    print('=== CN:', cn, '- ', cats.length, 'first-level categories ===');
    cats.forEach(c => {
        const childCount = db.DanhMucTrangBi.countDocuments({ IdCapTren: c._id });
        // extract the L1 number from ID: B.1.00.00.00.00.000 -> 1
        const l1 = c._id.split('.')[1];
        print('  ', c._id, '| L1:', l1, '| Ten:', c.Ten, '| Children:', childCount);
    });
    print('');
});

// Check DanhMucChuyenNganh for names
print('=== DanhMucChuyenNganh ===');
const dmcn = db.DanhMucChuyenNganh.find({}).sort({ ThuTu: 1 }).toArray();
dmcn.forEach(d => print(d._id, '|', d.Ten, '|', d.TenDayDu));
