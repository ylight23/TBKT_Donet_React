# Dynamic Config Regression

Ngày cập nhật: 2026-03-24

## Phạm vi
- Phân quyền runtime cho menu động
- Datasource và menu động
- DynamicField, FieldSet, FormConfig
- TemplateLayout và JSON runtime
- Restore và audit metadata

## 1. Permission Runtime
- [ ] User không có quyền `view` không thấy menu động trong sidebar hoặc `DynamicMenuBlock`.
- [ ] User không có quyền gọi runtime `GetListDynamicMenus` không nhận menu ngoài quyền.
- [ ] User không có quyền gọi `GetDynamicMenuRows` cho menu động bị chặn.
- [ ] Admin hoặc user có quyền `thamso_dynamicmenu` vẫn quản trị được cấu hình.
- [ ] Kiểm tra menu tĩnh và menu động cùng tuân theo một rule quyền xem.

## 2. Datasource And Menu
- [ ] Tạo datasource manual mới, lưu thành công, metadata `version = 1`.
- [ ] Sửa datasource manual, metadata `version` tăng và `modifyBy` thay đổi.
- [ ] Sync datasource từ proto, datasource nhận mode `proto`.
- [ ] Datasource `proto-managed` không bị chỉnh lệch schema ngoài ý muốn ở UI.
- [ ] Tạo menu động mới trỏ đúng datasource active.
- [ ] Menu động hiển thị preview sample data.
- [ ] Khi field mapping sai, màn cấu hình menu báo mismatch rõ ràng.
- [ ] Xóa datasource sẽ cascade soft delete menu liên quan.
- [ ] Restore datasource không tự restore menu.
- [ ] Restore menu thủ công sau đó runtime hoạt động lại bình thường.

## 3. Form Runtime
- [ ] Tạo DynamicField mới, lưu thành công, audit metadata hiển thị ở thư viện field.
- [ ] Sửa DynamicField, `version` tăng.
- [ ] Tạo FieldSet hợp lệ với field active.
- [ ] Save FieldSet với field đã bị xóa bị chặn.
- [ ] Tạo FormConfig có `key` ổn định.
- [ ] Đổi `name` của FormConfig nhưng giữ nguyên `key`, runtime vẫn tìm đúng form.
- [ ] Save FormConfig với `FieldSetId` không còn active bị chặn.
- [ ] Xóa FieldSet đang được form dùng sẽ remove khỏi `Tabs` thay vì để orphan reference.
- [ ] Runtime trang bị không fallback sang form đầu tiên nếu thiếu mapping; phải báo lỗi rõ.

## 4. Template JSON Runtime
- [ ] Tạo TemplateLayout mới, metadata `version = 1`.
- [ ] Publish template và render bằng `templateKey`.
- [ ] Template có `schemaJson` rỗng báo lỗi rõ tại runtime.
- [ ] Template có JSON sai format báo lỗi rõ tại runtime.
- [ ] Template không có block nào báo lỗi rõ tại runtime.
- [ ] `DynamicMenuBlock` lỗi load phải hiện cảnh báo thay vì fail âm thầm.
- [ ] `AddTrangBiDialog` thiếu `FormConfig`, `FieldSet`, hoặc field phải hiện warning rõ.

## 5. Restore
- [ ] Restore `DynamicField` hoạt động từ UI.
- [ ] Restore `FieldSet` hoạt động từ UI.
- [ ] Restore `FormConfig` hoạt động từ UI.
- [ ] Restore `DynamicMenu` hoạt động từ UI.
- [ ] Restore `DynamicMenuDataSource` hoạt động từ UI.
- [ ] Restore `TemplateLayout` hoạt động từ UI.

## 6. Audit Metadata
- [ ] Các màn quản trị chính hiển thị `version`, người sửa gần nhất và thời điểm sửa.
- [ ] Tạo mới bản ghi bất kỳ có `version = 1`.
- [ ] Mỗi lần sửa thành công, `version` tăng đúng 1.
- [ ] `createBy` giữ nguyên sau update.
- [ ] `modifyBy` cập nhật theo actor hiện tại sau update.

## Kết quả
- Người chạy:
- Ngày chạy:
- Môi trường:
- Hạng mục fail:
- Ghi chú:
