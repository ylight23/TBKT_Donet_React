const database = db.getSiblingDB('quanly_dmcanbo');

print('// Auto-generated full export for database quanly_dmcanbo');
print(`// Generated at ${new Date().toISOString()}`);
print("const database = db.getSiblingDB('quanly_dmcanbo');");
print('');
print('function restoreCollection(name, docs) {');
print('  const collection = database.getCollection(name);');
print('  collection.deleteMany({});');
print('  if (docs.length > 0) {');
print('    collection.insertMany(docs);');
print('  }');
print('  print(`Restored ${name}: ${docs.length} document(s)`);');
print('}');
print('');

database.getCollectionNames().sort().forEach((name) => {
  const docs = database.getCollection(name).find({}).toArray();
  const ejson = EJSON.stringify(docs, null, 2);
  const literal = JSON.stringify(ejson);

  print(`// Collection: ${name}`);
  print(`restoreCollection('${name}', EJSON.parse(${literal}));`);
  print('');
});
