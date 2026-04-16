# Thong Nhat Nhom Dong Bo

Tai lieu nay chot mot phuong an duy nhat de team co the implement ngay, khong con giu song song nhieu mo hinh cu.

## 1. Muc tieu nghiep vu hien tai

- Moi trang bi la mot ho so doc lap.
- Co truong hop 1 trang bi chinh dong bo voi nhieu trang bi phu di kem.
- Tat ca cac trang bi trong cum do thuoc 1 bo ho so dong bo duy nhat.
- Mot trang bi tai 1 thoi diem chi thuoc toi da 1 nhom dong bo.
- Uu tien trien khai mo hinh 1:N:
  
  - N trang bi thanh vien
  - 1 nhom dong bo

## 2. Quyet dinh chot

### 2.1 Mo hinh tong the

- Su dung collection rieng `NhomDongBo`.
- `NhomDongBo` la ho so dong bo dung de quan ly:
  - trang bi chinh
  - danh sach trang bi thanh vien
  - metadata ngay lap, nguoi lap
  - dynamic fields cua bo ho so
- `TrangBiNhom1` va `TrangBiNhom2` chi giu backlink don:
  - `TrangThaiDongBo`
  - `IdNhomDongBo`

### 2.2 Rang buoc quan he

 
- Mot `NhomDongBo` co the co 0..N thanh vien.
- Mot trang bi khong duoc thuoc 2 nhom dong bo khac nhau cung luc.
- Trang bi chinh cung phai mang `IdNhomDongBo` cua nhom do.
- Trang bi thanh vien cung phai mang `IdNhomDongBo` cua nhom do.
- Neu `IdNhomDongBo = null` thi trang bi khong thuoc bo ho so dong bo nao.

### 2.3 Pham vi hien tai

- Uu tien quan he 1:N de implement nhanh, ro nghia, de validate.
- Chua lam many-to-many.
- Chua cho 1 trang bi la thanh vien cua nhieu nhom dong bo.

## 3. Mongo schema chot

### 3.1 Collection `NhomDongBo`

```js
{
  "_id": "uuid-group-1",

  // Trang bi chinh cua nhom
  "TrangBiChinh": {
    "IdTrangBi": "guid-tb-main-1",
    "NhomTrangBi": 1,
    "MaDanhMuc": "G.1.01.00.00.00.001",
    "TenDanhMuc": "Xe tang T-72",
    "ChuyenNganh": "G",
    "SoHieu": "T72-001"
  },

  // Don vi lap va quan ly bo ho so
  "IdDonVi": "000.050.017",
  "TenDonVi": "Tieu doan 1",

  // Metadata rieng cua ho so dong bo
  "HoSoDongBo": {
    "NgayLap": { "Seconds": 1770000000, "Nanos": 0 },
    "NguoiLap": "user-a",
    "NgaySua": { "Seconds": 1770003600, "Nanos": 0 },
    "NguoiSua": "user-b",
    "GhiChu": "Lap nhom dong bo theo bien che"
  },

  // Dynamic fields cap nhom
  "Parameters": {
    "trang_thai": "hoat_dong",
    "ngay_thanh_lap": "2026-01-15"
  },

  // Danh sach trang bi thanh vien
  "ThanhVien": [
    {
      "IdTrangBi": "guid-tb-2",
      "NhomTrangBi": 1,
      "MaDanhMuc": "G.1.02.00.00.00.001",
      "TenDanhMuc": "Thiet bi ngam",
      "ChuyenNganh": "G",
      "SoHieu": "NG-002",
      "ConHieuLuc": true,
      "Parameters": {
        "ngay_ghep_bo": "2026-01-15",
        "ghi_chu_ghep_bo": "Dong bo theo bien che"
      }
    },
    {
      "IdTrangBi": "guid-tb-3",
      "NhomTrangBi": 1,
      "MaDanhMuc": "G.1.03.00.00.00.001",
      "TenDanhMuc": "May do xa",
      "ChuyenNganh": "G",
      "SoHieu": "MDX-003",
      "ConHieuLuc": true,
      "Parameters": {
        "ngay_ghep_bo": "2026-01-15"
      }
    }
  ],

  "Version": 1,
  "NguoiTao": "user-a",
  "NguoiSua": "user-b",
  "NgayTao": { "Seconds": 1770000000, "Nanos": 0 },
  "NgaySua": { "Seconds": 1770003600, "Nanos": 0 }
}
```

