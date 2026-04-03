// ============================================================
// Migration: ThamSo collections — create indexes
//
// Collections: DynamicField, FieldSet, FormConfig, DynamicMenu,
//              DynamicMenuDataSource, TemplateLayout
//
// Problem: These config collections have zero indexes beyond _id
// but every List query filters on { Delete: { $ne: true } }.
// Compound indexes are needed for lookup-heavy operations
// (GetDynamicMenuRows, SyncFromProto, UpsertDynamicFields).
//
// Run:
//   mongosh "mongodb://localhost:27017/quanly_dmcanbo" migrate_thamso_indexes.js
// ============================================================

print("=== migrate_thamso_indexes.js ===\n");

const INDEXES = [
    // ── DynamicMenuDataSource ──
    // GetDynamicMenuRows + SyncFromProto: filter on SourceKey + Delete
    { col: "DynamicMenuDataSource",
      spec: { SourceKey: 1, Delete: 1 },
      name: "idx_DMDS_SourceKey_Delete" },

    // ── DynamicField ──
    // UpsertDynamicFieldsForSourceAsync: Validation.DataSource + Key + Delete
    { col: "DynamicField",
      spec: { "Validation.DataSource": 1, Key: 1, Delete: 1 },
      name: "idx_DF_DataSource_Key_Delete" },

    // ── FieldSet ──
    // UpsertAutoFieldSetForSourceAsync: Desc (marker) + Delete
    { col: "FieldSet",
      spec: { Desc: 1, Delete: 1 },
      name: "idx_FS_Desc_Delete" },

    // ── TemplateLayout ──
    // Key lookup (future uniqueness / search by key)
    { col: "TemplateLayout",
      spec: { Key: 1 },
      name: "idx_TL_Key" },
];

let created = 0, skipped = 0;

INDEXES.forEach(idx => {
    const col = db.getCollection(idx.col);
    try {
        const existing = col.getIndexes().some(i => i.name === idx.name);
        if (existing) {
            print(`  SKIP  ${idx.col}.${idx.name} (already exists)`);
            skipped++;
            return;
        }
        col.createIndex(idx.spec, { name: idx.name, background: true });
        print(`  CREATE ${idx.col}.${idx.name} → ${JSON.stringify(idx.spec)}`);
        created++;
    } catch (e) {
        print(`  ERROR  ${idx.col}.${idx.name}: ${e.message}`);
    }
});

print(`\nDone: ${created} created, ${skipped} skipped`);

// ── Verify ──
print("\n── Index verification ──");
["DynamicMenuDataSource", "DynamicField", "FieldSet", "TemplateLayout",
 "FormConfig", "DynamicMenu"].forEach(name => {
    const indexes = db.getCollection(name).getIndexes();
    print(`  ${name}: ${indexes.map(i => i.name).join(", ")}`);
});
