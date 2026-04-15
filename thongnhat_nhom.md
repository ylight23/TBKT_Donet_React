
Hiểu — `DongBo` là boolean trên instance TB. Nhưng cần làm rõ cách nhóm: 

Analyzing your answers...

Cảm ơn dữ liệu legacy — bây giờ tôi hiểu rõ hơn. Hệ thống cũ đã có `TrangThaiDongBo: true` trên instance. Tôi sẽ thiết kế lại đơn giản hơn phù hợp với mô hình đã có.

---

## Thiết kế cập nhật: Boolean-first, không cần collection riêng

### Phân tích dữ liệu legacy

Từ sample bạn gửi, TB instance đã có các field quan trọng:

| Field legacy | Ý nghĩa | Map sang hệ thống mới |
|---|---|---|
| `TrangThaiDongBo: true` | TB này là thành phần của bộ hồ sơ đồng bộ | Giữ nguyên |
| `IDDonViQuanLy` | Đơn vị quản lý | `Parameters.don_vi_quan_ly` |
| `IDDonViSuDung` | Đơn vị sử dụng | `Parameters.don_vi_su_dung` |
| `IDCapTren` | TB cha (cấu trúc phân cấp) | Top-level `IdCapTren` |
| `IDChuyenNganh` | Chuyên ngành | `IdChuyenNganhKT` |
| `parentId` | Parent node | Có trong instance hierarchy |

### Cơ chế nhóm: implicit grouping

Từ câu trả lời *"khi biên chế 1 trang bị sẽ đồng bộ các trang bị đi cùng khác, tạo thành **bộ hồ sơ trang bị**"* — bộ hồ sơ hình thành tự động khi biên chế.

**Quy tắc nhóm đề xuất:**

```
Tất cả TB instance có:
  TrangThaiDongBo = true
  + cùng IDDonViQuanLy (hoặc IDDonViSuDung)
→ thuộc cùng 1 "bộ hồ sơ trang bị" của đơn vị đó
```

Tuy nhiên, 1 đơn vị có thể có **nhiều** hồ sơ đồng bộ (VD: Tiểu đoàn 1 có 2 xe tăng, mỗi xe đi kèm radar + thông tin riêng). Trong trường hợp đó cần **IdNhomDongBo** (group ID) để phân biệt bộ nào với bộ nào. 

Analyzing your answers...

Tất cả quyết định đã rõ. Đây là thiết kế cuối cùng (v3):

---

## Thiết kế v3: `TrangThaiDongBo` boolean + `NhomDongBo` collection

### Kiến trúc tổng quan

```
TrangBiNhom1/2 instance              NhomDongBo collection
┌──────────────────────┐              ┌──────────────────────────┐
│ _id: "guid-tb-1"     │◄────────────│ ThanhVien[].IdTrangBi    │
│ TrangThaiDongBo: true│              │ _id: "uuid-group-1"     │
│ DsNhomDongBo: [      │─────────────►│ TenNhom: "Bộ ĐB xe ..."│
│   "uuid-group-1",    │              │ IdDonVi: "000.050.017"  │
│   "uuid-group-2"     │              │ Parameters: { ... }     │
│ ]                     │              │ ThanhVien: [ ... ]      │
└──────────────────────┘              └──────────────────────────┘
```

**2 chiều tham chiếu:**
- **TB → Nhóm**: `DsNhomDongBo` (array ID) — cho biết TB thuộc bao nhiêu bộ
- **Nhóm → TB**: `ThanhVien[]` (embedded) — cho biết bộ gồm những TB nào

---

### MongoDB Schema

#### Collection `NhomDongBo`

