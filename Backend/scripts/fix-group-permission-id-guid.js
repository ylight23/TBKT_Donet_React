const COLLECTION = "PhanQuyenNhomNguoiDung";

function isGuid(value) {
  return typeof value === "string"
    && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === "x" ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
}

const collection = db.getCollection(COLLECTION);
const docs = collection.find({}).toArray();

let migrated = 0;
let skipped = 0;

docs.forEach((doc) => {
  if (isGuid(doc._id)) {
    skipped += 1;
    return;
  }

  let newId = generateGuid();
  while (collection.countDocuments({ _id: newId }) > 0) {
    newId = generateGuid();
  }

  const clone = Object.assign({}, doc, { _id: newId });
  collection.insertOne(clone);
  collection.deleteOne({ _id: doc._id });
  migrated += 1;
});

const idAudit = collection.find({}, { _id: 1 }).toArray();
let guid = 0;
let nonGuidString = 0;
let nonString = 0;

idAudit.forEach((doc) => {
  if (typeof doc._id === "string") {
    if (isGuid(doc._id)) guid += 1;
    else nonGuidString += 1;
  } else {
    nonString += 1;
  }
});

printjson({
  collection: COLLECTION,
  total: idAudit.length,
  migrated,
  skipped,
  guid,
  nonGuidString,
  nonString,
});
