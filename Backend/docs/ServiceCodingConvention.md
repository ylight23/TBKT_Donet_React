# Service Coding Convention

## Muc tieu

Tai lieu nay thong nhat cach thiet ke service cho cac module nhu `ThamSoService`, `PhanQuyenService`, `CatalogService` va cac service CRUD/read-model khac trong he thong.

Muc tieu:

- giu query path ro rang, de bao tri
- tach biet read-model va write path
- thong nhat cach dung MongoDB aggregation, soft delete, restore
- tranh service "om qua nhieu viec" va response thieu du lieu khien frontend phai tu join

## Nguyen tac chung

- Service gRPC chi nen dong vai tro endpoint/adaptor, con logic nghiep vu nen tach theo domain khi file bat dau phinh to.
- List screen va report screen duoc phep dung read-model rieng.
- Query phuc tap phuc vu UI thi uu tien build o backend, khong day viec join/map sang frontend neu du lieu do on dinh va can hien thi lap lai.
- Write path phai don gian, minh bach, de audit va de rollback.

## ID convention

He thong thong nhat 2 nhom khoa chinh:

### 1. Business key

Chi dung khi `_id` chinh la ma nghiep vu, co y nghia domain va duoc dung trong query/range/tree/sort.

Ap dung:

- `Office`

Rule:

- giu nguyen `_id` theo ma nghiep vu
- khong ep migrate sang GUID
- duoc phep dung `_id` trong regex, sap xep, prefix, quan he cha-con

### 2. GUID mac dinh

Tat ca module dong va du lieu quan tri con lai mac dinh dung:

- `Guid.NewGuid().ToString()`

Ap dung cho:

- `Employee`
- `CapBac`
- toan bo nhom `ThamSo`
- toan bo nhom `PhanQuyen`
- `LichSuPhanQuyenScope`
- `NhomChuyenNganh`
- `PermissionCatalog`

Rule:

- khong dung `ObjectId.GenerateNewId().ToString()`
- khong dung `_id` natural key neu key do khong phai ma nghiep vu bat buoc
- reference giua cac collection dong/quan tri nen tro toi GUID

### Cach ra quyet dinh voi collection moi

Neu tao collection moi, hoi 2 cau:

1. `_id` nay co phai ma nghiep vu can de nguoi dung nhin thay, tim kiem, sap xep, tao cay du lieu khong
2. Neu doi `_id`, nghiep vu co bi mat y nghia khong

Neu cau tra loi la `co`:

- dung business key

Neu cau tra loi la `khong`:

- dung GUID mac dinh

## Phan loai ham trong service

Moi service nen co 3 nhom ham ro rang:

### 1. Query/List

Dung cho man hinh danh sach, tim kiem, detail doc du lieu.

Vi du:

- `GetListFieldSets`
- `GetListFormConfigs`
- `ListGroupUsers`
- `ListAllAssignments`
- `GetCatalogById`

### 2. Command/Mutation

Dung cho create/update/delete/restore/reorder.

Vi du:

- `SaveFieldSet`
- `AddFieldToFieldSet`
- `RemoveFieldFromFieldSet`
- `ReorderFieldSetFields`
- `DeleteFieldSet`
- `RestoreFieldSet`

### 3. Report/ReadModel

Dung cho tong hop, thong ke, dashboard, man hinh can join nhieu nguon.

Vi du:

- `GetAssignmentStatistics`
- `GetFieldSetUsageSummary`
- `GetCatalogUsageReport`

## Quy uoc dung MongoDB query

### GetAll / danh sach

Neu man hinh danh sach can hien thi du lieu lien quan tu collection khac thi dung:

- `$lookup + pipeline`
- projection ro rang
- co phan trang, filter, sort

Dung cho:

- list co preview field tu `DynamicField`
- list assignment can ten nhom, ten user, ten node pham vi
- bao cao, thong ke

Khong nen:

- tra ve full document qua lon neu UI chi can summary
- de frontend tu goi them API khac de map ten/id trong man hinh list thong thuong

### GetById / chi tiet

Mac dinh uu tien:

- query rieng
- projection ro rang
- toi da 1-2 query de doc detail

Chi dung aggregation o `GetById` khi:

- detail la read-model phuc tap
- can join nhieu nguon de tra ve mot object UI hoan chinh

Rule thuc dung:

