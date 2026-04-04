/**
 * Repair mapping ownership FieldSet -> FormConfig used by
 * TrangBi config manager (keys: trangbi-<cn>, trangbi-<cn>-<l1>).
 *
 * Focus:
 * - CN O (Thong tin)
 * - CN I (Ra da)
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/repair-trangbi-fieldset-ownership.mongosh.js
 */

const now = new Date();
const toProtoTs = (date) => ({
  Seconds: NumberLong(Math.floor(date.getTime() / 1000)),
  Nanos: NumberInt((date.getMilliseconds() || 0) * 1000000),
});

const byName = (nameRegex) =>
  db.FieldSet.findOne({ Delete: { $ne: true }, Name: nameRegex }, { _id: 1, Name: 1 });

const fsCommon = byName(/^Thong tin chung$/i);
const fsThongTin = byName(/^Thong so chuyen nganh Thong tin$/i);
const fsRaDa = byName(/^Thong so chuyen nganh Ra da$/i);
const fsCatO101 = byName(/^Chi tiet danh muc O\.1\.01$/i);
const fsCatO102 = byName(/^Chi tiet danh muc O\.1\.02$/i);
const fsCatI101 = byName(/^Chi tiet danh muc I\.1\.01$/i);

if (!fsCommon || !fsThongTin || !fsRaDa) {
  throw new Error(
    `Missing required FieldSet(s): common=${!!fsCommon}, thongtin=${!!fsThongTin}, rada=${!!fsRaDa}`,
  );
}

const ensureFormConfig = ({ key, name, tabs }) => {
  const existing = db.FormConfig.findOne({ Key: key, Delete: { $ne: true } }, { _id: 1, Version: 1, CreateDate: 1, NguoiTao: 1 });
  if (!existing) {
    const id = UUID().toString();
    db.FormConfig.insertOne({
      _id: id,
      Key: key,
      Name: name,
      Desc: '',
      Tabs: tabs,
      Delete: false,
      Version: NumberInt(1),
      CreateDate: toProtoTs(now),
      ModifyDate: toProtoTs(now),
      NguoiTao: 'repair-trangbi-fieldset-ownership',
      NguoiSua: 'repair-trangbi-fieldset-ownership',
    });
    print(`[create] ${key} -> ${id}`);
    return;
  }

  db.FormConfig.updateOne(
    { _id: existing._id },
    {
      $set: {
        Name: name,
        Tabs: tabs,
        ModifyDate: toProtoTs(now),
        NguoiSua: 'repair-trangbi-fieldset-ownership',
        Delete: false,
      },
      $inc: { Version: 1 },
    },
  );
  print(`[update] ${key} -> ${existing._id}`);
};

ensureFormConfig({
  key: 'trangbi-o',
  name: 'Thong so chung - Thong tin',
  tabs: [
    { _id: 'tab-trangbi-o-common', Label: 'Thong tin chung', FieldSetIds: [String(fsCommon._id)] },
    { _id: 'tab-trangbi-o-specialized', Label: 'Thong tin', FieldSetIds: [String(fsThongTin._id)] },
  ],
});

ensureFormConfig({
  key: 'trangbi-i',
  name: 'Thong so chung - Ra da',
  tabs: [
    { _id: 'tab-trangbi-i-common', Label: 'Thong tin chung', FieldSetIds: [String(fsCommon._id)] },
    { _id: 'tab-trangbi-i-specialized', Label: 'Ra da', FieldSetIds: [String(fsRaDa._id)] },
  ],
});

if (fsCatO101 || fsCatO102) {
  ensureFormConfig({
    key: 'trangbi-o-1',
    name: 'TSKT rieng - Thong tin / nhom 1',
    tabs: [
      {
        _id: 'tab-trangbi-o-1-category',
        Label: 'Chi tiet danh muc',
        FieldSetIds: [String((fsCatO101 || fsCatO102)._id)],
      },
    ],
  });
}

if (fsCatI101) {
  ensureFormConfig({
    key: 'trangbi-i-1',
    name: 'TSKT rieng - Ra da / nhom 1',
    tabs: [
      {
        _id: 'tab-trangbi-i-1-category',
        Label: 'Chi tiet danh muc',
        FieldSetIds: [String(fsCatI101._id)],
      },
    ],
  });
}

print('\n[done] repaired ownership mapping for O/I configs');
