const dbName = db.getName();
print(`Using database: ${dbName}`);

function sameKey(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function keyText(key) {
  return JSON.stringify(key);
}

function ensureIndex(collectionName, key, options) {
  if (!db.getCollectionNames().includes(collectionName)) {
    print(`[SKIP] ${collectionName} does not exist`);
    return;
  }

  const col = db.getCollection(collectionName);
  const indexes = col.getIndexes();
  const existing = indexes.find((item) => sameKey(item.key, key));
  if (existing) {
    print(`[KEEP] ${collectionName}: existing key ${keyText(key)} uses name ${existing.name}`);
    return;
  }

  const name = col.createIndex(key, options);
  print(`[CREATE] ${collectionName}.${name}`);
}

ensureIndex("Office", { Path: 1 }, { name: "idx_office_path" });
ensureIndex("Office", { Depth: 1 }, { name: "idx_office_depth" });
ensureIndex("Office", { IdCapTren: 1 }, { name: "idx_office_parent" });
ensureIndex("Office", { "Parameters.Name": 1, "Parameters.StringValue": 1 }, { name: "idx_office_parameter_name_stringvalue", sparse: true });
ensureIndex("NhomChuyenNganh", { DanhSachCn: 1 }, { name: "idx_nhom_chuyen_nganh_danhsachcn" });