- list screen => uu tien aggregation khi can joined data
- detail screen => uu tien query rieng

### Add / Remove phan tu trong mang

Dung:

- `AddToSet` de them phan tu va tranh trung
- `Pull` de xoa phan tu khoi mang

Ap dung cho:

- them field vao fieldset
- xoa field khoi fieldset
- them relation id vao 1 danh sach

### Reorder mang

Dung:

- `Set` ca mang

Ly do:

- reorder la thay doi thu tu toan bo
- tranh patch tung phan tu kho theo doi

Ap dung cho:

- reorder `FieldIds`
- reorder `FieldSetIds`
- reorder cac tab, cac block

### Bao cao / thong ke

Dung:

- `$lookup + $group`
- projection rieng cho report

Khong tron report vao CRUD thong thuong.

Neu report bat dau lon:

- tach service/report query rieng

## Quy uoc read-model

Chi nen refactor sang read-model joined khi:

- API dang phuc vu UI list/detail
- frontend dang phai tu ghép id -> ten/object
- du lieu can hien thi lap lai o nhieu noi

Khong ep `$lookup` vao moi API.

Khong nen dung `$lookup` khi:

- API chi can ma/code toi thieu
- da co cache/read-model rieng
- day la write path

Vi du ap dung:

- `PhanQuyenService.GetMyPermissions`: giu cache/read-model, khong doi sang join dong
- `PhanQuyenService.ListAllAssignments`: dung aggregation + lookup
- `PhanQuyenService.ListGroupUsers`: dung aggregation + lookup khi can ten user/node pham vi
- `ThamSoService.GetListFieldSets`: dung aggregation + lookup neu UI can `DynamicField` day du

## Quy uoc soft delete va restore

Tat ca module cau hinh dong, du lieu quan tri, metadata tham chieu nen uu tien soft delete tru khi co ly do rat ro rang de hard delete.

### Soft delete

Khi xoa mem:

- `Delete = true`
- `NgayXoa`
- `NguoiXoa`

Moi query doc du lieu dang hoat dong phai loc:

- `Delete != true`

### Restore

Khi khoi phuc:

- `Delete = false`
- `NgayKhoiPhuc`
- `NguoiKhoiPhuc`

Restore phai qua API rieng, khong tron vao `Save`.

Vi du:

- `RestoreFieldSet`
- `RestoreDynamicField`
- `RestoreFormConfig`

### Phan quyen restore

Chi cac vai tro sau moi duoc restore:

- admin cau hinh
- superadmin

Khong cho user thuong thuc hien restore.

### Validate truoc khi restore

API restore phai validate relation/conflict truoc khi mo lai du lieu.

Can kiem tra it nhat:

- object tham chieu con hop le khong
- key/code/name co bi trung voi ban ghi dang hoat dong khong
- restore co lam song lai relation treo hoac du lieu xung dot khong

Neu khong hop le thi:

- chan restore
- tra ve loi ro nghia

### Xu ly relation khi xoa mem

Voi du lieu co relation, team phai chot ro cho tung loai entity mot trong 3 chien luoc:

1. Chan xoa
- dung khi relation quan trong va khong muon tao dangling reference

2. Bo qua khi doc joined
- dung khi relation co the mat, UI van chap nhan duoc du lieu khuyet

3. Cleanup reference
- dung khi nghiep vu cho phep cap nhat cac mang relation tu dong

Khong de moi service tu xu ly tuy y.

## Quy uoc chan, cascade, transaction

Truoc khi update hoac xoa entity cha, luon hoi 3 cau:

1. Co entity con nao dang phu thuoc khong
2. Neu co, nghiep vu muon bao ve du lieu hay tu dong dong bo du lieu lien quan
3. Neu can sua tu 2 collection tro len, co can dam bao all-or-nothing khong

Tu 3 cau hoi do, chon 1 trong 3 chien luoc sau.

### Khi nao chan

Dung `chan` khi:

- relation quan trong va khong duoc mat ngam
- auto cleanup co the lam vo nghia cau hinh
- user can tu sua quan he truoc khi sua/xoa entity cha
- mutation cham vao metadata cau hinh, form, quyen, tham chieu ma neu tu dong bo reference se kho audit

Rule:

- phat hien relation phu thuoc
- tra ve loi ro nghia
- yeu cau xu ly entity con truoc

