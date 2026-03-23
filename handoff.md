# Handoff

## Tổng quan
- Ngày: 2026-03-24
- Máy đang làm: `d:\TBKT_Donet_React`
- Repo/path: `d:\TBKT_Donet_React`
- Nhánh git: chưa kiểm tra cụ thể
- Commit gần nhất: chưa ghi nhận trong handoff này
- Người tiếp nhận: team BE / FE / QA

## Trạng thái nhanh
- [x] Đã review tĩnh code BE/FE cho phân quyền + cấu hình động
- [x] Đã chạy build frontend
- [x] Đã chạy build backend
- [ ] Chưa chạy test regression tự động
- [x] Đã xác định thứ tự ưu tiên triển khai
- [x] Chưa commit

## Kết luận ngắn
- Phần nền tảng CRUD cho `DynamicField`, `FieldSet`, `FormConfig`, `DynamicMenu`, `DynamicMenuDataSource`, `TemplateLayout` đã có.
- Phần `GetMyPermissions` và read-model phân quyền đang đi đúng hướng cache/read-model.
- Enforcement quyền runtime cho menu động và datasource động đã được khóa ở backend; frontend lọc thêm để tối ưu UX.
- Validation toàn vẹn tham chiếu giữa datasource -> menu và field -> fieldset -> form đã được bổ sung ở các luồng save/delete chính.
- Restore UI cho `DynamicField`, `FieldSet`, `FormConfig`, `DynamicMenu`, `DynamicMenuDataSource`, `TemplateLayout` đã có.
- Hệ thống hiện đã đi theo mô hình `schema-driven config + JSON runtime`, không phải lưu tất cả vào một blob JSON thuần.
- Điểm còn mở lớn nhất hiện tại là UI scope động/ABAC và kiểm thử hồi quy vận hành theo checklist.

## Trạng thái kiến trúc hiện tại
- `DynamicField`, `FieldSet`, `FormConfig`, `DynamicMenu`, `DynamicMenuDataSource` đang được quản trị như metadata có schema và validation nghiệp vụ.
- `TemplateLayout.schemaJson` là lớp JSON runtime để mô tả layout/block, tách khỏi lớp metadata cấu hình.
- `SyncFromProto` đã được chốt là nguồn chuẩn cho datasource entity chính; datasource manual chỉ là fallback có kiểm soát.
- `FormConfig` đã có `key/code` ổn định cho runtime, không còn phụ thuộc `name` làm định danh nghiệp vụ.
- Audit/version đã được đưa vào các cấu hình động chính để hỗ trợ truy vết thay đổi.

## Sprint Checklist

