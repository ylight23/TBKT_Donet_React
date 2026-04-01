const employeeCollection = db.getCollection("Employee");
const mappingCollection = db.getCollection("SsoNguoiDungMap");
const now = new Date();

const toDateOrNull = (value) => {
  if (value == null) return null;
  if (value instanceof Date) return value;

  if (typeof value === "object") {
    const secondsRaw = value.Seconds ?? value.seconds;
    const nanosRaw = value.Nanos ?? value.nanos ?? 0;
    if (secondsRaw != null) {
      const secondsNum = Number(secondsRaw);
      const nanosNum = Number(nanosRaw);
      if (!Number.isNaN(secondsNum) && !Number.isNaN(nanosNum)) {
        return new Date(secondsNum * 1000 + Math.floor(nanosNum / 1000000));
      }
    }
  }

  return null;
};

const cursor = employeeCollection.find(
  {
    Delete: { $ne: true },
    $or: [
      { DangNhapCuoi: { $exists: true } },
      { TruyCapCuoi: { $exists: true } },
      { AccessLevel: { $exists: true } },
      { dangNhapCuoi: { $exists: true } },
      { truyCapCuoi: { $exists: true } },
      { accessLevel: { $exists: true } },
    ],
  },
  {
    projection: {
      _id: 1,
      DangNhapCuoi: 1,
      TruyCapCuoi: 1,
      AccessLevel: 1,
      dangNhapCuoi: 1,
      truyCapCuoi: 1,
      accessLevel: 1,
    },
  }
);

let scanned = 0;
let modified = 0;
let skippedNoMapping = 0;

while (cursor.hasNext()) {
  const employee = cursor.next();
  scanned += 1;

  const employeeId = String(employee._id);
  const mapping = mappingCollection.findOne({ EmployeeId: employeeId }, { projection: { _id: 1 } });
  if (!mapping) {
    skippedNoMapping += 1;
    continue;
  }

  const loginAt = toDateOrNull(employee.DangNhapCuoi ?? employee.dangNhapCuoi);
  const accessAt = toDateOrNull(employee.TruyCapCuoi ?? employee.truyCapCuoi);
  const legacyAccessLevel = employee.AccessLevel ?? employee.accessLevel ?? null;

  const setDoc = {
    UpdatedAt: now,
  };

  if (loginAt) {
    setDoc.LastLoginAt = loginAt;
  }
  if (accessAt) {
    setDoc.LastAccessAt = accessAt;
  }
  if (legacyAccessLevel !== null && legacyAccessLevel !== undefined) {
    setDoc.LegacyAccessLevel = legacyAccessLevel;
  }

  const updateResult = mappingCollection.updateOne(
    { _id: mapping._id },
    {
      $set: setDoc,
    }
  );

  modified += updateResult.modifiedCount || 0;
}

printjson({
  collection: "SsoNguoiDungMap",
  scanned,
  modified,
  skippedNoMapping,
  totalMappings: mappingCollection.countDocuments(),
});