Vi du:

- xoa `DynamicField` khi van con `FieldSet` dang dung
- restore `FieldSet` khi `FieldIds` ben trong da khong con hop le
- xoa `NhomNguoiDung` he thong neu nghiep vu khong cho phep

### Khi nao cascade

Dung `cascade` khi:

- nghiep vu da chot ro entity con phai di cung entity cha
- auto cleanup khong lam mat y nghia du lieu
- user mong doi ket qua "cha doi thi con doi theo"
- relation la technical dependency, khong phai du lieu nguoi dung can tu quyet

Rule:

- xu ly entity con truoc
- sau do moi sua/xoa entity cha
- phai viet ro service nao la owner cua quy trinh cascade

Vi du:

- xoa `FieldSet` va remove id khoi cac `FormConfig.Tabs.FieldSetIds` neu team chot day la hanh vi mong muon
- xoa `DynamicMenuDataSource` va soft delete toan bo `DynamicMenu` dung `SourceKey` do neu nghiep vu yeu cau di dong bo
- xoa nhom quyen va cleanup relation trung gian cung luc

### Khi nao bat buoc transaction

Bat buoc dung transaction khi:

- mutation thay doi tu 2 collection tro len va ket qua phai nhat quan all-or-nothing
- co cascade mutation thuc su
- co read-before-write quan trong de quyet dinh write tiep theo
- fail o bat ky buoc nao cung khong duoc de lai partial state

Khong bat buoc transaction khi:

- chi update 1 collection
- chi validate roi chan
- side effect co the retry hoac eventual consistency chap nhan duoc

Rule:

- neu da chon `cascade` va cascade cham nhieu collection, mac dinh phai can nhac transaction truoc tien
- loi o bat ky buoc nao => rollback toan bo

## Ap dung cho ThamSo

### Cac thao tac nen chan

- `DeleteDynamicField`
  - chan neu field van dang duoc `FieldSet` tham chieu
- `RestoreFieldSet`
  - chan neu `FieldIds` ben trong khong con tro toi `DynamicField` dang hoat dong
- `RestoreFormConfig`
  - chan neu `FieldSetIds` ben trong khong con tro toi `FieldSet` dang hoat dong
- `RestoreDynamicMenu`
  - chan neu `DataSource` tham chieu khong con active
- `RestoreDynamicMenuDataSource`
  - chan neu trung `SourceKey` dang hoat dong
- `RestoreTemplateLayout`
  - chan neu trung `Key` dang hoat dong

Ly do:

- day la du lieu cau hinh
- auto cleanup ngam de gay vo form/menu ma nguoi dung khong de y
- hien tai codebase da di theo huong protect reference integrity

### Cac thao tac co the cascade neu team chot nghiep vu

- `DeleteFieldSet`
  - co the cascade remove `FieldSetIds` khoi `FormConfig.Tabs`
- `DeleteDynamicMenuDataSource`
  - co the cascade soft delete `DynamicMenu` cung `SourceKey`
- `DeleteFormConfig`
  - co the cascade cleanup relation voi module template neu sau nay co rang buoc truc tiep

Nhung hien tai:

- chua nen tu dong cascade trong `ThamSo`
- uu tien `chan` hon `cascade`
- vi cau hinh dong can minh bach va de audit

### Khi nao transaction bat buoc trong ThamSo

Bat buoc neu team quyet dinh chuyen 1 trong cac flow sau sang cascade that:

- `DeleteFieldSet` + cleanup `FormConfig`
- `DeleteDynamicMenuDataSource` + soft delete `DynamicMenu`
- bat ky flow nao vua cap nhat entity cha vua cap nhat danh sach id cua entity con

Khong bat buoc voi luong hien tai:

- `Delete...` dang chi soft delete 1 collection
- `Restore...` dang chi validate roi update 1 collection

## Ap dung cho PhanQuyen

### Cac thao tac nen chan

- `DeleteNhomNguoiDung`
  - chan voi nhom he thong
- `AssignUserToGroup`
  - chan du lieu request khong hop le, duplicate relation hoac scope khong hop le
- `SaveGroupPermissions`
  - chan neu payload quyen khong hop le

### Cac thao tac dang cascade hop ly