```js
{
  "_id": "uuid-group-1",
  "TenNhom": "Bộ ĐB xe tăng T-72 - Tiểu đoàn 1",
  "IdDonVi": "000.050.017",                // Office biên chế
  "TenDonVi": "Tiểu đoàn 1",              // denormalized
  
  "Parameters": {                           // dynamic fields bộ hồ sơ
    "ngay_thanh_lap": "2026-01-15",         // FormConfig "nhom-dong-bo"
    "trang_thai": "hoat_dong",
    "ghi_chu": "Kiểm tra Q1/2026"
  },

  "ThanhVien": [
    {
      "IdTrangBi": "guid-tb-1",
      "NhomTrangBi": 1,                    // 1 hoặc 2
      "MaDanhMuc": "G.1.01.00.00.00.001",  // denormalized
      "TenDanhMuc": "Xe tăng T-72",
      "ChuyenNganh": "G",
      "SoHieu": "T72-001",
      "IdDonViSuaChua": "000.060.003",
      "TenDonViSuaChua": "Xưởng sửa chữa A",
      "TrangThai": "hoat_dong",             // "hoat_dong"|"thanh_ly"|"chuyen_don_vi"
      "Parameters": {                       // dynamic fields thành viên
        "ngay_ghep_bo": "2025-06-10",       // FormConfig "thanh-vien-dong-bo"
        "ghi_chu_sua_chua": "Thay xích Q4"
      }
    },
    {
      "IdTrangBi": "guid-tb-2",
      "NhomTrangBi": 1,
      "MaDanhMuc": "I.1.02.00.00.00.001",
      "TenDanhMuc": "Đài Ra-đa P-18",
      "ChuyenNganh": "I",
      "SoHieu": "RD-018",
      "IdDonViSuaChua": "000.070.005",
      "TenDonViSuaChua": "Trạm sửa chữa RĐ",
      "TrangThai": "hoat_dong",
      "Parameters": { "ngay_ghep_bo": "2025-06-10" }
    }
  ],

  "Version": 1,
  "NguoiTao": "user-id",
  "NguoiSua": "user-id",
  "NgayTao": { "Seconds": ..., "Nanos": ... },
  "NgaySua": { "Seconds": ..., "Nanos": ... }
}
```

#### TrangBiNhom1/Nhom2 — thêm 2 fields

```js
{
  "_id": "guid-tb-1",
  "MaDanhMuc": "G.1.01.00.00.00.001",
  // ... existing fields ...
  "TrangThaiDongBo": true,                  // computed: DsNhomDongBo.length > 0
  "DsNhomDongBo": ["uuid-group-1", "uuid-group-2"]  // backlinks → NhomDongBo._id
}
```

#### Indexes

```js
db.NhomDongBo.createIndex({ "IdDonVi": 1 }, { name: "idx_donvi" });
db.NhomDongBo.createIndex({ "ThanhVien.IdTrangBi": 1 }, { name: "idx_tv_idtb" });
db.NhomDongBo.createIndex({ "ThanhVien.ChuyenNganh": 1 }, { name: "idx_tv_cn" });

db.TrangBiNhom1.createIndex({ "DsNhomDongBo": 1 }, { name: "idx_ds_nhom_db" });
db.TrangBiNhom2.createIndex({ "DsNhomDongBo": 1 }, { name: "idx_ds_nhom_db" });
```

---

### Proto

```protobuf
// ============================================================
// NhomDongBo — Bộ hồ sơ trang bị đồng bộ
// ============================================================

message ThanhVienDongBo {
  string id_trang_bi = 1;
  int32  nhom_trang_bi = 2;
  string ma_danh_muc = 3;
  string ten_danh_muc = 4;
  string chuyen_nganh = 5;
  string so_hieu = 6;
  string id_don_vi_sua_chua = 7;
  string ten_don_vi_sua_chua = 8;
  string trang_thai = 9;              // "hoat_dong" | "thanh_ly" | "chuyen_don_vi"
  map<string, string> parameters = 10; // dynamic fields riêng thành viên
  bool restricted = 11;               // true = user không có quyền CN → ẩn chi tiết
}

message NhomDongBo {
  string id = 1;
  string ten_nhom = 2;
  string id_don_vi = 3;
  string ten_don_vi = 4;
  repeated ThanhVienDongBo thanh_vien = 5;
  map<string, string> parameters = 6; // dynamic fields bộ hồ sơ
  google.protobuf.StringValue nguoi_tao = 10;
  google.protobuf.StringValue nguoi_sua = 11;
  google.protobuf.Timestamp ngay_tao = 12;
  google.protobuf.Timestamp ngay_sua = 13;
  int32 version = 14;
}

message NhomDongBoGridItem {
  string id = 1;
  string ten_nhom = 2;
  string id_don_vi = 3;
  string ten_don_vi = 4;
  int32  so_thanh_vien = 5;
  int32  so_hoat_dong = 6;            // count TrangThai == "hoat_dong"
  string cac_chuyen_nganh = 7;        // "G, I, O" — joined
  string trang_thai = 8;              // từ Parameters
  string nguoi_sua = 9;
  google.protobuf.Timestamp ngay_sua = 10;
}

message GetListNhomDongBoRequest {
  google.protobuf.StringValue id_don_vi = 1;
  google.protobuf.StringValue chuyen_nganh = 2;
  google.protobuf.StringValue search_text = 3;
  google.protobuf.StringValue id_trang_bi = 4;  // tìm nhóm chứa TB cụ thể
}

message GetListNhomDongBoResponse {
  repeated NhomDongBoGridItem items = 1;
  bool success = 2;
  string message = 3;
}

message GetNhomDongBoRequest { string id = 1; }
message GetNhomDongBoResponse {
  NhomDongBo item = 1;
  bool success = 2;
  string message = 3;
}

message SaveNhomDongBoRequest { NhomDongBo item = 1; }
message SaveNhomDongBoResponse {
  string id = 1;
  bool success = 2;
  string message = 3;
}

message DeleteNhomDongBoRequest { string id = 1; }
message DeleteNhomDongBoResponse {
  bool success = 1;
  string message = 2;
}
```

