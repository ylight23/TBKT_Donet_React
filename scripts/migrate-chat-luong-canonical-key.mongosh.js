/**
 * Chuẩn hóa key cấp chất lượng của hồ sơ trang bị kỹ thuật:
 * - DynamicField: cap_chat_luong -> chat_luong
 * - TrangBiNhom1/TrangBiNhom2.Parameters.cap_chat_luong -> Parameters.chat_luong
 *
 * Chạy:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-chat-luong-canonical-key.mongosh.js
 */

const dbName = 'quanly_dmcanbo';
const dbx = db.getSiblingDB(dbName);
const now = new Date();

function migrateDynamicField() {
  const result = dbx.DynamicField.updateMany(
    { Key: 'cap_chat_luong', Delete: { $ne: true } },
    {
      $set: {
        Key: 'chat_luong',
        Label: 'Cap chat luong',
        ModifyDate: now,
        NguoiSua: 'migrate-chat-luong-canonical-key',
      },
      $inc: { Version: 1 },
    },
  );
  print(`DynamicField: matched=${result.matchedCount}, modified=${result.modifiedCount}`);
}

function migrateTrangBiCollection(collectionName) {
  const coll = dbx.getCollection(collectionName);
  let updated = 0;
  let skipped = 0;

  coll.find({ 'Parameters.cap_chat_luong': { $exists: true } }).forEach((doc) => {
    const params = doc.Parameters || {};
    const nextParams = { ...params };

    if (!nextParams.chat_luong && nextParams.cap_chat_luong) {
      nextParams.chat_luong = nextParams.cap_chat_luong;
    }
    delete nextParams.cap_chat_luong;

    if (JSON.stringify(params) === JSON.stringify(nextParams)) {
      skipped += 1;
      return;
    }

    coll.updateOne(
      { _id: doc._id },
      {
        $set: {
          Parameters: nextParams,
          NgaySua: {
            Seconds: Math.floor(now.getTime() / 1000),
            Nanos: (now.getTime() % 1000) * 1000000,
          },
          NguoiSua: 'migrate-chat-luong-canonical-key',
        },
      },
    );
    updated += 1;
  });

  print(`${collectionName}: updated=${updated}, skipped=${skipped}`);
}

print('\n=== migrate-chat-luong-canonical-key ===');
migrateDynamicField();
migrateTrangBiCollection('TrangBiNhom1');
migrateTrangBiCollection('TrangBiNhom2');
print('=== Done ===\n');
