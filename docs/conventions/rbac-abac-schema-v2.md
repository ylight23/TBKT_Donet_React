# RBAC + ABAC Schema V2

Tai lieu nay chot cach dat ten, vai tro tung collection, schema cuoi, va ke hoach migration de doi dan tu schema cu sang schema moi ma khong gay runtime.

## 1. Muc tieu

He thong phan quyen duoc tach ro thanh 4 lop:

- `Role`
  - dinh nghia vai tro/nhom
  - chua metadata cua role va pham vi du lieu mac dinh
- `RolePermission`
  - quyen chuc nang mac dinh cua role
- `UserPermissionOverride`
  - quyen chuc nang override rieng cho user
- `UserRoleAssignment`
  - ban ghi gan user vao role
  - chua pham vi du lieu hieu luc cua user trong role do

Cache runtime van giu:

- `UserPermission`
  - read-model sau khi rebuild

## 2. Map ten cu -> ten moi

| Ten cu | Ten moi de nghi | Vai tro |
| --- | --- | --- |
| `NhomNguoiDung` | `Role` | Vai tro/nhom |
| `PhanQuyenNhomNguoiDung` | `RolePermission` | Quyen chuc nang mac dinh cua role |
| `PhanQuyenNguoiDung` | `UserPermissionOverride` | Override quyen chuc nang rieng cho user |
| `NguoiDungNhomNguoiDung` | `UserRoleAssignment` | Gan user vao role + scope du lieu hieu luc |
| `UserPermission` | `UserPermission` | Cache runtime, khong doi o phase dau |

Giai thich:

- `Role` la template.
- `UserRoleAssignment` la instance ap cho tung user.
- `RolePermission` tra loi "duoc dung chuc nang nao".
- `PhamViChuyenNganh` trong `Role` va `UserRoleAssignment` tra loi "duoc thao tac tren du lieu CN nao".

## 3. Schema cuoi tung collection

### 3.1 Role

Collection hien tai: `NhomNguoiDung`

Schema cuoi de nghi:

```json
{
  "_id": "764ea6a3-3197-40eb-b29a-52e4657ca8ff",
  "Ten": "Quan tri he thong",
  "MoTa": "Vai tro quan tri noi bo",
  "Color": "#64748b",
  "Loai": "System",
  "ClonedFromId": null,
  "IsDefault": false,

  "MaPhanHe": "TBKT.ThongTin",
  "VaiTroNoiBo": true,
  "TrongSo": 1,

  "ScopeType": "SUBTREE",
  "IdDonViUyQuyenQT": "000",

  "PhamViChuyenNganh": {
    "IdChuyenNganh": "I",
    "IdChuyenNganhDoc": [
      {
        "Id": "I",
        "Actions": ["view", "add", "edit", "delete", "approve", "download", "print"]
      },
      {
        "Id": "T",
        "Actions": ["view", "download"]
      }
    ]
  },

  "NguoiTao": "admin",
  "NguoiSua": "admin",
  "NgayTao": "2026-03-28T00:00:00Z",
  "NgaySua": "2026-03-28T00:00:00Z"
}
```

Field nen giu o `Role`:

- `Ten`
- `MoTa`
- `Color`
- `Loai`
- `ClonedFromId`
- `IsDefault`
- `MaPhanHe`
- `VaiTroNoiBo`
- `TrongSo`
- `ScopeType`
- `IdDonViUyQuyenQT`
- `PhamViChuyenNganh`
- audit fields

Field khong nen giu o `Role`:

- `IdNganhDoc`
- `IdNhomChuyenNganh`
- `IdDanhMucChuyenNganh`
- `IdChuyenNganhDoc`
- `IdDonViScope`
- `IdDonViUyQuyen`

Ly do:

- `Role` chi giu template scope.
- Khong giu cac field legacy phang khi da co `PhamViChuyenNganh` co cau truc.

### 3.2 RolePermission

Collection hien tai: `PhanQuyenNhomNguoiDung`

Schema cuoi de nghi:

```json
{
  "_id": "4bbfcacc-013f-4042-b996-b293f66e52b0",
  "IdRole": "764ea6a3-3197-40eb-b29a-52e4657ca8ff",
  "MaChucNang": "equipment.create",
  "MaPhanHe": "TBKT.ThongTin",
  "TieuDeChucNang": "Tiep nhan trang bi",
  "TieuDeNhomQuyen": "Trang bi ky thuat",
  "Actions": {
    "view": true,
    "add": false,
    "edit": false,
    "delete": false,
    "approve": false,
    "unapprove": false,
    "download": false,
    "print": false
  },
  "NguoiTao": "migration.catalog.v1",
  "NguoiSua": "migration.catalog.v1",
  "NgayTao": "2026-03-28T00:00:00Z",
  "NgaySua": "2026-03-28T00:00:00Z"
}
```

Field nen giu:

- `_id`
- `IdRole`
- `MaChucNang`
- `MaPhanHe`
- `TieuDeChucNang`
- `TieuDeNhomQuyen`
- `Actions`
- audit fields

Field can bo:

- `IdCapTren`

### 3.3 UserPermissionOverride

Collection hien tai: `PhanQuyenNguoiDung`

Schema cuoi de nghi:

```json
{
  "_id": "0530fddb-fcfd-42e3-876a-a87ef12ba9c8",
  "IdNguoiDung": "b673d728-3ac4-46cc-bf9d-d18ec733d1bd",
  "MaChucNang": "core.application",
  "MaPhanHe": "TBKT.ThongTin",
  "TieuDeChucNang": "He thong",
  "TieuDeNhomQuyen": "Quan tri",
  "Actions": {
    "view": true,
    "add": true,
    "edit": true,
    "delete": true,
    "approve": true,
    "unapprove": true,
    "download": true,
    "print": true
  },
  "NguoiTao": "admin",
  "NguoiSua": "admin",
  "NgayTao": "2026-03-28T00:00:00Z",
  "NgaySua": "2026-03-28T00:00:00Z"
}
```

Collection nay chi dung cho:

- break-glass theo user
- override khan cap
- tai khoan dac biet khong nen tao role rieng

Neu override la nghiep vu thuong xuyen, uu tien tao role moi thay vi dung collection nay.

### 3.4 UserRoleAssignment

Collection hien tai: `NguoiDungNhomNguoiDung`

Schema cuoi de nghi:

```json
{
  "_id": "27500bcc-1ae7-1e54-3f81-75b29d5ebe2c",
  "IdNguoiDung": "3864ebdc-731f-4a3f-8155-5e2651854250",
  "IdRole": "764ea6a3-3197-40eb-b29a-52e4657ca8ff",

  "Loai": "Direct",

  "ScopeType": "ALL",
  "IdDonViUyQuyenQT": "000",
  "IdNguoiUyQuyen": null,
  "NgayHetHan": null,

  "PhamViChuyenNganh": {
    "IdChuyenNganh": "I",
    "IdChuyenNganhDoc": [
      {
        "Id": "I",
        "Actions": ["view", "add", "edit", "delete", "approve", "download", "print"]
      },
      {
        "Id": "T",
        "Actions": ["view", "download"]
      }
    ]
  },

  "NguoiTao": "migration.sso.bootstrap",
  "NguoiSua": "migration.sso.bootstrap",
  "NgayTao": "2026-03-28T00:00:00Z",
  "NgaySua": "2026-03-28T00:00:00Z"
}
```

Field nen giu o `UserRoleAssignment`:

- `IdNguoiDung`
- `IdRole`
- `Loai`
- `ScopeType`
- `IdDonViUyQuyenQT`
- `IdNguoiUyQuyen`
- `NgayHetHan`
- `PhamViChuyenNganh`
- audit fields

Field khong nen giu o `UserRoleAssignment`:

- `IdNganhDoc`
- `IdDanhMucChuyenNganh`
- `IdChuyenNganhDoc`
- `IdNhomChuyenNganh`
- `IdDonViScope`
- `IdDonViUyQuyen`

Ly do:

- da co `PhamViChuyenNganh` co cau truc
- da chot `IdDonViUyQuyenQT` la ten nghiep vu ro hon cho don vi duoc cap scope

### 3.5 UserPermission cache