| ID | Hạng mục | Owner | BE | FE | QA | Priority | Definition of Done |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Enforce quyền runtime cho menu động | BE lead | Thêm kiểm tra `permissionCode` trong `GetListDynamicMenus` và/hoặc `GetDynamicMenuRows`; chỉ trả menu/dữ liệu user có quyền `view` | Ẩn menu động user không có quyền; không render item trái quyền ở sidebar và block menu | Viết test case user có quyền / không có quyền / admin | P0 | User không thể thấy hoặc gọi thành công menu động trái quyền; test pass cho 3 role chính |
| P2 | Chuẩn hóa mapping `permissionCode -> view action` | BE + FE | Chốt helper kiểm tra quyền theo `permissionCode` thống nhất với permission catalog | Dùng chung một rule khi gọi `canFunc(...)` hoặc equivalent | Kiểm thử menu static và dynamic dùng cùng rule | P0 | Không còn khác biệt giữa menu static và dynamic khi kiểm tra quyền xem |
| P3 | Hoàn thiện UI scope động / ABAC | FE owner | Hỗ trợ đầy đủ request fields đã có ở backend như `scopeAttribute`, `ngayHetHan`, `anchorNodeId`, `idNguoiUyQuyen` | Thêm form nhập/sửa scope nâng cao ở màn hình phân quyền | Viết test case với scope theo thuộc tính, scope hết hạn, delegated | P1 | Người dùng có thể tạo/sửa assignment với scope nâng cao và backend đọc lại đúng |
| D1 | Khóa toàn vẹn datasource -> menu khi save menu | BE owner | `SaveDynamicMenu` validate datasource tồn tại và active; fail rõ nếu invalid | Hiển thị lỗi rõ ràng trong màn cấu hình menu | Test save menu với datasource hợp lệ / disable / đã xóa | P0 | Không thể lưu menu tham chiếu datasource không hợp lệ |
| D2 | Chốt hành vi xóa datasource | BE lead | Chọn 1 trong 2: chặn xóa nếu còn menu dùng, hoặc cascade soft delete menu liên quan | FE hiển thị warning trước khi xóa theo rule đã chốt | QA test cả nhánh chặn và nhánh cascade theo rule cuối cùng | P0 | Không còn trạng thái datasource bị xóa nhưng menu runtime vẫn gãy âm thầm |
| D3 | Cảnh báo field mapping lỗi giữa datasource và menu | BE + FE | Cung cấp metadata hoặc API giúp phát hiện field menu không còn trong datasource | Hiển thị warning trong màn cấu hình menu và preview sample data | Test khi đổi field registry hoặc sync proto làm mất field cũ | P1 | Người cấu hình nhìn thấy mismatch trước khi publish/use runtime |
| D4 | Preview runtime cho menu động | FE owner | Nếu cần, bổ sung API sample/preview ổn định hơn | Thêm preview grid/runtime ngay trong trang cấu hình menu | QA kiểm tra preview với datasource rỗng, lỗi, dữ liệu bình thường | P2 | Có thể xem trước columns + sample rows ngay khi cấu hình menu |
| D5 | Chốt source of truth cho datasource | BE lead | Quy định `SyncFromProto` là chuẩn cho entity chính, `DiscoverCollectionFields` là fallback/manual | Gắn chú thích rõ trong UI datasource | QA xác nhận flow sync proto và browse collection hoạt động theo đúng vai trò | P2 | Team thống nhất quy trình tạo datasource mới, không mơ hồ giữa proto và scan Mongo |
| F1 | Validate toàn vẹn `FieldSetIds` khi lưu `FormConfig` | BE owner | `SaveFormConfig` reject nếu tab tham chiếu fieldset đã xóa/invalid | FE hiển thị lỗi chi tiết theo tab/fieldset | QA test save form với fieldset hợp lệ và orphan fieldset | P0 | Không thể lưu form chứa tham chiếu fieldset mồ côi |
| F2 | Validate toàn vẹn `FieldIds` khi lưu `FieldSet` | BE owner | `SaveFieldSet` reject nếu field không còn active | FE hiển thị lỗi field nào invalid | QA test với field delete trước rồi save set | P0 | Không thể lưu fieldset chứa field mồ côi |
| F3 | Chốt hành vi xóa `FieldSet` đang được form dùng | BE lead | Chọn 1 trong 2: chặn xóa, hoặc cascade remove khỏi `FormConfig.Tabs` | FE hiển thị confirm/warning theo rule đã chốt | QA test delete fieldset khi đang được dùng bởi nhiều form/tab | P1 | Hành vi xóa thống nhất, không tạo form lỗi âm thầm |
| F4 | Surface lỗi runtime form/json rõ ràng | FE owner | Có thể bổ sung metadata lỗi khi join thiếu config | Runtime form/template hiển thị lỗi rõ thay vì silently bỏ qua block/fieldset | QA test form có config thiếu, fieldset thiếu, field thiếu | P1 | Người dùng và team cấu hình nhận biết ngay cấu hình lỗi tại runtime |
| F5 | Tách rõ `FormConfig` và `TemplateLayout.schemaJson` trong nghiệp vụ | BE + FE lead | Chốt tài liệu vai trò từng loại cấu hình, tránh dùng lẫn | Gắn label/mô tả rõ ở UI cấu hình template và cấu hình form | QA review lại flow chính của trang bị + template menu động | P1 | Team thống nhất: form nhập động và layout runtime là hai lớp cấu hình khác nhau |
| F6 | Gắn đúng form theo menu/template key, bỏ fallback âm thầm | FE owner | Nếu cần thêm identifier ổn định ở BE/seed | `TrangBiDataGrid` / dialog chọn form theo key hoặc mapping rõ ràng, không default form đầu tiên nếu mismatch | QA test trường hợp thiếu mapping | P1 | Nếu thiếu mapping thì báo lỗi rõ, không dùng nhầm form |
| R1 | Bổ sung restore UI cho cấu hình động | FE owner | Tận dụng các RPC `Restore...` đã có | Thêm list deleted / action restore cho field, fieldset, form, menu, datasource, template | QA test soft delete -> restore -> runtime hoạt động lại | P2 | Admin có thể khôi phục cấu hình mà không phải thao tác DB tay |
| R2 | Audit log / version nhẹ cho config động | BE owner | Cân nhắc `updatedAt`, `updatedBy`, version hoặc history nhẹ cho config | FE hiển thị thông tin sửa gần nhất ở màn quản trị | QA test update nhiều lần và kiểm tra metadata | P3 | Có thể audit ai sửa cấu hình nào và khi nào |
| T1 | Regression test cho menu động + datasource | QA owner | Chuẩn bị dataset test hoặc fixture | Chuẩn bị kịch bản FE tái hiện | Viết checklist regression cho create/edit/delete/restore/sync | P1 | Có bộ regression tối thiểu cho datasource/menu chạy lại sau mỗi sprint |
| T2 | Regression test cho form động + template JSON | QA owner | Chuẩn bị fixture config `Field`, `FieldSet`, `FormConfig`, `TemplateLayout` | Chạy các flow create/edit/render runtime | Test tab thường, tab sync-group, child tab, template có `DynamicMenuBlock` / `DataTableBlock` | P1 | Có bộ regression tối thiểu cho form/json runtime |

