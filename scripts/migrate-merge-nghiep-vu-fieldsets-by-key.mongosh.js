/*
  Keep only one canonical FieldSet per runtime key for schedule modules.
  Mark non-canonical FieldSet docs as Delete=true to avoid fragmented runtime forms.

  Run:
    mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-merge-nghiep-vu-fieldsets-by-key.mongosh.js
*/

const dbx = db.getSiblingDB('quanly_dmcanbo');
const NOW = new Date();
const USER = 'migration-merge-nghiep-vu-fieldsets';

function ts(date) {
  const millis = date.getTime();
  return {
    Seconds: NumberLong(String(Math.floor(millis / 1000))),
    Nanos: (millis % 1000) * 1000000,
  };
}

const canonicalByKey = {
  'trang_bi.bao_quan': 'e3b0c442-98fc-1c39-b35a-b44d88e90001',
  'trang_bi.bao_duong': 'e3b0c442-98fc-1c39-b35a-b44d88e90020',
  'trang_bi.sua_chua': 'e3b0c442-98fc-1c39-b35a-b44d88e90030',
  'trang_bi.niem_cat': 'e3b0c442-98fc-1c39-b35a-b44d88e90040',
  'trang_bi.dieu_dong': 'e3b0c442-98fc-1c39-b35a-b44d88e90050',
  'trang_bi.chuyen_cap_chat_luong': '7f31117e-ad92-4353-c8f3-7c05a5f51001',
};

const result = [];
for (const [key, keepId] of Object.entries(canonicalByKey)) {
  const query = {
    Key: key,
    _id: { $ne: keepId },
    Delete: { $ne: true },
  };
  const matched = dbx.FieldSet.countDocuments(query);

  if (matched > 0) {
    dbx.FieldSet.updateMany(
      query,
      {
        $set: {
          Delete: true,
          ModifyDate: ts(NOW),
          ModifyBy: USER,
          NguoiSua: USER,
        },
      },
    );
  }

  result.push({ key, kept: keepId, deleted: matched });
}

printjson({ ok: true, result });
