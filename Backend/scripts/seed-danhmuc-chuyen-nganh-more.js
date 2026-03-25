
const db = db.getSiblingDB("quanly_dmcanbo");

const items = [
    { _id: "T", Ten: "Xe Máy", VietTat: null, ThuTu: 1 },
    { _id: "R", Ten: "Đo lường", VietTat: null, ThuTu: 18 },
    { _id: "Q", Ten: "Biên phòng", VietTat: null, ThuTu: 19 },
    { _id: "S", Ten: "Bản đồ", VietTat: null, ThuTu: 20 },
    { _id: "F", Ten: "Dùng chung", VietTat: "D.Chung", ThuTu: 21 },
    { _id: "L", Ten: "TBTS", VietTat: "TBTS", ThuTu: 22 }
];

const now = new Date();
const creatorId = "304b79d6-aa43-4ea8-b4ed-5fe68538a014";

console.log("Seeding additional DanhMucChuyenNganh items...");
items.forEach(item => {
    db.getCollection("DanhMucChuyenNganh").updateOne(
        { _id: item._id },
        {
            $set: {
                Ten: item.Ten,
                VietTat: item.VietTat,
                ThuTu: item.ThuTu,
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
});

console.log("Seeding complete.");