### 3.2 Collection `TrangBiNhom1` / `TrangBiNhom2`

Chi them backlink don, khong embed ho so dong bo day du vao record trang bi:

```js
{
  "_id": "guid-tb-main-1",
  "MaDanhMuc": "G.1.01.00.00.00.001",
  // ... existing fields ...
  "TrangThaiDongBo": true,
  "IdNhomDongBo": "uuid-group-1"
}
```

```js
{
  "_id": "guid-tb-2",
  "MaDanhMuc": "G.1.02.00.00.00.001",
  // ... existing fields ...
  "TrangThaiDongBo": true,
  "IdNhomDongBo": "uuid-group-1"
}
```

```js
{
  "_id": "guid-tb-doc-lap",
  "MaDanhMuc": "G.1.99.00.00.00.001",
  // ... existing fields ...
  "TrangThaiDongBo": false,
  "IdNhomDongBo": null
}
```

### 3.3 Index can co

```js
db.NhomDongBo.createIndex({ "TrangBiChinh.IdTrangBi": 1 }, { name: "idx_tb_chinh" });
db.NhomDongBo.createIndex({ "ThanhVien.IdTrangBi": 1 }, { name: "idx_tv_idtb" });
db.NhomDongBo.createIndex({ "IdDonVi": 1 }, { name: "idx_donvi" });

db.TrangBiNhom1.createIndex({ "IdNhomDongBo": 1 }, { name: "idx_id_nhom_dong_bo" });
db.TrangBiNhom2.createIndex({ "IdNhomDongBo": 1 }, { name: "idx_id_nhom_dong_bo" });
```

## 4. Proto chot

```protobuf
message HoSoDongBoInfo {
  google.protobuf.Timestamp ngay_lap = 1;
  google.protobuf.StringValue nguoi_lap = 2;
  google.protobuf.Timestamp ngay_sua = 3;
  google.protobuf.StringValue nguoi_sua = 4;
  google.protobuf.StringValue ghi_chu = 5;
}

message TrangBiDongBoRef {
  string id_trang_bi = 1;
  int32 nhom_trang_bi = 2;
  string ma_danh_muc = 3;
  string ten_danh_muc = 4;
  string chuyen_nganh = 5;
  string so_hieu = 6;
}

message ThanhVienDongBo {
  string id_trang_bi = 1;
  int32 nhom_trang_bi = 2;
  string ma_danh_muc = 3;
  string ten_danh_muc = 4;
  string chuyen_nganh = 5;
  string so_hieu = 6;
  bool con_hieu_luc = 7;
  map<string, string> parameters = 8;
  bool restricted = 9;
}

message NhomDongBo {
  string id = 1;
  TrangBiDongBoRef trang_bi_chinh = 2;
  string id_don_vi = 3;
  string ten_don_vi = 4;
  HoSoDongBoInfo ho_so_dong_bo = 5;
  repeated ThanhVienDongBo thanh_vien = 6;
  map<string, string> parameters = 7;
  google.protobuf.StringValue nguoi_tao = 10;
  google.protobuf.StringValue nguoi_sua = 11;
  google.protobuf.Timestamp ngay_tao = 12;
  google.protobuf.Timestamp ngay_sua = 13;
  int32 version = 14;
}

message NhomDongBoGridItem {
  string id = 1;
  string id_trang_bi_chinh = 2;
  string ma_danh_muc_trang_bi_chinh = 3;
  string ten_danh_muc_trang_bi_chinh = 4;
  string so_hieu_trang_bi_chinh = 5;
  string id_don_vi = 6;
  string ten_don_vi = 7;
  int32 so_thanh_vien = 8;
  string trang_thai = 9;
  string nguoi_sua = 10;
  google.protobuf.Timestamp ngay_sua = 11;
}

message SaveThanhVienDongBoInput {
  string id_trang_bi = 1;
  bool con_hieu_luc = 2;
  map<string, string> parameters = 3;
}

message SaveNhomDongBoRequest {
  google.protobuf.StringValue id = 1;
  string id_trang_bi_chinh = 2;
  string id_don_vi = 3;
  HoSoDongBoInfo ho_so_dong_bo = 4;
  map<string, string> parameters = 5;
  repeated SaveThanhVienDongBoInput thanh_vien = 6;
  google.protobuf.Int32Value expected_version = 7;
}

message SaveNhomDongBoResponse {
  string id = 1;
  bool success = 2;
  string message = 3;
}

message GetNhomDongBoRequest {
  string id = 1;
}

message GetNhomDongBoResponse {
  NhomDongBo item = 1;
  bool success = 2;
  string message = 3;
}

message GetListNhomDongBoRequest {
  google.protobuf.StringValue id_don_vi = 1;
  google.protobuf.StringValue id_trang_bi_chinh = 2;
  google.protobuf.StringValue search_text = 3;
}

message GetListNhomDongBoResponse {
  repeated NhomDongBoGridItem items = 1;
  bool success = 2;
  string message = 3;
}

message DeleteNhomDongBoRequest {
  string id = 1;
}

message DeleteNhomDongBoResponse {
  bool success = 1;
  string message = 2;
}
```