Thêm vào `DanhMucTrangBiService`:

```protobuf
service DanhMucTrangBiService {
  // ... existing RPCs ...
  rpc GetListNhomDongBo (GetListNhomDongBoRequest) returns (GetListNhomDongBoResponse);
  rpc GetNhomDongBo (GetNhomDongBoRequest) returns (GetNhomDongBoResponse);
  rpc SaveNhomDongBo (SaveNhomDongBoRequest) returns (SaveNhomDongBoResponse);
  rpc DeleteNhomDongBo (DeleteNhomDongBoRequest) returns (DeleteNhomDongBoResponse);
}
```

TrangBiNhom1/Nhom2 EditorItem — thêm backlink:

```protobuf
message TrangBiNhom1EditorItem {
  // ... existing fields 1-14 ...
  repeated string ds_nhom_dong_bo = 15;  // IDs NhomDongBo chứa TB này
  bool trang_thai_dong_bo = 16;          // computed: ds_nhom_dong_bo.length > 0
}
```

---

### Backend Save flow

```
SaveNhomDongBo:
  1. Validate IdDonVi → Office tồn tại
  2. Per ThanhVien:
     a. IdTrangBi tồn tại trong TrangBiNhom{NhomTrangBi}
     b. IdDonViSuaChua → Office tồn tại (bất kỳ ĐV)
     c. Không trùng IdTrangBi trong cùng nhóm
  3. Denormalize: TenDanhMuc, ChuyenNganh, SoHieu, TenDonVi...
  4. Upsert NhomDongBo doc

  5. Cập nhật backlink DsNhomDongBo (many-to-many):
     If UPDATE:
       old = load existing NhomDongBo doc
       added   = new.ThanhVien - old.ThanhVien  (by IdTrangBi)
       removed = old.ThanhVien - new.ThanhVien  (chỉ TrangThai != "thanh_ly")
     If INSERT:
       added = all ThanhVien;  removed = empty

     Per added TB:
       TrangBiNhom{N}.updateOne(
         { _id: idTrangBi },
         { $addToSet: { DsNhomDongBo: nhomId },
           $set: { TrangThaiDongBo: true } })

     Per removed TB:
       TrangBiNhom{N}.updateOne(
         { _id: idTrangBi },
         { $pull: { DsNhomDongBo: nhomId } })
       // Re-check nếu DsNhomDongBo rỗng → set TrangThaiDongBo = false
       TrangBiNhom{N}.updateOne(
         { _id: idTrangBi, DsNhomDongBo: { $size: 0 } },
         { $set: { TrangThaiDongBo: false } })

DeleteNhomDongBo:
  1. Load doc
  2. Per ThanhVien: $pull DsNhomDongBo, re-check TrangThaiDongBo
  3. Delete NhomDongBo doc

Khi thanh lý/xóa TB (hook trong SaveTrangBiNhom1):
  1. Find NhomDongBo where ThanhVien.IdTrangBi == id
  2. Set ThanhVien.$.TrangThai = "thanh_ly" (giữ lịch sử)
  3. KHÔNG remove khỏi nhóm → user thấy TB đã thanh lý

GetNhomDongBo (cross-CN restriction):
  userCnScopes = GetUserCnScopes(context)  // ["G", "F"]
  per ThanhVien:
    if tv.ChuyenNganh NOT IN userCnScopes:
      tv.SoHieu = ""
      tv.Parameters.Clear()
      tv.Restricted = true
```

---

### FormConfig tích hợp

