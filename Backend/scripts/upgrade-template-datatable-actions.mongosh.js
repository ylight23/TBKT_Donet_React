/*
Upgrade DataTable action flags in TemplateLayout.SchemaJson (mongosh).

Usage:
  mongosh "mongodb://localhost:27017/quanly_dmcanbo" --quiet Backend/scripts/upgrade-template-datatable-actions.mongosh.js

Env (optional):
  TEMPLATE_KEY=trang-bi-nhom-2
  APPLY=true
*/

const templateKey = (process?.env?.TEMPLATE_KEY || "trang-bi-nhom-2").trim();
const apply = String(process?.env?.APPLY || "").trim().toLowerCase() === "true";
const actor = "script.upgrade-template-datatable-actions";

const desiredFlags = {
  enableView: "yes",
  enableEdit: "yes",
  enableDelete: "yes",
  enablePrint: "no",
  enableExport: "no",
};

function ensureDataTableFlags(schema) {
  if (!schema || typeof schema !== "object") {
    return { changed: false, changes: [], dataTableCount: 0 };
  }
  const changes = [];
  let dataTableCount = 0;

  const patchBlock = (block, location) => {
    if (!block || typeof block !== "object" || block.type !== "DataTable") return;
    dataTableCount += 1;
    if (!block.props || typeof block.props !== "object") block.props = {};

    Object.keys(desiredFlags).forEach((flag) => {
      const expected = desiredFlags[flag];
      const current = block.props[flag];
      if (current !== expected) {
        changes.push({ location, flag, from: current, to: expected });
        block.props[flag] = expected;
      }
    });
  };

  const content = Array.isArray(schema.content) ? schema.content : [];
  content.forEach((block, idx) => patchBlock(block, `content[${idx}]`));

  const zones = schema.zones && typeof schema.zones === "object" ? schema.zones : {};
  Object.keys(zones).forEach((zoneKey) => {
    const blocks = zones[zoneKey];
    if (!Array.isArray(blocks)) return;
    blocks.forEach((block, idx) => patchBlock(block, `zones.${zoneKey}[${idx}]`));
  });

  return {
    changed: changes.length > 0,
    changes,
    dataTableCount,
  };
}

const col = db.getCollection("TemplateLayout");
const doc = col.findOne({
  Key: templateKey,
  $or: [{ Delete: { $exists: false } }, { Delete: false }],
});

if (!doc) {
  printjson({ ok: false, message: "Template not found", templateKey });
} else {
  let schema;
  try {
    schema = JSON.parse(doc.SchemaJson || "{}");
  } catch (err) {
    printjson({
      ok: false,
      message: "SchemaJson is invalid JSON",
      templateKey,
      error: String(err),
    });
    quit(1);
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
    printjson({ ...report, message: "No changes needed" });
  } else if (!apply) {
    printjson({ ...report, message: "Dry run only. Re-run with APPLY=true to persist." });
  } else {
    const now = new Date();
    const updateRes = col.updateOne(
      { _id: doc._id },
      {
        $set: {
          SchemaJson: JSON.stringify(schema, null, 2),
          ModifyDate: now,
          ModifyBy: actor,
          NguoiSua: actor,
        },
        $inc: { Version: 1 },
      }
    );

    printjson({
      ...report,
      updateMatched: updateRes.matchedCount || 0,
      updateModified: updateRes.modifiedCount || 0,
      message: "Applied",
    });
  }
}

