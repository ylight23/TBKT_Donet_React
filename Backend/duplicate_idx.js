print("=== INDEX AUDIT PRO ===");

db.getCollectionNames().forEach(colName => {

    const col = db.getCollection(colName);
    const indexes = col.getIndexes();

    print(`\n📦 ${colName}`);

    // Map usage
    const usageMap = {};
    col.aggregate([{ $indexStats: {} }]).forEach(stat => {
        usageMap[stat.name] = stat.accesses.ops;
    });

    // Detect duplicate
    const keyMap = {};

    indexes.forEach(idx => {
        const keyStr = JSON.stringify(idx.key);

        if (!keyMap[keyStr]) keyMap[keyStr] = [];
        keyMap[keyStr].push(idx);
    });

    indexes.forEach(idx => {
        const usage = usageMap[idx.name] || 0;

        let flag = "✅";

        if (usage === 0) flag = "⚠️ UNUSED";

        const keyStr = JSON.stringify(idx.key);
        if (keyMap[keyStr].length > 1) {
            flag = "❌ DUPLICATE";
        }

        print(`  ${flag} ${idx.name} → ${JSON.stringify(idx.key)} (used: ${usage})`);
    });
});

print("\n=== DONE ===");