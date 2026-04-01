# Collection Rename Rollout (Safe, No Runtime Break)

## Muc tieu
- Doi ten collection theo mo hinh moi:
  - `Role`
  - `RolePermission`
  - `UserPermissionOverride`
  - `UserRoleAssignment`
- Khong gay vo runtime trong qua trinh chuyen doi.

## Mapping cu -> moi
- `NhomNguoiDung` -> `Role`
- `PhanQuyenNhomNguoiDung` -> `RolePermission`
- `PhanQuyenNguoiDung` -> `UserPermissionOverride`
- `NguoiDungNhomNguoiDung` -> `UserRoleAssignment`
- `PhanQuyenPhanHeNhomNguoiDung` -> `RoleSubsystemPermission`
- `PhanQuyenPhanHeNguoiDung` -> `UserSubsystemPermission`

## Nguyen tac
- Runtime doc/ghi qua `PermissionCollectionNames`.
- Mac dinh van tro toi ten cu (legacy).
- Chi switch sang ten moi khi da migrate du lieu xong va verify dat yeu cau.

## Pha rollout
1. Pha A - Chuan bi runtime
- Da co config switch:
  - `Authz:CollectionNames:UseCanonicalNames`
  - Hoac map tung ten collection trong `Authz:CollectionNames:*`
- Deploy ban runtime moi (van de `UseCanonicalNames=false`).

2. Pha B - Migrate du lieu
- Chay script:
  - `Backend/scripts/migrate-role-collection-rename-safe.js`
- Chay theo thu tu:
  - `MODE="plan"`
  - `MODE="copy"`
  - `MODE="verify"`
- Neu chua dat, tiep tuc copy lai (idempotent) va verify den khi dat.

3. Pha C - Switch runtime
- Bat:
  - `Authz:CollectionNames:UseCanonicalNames=true`
  - hoac set ro ten collection moi trong config.
- Rebuild permission cache all user.
- Theo doi log va smoke test UI/permission.

4. Pha D - On dinh va don dep
- Sau khi on dinh 1 khoang thoi gian van hanh, moi xem xet freeze legacy.
- Khuyen nghi giu legacy trong 1-2 release de rollback nhanh.

## Rollback
- Tat switch:
  - `Authz:CollectionNames:UseCanonicalNames=false`
- Neu can, dong bo nguoc du lieu:
  - Script cung file, `MODE="rollback-copy"`.
- Runtime quay ve doc/ghi ten cu ngay, khong can doi code.

## Checklist truoc khi switch
- Build backend pass.
- `MODE=verify` khong con chenh count nghiem trong.
- Permission API smoke test:
  - `GetMyPermissions`
  - `ListNhomNguoiDung`
  - `GetGroupPermissions`
  - `AssignUserToGroup`
  - `SaveGroupPermissions`
- Rebuild cache toan bo user thanh cong.

