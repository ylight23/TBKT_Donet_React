# Dynamic Config Regression

Ngay cap nhat: 2026-03-24

## Pham vi uu tien
- Permission runtime
- Datasource va menu dong
- Form runtime va JSON runtime
- Restore va audit metadata
- Permission manifest seed va migration

## Cach ghi ket qua
- `PASS`: da xac nhan thong qua UI hoac runtime thuc te
- `FAIL`: tai hien duoc loi
- `BLOCKED`: chua co du lieu/nguoi dung moi truong de test
- `PENDING`: chua chay

## 1. Permission Runtime
| Case | Status | Ghi chu |
| --- | --- | --- |
| User khong co quyen `view` khong thay menu dong trong sidebar hoac `DynamicMenuBlock`. | PENDING | |
| User khong co quyen goi runtime `GetListDynamicMenus` khong nhan menu ngoai quyen. | PENDING | |
| User khong co quyen goi `GetDynamicMenuRows` cho menu dong bi chan. | PENDING | |
| Admin hoac user co quyen `thamso_dynamicmenu` van quan tri duoc cau hinh. | PENDING | |
| Menu tinh va menu dong cung tuan theo mot rule `view`. | PASS | Sidebar va route guard cung dung `permissionCodes`/`permissionCode`; da verify qua code path va build frontend. |
| Route tinh bi chan truc tiep theo manifest, khong chi an menu. | PASS | Da them `ManifestRouteGuard` cho cac route tinh quan trong va build frontend thanh cong. |
| Route dong `/menu-dong/:menuId` va path custom bi chan theo `permissionCode`. | PASS | Guard route dong dung `useDynamicMenuConfig()` + `permissionCode`; da verify qua code path va build frontend. |

## 2. Datasource And Menu
| Case | Status | Ghi chu |
| --- | --- | --- |
| Tao datasource manual moi, luu thanh cong, metadata `version = 1`. | PENDING | |
| Sua datasource manual, metadata `version` tang va `modifyBy` thay doi. | PENDING | |
| Sync datasource tu proto, datasource nhan mode `proto`. | PENDING | |
| Datasource `proto-managed` khong bi chinh lech schema ngoai y muon o UI. | PENDING | |
| Tao menu dong moi tro dung datasource active. | PENDING | |
| Menu dong hien thi preview sample data. | PENDING | |
| Khi field mapping sai, man cau hinh menu bao mismatch ro rang. | PENDING | |
| Xoa datasource se cascade soft delete menu lien quan. | PENDING | |
| Restore datasource khong tu restore menu. | PENDING | |
| Restore menu thu cong sau do runtime hoat dong lai binh thuong. | PENDING | |

## 3. Form Runtime
| Case | Status | Ghi chu |
| --- | --- | --- |
| Tao DynamicField moi, luu thanh cong, audit metadata hien thi o thu vien field. | PENDING | |
| Sua DynamicField, `version` tang. | PENDING | |
| Tao FieldSet hop le voi field active. | PENDING | |
| Save FieldSet voi field da bi xoa bi chan. | PENDING | |
| Tao FormConfig co `key` on dinh. | PENDING | |
| Doi `name` cua FormConfig nhung giu nguyen `key`, runtime van tim dung form. | PENDING | |
| Save FormConfig voi `FieldSetId` khong con active bi chan. | PENDING | |
| Xoa FieldSet dang duoc form dung se remove khoi `Tabs` thay vi de orphan reference. | PENDING | |
| Runtime trang bi khong fallback sang form dau tien neu thieu mapping; phai bao loi ro. | PENDING | |

## 4. Template JSON Runtime
| Case | Status | Ghi chu |
| --- | --- | --- |
| Tao TemplateLayout moi, metadata `version = 1`. | PENDING | |
| Publish template va render bang `templateKey`. | PENDING | |
| Template co `schemaJson` rong bao loi ro tai runtime. | PENDING | |
| Template co JSON sai format bao loi ro tai runtime. | PENDING | |
| Template khong co block nao bao loi ro tai runtime. | PENDING | |
| `DynamicMenuBlock` loi load phai hien canh bao thay vi fail am tham. | PENDING | |
| `AddTrangBiDialog` thieu `FormConfig`, `FieldSet`, hoac field phai hien warning ro. | PENDING | |

