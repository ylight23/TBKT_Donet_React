
const db = db.getSiblingDB("quanly_dmcanbo");

const items = [
    { _id: "T",  Ten: "Xe Máy", VietTat: null, ThuTu: 1 },
    { _id: "B",  Ten: "Tàu thuyền", VietTat: null, ThuTu: 2 },
    { _id: "O",  Ten: "Thông tin", VietTat: null, ThuTu: 3 },
    { _id: "I",  Ten: "Ra đa", VietTat: null, ThuTu: 4 },
    { _id: "G",  Ten: "Tăng Thiết giáp", VietTat: "TTG", ThuTu: 5 },
    { _id: "A",  Ten: "Máy bay", VietTat: null, ThuTu: 6 },
    { _id: "C",  Ten: "Tên lửa", VietTat: null, ThuTu: 7 },
    { _id: "D1", Ten: "Súng pháo", VietTat: null, ThuTu: 8 },
    { _id: "D2", Ten: "KTĐTQH", VietTat: null, ThuTu: 9 },
    { _id: "D3", Ten: "Trang bị nước", VietTat: "T.Bị nước", ThuTu: 10 },
    { _id: "D4", Ten: "Công cụ hỗ trợ", VietTat: "CC hỗ trợ", ThuTu: 11 },
    { _id: "E",  Ten: "Đạn dược", VietTat: null, ThuTu: 12 },
    { _id: "H",  Ten: "Tác chiến điện tử", VietTat: "TCĐT", ThuTu: 13 },
    { _id: "K",  Ten: "Công nghệ thông tin - Không gian mạng", VietTat: "CNTT", ThuTu: 14 },
    { _id: "M",  Ten: "Công binh", VietTat: null, ThuTu: 15 },
    { _id: "N",  Ten: "Hóa học", VietTat: null, ThuTu: 16 },
    { _id: "P",  Ten: "Cơ yếu", VietTat: null, ThuTu: 17 },
    { _id: "R",  Ten: "Đo lường", VietTat: null, ThuTu: 18 },
    { _id: "Q",  Ten: "Biên phòng", VietTat: null, ThuTu: 19 },
    { _id: "S",  Ten: "Bản đồ", VietTat: null, ThuTu: 20 },
    { _id: "F",  Ten: "Dùng chung", VietTat: "D.Chung", ThuTu: 21 },
    { _id: "L",  Ten: "TBTS", VietTat: "TBTS", ThuTu: 22 }
];

const now = new Date();
const creatorId = "304b79d6-aa43-4ea8-b4ed-5fe68538a014";

console.log("Seeding all 22 DanhMucChuyenNganh items...");
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

console.log("Seeding complete. Total: " + items.length);
