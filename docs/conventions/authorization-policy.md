# Authorization Convention (RBAC + ABAC)

## Mục tiêu
Chuẩn hóa thứ tự kiểm tra quyền để tất cả service dùng cùng một policy runtime.

## Policy chuẩn (thứ tự bắt buộc)
1. `IsSuperAdmin` => `allow` + ghi audit đặc biệt.
2. `DuocTruyCap == false` (module gate đóng) => `deny` ngay.
3. Không có `Action` tương ứng trong `MaChucNang + Actions` => `deny`.
4. Không thỏa `Scope` dữ liệu (CN/đơn vị) => `deny`.

## Ý nghĩa từng lớp
- `IsSuperAdmin`: break-glass account, không phải cơ chế chính hằng ngày.
- `DuocTruyCap`: công tắc tổng cấp phân hệ (module gate).
- `MaChucNang + Actions`: quyền chi tiết thao tác.
- `ScopeType + Anchor + PhamViChuyenNganh`: phạm vi dữ liệu được thao tác.

## Quy ước triển khai trong code
- Gọi qua `AccessGate` (single source of truth per request).
- Check module gate bằng `CanAccessModule(maPhanHe)`.
- Check thao tác đầy đủ bằng `CanPerformAction(maPhanHe, maChucNang, action, idChuyenNganh)`.
- Service interceptor phải ghi log khi `SuperAdmin` bypass.

## Invariant khi lưu quyền
- Nếu `DuocTruyCap = false` thì runtime luôn `deny` mọi action trong phân hệ đó.
- Có thể chọn một trong 2 chiến lược dữ liệu:
  - Preserve action grants (giữ để bật lại nhanh).
  - Clear action grants (dữ liệu sạch, không mâu thuẫn).
- Hệ thống hiện tại đang theo hướng **preserve + runtime deny**.

## Checklist review PR
- Có dùng đúng thứ tự 4 bước trên chưa.
- Có bypass `SuperAdmin` nhưng thiếu audit không.
- Có check action nhưng quên module gate không.
- Có check action nhưng quên scope dữ liệu (CN/đơn vị) không.