- `DeleteNhomNguoiDung`
  - xoa nhom
  - xoa relation user-group
  - xoa quyen theo nhom
  - xoa quyen phan he theo nhom
  - xoa quyen nganh doc theo nhom
  - enqueue rebuild cho user bi anh huong

- `SaveGroupPermissions`
  - cap nhat quyen nhom
  - cap nhat `ScopeType` neu co
  - enqueue rebuild cho tat ca user trong nhom

- `AssignUserToGroup` / `RemoveUserFromGroup`
  - cap nhat relation
  - enqueue rebuild cho dung user bi anh huong

### Khi nao transaction bat buoc trong PhanQuyen

Bat buoc can nhac transaction neu:

- 1 thao tac dong thoi sua nhieu collection quyen/nhom/assignment
- va khong chap nhan trang thai trung gian

Theo convention:

- `DeleteNhomNguoiDung` la ung vien ro nhat cho transaction, vi dang dong vao nhieu collection
- `SaveGroupPermissions` can transaction neu team muon dam bao viec xoa cu + them moi + update scope la all-or-nothing
- `AssignUserToGroup` va `RemoveUserFromGroup` hien tai co the chua can transaction neu write path van don gian va rebuild queue chap nhan retry

### Side effect eventual consistency trong PhanQuyen

`rebuildQueue` va `rebuildService` la side effect sau mutation.

Rule:

- neu mutation chinh thanh cong ma enqueue rebuild fail, phai log ro va co co che retry
- khong ep transaction Mongo bao tron ca rebuild queue neu queue khong cung transaction boundary
- uu tien nhat quan du lieu nguon quyen truoc, read-model cache rebuild sau

## Index convention

Index phai bam theo query thuc te, khong bam theo cam tinh.

Nen index khi:

- field duoc filter lap lai
- field duoc sort lap lai
- field la join key hoac relation key
- collection co xu huong tang nhanh

Voi du lieu soft delete, uu tien compound index gom:

- field chinh + `Delete`

Vi du:

- `{ SourceKey: 1, Delete: 1 }`
- `{ DataSource: 1, Delete: 1 }`
- `{ "Validation.DataSource": 1, Delete: 1 }`

## DTO / Proto / Response convention

- Neu response la read-model phuc vu UI, co the tra them du lieu joined.
- Neu can giu entity goc sach se, co the dung wrapper detail/view.
- Khong dat ten wrapper qua ky thuat neu team thay kho doc.

Vi du ten chap nhan duoc:

- `FieldSetDetail`
- `CatalogDetail`
- `AssignmentDetail`

Khong nen dat ten mo ho nhu:

- `Result`
- `Data`

## Validation convention

Validation nen dat tai write path, khong dat tai frontend la chinh.

Can validate:

- id bat buoc
- duplicate key/code
- relation hop le
- xung dot khi restore
- du lieu co bi xoa mem khong

Validation helper dung chung co the tach rieng, nhung khong duoc de frontend ganh phan xac thuc nghiep vu chinh.

## Logging convention

Can log ro voi cac thao tac sau:

- delete
- restore
- rebuild cache/read-model
- migration/index initialization
- conflict khi restore

Log nen co:

- actor
- entity id
- action
- ket qua

## Khuyen nghi ap dung ngay

### `ThamSoService`

- list cau hinh dung aggregation khi UI can joined data
- mutate mang dung `AddToSet`, `Pull`, `Set` ca mang theo dung use case
- bo sung API `Restore...` rieng cho `DynamicField`, `FieldSet`, `FormConfig` neu module nay can khoi phuc

### `PhanQuyenService`

- giu `GetMyPermissions` theo huong cache/read-model
- tiep tuc dung aggregation cho `ListGroupUsers`, `ListAllAssignments`
- khong ep `$lookup` vao cac write API

### `CatalogService`

- tach ro list/query va command
- cac man hinh list lon co joined info thi dung aggregation + projection ro
- neu co xoa mem thi phai them policy restore thong nhat nhu tren

## Definition of Done cho service moi

Mot service duoc xem la dat convention khi:

- phan tach ro query, command, report
- list co pagination/filter/sort khi can
- query doc loc `Delete != true`
- delete dung soft delete policy thong nhat
- restore qua API rieng va co validate conflict/relation
- chi dung `$lookup` khi thuc su phuc vu read-model
- index duoc tao dua tren query thuc te
- frontend khong phai tu join du lieu co ban lap lai
