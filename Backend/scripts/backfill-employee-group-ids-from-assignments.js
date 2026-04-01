const assignmentCollection = db.getCollection("NguoiDungNhomNguoiDung");
const employeeCollection = db.getCollection("Employee");

const validAssignments = assignmentCollection
  .find(
    {
      IdNguoiDung: { $nin: [null, ""] },
      IdNhomNguoiDung: { $nin: [null, ""] },
    },
    { _id: 0, IdNguoiDung: 1, IdNhomNguoiDung: 1 },
  )
  .toArray();

const grouped = {};
validAssignments.forEach((item) => {
  const userId = String(item.IdNguoiDung);
  const groupId = String(item.IdNhomNguoiDung);
  if (!grouped[userId]) grouped[userId] = new Set();
  grouped[userId].add(groupId);
});

let updated = 0;
let missingEmployee = 0;

Object.keys(grouped).forEach((userId) => {
  const groupIds = Array.from(grouped[userId]);
  const updateResult = employeeCollection.updateOne(
    { _id: userId },
    { $set: { IDNhomNguoiDungs: groupIds } },
  );

  if (updateResult.matchedCount === 0) {
    missingEmployee += 1;
    return;
  }
  if (updateResult.modifiedCount > 0) {
    updated += 1;
  }
});

printjson({
  migration: "backfill-employee-group-ids-from-assignments",
  assignmentCount: validAssignments.length,
  employeeWithAssignments: Object.keys(grouped).length,
  updated,
  missingEmployee,
});