Collection hien tai: `UserPermission`

Day la read-model. Tam thoi chua doi ten trong phase dau de tranh va cham lon.

Schema cache nen phan ra:

```json
{
  "_id": "user-id",
  "ScopeType": "SUBTREE",
  "AnchorNodeId": "000.050.017",
  "AnchorParentId": "000.050",
  "PhamViChuyenNganh": {
    "IdChuyenNganh": "I",
    "IdChuyenNganhDoc": [
      { "Id": "I", "Actions": ["view", "add", "edit"] },
      { "Id": "T", "Actions": ["view"] }
    ]
  },
  "PhanHe": [],
  "ChucNang": [],
  "ServiceScopes": ["tbkt-thongtin"]
}
```

## 4. Phan bo field: Role vs UserRoleAssignment

### Field thuoc ve template `Role`

- `MaPhanHe`
- `TrongSo`
- `VaiTroNoiBo`
- `ScopeType`
- `IdDonViUyQuyenQT`
- `PhamViChuyenNganh`

Y nghia:

- day la cau hinh mac dinh cua role
- user moi duoc gan vao role se duoc copy tu day

### Field thuoc ve `UserRoleAssignment`

- `IdNguoiDung`
- `IdRole`
- `Loai`
- `ScopeType`
- `IdDonViUyQuyenQT`
- `IdNguoiUyQuyen`
- `NgayHetHan`
- `PhamViChuyenNganh`

Y nghia:

- day la pham vi du lieu hieu luc khi runtime check
- cho phep override theo tung user ma khong sua role goc

### Rule copy khi assign user vao role

Khi tao `UserRoleAssignment` moi:

1. doc template tu `Role`
2. copy:
   - `ScopeType`
   - `IdDonViUyQuyenQT`
   - `PhamViChuyenNganh`
3. neu UI co override luc gan:
   - ghi de vao assignment
4. runtime chi doc `UserRoleAssignment`, khong doc truc tiep template `Role`

## 5. Runtime precedence

Thiet ke runtime can dung chung quy tac sau:

1. `IsSuperAdmin` => allow + audit dac biet
2. `DuocTruyCap == false` => deny ngay
3. khong co `Action` tu `RolePermission` + `UserPermissionOverride` => deny
4. khong thoa `UserRoleAssignment.ScopeType` va `UserRoleAssignment.PhamViChuyenNganh` => deny

Luu y:

- `RolePermission` va `UserPermissionOverride` tra loi "duoc goi chuc nang gi"
- `UserRoleAssignment` tra loi "duoc thao tac tren du lieu nao"

## 6. Migration plan khong gay runtime

### Phase 0 - Chot convention

- team chot ten moi trong tai lieu nay
- code runtime chua doi ten collection ngay
- cap nhat doc/noi bo truoc

### Phase 1 - Chuan hoa schema tren collection cu

Thuc hien tren collection cu, chua rename collection:

- `NhomNguoiDung`
  - bo field legacy:
    - `IdNganhDoc`
    - `IdDanhMucChuyenNganh`
    - `IdChuyenNganhDoc`
    - `IdNhomChuyenNganh`
    - `IdDonViScope`
    - `IdDonViUyQuyen`
  - them/giu:
    - `ScopeType`
    - `IdDonViUyQuyenQT`
    - `PhamViChuyenNganh`

- `NguoiDungNhomNguoiDung`
  - bo field legacy:
    - `IdNganhDoc`
    - `IdDanhMucChuyenNganh`
    - `IdChuyenNganhDoc`
    - `IdNhomChuyenNganh`
    - `IdDonViScope`
    - `IdDonViUyQuyen`
  - them/giu:
    - `ScopeType`
    - `IdDonViUyQuyenQT`
    - `PhamViChuyenNganh`

- `PhanQuyenNhomNguoiDung`
  - bo `IdCapTren`
  - dam bao `_id` la GUID string

- `PhanQuyenNguoiDung`
  - bo `IdCapTren`

Runtime van dung ten cu trong code, nhung schema da giong V2.

### Phase 2 - Write-path doi sang model V2

Backend:

- `SaveGroupPermissions`
  - luu `ScopeType`, `IdDonViUyQuyenQT`, `PhamViChuyenNganh` vao `NhomNguoiDung`
- `AssignUserToGroup`
  - copy `ScopeType`, `IdDonViUyQuyenQT`, `PhamViChuyenNganh` tu `NhomNguoiDung` sang `NguoiDungNhomNguoiDung`
- bo hoan toan write vao field phang legacy

Frontend:

- UI doc/ghi `PhamViChuyenNganh`
- khong con dung `IdDanhMucChuyenNganh` nhu source-of-truth

### Phase 3 - Read-path doi sang model V2

Runtime:

- `GetGroupPermissions` doc scope template tu `NhomNguoiDung`
- `ListGroupUsers` doc scope effective tu `NguoiDungNhomNguoiDung`
- `RebuildService` chi doc:
  - `PhanQuyenNhomNguoiDung`
  - `PhanQuyenNguoiDung`
  - `NguoiDungNhomNguoiDung.PhamViChuyenNganh`

Cache:

- rebuild toan bo `UserPermission`
- khong build tu field phang legacy nua

### Phase 4 - Compatibility cleanup

- proto:
  - bo `IdDanhMucChuyenNganh`
  - bo `IdNganhDoc`
  - bo `IdChuyenNganhDoc` neu da co `PhamViChuyenNganh`
- UI:
  - bo decode/encode compatibility field cu
- scripts:
  - bo script seed field legacy

### Phase 5 - Rename collection trong code

Chi thuc hien sau khi schema va runtime da on dinh.

Lua chon an toan:

- doi alias trong `PermissionCollectionNames.cs` truoc
- ten bien/code:
  - `UserGroups` => `Roles`
  - `UserGroupAssignments` => `UserRoleAssignments`
  - `GroupFunctionPermissions` => `RolePermissions`
  - `UserFunctionPermissions` => `UserPermissionOverrides`

Lua chon manh tay hon:

- rename collection Mongo that su
- can migration window + backup + rebuild cache lai

Khuyen nghi:

- phase 5A: doi ten trong code abstraction truoc
- phase 5B: doi ten collection vat ly sau

## 7. Invariant can enforce

### Role

- neu `ScopeType = DELEGATED` thi khong khuyen nghi dat o role template chung
- `PhamViChuyenNganh.IdChuyenNganh` phai co trong `PhamViChuyenNganh.IdChuyenNganhDoc`

### UserRoleAssignment

- neu `ScopeType = DELEGATED`:
  - bat buoc `IdDonViUyQuyenQT`
  - bat buoc `IdNguoiUyQuyen`
  - bat buoc `NgayHetHan`
- neu `ScopeType = ALL`:
  - audit bat buoc
- `PhamViChuyenNganh.IdChuyenNganh` phai co trong danh sach doc

### RolePermission / UserPermissionOverride

- moi cap `(IdRole, MaChucNang)` hoac `(IdNguoiDung, MaChucNang)` la duy nhat
- khong ghi `IdCapTren`

## 8. Chi tiet implement de nghi

### PermissionCollectionNames.cs

Trong phase hien tai co the doi ten logic truoc, khong can doi ten vat ly:

```csharp
public const string Roles = "NhomNguoiDung";
public const string UserRoleAssignments = "NguoiDungNhomNguoiDung";
public const string RolePermissions = "PhanQuyenNhomNguoiDung";
public const string UserPermissionOverrides = "PhanQuyenNguoiDung";
```

Sau do cho phep code moi dung ten moi, trong khi DB vat ly van giu ten cu.

## 9. Quyet dinh cuoi

Chot theo huong sau:

- `Role` giu template scope mac dinh, gom ca `PhamViChuyenNganh`
- `UserRoleAssignment` giu effective scope cua user
- `RolePermission` giu quyen chuc nang mac dinh
- `UserPermissionOverride` chi dung cho override dac biet
- field phang legacy (`IdDanhMucChuyenNganh`, `IdNganhDoc`, `IdChuyenNganhDoc`) se bi loai bo dan

Day la mo hinh uu tien ro nghia nghiep vu, de doc, de migrate, va phu hop cho ca RBAC + ABAC.
