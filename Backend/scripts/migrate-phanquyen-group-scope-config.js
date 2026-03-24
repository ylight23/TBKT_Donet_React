/* eslint-disable no-console */
const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "quanly_dmcanbo";

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection("NhomNguoiDung");

  const docs = await collection.find({}, { projection: { _id: 1, ScopeType: 1, IdDonViScope: 1, IdNganhDoc: 1, IdNhomChuyenNganh: 1 } }).toArray();
  let modified = 0;

  for (const doc of docs) {
    const scopeType = (doc.ScopeType || "SUBTREE").toString().trim().toUpperCase();
    const update = {
      $set: {
        ScopeType: scopeType,
        IdNhomChuyenNganh: typeof doc.IdNhomChuyenNganh === "string" ? doc.IdNhomChuyenNganh : "",
      },
    };

    if (scopeType === "MULTI_NODE") {
      update.$set.IdDonViScope = "";
      update.$set.IdNganhDoc = Array.isArray(doc.IdNganhDoc)
        ? [...new Set(doc.IdNganhDoc.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()))]
        : [];
    } else {
      update.$set.IdDonViScope = typeof doc.IdDonViScope === "string" ? doc.IdDonViScope : "";
      update.$set.IdNganhDoc = [];
    }

    const result = await collection.updateOne({ _id: doc._id }, update);
    modified += result.modifiedCount;
  }

  console.log(JSON.stringify({ collection: "NhomNguoiDung", processed: docs.length, modified }, null, 2));
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
