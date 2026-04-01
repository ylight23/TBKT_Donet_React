/*
Usage:
  mongosh "mongodb://localhost:27017/quanly_dmcanbo" --quiet `
    --eval "var MAPPING_FILE='Backend/scripts/sso-subject-employee-mapping.sample.json'; var DRY_RUN=true;" `
    Backend/scripts/import-sso-subject-employee-mapping.js

  mongosh "mongodb://localhost:27017/quanly_dmcanbo" --quiet `
    --eval "var MAPPING_FILE='D:/mapping.json'; var AUTO_ASSIGN_MEMBERSHIP=true;" `
    Backend/scripts/import-sso-subject-employee-mapping.js

Input JSON:
[
  {
    "provider": "wso2",
    "issuer": "https://localhost:9443/oauth2/token",
    "subject": "00u123abc",
    "employeeId": "a4e209b6-85d3-44bf-90ab-5e5bc9b42e5e",
    "userName": "nguyenvandat",
    "role": "user",
    "active": true,
    "lastLoginAt": "2026-03-27T01:07:08.333Z",
    "lastAccessAt": "2026-03-27T02:30:00.000Z"
  }
]
*/

const mappingFile =
  typeof MAPPING_FILE !== "undefined" && MAPPING_FILE
    ? String(MAPPING_FILE)
    : "Backend/scripts/sso-subject-employee-mapping.sample.json";
const dryRun = typeof DRY_RUN !== "undefined" ? Boolean(DRY_RUN) : false;

const mappingCollection = db.getCollection("SsoNguoiDungMap");
const employeeCollection = db.getCollection("Employee");
const groupCollection = db.getCollection("NhomNguoiDung");
const assignmentCollection = db.getCollection("NguoiDungNhomNguoiDung");
const now = new Date();
const newGuid = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};
const autoAssignMembership =
  typeof AUTO_ASSIGN_MEMBERSHIP !== "undefined" ? Boolean(AUTO_ASSIGN_MEMBERSHIP) : false;
const adminGroupName =
  typeof ADMIN_GROUP_NAME !== "undefined" && ADMIN_GROUP_NAME
    ? String(ADMIN_GROUP_NAME)
    : "Quản trị hệ thống";
const userGroupName =
  typeof USER_GROUP_NAME !== "undefined" && USER_GROUP_NAME
    ? String(USER_GROUP_NAME)
    : "Nhóm trợ lý TBKT Thông tin";
const defaultScopeType =
  typeof DEFAULT_SCOPE_TYPE !== "undefined" && DEFAULT_SCOPE_TYPE
    ? String(DEFAULT_SCOPE_TYPE)
    : "Subtree";

const readJsonFile = (path) => {
  const raw = fs.readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return EJSON.parse(raw);
  }
};