## Theo luồng ưu tiên

### Giai đoạn 1: Chặn lỗi lớn ở runtime
- [x] P1 - Enforce quyền runtime cho menu động
- [x] P2 - Chuẩn hóa mapping `permissionCode -> view action`
- [x] D1 - Validate datasource khi save menu
- [x] D2 - Chốt hành vi xóa datasource
- [x] F1 - Validate `FieldSetIds` khi lưu `FormConfig`
- [x] F2 - Validate `FieldIds` khi lưu `FieldSet`

### Giai đoạn 2: Hoàn thiện quản trị và trải nghiệm cấu hình
- [ ] P3 - UI scope động / ABAC
- [x] D3 - Cảnh báo field mapping lỗi
- [x] D4 - Preview runtime cho menu động
- [x] F3 - Chốt hành vi xóa `FieldSet`
- [x] F4 - Surface lỗi runtime rõ ràng
- [x] R1 - Restore UI cho cấu hình động

### Giai đoạn 3: Ổn định hóa và audit
- [x] D5 - Chốt source of truth cho datasource
- [x] F5 - Tách rõ `FormConfig` và `TemplateLayout.schemaJson`
- [x] F6 - Bỏ fallback âm thầm khi chọn form
- [x] R2 - Audit log / version nhẹ
- [x] T1 - Regression menu/datasource
- [x] T2 - Regression form/json runtime

## Kế hoạch triển khai theo giai đoạn

### Giai đoạn 1A: Khóa runtime permission
Mục tiêu:
- Chặn truy cập trái quyền ở runtime menu động bằng backend.
- Đồng bộ rule kiểm tra quyền giữa backend, sidebar và runtime page.

Đầu việc:
- [x] BE: bổ sung check `permissionCode` trong `GetListDynamicMenus`
- [x] BE: bổ sung check `permissionCode` trong `GetDynamicMenuRows`
- [x] BE: chuẩn hóa helper check action `view`
- [x] FE: lọc danh sách menu động theo quyền hiện tại trước khi render
- [x] FE: lọc cả `DynamicMenuBlock` và các điểm dùng `useDynamicMenuConfig`
- [ ] QA: test `admin`, `user có quyền`, `user không có quyền`

Definition of Done:
- User không có quyền không lấy được menu/dữ liệu kể cả gọi API trực tiếp.
- Sidebar, menu block và trang `/menu-dong/:id` cho kết quả nhất quán.

### Giai đoạn 1B: Khóa toàn vẹn datasource -> menu
Mục tiêu:
- Không để runtime gãy vì menu trỏ tới datasource không hợp lệ.

Đầu việc:
- [x] BE: `SaveDynamicMenu` validate datasource tồn tại và active
- [x] BE: `DeleteDynamicMenuDataSource` đổi sang `cascade soft delete` menu liên quan theo `sourceKey`
- [x] BE: cân nhắc log số menu bị cascade khi xóa datasource
- [x] FE: hiển thị cảnh báo rõ khi xóa datasource sẽ làm soft delete menu liên quan
- [x] FE: refresh lại list menu sau khi xóa datasource nếu có màn liên quan cùng session
- [ ] QA: test save menu với datasource active / disabled / deleted
- [ ] QA: test delete datasource và kiểm tra menu liên quan biến mất khỏi runtime

Definition of Done:
- Không còn trường hợp datasource bị xóa nhưng menu vẫn còn active ở runtime.
- Khi restore datasource, menu không tự bật lại ngoài ý muốn.

