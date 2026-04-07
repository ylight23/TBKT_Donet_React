/**
 * Remove legacy "__meta:*" tokens from FormConfig.Tabs.FieldSetIds.
 *
 * Usage:
 *   mongosh "mongodb://localhost:27017/quanly_dmcanbo" --file scripts/migrate-remove-formconfig-meta-setids.mongosh.js
 */

const dbName = db.getName();
print(`[migrate-remove-formconfig-meta-setids] database=${dbName}`);

const isActive = { Delete: { $ne: true } };
const META_PREFIX = "__meta:";

const formConfigs = db.FormConfig.find(isActive).toArray();
let touchedCount = 0;
let tabTouchedCount = 0;

for (const form of formConfigs) {
  const tabs = Array.isArray(form.Tabs) ? form.Tabs : [];
  let formChanged = false;

  const nextTabs = tabs.map((tab) => {
    const setIds = Array.isArray(tab.FieldSetIds) ? tab.FieldSetIds : [];
    const cleaned = setIds
      .filter((id) => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0 && !id.toLowerCase().startsWith(META_PREFIX));

    const changed = cleaned.length !== setIds.length;
    if (!changed) return tab;

    formChanged = true;
    tabTouchedCount += 1;
    return { ...tab, FieldSetIds: cleaned };
  });

  if (!formChanged) continue;

  db.FormConfig.updateOne(
    { _id: form._id },
    {
      $set: {
        Tabs: nextTabs,
        ModifyDate: new Date(),
        NguoiSua: "migrate-remove-formconfig-meta-setids",
      },
      $inc: { Version: 1 },
    },
  );
  touchedCount += 1;
}

printjson({
  scannedForms: formConfigs.length,
  updatedForms: touchedCount,
  updatedTabs: tabTouchedCount,
});