const toDateOrNull = (value) => {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeRole = (value) => {
  const role = String(value ?? "").trim().toLowerCase();
  return role === "admin" ? "admin" : "user";
};

const rows = readJsonFile(mappingFile);
if (!Array.isArray(rows)) {
  throw new Error(`Mapping file must be JSON array: ${mappingFile}`);
}

const result = {
  mappingFile,
  dryRun,
  autoAssignMembership,
  total: rows.length,
  processed: 0,
  skippedInvalid: 0,
  skippedEmployeeNotFound: 0,
  upserted: 0,
  modified: 0,
  unchanged: 0,
  membershipInserted: 0,
  membershipUpdated: 0,
  membershipUnchanged: 0,
};

let adminGroup = null;
let userGroup = null;
if (autoAssignMembership) {
  adminGroup = groupCollection.findOne({ Ten: adminGroupName }, { projection: { _id: 1 } });
  userGroup = groupCollection.findOne({ Ten: userGroupName }, { projection: { _id: 1 } });
  if (!adminGroup) throw new Error(`Cannot find admin group: ${adminGroupName}`);
  if (!userGroup) throw new Error(`Cannot find user group: ${userGroupName}`);
}

rows.forEach((row, index) => {
  const provider = isNonEmptyString(row.provider) ? String(row.provider).trim() : "sso";
  const issuer = isNonEmptyString(row.issuer) ? String(row.issuer).trim() : provider;
  const subject = isNonEmptyString(row.subject) ? String(row.subject).trim() : "";
  const employeeId = isNonEmptyString(row.employeeId) ? String(row.employeeId).trim() : "";
  const userName = isNonEmptyString(row.userName) ? String(row.userName).trim() : null;
  const role = normalizeRole(row.role);
  const active = row.active === false ? false : true;
  const lastLoginAt = toDateOrNull(row.lastLoginAt);
  const lastAccessAt = toDateOrNull(row.lastAccessAt);

  if (!subject || !employeeId) {
    result.skippedInvalid += 1;
    return;
  }

  const employeeExists = employeeCollection.countDocuments({ _id: employeeId }) > 0;
  if (!employeeExists) {
    result.skippedEmployeeNotFound += 1;
    return;
  }

  const setDoc = {
    Provider: provider,
    Issuer: issuer,
    Subject: subject,
    EmployeeId: employeeId,
    Role: role,
    Active: active,
    UpdatedAt: now,
  };

  if (userName) setDoc.UserName = userName;
  if (lastLoginAt) setDoc.LastLoginAt = lastLoginAt;
  if (lastAccessAt) setDoc.LastAccessAt = lastAccessAt;

  if (!dryRun) {
    const writeResult = mappingCollection.updateOne(
      { Provider: provider, Subject: subject },
      {
        $set: setDoc,
        $setOnInsert: {
          CreatedAt: now,
        },
      },
      { upsert: true }
    );

    result.upserted += writeResult.upsertedCount || 0;
    result.modified += writeResult.modifiedCount || 0;
    if ((writeResult.upsertedCount || 0) === 0 && (writeResult.modifiedCount || 0) === 0) {
      result.unchanged += 1;
    }

    if (autoAssignMembership) {
      const targetGroupId = role === "admin" ? String(adminGroup._id) : String(userGroup._id);
      const membershipResult = assignmentCollection.updateOne(
        {
          IdNguoiDung: employeeId,
          IdNhomNguoiDung: targetGroupId,
        },
        {
          $set: {
            IdNguoiDung: employeeId,
            IdNhomNguoiDung: targetGroupId,
            ScopeType: defaultScopeType,
            IdDonViUyQuyenQT: null,
            IdNganhDoc: [],
            NgayHetHan: null,
            IdNguoiUyQuyen: null,
            IdDanhMucChuyenNganh: "",
            IdChuyenNganhDoc: [],
            PhamViChuyenNganh: null,
            Loai: "Direct",
            NguoiSua: "migration.import-sso-subject-employee-mapping",
            NgaySua: now,
          },
          $setOnInsert: {
            _id: newGuid(),
            NguoiTao: "migration.import-sso-subject-employee-mapping",
            NgayTao: now,
          },
          $unset: {
            IdDonViScope: "",
            IdDonViUyQuyen: "",
          },
        },
        { upsert: true }
      );

      if ((membershipResult.upsertedCount || 0) > 0) result.membershipInserted += 1;
      else if ((membershipResult.modifiedCount || 0) > 0) result.membershipUpdated += 1;
      else result.membershipUnchanged += 1;
    }
  }

  result.processed += 1;
});

const mappedEmployeeIds = mappingCollection.distinct("EmployeeId", {
  EmployeeId: { $type: "string" },
});
const mappedSet = new Set(mappedEmployeeIds.map((x) => String(x)));
const totalEmployees = employeeCollection.countDocuments({ Delete: { $ne: true } });
let unmappedEmployees = 0;
employeeCollection.find({ Delete: { $ne: true } }, { projection: { _id: 1 } }).forEach((doc) => {
  if (!mappedSet.has(String(doc._id))) unmappedEmployees += 1;
});

printjson({
  ...result,
  totalMappingsInDb: mappingCollection.countDocuments(),
  totalAssignmentsInDb: assignmentCollection.countDocuments(),
  totalEmployees,
  unmappedEmployees,
  sampleUnmappedEmployees: employeeCollection
    .find(
      { Delete: { $ne: true }, _id: { $nin: mappedEmployeeIds } },
      { projection: { _id: 1, HoVaTen: 1, Email: 1, IDDonVi: 1, IdDonVi: 1 } }
    )
    .limit(20)
    .toArray(),
});
