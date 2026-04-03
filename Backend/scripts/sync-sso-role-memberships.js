/*
Usage:
  mongosh "mongodb://localhost:27017/quanly_dmcanbo" --quiet Backend/scripts/sync-sso-role-memberships.js

Optional vars:
  --eval "var DRY_RUN=true;"
  --eval "var ADMIN_GROUP_NAME='Quản trị hệ thống';"
  --eval "var USER_GROUP_NAME='Cổng thông tin';"
  --eval "var DEFAULT_SCOPE_TYPE='Subtree';"
*/

const dryRun = typeof DRY_RUN !== "undefined" ? Boolean(DRY_RUN) : false;
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

const ssoCollection = db.getCollection("SsoNguoiDungMap");
const employeeCollection = db.getCollection("Employee");
const groupCollection = db.getCollection("NhomNguoiDung");
const assignmentCollection = db.getCollection("NguoiDungNhomNguoiDung");

const now = new Date();
const newGuid = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
};

const normalizeRole = (value) => {
  const role = String(value ?? "").trim().toLowerCase();
  return role === "admin" ? "admin" : "user";
};

const adminGroup = groupCollection.findOne({ Ten: adminGroupName }, { projection: { _id: 1, Ten: 1 } });
const userGroup = groupCollection.findOne({ Ten: userGroupName }, { projection: { _id: 1, Ten: 1 } });

if (!adminGroup) {
  throw new Error(`Cannot find admin group by Ten='${adminGroupName}' in NhomNguoiDung`);
}
if (!userGroup) {
  throw new Error(`Cannot find user group by Ten='${userGroupName}' in NhomNguoiDung`);
}

const cursor = ssoCollection.find(
  {
    Active: { $ne: false },
  },
  {
    projection: {
      _id: 1,
      UserName: 1,
      Provider: 1,
      Subject: 1,
      Role: 1,
      EmployeeId: 1,
      Active: 1,
    },
  }
);

const summary = {
  dryRun,
  config: {
    adminGroupName,
    userGroupName,
    defaultScopeType,
  },
  groups: {
    adminGroupId: String(adminGroup._id),
    userGroupId: String(userGroup._id),
  },
  scanned: 0,
  skippedMissingEmployeeId: 0,
  skippedMissingEmployee: 0,
  skippedInvalidEmployeeId: 0,
  insertedAssignments: 0,
  updatedAssignments: 0,
  unchangedAssignments: 0,
  affectedUsers: 0,
  sample: [],
};

const affectedUserIds = new Set();

while (cursor.hasNext()) {
  const row = cursor.next();
  summary.scanned += 1;

  const employeeId = String(row.EmployeeId ?? "").trim();
  if (!employeeId) {
    summary.skippedMissingEmployeeId += 1;
    continue;
  }
  if (employeeId.length < 8) {
    summary.skippedInvalidEmployeeId += 1;
    continue;
  }

  const employeeExists = employeeCollection.countDocuments({ _id: employeeId }) > 0;
  if (!employeeExists) {
    summary.skippedMissingEmployee += 1;
    continue;
  }

  const role = normalizeRole(row.Role);
  const targetGroupId = role === "admin" ? String(adminGroup._id) : String(userGroup._id);

  const filter = {
    IdNguoiDung: employeeId,
    IdNhomNguoiDung: targetGroupId,
  };

  const updateDoc = {
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
      NguoiSua: "migration.sso-role-membership",
      NgaySua: now,
    },
    $setOnInsert: {
      _id: newGuid(),
      NguoiTao: "migration.sso-role-membership",
      NgayTao: now,
    },
    $unset: {
      IdDonViScope: "",
      IdDonViUyQuyen: "",
    },
  };

  if (!dryRun) {
    const wr = assignmentCollection.updateOne(filter, updateDoc, { upsert: true });
    if ((wr.upsertedCount || 0) > 0) {
      summary.insertedAssignments += 1;
      affectedUserIds.add(employeeId);
    } else if ((wr.modifiedCount || 0) > 0) {
      summary.updatedAssignments += 1;
      affectedUserIds.add(employeeId);
    } else {
      summary.unchangedAssignments += 1;
    }
  }

  if (summary.sample.length < 20) {
    summary.sample.push({
      userName: row.UserName ?? "",
      provider: row.Provider ?? "",
      subject: row.Subject ?? "",
      role,
      employeeId,
      assignedGroupId: targetGroupId,
    });
  }
}

summary.affectedUsers = affectedUserIds.size;

printjson(summary);
