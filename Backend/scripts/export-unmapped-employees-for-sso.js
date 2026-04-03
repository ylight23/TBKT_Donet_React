/*
Usage:
  mongosh "mongodb://localhost:27017/quanly_dmcanbo" --quiet `
    Backend/scripts/export-unmapped-employees-for-sso.js

Tip:
  Redirect output to file:
  mongosh ... export-unmapped-employees-for-sso.js > unmapped-employees.json
*/

const employeeCollection = db.getCollection("Employee");
const mappingCollection = db.getCollection("SsoNguoiDungMap");

const mappedEmployeeIds = mappingCollection.distinct("EmployeeId", {
  EmployeeId: { $type: "string" },
});

const items = employeeCollection
  .find(
    { Delete: { $ne: true }, _id: { $nin: mappedEmployeeIds } },
    {
      projection: {
        _id: 1,
        HoVaTen: 1,
        Email: 1,
        IDDonVi: 1,
        IdDonVi: 1,
        IDQuanTriDonVi: 1,
        IdQuanTriDonVi: 1,
      },
    }
  )
  .map((doc) => ({
    employeeId: String(doc._id),
    hoVaTen: doc.HoVaTen ?? null,
    email: doc.Email ?? null,
    idDonVi: doc.IDDonVi ?? doc.IdDonVi ?? null,
    idQuanTriDonVi: doc.IDQuanTriDonVi ?? doc.IdQuanTriDonVi ?? null,
    provider: "wso2",
    issuer: "https://localhost:9443/oauth2/token",
    subject: "",
    userName: "",
    role: "user",
    active: true,
  }))
  .toArray();

printjson({
  totalUnmappedEmployees: items.length,
  items,
});
