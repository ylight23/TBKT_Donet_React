const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const targets = ['DynamicField', 'FieldSet', 'FormConfig'];

function isDateValue(value) {
  return value instanceof Date;
}

function isTimestampDoc(value) {
  return value
    && typeof value === 'object'
    && Object.prototype.hasOwnProperty.call(value, 'Seconds')
    && Object.prototype.hasOwnProperty.call(value, 'Nanos');
}

function toTimestampDoc(date) {
  const ms = date.getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms % 1000) * 1000000);
  return {
    Seconds: NumberLong(seconds),
    Nanos: nanos,
  };
}

function normalizeField(collectionName, fieldName) {
  const collection = database.getCollection(collectionName);
  const docs = collection.find({ [fieldName]: { $type: 'date' } }).toArray();
  let modified = 0;

  docs.forEach((doc) => {
    const current = doc[fieldName];
    if (!isDateValue(current)) {
      return;
    }

    collection.updateOne(
      { _id: doc._id },
      { $set: { [fieldName]: toTimestampDoc(current) } },
    );
    modified += 1;
  });

  return modified;
}

function inspectSample(collectionName) {
  const doc = database.getCollection(collectionName).findOne({});
  if (!doc) {
    return null;
  }

  return {
    _id: doc._id,
    CreateDate: doc.CreateDate,
    ModifyDate: doc.ModifyDate,
    createDateIsTimestamp: isTimestampDoc(doc.CreateDate),
    modifyDateIsTimestamp: isTimestampDoc(doc.ModifyDate),
  };
}

const summary = {};

targets.forEach((name) => {
  const createUpdated = normalizeField(name, 'CreateDate');
  const modifyUpdated = normalizeField(name, 'ModifyDate');
  summary[name] = {
    createUpdated,
    modifyUpdated,
    sample: inspectSample(name),
  };
});

printjson({
  ok: 1,
  db: dbName,
  summary,
});
