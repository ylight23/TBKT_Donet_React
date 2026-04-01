const employeeCollection = db.getCollection("Employee");
const mappingCollection = db.getCollection("SsoNguoiDungMap");
const now = new Date();

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

const normalizeUserName = (value) => String(value).trim();
const normalizeSubject = (value) => String(value).trim().toLowerCase();

const cursor = employeeCollection.find(
  {
    Delete: { $ne: true },
    $or: [
      { TenTaiKhoan: { $type: "string", $ne: "" } },
      { tenTaiKhoan: { $type: "string", $ne: "" } },
    ],
  },
  { projection: { _id: 1, TenTaiKhoan: 1, tenTaiKhoan: 1 } }
);

let scanned = 0;
let skipped = 0;
let upserted = 0;
let modified = 0;

while (cursor.hasNext()) {
  const employee = cursor.next();
  scanned += 1;

  const userNameRaw = employee.TenTaiKhoan ?? employee.tenTaiKhoan ?? "";
  if (!isNonEmptyString(userNameRaw)) {
    skipped += 1;
    continue;
  }

  const userName = normalizeUserName(userNameRaw);
  const subject = normalizeSubject(userNameRaw);
  const employeeId = String(employee._id);
  const role = subject === "admin" || subject === "superadmin" ? "admin" : "user";

  const result = mappingCollection.updateOne(
    {
      Provider: "local",
      Subject: subject,
    },
    {
      $set: {
        UserName: userName,
        Provider: "local",
        Issuer: "local",
        Subject: subject,
        EmployeeId: employeeId,
        Role: role,
        Active: true,
        UpdatedAt: now,
      },
      $setOnInsert: {
        CreatedAt: now,
        LastLoginAt: null,
      },
      $unset: {
        ExternalUserId: "",
      },
    },
    { upsert: true }
  );

  upserted += result.upsertedCount || 0;
  modified += result.modifiedCount || 0;
}

printjson({
  collection: "SsoNguoiDungMap",
  scanned,
  skipped,
  upserted,
  modified,
  totalMappings: mappingCollection.countDocuments(),
});