| FormConfig Key | Scope | Lưu vào |
|---|---|---|
| `nhom-dong-bo` | Fields chung bộ hồ sơ (tên, trạng thái, ngày thành lập...) | `NhomDongBo.Parameters` |
| `thanh-vien-dong-bo` | Fields riêng mỗi thành viên (ngày ghép bộ, ghi chú sửa chữa...) | `ThanhVienDongBo.parameters` |

Runtime flow giống hệt TrangBiNhom1 hiện tại:

```
Frontend → GetRuntimeFormSchema({ key: "nhom-dong-bo" })
         → Render dynamic tabs cho bộ hồ sơ
         → Values ↔ NhomDongBo.Parameters

Frontend → GetRuntimeFormSchema({ key: "thanh-vien-dong-bo" })
         → Render inline form mỗi thành viên
         → Values ↔ ThanhVienDongBo.parameters
```

---

### Tóm tắt kiến trúc cuối cùng

```
              ┌──────────────┐
              │   Office     │
              └──────┬───────┘
                     │ 1:N
              ┌──────┴───────┐
              │ NhomDongBo   │ ← Collection riêng, có metadata + ThanhVien[]
              │ Parameters   │ ← FormConfig "nhom-dong-bo"
              └──────┬───────┘
                     │ N:M (via DsNhomDongBo + ThanhVien[])
         ┌───────────┼───────────┐
         │           │           │
  ┌──────┴─────┐ ┌───┴────┐ ┌───┴────┐
  │TrangBiNhom1│ │  Nhom1 │ │  Nhom1 │
  │ CN: G      │ │ CN: I  │ │ CN: O  │
  │ DsNhomDB[] │ │DsNhom[]│ │DsNhom[]│
  │ ĐB: true   │ │ĐB: true│ │ĐB:true │
  └────────────┘ └────────┘ └────────┘
         │    mỗi ThanhVien có:
         │    - Parameters (FormConfig "thanh-vien-dong-bo")
         │    - IdDonViSuaChua (bất kỳ Office)
         │    - TrangThai (hoat_dong|thanh_ly|...)
         │    - Restricted (cross-CN quyền)
```

Muốn bắt đầu implement proto + backend service?

OK — quay lại 1:1. Thiết kế đơn giản hơn:

### Thay đổi so với v3

| Aspect | v3 (many-to-many) | Final (1:1) |
|---|---|---|
| Backlink trên TB | `DsNhomDongBo: [...]` (array) | `IdNhomDongBo: "uuid"` (string, nullable) |
| `TrangThaiDongBo` | `DsNhomDongBo.length > 0` | `IdNhomDongBo != null` |
| Validate khi thêm | Chỉ check trùng trong cùng nhóm | **Block** nếu TB đã thuộc nhóm khác |
| Index | `{ DsNhomDongBo: 1 }` | `{ IdNhomDongBo: 1 }` |
| Proto EditorItem | `repeated string ds_nhom_dong_bo` | `string id_nhom_dong_bo` |

### DB Schema cập nhật

```js
// TrangBiNhom1 / TrangBiNhom2 — backlink đơn
{
  "_id": "guid-tb-1",
  // ... existing fields ...
  "TrangThaiDongBo": true,              // boolean flag (legacy compat)
  "IdNhomDongBo": "uuid-group-1"       // FK → NhomDongBo._id, null = chưa thuộc nhóm
}
```

### Validate khi Save nhóm

```
SaveNhomDongBo — per ThanhVien:
  existing = TrangBiNhom{N}.findOne({ _id: idTrangBi })
  if existing.IdNhomDongBo != null 
     AND existing.IdNhomDongBo != currentNhomId:
    → REJECT: "TB {TenDanhMuc} đã thuộc nhóm đồng bộ khác"
```

### Backlink update đơn giản hơn

```
Save (insert/update):
  added TB:   $set { IdNhomDongBo: nhomId, TrangThaiDongBo: true }
  removed TB: $set { IdNhomDongBo: null,   TrangThaiDongBo: false }

Delete nhóm:
  all TB in nhóm: $set { IdNhomDongBo: null, TrangThaiDongBo: false }
```

### Proto cập nhật

```protobuf
message TrangBiNhom1EditorItem {
  // ... existing fields 1-14 ...
  string id_nhom_dong_bo = 15;       // NhomDongBo._id, rỗng = chưa thuộc nhóm
  bool trang_thai_dong_bo = 16;      // computed
}
```

Phần còn lại (NhomDongBo collection, ThanhVienDongBo, FormConfig, cross-CN restriction, thanh lý giữ lịch sử) giữ nguyên như v3. Muốn implement?