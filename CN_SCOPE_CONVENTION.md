# CN Scope Convention

## Flow

`GetMyPermissions -> visibleCNs/actionsPerCn -> backend filter -> frontend disable`

## Source Of Truth

- `PhamViChuyenNganh` la source of truth
- `VisibleCNs` la field dan xuat de filter nhanh
- `actionsPerCn` la ma tran action theo tung chuyen nganh

## Backend Gate

- List: dung `BuildCnVisibilityFilter(...)`
- Detail: dung `RequireSeeCN(...)`
- Create/Edit/Delete/Approve: dung `RequireActOnCN(...)`
- Cac module bat CN isolation phai dung strict mode `requireCnScope = true`

## Runtime Rule

- User thuong chi thao tac trong `visibleCNs` duoc cap
- Admin co the thao tac da CN theo policy admin
- Dynamic menu row API phai ap cung rule CN nhu Catalog/Trang bi
- DynamicField chi hien field co `cnIds` giao voi `visibleCNs`, hoac field chung khong gan CN

## UI Gate

- DataGrid/Form dung `useEffectiveActions` hoac `canCnAction`
- Dropdown CN chi hien `visibleCNs`
- UI chi la lop UX, khong thay the backend gate

## Implementation Checklist

### Backend

- `Backend/src/Authorization/ServiceMutationPolicy.cs`
  - them strict overload cho `RequireActOnCN`, `RequireSeeCN`, `BuildCnVisibilityFilter`
- `Backend/src/Authorization/AccessGateBuilder.cs`
  - parse `VisibleCNs`
- `Backend/src/Authorization/ServerCallContextIdentityExtensions.cs`
  - resolve SSO mapping theo `UserName/Subject/Issuer/Provider`
- `Backend/src/Services/RebuildService.cs`
  - ghi `VisibleCNs`, bo read-model legacy `NganhDocIds`
- `Backend/src/Services/PhanQuyenServiceImpl.cs`
  - `GetMyPermissions` tra `VisibleCns`
- `Backend/src/Services/ThamSo/DynamicFieldService.cs`
  - filter field theo CN khi doc, validate `cnIds` khi luu
- `Backend/src/Services/ThamSo/FormConfigService.cs`
  - them `GetRuntimeFormSchemaAsync`
- `Backend/src/Services/ThamSo/DynamicMenuService.cs`
  - gate CN cho row list/create/edit/delete
- `Backend/src/Services/CatalogService.cs`
  - gate CN cho `DanhMucTrangBi`

### Frontend

- `Frontend_TBKT/src/hooks/useMyPermissions.ts`
  - expose `visibleCNs`, `canCnAction`
- `Frontend_TBKT/src/components/TrangBiDataGrid/index.tsx`
  - runtime schema theo key, khoa action theo CN
- `Frontend_TBKT/src/features/templateRuntime/blocks/DataTableBlock.tsx`
  - khoa row action theo `entityCnId`
- `Frontend_TBKT/src/pages/CauHinhThamSo/...`
  - filter field/CN theo `visibleCNs`

## Done Condition

- User khong nhin thay du lieu CN ngoai pham vi
- User khong sua/xoa du lieu CN ngoai pham vi
- Runtime form trang bi khong can full admin schema
- `GetMyPermissions` va UI runtime dung `visibleCNs` thong nhat