### 4.1 Bo sung vao editor item cua TrangBiNhom1 / TrangBiNhom2

```protobuf
message TrangBiNhom1EditorItem {
  // ... existing fields 1-14 ...
  google.protobuf.StringValue id_nhom_dong_bo = 15;
  bool trang_thai_dong_bo = 16;
}
```

`TrangBiNhom2EditorItem` them tuong tu.

## 5. Save flow chot

### 5.1 SaveNhomDongBo

```text
1. Validate IdDonVi ton tai trong Office.
2. Load TrangBiChinh theo id_trang_bi_chinh.
3. Validate TrangBiChinh ton tai.
4. Validate TrangBiChinh chua thuoc nhom khac:
   - neu TrangBiChinh.IdNhomDongBo != null va != currentNhomId -> reject
5. Validate tung thanh vien:
   - IdTrangBi ton tai
   - khong trung nhau trong request
   - khong trung voi id_trang_bi_chinh
   - khong thuoc nhom khac:
     existing.IdNhomDongBo != null va != currentNhomId -> reject
   - cung Nhom voi TrangBiChinh
6. Backend tu denormalize:
   - MaDanhMuc
   - TenDanhMuc
   - ChuyenNganh
   - SoHieu
   - TenDonVi
7. Neu create:
   - tao NhomDongBo moi
8. Neu update:
   - load old doc
   - tinh added / removed / kept members theo IdTrangBi
9. Save NhomDongBo.
10. Update backlink tren TrangBiChinh:
   - TrangThaiDongBo = true
   - IdNhomDongBo = nhomId
11. Update backlink tren cac thanh vien:
   - added / kept -> set IdNhomDongBo = nhomId, TrangThaiDongBo = true
   - removed -> set IdNhomDongBo = null, TrangThaiDongBo = false
12. Tang Version va luu audit fields.
```

### 5.2 DeleteNhomDongBo

```text
1. Load NhomDongBo.
2. Clear backlink cua TrangBiChinh:
   - IdNhomDongBo = null
   - TrangThaiDongBo = false
3. Clear backlink cua tat ca ThanhVien:
   - IdNhomDongBo = null
   - TrangThaiDongBo = false
4. Xoa document NhomDongBo.
```

### 5.3 Khi xoa hoac thanh ly mot TrangBi

Phien ban hien tai uu tien don gian:

- Neu trang bi dang la thanh vien cua NhomDongBo:
  - reject thao tac xoa cung, yeu cau go khoi nhom truoc
  - hoac support auto-remove trong phase sau
- Neu trang bi dang la TrangBiChinh cua NhomDongBo:
  - reject xoa neu nhom van con thanh vien
  - user phai giai the nhom hoac doi trang bi chinh truoc

Khuyen nghi phase 1:

- Chua auto-migrate lich su thanh ly trong `NhomDongBo`.
- Uu tien validate block de tranh phat sinh state nua vo.

## 6. Get flow chot

### 6.1 GetNhomDongBo

```text
1. Load NhomDongBo by id.
2. Map trang_bi_chinh.
3. Map danh sach thanh_vien.
4. Neu co cross-CN restriction:
   - neu user khong co quyen voi ChuyenNganh cua thanh vien:
     - clear SoHieu
     - clear Parameters
     - set restricted = true
5. Tra response.
```

### 6.2 GetListNhomDongBo

Read-model phang de grid:

- id
- id_trang_bi_chinh
- ma_danh_muc_trang_bi_chinh
- ten_danh_muc_trang_bi_chinh
- so_hieu_trang_bi_chinh
- id_don_vi
- ten_don_vi
- so_thanh_vien
- trang_thai
- nguoi_sua
- ngay_sua

