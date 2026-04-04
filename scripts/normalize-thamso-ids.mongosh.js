const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

function normalizeRootIds(collectionName) {
  const collection = database.getCollection(collectionName);
  const docs = collection.find({ $or: [{ Id: null }, { Id: { $exists: false } }] }).toArray();
  let updated = 0;

  docs.forEach((doc) => {
    if (!doc || doc._id == null) return;
    collection.updateOne(
      { _id: doc._id },
      { $set: { Id: String(doc._id) } },
    );
    updated += 1;
  });

  return updated;
}

function normalizeFormConfigTabs() {
  const collection = database.getCollection('FormConfig');
  const docs = collection.find({ Tabs: { $exists: true, $ne: null } }).toArray();
  let updated = 0;

  docs.forEach((doc) => {
    const tabs = Array.isArray(doc.Tabs) ? doc.Tabs : [];
    let dirty = false;
    const nextTabs = tabs.map((tab) => {
      if (!tab || typeof tab !== 'object') return tab;
      if (tab.Id != null && tab.Id !== '') return tab;
      if (tab._id == null || tab._id === '') return tab;
      dirty = true;
      return {
        ...tab,
        Id: String(tab._id),
      };
    });

    if (dirty) {
      collection.updateOne(
        { _id: doc._id },
        { $set: { Tabs: nextTabs } },
      );
      updated += 1;
    }
  });

  return updated;
}

const result = {
  DynamicField: normalizeRootIds('DynamicField'),
  FieldSet: normalizeRootIds('FieldSet'),
  FormConfig: normalizeRootIds('FormConfig'),
  FormConfigTabs: normalizeFormConfigTabs(),
};

printjson(result);