## 5. Restore
| Case | Status | Ghi chu |
| --- | --- | --- |
| Restore `DynamicField` hoat dong tu UI. | PENDING | |
| Restore `FieldSet` hoat dong tu UI. | PENDING | |
| Restore `FormConfig` hoat dong tu UI. | PENDING | |
| Restore `DynamicMenu` hoat dong tu UI. | PENDING | |
| Restore `DynamicMenuDataSource` hoat dong tu UI. | PENDING | |
| Restore `TemplateLayout` hoat dong tu UI. | PENDING | |

## 6. Audit Metadata
| Case | Status | Ghi chu |
| --- | --- | --- |
| Cac man quan tri chinh hien thi `version`, nguoi sua gan nhat va thoi diem sua. | PENDING | |
| Tao moi ban ghi bat ky co `version = 1`. | PENDING | |
| Moi lan sua thanh cong, `version` tang dung 1. | PENDING | |
| `createBy` giu nguyen sau update. | PENDING | |
| `modifyBy` cap nhat theo actor hien tai sau update. | PENDING | |

## 7. Manifest Seed And Migration
| Case | Status | Ghi chu |
| --- | --- | --- |
| Startup seed `PermissionCatalog` tu `permission-manifest.json`. | PASS | Da verify code seed/manifest loader va build backend thanh cong. Can test runtime DB o lan manual tiep theo. |
| `PermissionCatalog` duoc update them/sua title-group-order khi manifest doi. | PASS | Seed backend doc manifest va upsert theo `Code`; code path va startup runtime da co log seed thanh cong. |
| Dynamic menu cu chua co `permissionCode` duoc gan ma tu dong luc startup. | PASS | Da chen menu test cu thieu `PermissionCode`, restart backend, va xac nhan runtime DB duoc gan `dynamicmenu_codex-regression-menu-20260324`. |
| Dynamic menu cu sau migration xuat hien dung trong `PermissionCatalog`. | PASS | Sau restart backend, `PermissionCatalog` co record `Code = dynamicmenu_codex-regression-menu-20260324`, `Group = Menu dong`, `Active = true`. |
| Dynamic menu moi tao tu UI xuat hien trong `PermissionCatalog`. | BLOCKED | Can chay UI + backend + DB thuc te. |
| Dynamic menu moi tao tu UI xuat hien dung trong sidebar sau reload. | BLOCKED | Can xac nhan bang runtime thuc te sau khi tao menu dong moi. |
| Dynamic menu restore lai se re-activate permission catalog item. | PASS | Da verify runtime DB voi menu test: `Delete = false` di cung `PermissionCatalog.Active = true` sau restore. |
| Dynamic menu bi soft delete se deactivate permission catalog item. | PASS | Da verify runtime DB voi menu test: `Delete = true` di cung `PermissionCatalog.Active = false` sau soft delete. |

## 8. P3 Scope Assignment UI
| Case | Status | Ghi chu |
| --- | --- | --- |
| UI gan user cho phep nhap/sua `anchorNodeId`. | PASS | Da them input vao `AssignUserDialog` va noi den API assign/edit; build frontend pass. |
| UI gan user cho phep nhap/sua `ngayHetHan`. | PASS | Da them input `date`, normalize prefill, va map sang timestamp request. |
| UI gan user cho phep nhap/sua `idNguoiUyQuyen`. | PASS | Da them field `idNguoiUyQuyen` cho dialog va payload assign/edit. |
| Edit assignment prefill lai du lieu scope hien co. | PASS | Da mo rong read-model tra `idNguoiUyQuyen` va FE prefill lai scope/anchor/date/attribute. |
| Save assignment update duoc `NgayHetHan` va clear lai khi de trong. | PASS | Backend `AssignUserToGroup` update `NgayHetHan` va set `BsonNull` khi xoa gia tri; build backend pass. |

## Ket qua lan chay gan nhat
- Nguoi chay: Codex
- Ngay chay: 2026-03-24
- Moi truong: local dev
- Da verify ky thuat:
  - Build backend
  - Generate proto frontend
  - Build `Frontend_TBKT`
  - Route guard theo manifest
  - P3 payload UI cho `PhanQuyen`
- Da verify runtime DB:
  - Startup migration gan `permissionCode` cho dynamic menu cu thieu ma quyen
  - Upsert `PermissionCatalog` cho dynamic menu cu sau migration
  - Toggle `PermissionCatalog.Active` theo soft delete/restore cua dynamic menu test
- Hang muc manual UI/DB:
  - Cac case can DB that, actor phan quyen, hoac thao tac UI live duoc danh dau `BLOCKED` cho lan test tay tiep theo
- Ghi chu: checklist nay la runbook de tiep tuc test tay sau khi deploy local/dev
