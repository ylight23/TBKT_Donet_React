// Migration: Nested Embedded → Reference by ID
// FieldSet.Fields (embedded DynamicField[]) → FieldSet.FieldIds (string[])
// FormConfig.Tabs[].FieldSets (embedded FieldSet[]) → FormConfig.Tabs[].FieldSetIds (string[])
//
// Run:  mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_embedded_to_refs.js
// Or adjust the connection string / db name as needed.

// ── 1. FieldSet: Fields → FieldIds ──────────────────────────
print("=== Migrating FieldSet collection ===");

const fieldSetDocs = db.FieldSet.find({ Fields: { $exists: true } }).toArray();
print(`Found ${fieldSetDocs.length} FieldSet doc(s) with embedded Fields`);

let fsUpdated = 0;
for (const doc of fieldSetDocs) {
    const fieldIds = (doc.Fields || [])
        .map(f => f._id || f.Id || "")
        .filter(id => id !== "");

    db.FieldSet.updateOne(
        { _id: doc._id },
        {
            $set: { FieldIds: fieldIds },
            $unset: { Fields: "" }
        }
    );
    fsUpdated++;
}
print(`Updated ${fsUpdated} FieldSet doc(s): Fields → FieldIds`);

// ── 2. FormConfig: Tabs[].FieldSets → Tabs[].FieldSetIds ───
print("\n=== Migrating FormConfig collection ===");

const formDocs = db.FormConfig.find({ "Tabs.FieldSets": { $exists: true } }).toArray();
print(`Found ${formDocs.length} FormConfig doc(s) with embedded FieldSets in Tabs`);

let fcUpdated = 0;
for (const doc of formDocs) {
    const tabs = (doc.Tabs || []).map(tab => {
        const fieldSetIds = (tab.FieldSets || [])
            .map(fs => fs._id || fs.Id || "")
            .filter(id => id !== "");

        const newTab = { ...tab, FieldSetIds: fieldSetIds };
        delete newTab.FieldSets;
        return newTab;
    });

    db.FormConfig.updateOne(
        { _id: doc._id },
        { $set: { Tabs: tabs } }
    );
    fcUpdated++;
}
print(`Updated ${fcUpdated} FormConfig doc(s): Tabs[].FieldSets → Tabs[].FieldSetIds`);

print("\n=== Migration complete ===");