### Giai đoạn 1C: Khóa toàn vẹn field -> fieldset -> form
Mục tiêu:
- Không để `FormConfig` hoặc runtime form chứa tham chiếu mồ côi.

Đầu việc:
- [x] BE: `SaveFieldSet` reject nếu chứa `FieldId` không còn active
- [x] BE: `SaveFormConfig` reject nếu chứa `FieldSetId` không còn active
- [x] BE: `DeleteFieldSet` đổi sang `cascade remove khỏi FormConfig.Tabs`
- [x] BE: đảm bảo thao tác cascade không làm hỏng thứ tự tab hoặc cấu trúc sync-group
- [ ] FE: hiển thị lỗi save rõ theo fieldset/tab bị invalid
- [ ] QA: test delete fieldset đang được nhiều form dùng
- [ ] QA: test save form cũ sau khi fieldset đã bị remove

Definition of Done:
- Không thể lưu cấu hình chứa tham chiếu mồ côi.
- Xóa fieldset sẽ làm sạch tham chiếu form thay vì để runtime lỗi âm thầm.

### Giai đoạn 2A: Hoàn thiện quản trị datasource/menu
Mục tiêu:
- Người cấu hình nhìn ra ngay menu/datasource nào lỗi hoặc thiếu mapping.

Đầu việc:
- [x] FE: thêm preview sample data trong cấu hình menu
- [x] FE: hiển thị mismatch field giữa menu columns và datasource fields
- [ ] BE: nếu cần, thêm metadata hỗ trợ preview/mismatch
- [x] FE: hiển thị trạng thái menu bị cascade delete do datasource
- [ ] QA: test thay đổi field registry sau sync proto

Definition of Done:
- Người cấu hình có thể thấy trước dữ liệu và phát hiện field mapping sai trước khi đưa vào runtime.

### Giai đoạn 2B: Hoàn thiện phân quyền động nâng cao
Mục tiêu:
- Dùng được scope động thật, không chỉ `scopeType` cơ bản.

Đầu việc:
- [ ] FE: form gán quyền hỗ trợ `anchorNodeId`
- [ ] FE: form gán quyền hỗ trợ `scopeAttribute`
- [ ] FE: form gán quyền hỗ trợ `ngayHetHan`
- [ ] FE: form gán quyền hỗ trợ `idNguoiUyQuyen` nếu nghiệp vụ cần
- [ ] BE: rà lại input validation cho các field scope nâng cao
- [ ] QA: test delegated, by-attribute, expired scope

Definition of Done:
- Có thể tạo và sửa assignment scope nâng cao từ UI, backend đọc lại đúng, runtime không regress.

### Giai đoạn 2C: Restore UI cho cấu hình động
Mục tiêu:
- Admin không cần thao tác DB tay khi khôi phục config.

Đầu việc:
- [x] FE: thêm action restore cho `DynamicField`
- [x] FE: thêm action restore cho `FieldSet`
- [x] FE: thêm action restore cho `FormConfig`
- [x] FE: thêm action restore cho `DynamicMenu`
- [x] FE: thêm action restore cho `DynamicMenuDataSource`
- [x] FE: thêm action restore cho `TemplateLayout`
- [ ] QA: test delete -> restore -> runtime dùng lại được

Definition of Done:
- Tất cả config soft delete chính có thể restore từ UI quản trị.

### Giai đoạn 3A: Chuẩn hóa nguồn dữ liệu và định danh runtime
Mục tiêu:
- Giảm rủi ro do naming không ổn định và config thủ công khó kiểm soát.

Đầu việc:
- [x] BE: tài liệu hóa `SyncFromProto` là nguồn chuẩn cho datasource entity chính
- [x] FE: chỉnh UI datasource để phân biệt rõ `proto-managed` và `manual/fallback`
- [x] BE: bổ sung `key` hoặc `code` ổn định cho `FormConfig`
- [x] FE: thay lookup form theo `name` bằng `key`/`code`
- [x] FE: các màn runtime trang bị/template không còn fallback theo `name`
- [ ] QA: test rename `FormConfig.name` nhưng runtime vẫn hoạt động

Definition of Done:
- Đổi tên hiển thị form không làm vỡ runtime.
- Datasource entity chính được sinh/quản trị theo một nguồn chuẩn duy nhất.

