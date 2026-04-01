/* eslint-disable no-undef */
/* global db */

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeScopeType(value) {
  const raw = normalizeString(value).toUpperCase();
  if (!raw) return 'SUBTREE';
  switch (raw) {
    case 'NODEONLY':
    case 'NODE_ONLY':
      return 'NODE_ONLY';
    case 'NODEANDCHILDREN':
    case 'NODE_AND_CHILDREN':
      return 'NODE_AND_CHILDREN';
    case 'MULTINODE':
    case 'MULTI_NODE':
      return 'MULTI_NODE';
    case 'BYATTRIBUTE':
    case 'BY_ATTRIBUTE':
      return 'SUBTREE';
    default:
      return raw;
  }
}

function normalizeList(values) {
  const result = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((value) => {
    const item = normalizeString(value);
    if (!item || seen.has(item)) return;
    seen.add(item);
    result.push(item);
  });
  return result;
}

function fullActions() {
  return ['view', 'add', 'edit', 'delete', 'approve', 'unapprove', 'download', 'print'];
}

function crossActions() {
  return ['view', 'download'];
}

function ensurePhamVi(doc) {
  if (doc.PhamViChuyenNganh && typeof doc.PhamViChuyenNganh === 'object') {
    const ownId = normalizeString(doc.PhamViChuyenNganh.IdChuyenNganh);
    const entries = normalizeList((doc.PhamViChuyenNganh.IdChuyenNganhDoc || []).map((entry) => entry && entry.Id));
    if (ownId && entries.length > 0) {
      return doc.PhamViChuyenNganh;
    }
  }

  const ownId = normalizeString(doc.IdDanhMucChuyenNganh)
    || normalizeList(doc.IdChuyenNganhDoc)[0]
    || normalizeList(doc.IdNganhDoc)[0]
    || '';
  if (!ownId) return null;

  const ids = normalizeList([ownId].concat(doc.IdChuyenNganhDoc || []).concat(doc.IdNganhDoc || []));
  const mapped = ids.map((id) => ({
    Id: id,
    Actions: id === ownId ? fullActions() : crossActions(),
  }));

  return {
    IdChuyenNganh: ownId,
    IdChuyenNganhDoc: mapped,
  };
}

function buildUpdate(doc) {
  const update = {
    $set: {
      ScopeType: normalizeScopeType(doc.ScopeType),
      IdDonViUyQuyenQT: normalizeString(doc.IdDonViUyQuyenQT)
        || normalizeString(doc.IdDonViUyQuyen)
        || normalizeString(doc.IdDonViScope),
    },
    $unset: {
      IdDonViScope: '',
      IdDonViUyQuyen: '',
      IdNganhDoc: '',
      IdNhomChuyenNganh: '',
      IdDanhMucChuyenNganh: '',
      IdChuyenNganhDoc: '',
    },
  };

  const phamVi = ensurePhamVi(doc);
  if (phamVi) {
    update.$set.PhamViChuyenNganh = phamVi;
  } else {
    update.$unset.PhamViChuyenNganh = '';
  }

  return update;
}

function migrateCollection(name) {
  const collection = db.getCollection(name);
  const docs = collection.find({}).toArray();
  if (!docs.length) {
    print(`[schema-v2] ${name}: no documents`);
    return;
  }

  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: buildUpdate(doc),
    },
  }));

  const result = collection.bulkWrite(ops, { ordered: false });
  print(`[schema-v2] ${name}: matched=${result.matchedCount} modified=${result.modifiedCount}`);
}

migrateCollection('NhomNguoiDung');
migrateCollection('NguoiDungNhomNguoiDung');
