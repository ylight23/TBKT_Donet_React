/*
  Migration: add NhomDongBo schema support
  - Ensure collection NhomDongBo exists
  - Add TrangThaiDongBo + IdNhomDongBo defaults to TrangBiNhom1 / TrangBiNhom2
  - Create supporting indexes
*/

const targetCollections = ['TrangBiNhom1', 'TrangBiNhom2'];

function ensureCollection(name) {
  const exists = db.getCollectionNames().includes(name);
  if (!exists) {
    db.createCollection(name);
    print(`[createCollection] ${name}`);
  } else {
    print(`[exists] ${name}`);
  }
}

function patchTrangBiCollection(name) {
  const col = db.getCollection(name);

  const result = col.updateMany(
    {
      $or: [
        { TrangThaiDongBo: { $exists: false } },
        { IdNhomDongBo: { $exists: false } },
      ],
    },
    {
      $set: {
        TrangThaiDongBo: false,
        IdNhomDongBo: null,
      },
    },
  );

  print(`[updateMany] ${name}: matched=${result.matchedCount}, modified=${result.modifiedCount}`);

  col.createIndex({ IdNhomDongBo: 1 }, { name: 'idx_id_nhom_dong_bo' });
}

ensureCollection('NhomDongBo');

for (const name of targetCollections) {
  patchTrangBiCollection(name);
}

db.getCollection('NhomDongBo').createIndex({ IdDonVi: 1 }, { name: 'idx_donvi' });
db.getCollection('NhomDongBo').createIndex({ 'DsTrangBi.Id': 1 }, { name: 'idx_ds_trang_bi_id' });
db.getCollection('NhomDongBo').createIndex({ 'DsTrangBi.Nhom': 1 }, { name: 'idx_ds_trang_bi_nhom' });

print('Done migrate-trangbi-add-nhom-dong-bo-schema');
