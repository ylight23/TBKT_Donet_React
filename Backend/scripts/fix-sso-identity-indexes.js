const collection = db.getCollection("SsoNguoiDungMap");

const normalizeLegacyResult = collection.updateMany(
  { Subject: { $exists: false } },
  [
    {
      $set: {
        Subject: { $ifNull: ["$ExternalUserId", "$UserName"] },
      },
    },
  ]
);

const cleanupLegacyResult = collection.updateMany(
  { ExternalUserId: { $exists: true } },
  { $unset: { ExternalUserId: "" } }
);

try {
  collection.dropIndex("ux_account_employee_map_external_user");
} catch (error) {
  // Ignore if index does not exist.
}
try {
  collection.dropIndex("ux_account_employee_map_username");
} catch (error) {
  // Ignore if index does not exist.
}
try {
  collection.dropIndex("ux_sso_identity_username");
} catch (error) {
  // Ignore if index does not exist.
}
try {
  collection.dropIndex("ux_sso_identity_provider_subject");
} catch (error) {
  // Ignore if index does not exist.
}
try {
  collection.dropIndex("idx_sso_identity_employee");
} catch (error) {
  // Ignore if index does not exist.
}

const providerSubjectIndex = collection.createIndex(
  { Provider: 1, Subject: 1 },
  {
    name: "ux_sso_identity_provider_subject",
    unique: true,
    partialFilterExpression: {
      Provider: { $exists: true, $type: "string" },
      Subject: { $exists: true, $type: "string" },
    },
  },
);

const userNameIndex = collection.createIndex(
  { UserName: 1 },
  {
    name: "ux_sso_identity_username",
    unique: true,
    partialFilterExpression: {
      UserName: { $exists: true, $type: "string" },
    },
  },
);

const employeeIndex = collection.createIndex(
  { EmployeeId: 1 },
  { name: "idx_sso_identity_employee" },
);

printjson({
  collection: "SsoNguoiDungMap",
  normalizedLegacySubject: normalizeLegacyResult.modifiedCount,
  cleanedLegacyExternalUserId: cleanupLegacyResult.modifiedCount,
  createdIndexes: [providerSubjectIndex, userNameIndex, employeeIndex],
  indexes: collection.getIndexes(),
});
