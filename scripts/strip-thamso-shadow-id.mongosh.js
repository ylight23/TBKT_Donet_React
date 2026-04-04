const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const result = {
  dynamicField: database.DynamicField.updateMany(
    { Id: { $exists: true } },
    { $unset: { Id: '' } },
  ).modifiedCount,
  fieldSet: database.FieldSet.updateMany(
    { Id: { $exists: true } },
    { $unset: { Id: '' } },
  ).modifiedCount,
  formConfig: database.FormConfig.updateMany(
    { Id: { $exists: true } },
    { $unset: { Id: '' } },
  ).modifiedCount,
  formConfigTabs: database.FormConfig.updateMany(
    { 'Tabs.Id': { $exists: true } },
    { $unset: { 'Tabs.$[].Id': '' } },
  ).modifiedCount,
};

printjson(result);