### Giai đoạn 3B: Audit, version, regression
Mục tiêu:
- Có khả năng audit thay đổi và chống regress khi mở rộng thêm JSON runtime.

Đầu việc:
- [x] BE: thêm metadata `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `version`
- [x] FE: hiển thị thông tin sửa gần nhất ở các màn quản trị chính
- [x] QA: tạo checklist regression cho menu/datasource
- [x] QA: tạo checklist regression cho form/json runtime
- [x] QA: tạo checklist regression cho permission runtime

Definition of Done:
- Team có thể truy vết thay đổi cấu hình và có bộ checklist regression tối thiểu trước mỗi lần release.

Kết quả đã làm:
- Proto và BE đã expose metadata audit/version cho `DynamicField`, `FieldSet`, `FormConfig`, `DynamicMenu`, `DynamicMenuDataSource`, `TemplateLayout`.
- FE đã map metadata audit và hiển thị tóm tắt `version • actor • thời gian` ở các màn quản trị chính.
- Đã bổ sung checklist regression thủ công tại [dynamic-config-regression.md](D:/TBKT_Donet_React/docs/regression/dynamic-config-regression.md).

## File chính đã rà

### Backend
- [ThamSoService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSoService.cs)
- [PhanQuyenServiceImpl.cs](D:/TBKT_Donet_React/Backend/src/Services/PhanQuyenServiceImpl.cs)
- [DynamicFieldService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSo/DynamicFieldService.cs)
- [FieldSetService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSo/FieldSetService.cs)
- [FormConfigService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSo/FormConfigService.cs)
- [DynamicMenuService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSo/DynamicMenuService.cs)
- [DynamicMenuDataSourceService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSo/DynamicMenuDataSourceService.cs)
- [ProtoSchemaDiscoveryService.cs](D:/TBKT_Donet_React/Backend/src/Services/ThamSo/ProtoSchemaDiscoveryService.cs)

### Frontend
- [phanQuyenApi.ts](D:/TBKT_Donet_React/Frontend_TBKT/src/apis/phanQuyenApi.ts)
- [thamSoApi.ts](D:/TBKT_Donet_React/Frontend_TBKT/src/apis/thamSoApi.ts)
- [CauHinhDataSource/index.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/pages/CauHinhDataSource/index.tsx)
- [CauHinhMenu/index.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/pages/CauHinhMenu/index.tsx)
- [useDynamicMenuConfig.ts](D:/TBKT_Donet_React/Frontend_TBKT/src/hooks/useDynamicMenuConfig.ts)
- [MenuDong/index.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/pages/MenuDong/index.tsx)
- [DynamicMenuBlock.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/features/templateRuntime/blocks/DynamicMenuBlock.tsx)
- [DataTableBlock.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/features/templateRuntime/blocks/DataTableBlock.tsx)
- [thamSo.ts](D:/TBKT_Donet_React/Frontend_TBKT/src/store/reducer/thamSo.ts)
- [useFormConfigManager.ts](D:/TBKT_Donet_React/Frontend_TBKT/src/pages/CauHinhTemplate/hooks/useFormConfigManager.ts)
- [PageFormConfig.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/pages/CauHinhThamSo/subComponents/PageFormConfig.tsx)
- [TrangBiDataGrid/index.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/components/TrangBiDataGrid/index.tsx)
- [AddTrangBiDialog.tsx](D:/TBKT_Donet_React/Frontend_TBKT/src/components/TrangBiDataGrid/AddTrangBiDialog.tsx)

## Vướng mắc / quyết định cần chốt
- [x] Xóa datasource sẽ `cascade soft delete menu liên quan`
- [x] Xóa fieldset sẽ `cascade remove khỏi form tabs`
- [x] Runtime menu động sẽ enforce quyền ở BE hoàn toàn; FE vẫn lọc thêm để tối ưu UX nhưng không được xem là lớp bảo vệ chính
- [x] `SyncFromProto` là nguồn chuẩn bắt buộc cho datasource entity chính; `DiscoverCollectionFields` chỉ dùng cho fallback/manual datasource
- [x] Mapping form theo `name` cần đổi sang `key`/`code` ổn định, không dùng `name` làm định danh runtime

## Quyết định đã chốt
- Datasource delete:
  - Soft delete datasource
  - Cascade soft delete toàn bộ `DynamicMenu` đang tham chiếu `sourceKey`
  - Khi restore datasource, không auto-restore menu; admin chủ động restore menu nếu cần
- FieldSet delete:
  - Soft delete fieldset
  - Cascade remove `FieldSetId` khỏi toàn bộ `FormConfig.Tabs`
  - Không xóa cả form, chỉ làm sạch tham chiếu
- Runtime permission:
  - Backend là nơi enforce bắt buộc cho menu động và datasource runtime
  - Frontend chỉ lọc bổ sung để không hiển thị menu trái quyền
- Datasource source of truth:
  - Entity chính đi qua `SyncFromProto`
  - `DiscoverCollectionFields` dành cho collection phụ, dữ liệu legacy, hoặc cấu hình thủ công
- Form mapping:
  - Bổ sung `key` hoặc `code` ổn định cho `FormConfig`
  - Các màn runtime như `TrangBiDataGrid` / dialog / template integration phải map theo `key`/`code`
  - `name` chỉ còn là nhãn hiển thị, không dùng để lookup nghiệp vụ

## Cách triển khai đề xuất
1. Làm xong nhóm P1/P2/D1/D2/F1/F2 trước, không mở rộng UI mới trước khi khóa runtime.
2. Sau khi khóa runtime, mới làm restore UI + scope động nâng cao.
3. Trước khi merge rộng, tạo regression checklist cho menu/datasource và form/json runtime.

## Gợi ý phân công
- BE lead: quyết định rule nghiệp vụ delete/cascade + enforcement permission runtime
- BE owner: implement validation save/restore/integrity
- FE owner: filter menu theo quyền, warning cấu hình lỗi, restore UI, scope UI nâng cao
- QA owner: tạo bộ case regression cho quyền động, datasource/menu, form/json runtime

## Lệnh đã dùng
```bash
# repo scan
rg -n --hidden -S "json|dynamic|menu|permission|role|authorize|datasource|form" Frontend_TBKT Backend handoff.md

