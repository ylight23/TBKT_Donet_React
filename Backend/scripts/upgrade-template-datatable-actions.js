/*
Upgrade DataTable action flags in TemplateLayout.SchemaJson.

Usage:
  node Backend/scripts/upgrade-template-datatable-actions.js --key=trang-bi-nhom-2
  node Backend/scripts/upgrade-template-datatable-actions.js --key=trang-bi-nhom-2 --apply

Env:
  MONGO_URI (default: mongodb://localhost:27017)
  MONGO_DB  (default: quanly_dmcanbo)
*/

const { MongoClient } = require("mongodb");

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DB || "quanly_dmcanbo";

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  if (!found) return fallback;
  return found.slice(name.length + 3);
};
const hasFlag = (name) => args.includes(`--${name}`);

const templateKey = getArg("key", "trang-bi-nhom-2").trim();
const apply = hasFlag("apply");

const desiredFlags = {
  enableView: "yes",
  enableEdit: "yes",
  enableDelete: "yes",
  enablePrint: "no",
  enableExport: "no",
};

const ensureDataTableFlags = (schema) => {
  if (!schema || typeof schema !== "object") {
    return { changed: false, changes: [], dataTableCount: 0 };
  }

  const changes = [];
  let dataTableCount = 0;

  const patchBlock = (block, location) => {
    if (!block || typeof block !== "object" || block.type !== "DataTable") return;
    dataTableCount += 1;
    if (!block.props || typeof block.props !== "object") block.props = {};

    for (const [flag, value] of Object.entries(desiredFlags)) {
      const current = block.props[flag];
      if (current !== value) {
        changes.push({ location, flag, from: current, to: value });
        block.props[flag] = value;
      }
    }
  };

  const content = Array.isArray(schema.content) ? schema.content : [];
  content.forEach((block, idx) => patchBlock(block, `content[${idx}]`));

  const zones = schema.zones && typeof schema.zones === "object" ? schema.zones : {};
  for (const [zoneKey, zoneBlocks] of Object.entries(zones)) {
    if (!Array.isArray(zoneBlocks)) continue;
    zoneBlocks.forEach((block, idx) => patchBlock(block, `zones.${zoneKey}[${idx}]`));
  }

  return {
    changed: changes.length > 0,
    changes,
    dataTableCount,
  };
};

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const col = db.collection("TemplateLayout");

    const doc = await col.findOne({ Key: templateKey, $or: [{ Delete: { $exists: false } }, { Delete: false }] });
    if (!doc) {
      console.log(JSON.stringify({ ok: false, message: "Template not found", templateKey }, null, 2));
      return;
    }

    let schema;
    try {
      schema = JSON.parse(doc.SchemaJson || "{}");
    } catch (err) {
      console.log(JSON.stringify({
        ok: false,
        message: "SchemaJson is invalid JSON",
        templateKey,
        error: String(err),
      }, null, 2));
      return;
    }

    const beforeVersion = Number(doc.Version || 0);
    const patch = ensureDataTableFlags(schema);
    const report = {
      ok: true,
      apply,
      templateKey,
      id: String(doc._id),
      dataTableCount: patch.dataTableCount,
      changed: patch.changed,
      changes: patch.changes,
      beforeVersion,
      afterVersion: patch.changed && apply ? beforeVersion + 1 : beforeVersion,
    };

    if (!patch.changed) {
      console.log(JSON.stringify({ ...report, message: "No changes needed" }, null, 2));
      return;
    }

    if (!apply) {
      console.log(JSON.stringify({ ...report, message: "Dry run only. Re-run with --apply to persist." }, null, 2));
      return;
    }

    const now = new Date();
    const res = await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          SchemaJson: JSON.stringify(schema, null, 2),
          ModifyDate: now,
          ModifyBy: "script.upgrade-template-datatable-actions",
          NguoiSua: "script.upgrade-template-datatable-actions",
        },
        $inc: { Version: 1 },
      }
    );

    console.log(JSON.stringify({
      ...report,
      updateMatched: res.matchedCount || 0,
      updateModified: res.modifiedCount || 0,
      message: "Applied",
    }, null, 2));
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(JSON.stringify({
    ok: false,
    message: "Script failed",
    error: String(err),
  }, null, 2));
  process.exit(1);
});

