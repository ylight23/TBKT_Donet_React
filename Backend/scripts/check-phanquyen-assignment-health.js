const employeeCol = db.getCollection("Employee");
const assignmentCol = db.getCollection("NguoiDungNhomNguoiDung");
const groupCol = db.getCollection("NhomNguoiDung");

const totalEmployee = employeeCol.countDocuments({ Delete: { $ne: true } });
const totalAssignment = assignmentCol.countDocuments();
const assignmentWithUser = assignmentCol.countDocuments({ IdNguoiDung: { $nin: [null, ""] } });
const assignmentWithoutUser = assignmentCol.countDocuments({
  $or: [{ IdNguoiDung: null }, { IdNguoiDung: "" }, { IdNguoiDung: { $exists: false } }],
});

const joined = assignmentCol
  .aggregate([
    { $match: { IdNguoiDung: { $nin: [null, ""] } } },
    {
      $lookup: {
        from: "Employee",
        localField: "IdNguoiDung",
        foreignField: "_id",
        as: "emp",
      },
    },
    {
      $project: {
        _id: 1,
        IdNguoiDung: 1,
        IdNhomNguoiDung: 1,
        ScopeType: 1,
        empCount: { $size: "$emp" },
        HoVaTen: { $ifNull: [{ $first: "$emp.HoVaTen" }, null] },
        IdDonVi: { $ifNull: [{ $first: "$emp.IdDonVi" }, null] },
      },
    },
  ])
  .toArray();

const matchedCount = joined.filter((x) => x.empCount > 0).length;
const missingEmployee = joined.filter((x) => x.empCount === 0);

const orphanGroup = assignmentCol
  .aggregate([
    { $match: { IdNhomNguoiDung: { $nin: [null, ""] } } },
    {
      $lookup: {
        from: "NhomNguoiDung",
        localField: "IdNhomNguoiDung",
        foreignField: "_id",
        as: "group",
      },
    },
    { $project: { _id: 1, IdNhomNguoiDung: 1, groupCount: { $size: "$group" } } },
    { $match: { groupCount: 0 } },
    { $limit: 20 },
  ])
  .toArray();

const sampleUsers = joined
  .filter((x) => x.empCount > 0)
  .slice(0, 20)
  .map((x) => ({
    assignmentId: String(x._id),
    idNguoiDung: x.IdNguoiDung,
    idNhomNguoiDung: x.IdNhomNguoiDung,
    scopeType: x.ScopeType,
    hoVaTen: x.HoVaTen,
    idDonVi: x.IdDonVi,
  }));

printjson({
  collection: {
    employee: "Employee",
    group: "NhomNguoiDung",
    assignment: "NguoiDungNhomNguoiDung",
  },
  totals: {
    employee: totalEmployee,
    group: groupCol.countDocuments(),
    assignment: totalAssignment,
    assignmentWithUser,
    assignmentWithoutUser,
  },
  integrity: {
    assignmentWithMatchedEmployee: matchedCount,
    assignmentMissingEmployee: missingEmployee.length,
    assignmentMissingGroup: orphanGroup.length,
  },
  sampleMissingEmployee: missingEmployee.slice(0, 20).map((x) => ({
    assignmentId: String(x._id),
    idNguoiDung: x.IdNguoiDung,
    idNhomNguoiDung: x.IdNhomNguoiDung,
    scopeType: x.ScopeType,
  })),
  sampleMissingGroup: orphanGroup,
  sampleUsers,
});