### 6.3 GetTrangBiNhom1 / GetTrangBiNhom2

Tra them:

- `id_nhom_dong_bo`
- `trang_thai_dong_bo`

Frontend neu can thong tin chi tiet nhom dong bo se goi them `GetNhomDongBo` bang `id_nhom_dong_bo`.

## 7. Rule validate backend chi tiet

### 7.1 Rule cau truc

- Mot `NhomDongBo` phai co dung 1 `TrangBiChinh`.
- `TrangBiChinh` khong duoc xuat hien trong `ThanhVien`.
- `ThanhVien` khong duoc trung `IdTrangBi`.
- Mot `TrangBi` chi duoc thuoc toi da 1 `NhomDongBo`.
- Tat ca `ThanhVien` phai cung `Nhom` voi `TrangBiChinh`.

### 7.2 Rule save contract

- Frontend chi gui:
  - `id_trang_bi_chinh`
  - `id_don_vi`
  - `ho_so_dong_bo`
  - `parameters`
  - danh sach `id_trang_bi` thanh vien + member parameters
- Frontend khong duoc gui de backend tin cac field denormalized:
  - `TenDanhMuc`
  - `SoHieu`
  - `ChuyenNganh`
  - `TenDonVi`
- Backend phai resolve lai cac field nay tu du lieu goc.

### 7.3 Rule audit

- `NguoiLap` va `NgayLap` cua `HoSoDongBo` chi set khi tao moi.
- `NguoiSua` va `NgaySua` cua `HoSoDongBo` set lai moi lan cap nhat.
- `Version` bat buoc check optimistic concurrency khi update.

### 7.4 Rule quyen

- User chi duoc tao/sua nhom dong bo voi cac trang bi trong scope duoc phep.
- Neu co thanh vien khac chuyen nganh va policy hien tai cho phep hien summary:
  - backend co the tra `restricted = true`
  - frontend khong duoc hien so_hieu va member parameters cua thanh vien bi restricted

## 8. FormConfig tich hop

| FormConfig Key | Scope | Luu vao |
|---|---|---|
| `nhom-dong-bo` | Dynamic fields cua ho so dong bo | `NhomDongBo.Parameters` |
| `thanh-vien-dong-bo` | Dynamic fields cua moi thanh vien | `ThanhVienDongBo.Parameters` |

Runtime flow:

```text
Frontend -> GetRuntimeFormSchema({ key: "nhom-dong-bo" })
         -> Render fields cap nhom
         -> Bind values vao NhomDongBo.Parameters

Frontend -> GetRuntimeFormSchema({ key: "thanh-vien-dong-bo" })
         -> Render inline form tren tung member
         -> Bind values vao ThanhVienDongBo.Parameters
```

## 9. UI flow de implement

### 9.1 Man hinh danh sach nhom dong bo

- Grid hien:
  - Trang bi chinh
  - So hieu trang bi chinh
  - Don vi
  - So thanh vien
  - Trang thai
  - Nguoi sua
  - Ngay sua

### 9.2 Form tao/sua nhom dong bo

- Chon `TrangBiChinh`
- Chon `DonVi`
- Nhap thong tin `HoSoDongBo`
- Nhap dynamic fields cap nhom
- Them danh sach `ThanhVien`
- Moi thanh vien co:
  - thong tin tom tat
  - dynamic fields rieng

### 9.3 Trong form sua TrangBi

- Hien read-only:
  - `TrangThaiDongBo`
  - `IdNhomDongBo`
- Neu co `IdNhomDongBo`:
  - co link mo chi tiet nhom dong bo

## 10. Ghi chu cho phase sau neu doi quan he

Neu sau nay can mo rong sang many-to-many:

- doi backlink tren `TrangBiNhom1/2`:
  - tu `IdNhomDongBo`
  - sang `DsNhomDongBo[]`
- update validation:
  - bo rule "mot trang bi chi thuoc 1 nhom"
- update grid/editor item:
  - `id_nhom_dong_bo` -> `repeated string ds_nhom_dong_bo`
- giu nguyen collection `NhomDongBo`, chi doi backlink va save flow

Tuc la phien ban hien tai duoc thiet ke de implement nhanh theo 1:N, nhung van co duong nang cap sau nay neu nghiep vu doi.
