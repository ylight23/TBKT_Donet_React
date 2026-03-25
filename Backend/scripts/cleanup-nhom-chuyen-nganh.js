
const db = db.getSiblingDB("quanly_dmcanbo");

console.log("Seeding DanhMucChuyenNganh...");
const now = new Date();
const creatorId = "304b79d6-aa43-4ea8-b4ed-5fe68538a014";

db.getCollection("DanhMucChuyenNganh").updateOne(
    { _id: "T" },
    {
        $set: {
            Ten: "Xe Máy",
            VietTat: null,
            ThuTu: 1,
            NguoiSua: creatorId,
            NgaySua: now
        },
        $setOnInsert: {
            NguoiTao: creatorId,
            NgayTao: now
        }
    },
    { upsert: true }
);

console.log("Dropping NhomChuyenNganh collection...");
const collections = db.getCollectionNames();
if (collections.includes("NhomChuyenNganh")) {
    db.getCollection("NhomChuyenNganh").drop();
    console.log("Collection NhomChuyenNganh dropped.");
} else {
    console.log("Collection NhomChuyenNganh does not exist.");
}

console.log("All done.");