# đọc service/backend
Get-Content Backend\src\Services\ThamSoService.cs
Get-Content Backend\src\Services\PhanQuyenServiceImpl.cs
Get-Content Backend\src\Services\ThamSo\DynamicMenuService.cs
Get-Content Backend\src\Services\ThamSo\FormConfigService.cs
Get-Content Backend\src\Services\ThamSo\DynamicMenuDataSourceService.cs

# đọc frontend
Get-Content Frontend_TBKT\src\apis\phanQuyenApi.ts
Get-Content Frontend_TBKT\src\apis\thamSoApi.ts
Get-Content Frontend_TBKT\src\pages\CauHinhDataSource\index.tsx
Get-Content Frontend_TBKT\src\pages\MenuDong\index.tsx
Get-Content Frontend_TBKT\src\pages\CauHinhTemplate\hooks\useFormConfigManager.ts
```

## Bước tiếp theo
1. Hoàn thiện `P3`: UI scope động / ABAC cho các field như `anchorNodeId`, `scopeAttribute`, `ngayHetHan`, `idNguoiUyQuyen`.
2. Chạy checklist tại [dynamic-config-regression.md](D:/TBKT_Donet_React/docs/regression/dynamic-config-regression.md) cho 3 cụm: permission, datasource/menu, form/json runtime.
3. Nếu muốn đi thêm một bước nền tảng, cân nhắc tách checklist QA thành test case có `Test ID / Steps / Expected`.
4. Sau khi QA ổn định, mới cân nhắc các bước tối ưu cao hơn như import/export config, history chi tiết hơn, hoặc trash view liên phiên.

## Prompt cho máy sau
```text
Đọc handoff.md trước.

Ưu tiên sprint hiện tại:
1. Khóa runtime permission cho dynamic menu và datasource
2. Khóa toàn vẹn tham chiếu datasource -> menu và field -> fieldset -> form
3. Sau đó mới làm restore UI và scope động nâng cao

Khi làm:
- Không revert thay đổi ngoài phạm vi task
- Ưu tiên sửa BE trước nếu task liên quan enforcement/validation
- Nếu phải chọn rule nghiệp vụ cho delete/cascade, kiểm tra mục "Vướng mắc / quyết định cần chốt" trong handoff.md
```

## Ghi chú nhanh
- Đây không còn chỉ là handoff từ review tĩnh; file đã phản ánh cả phần triển khai qua các giai đoạn 1, 2, 3A, 3B.
- Build frontend và backend đã chạy thành công; regression hiện mới ở mức checklist thủ công, chưa có test tự động đầy đủ.
- `handoff.md` cũ bị lỗi encoding, đã được thay bằng bản sprint-ready này.
