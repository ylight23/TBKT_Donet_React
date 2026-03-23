# PhanQuyen Read-Model Audit

## Summary

Audit này phân loại các RPC trong `PhanQuyenServiceImpl` theo đúng vai trò đọc dữ liệu hiện tại:

- `GetMyPermissions`: cache/read-model
- `ListGroupUsers`, `ListAllAssignments`: aggregate read-model
- `ListNhomNguoiDung`, `GetGroupPermissions`: simple read
- `SaveNhomNguoiDung`, `DeleteNhomNguoiDung`, `SaveGroupPermissions`, `AssignUserToGroup`, `RemoveUserFromGroup`: write path

Mục tiêu của tài liệu là chốt rõ RPC nào nên giữ nguyên, RPC nào chỉ cần tối ưu query, và RPC nào có thể cân nhắc read-model riêng ở vòng sau. Audit này không thay đổi proto hay runtime behavior.

## RPC Classification

| RPC | Loại | Nguồn dữ liệu | Query shape hiện tại | Kết luận |
| --- | --- | --- | --- | --- |
| `GetMyPermissions` | Cache/read-model | `UserPermissionCache` | `Find(_id=userId)` + rebuild fallback | Giữ nguyên |
| `ListNhomNguoiDung` | Simple read | `NhomNguoiDung`, `NguoiDungNhomNguoiDung` | `Find(all)` + `Aggregate($group count)` chạy song song | Giữ nguyên |
| `GetGroupPermissions` | Simple read | `PhanQuyenNhomNguoiDung`, `NhomNguoiDung` | 2 query projection chạy song song | Giữ nguyên |
| `ListGroupUsers` | Aggregate read-model | `NguoiDungNhomNguoiDung`, `Employee` | 1 pipeline `$match + $lookup + $unwind + $project` | Giữ nguyên |
| `ListAllAssignments` | Aggregate read-model | `NguoiDungNhomNguoiDung`, `NhomNguoiDung`, `Employee` | `CountDocuments` + 1 pipeline `$sort/$skip/$limit/$lookup/$project` | Giữ nguyên, có 1 điểm theo dõi |

## Detailed Findings

### `GetMyPermissions`

- Đây là read-model chuẩn vì dữ liệu trả về là quyền hiệu lực cuối cùng, không phải dữ liệu cấu hình nguồn.
- Query chỉ đọc từ `UserPermissionCache`, nếu thiếu cache thì gọi `RebuildService.RebuildForUser(userId)` rồi đọc lại.
- Không nên thay bằng `$lookup`, vì join động sẽ làm mất lợi thế của cache và tăng chi phí mỗi request.

### `ListNhomNguoiDung`

- Backend đang tách đúng 2 phần:
  - đọc danh sách nhóm từ `NhomNguoiDung`
  - đếm số người dùng theo nhóm bằng `Aggregate($group)`
- Hai query được bắn song song, rồi merge tại application layer qua `countMap`.
- Frontend hiện chỉ dùng các field:
  - `ten`, `moTa`, `color`, `loai`, `clonedFromId`, `userCount`, `scopeType`, `isDefault`
- Không thấy frontend tự join thêm dữ liệu nào ngoài `userCount`, nên chưa cần `$lookup`.
- Chỉ cân nhắc read-model mới nếu sau này sidebar hoặc list nhóm cần thêm metadata như creator info, default template, hoặc permission summary.

### `GetGroupPermissions`

- Response hiện tại chỉ trả `checkedCodes + scopeType`.
- Frontend `RolePermissionPanel` đang dùng đúng kiểu dữ liệu tối thiểu này để bật/tắt checkbox quyền và scope mặc định của nhóm.
- Không thấy frontend tự join thêm title chức năng hay action detail từ response này.
- Vì use case là chọn code quyền, đây không phải API phù hợp để ép sang joined read-model.

### `ListGroupUsers`

- Đây đã là aggregate read-model đúng nghĩa:
  - `$match` theo `IdNhomNguoiDung`
  - `$lookup` sang `Employee`
  - `$unwind` và `$project` dữ liệu UI cần
- Frontend đang dùng:
  - `hoTen`
  - `donVi`
  - `scopeType`
  - `anchorNodeId`
  - `isExpired`
  - `ngayHetHan`
- Không thấy frontend phải tự tra user profile hay group metadata sau khi gọi API này.
- Điểm chưa dùng hết: backend có trả `ScopeAttribute`, nhưng `phanQuyenApi.ts` hiện chưa map ra `UserInGroupInfo`. Đây là mismatch nhẹ ở DTO frontend, không phải vấn đề query.
- Chưa cần thay đổi query shape.

### `ListAllAssignments`

- Đây cũng đã là aggregate read-model hợp lý:
  - 1 query đếm tổng số bản ghi
  - 1 pipeline trang hóa + `$lookup` sang `NhomNguoiDung` và `Employee`
- Frontend đang dùng dữ liệu này để render danh sách gán và hiện đang fallback:
  - `anchorNodeName: a.anchorNodeName || a.anchorNodeId`
- Điều này cho thấy response chưa hydrate được tên node phạm vi. Đây là chỗ duy nhất trong read path hiện tại mà frontend đang bù dữ liệu hiển thị.
- Kết luận:
  - Giữ nguyên query hiện tại ở vòng này
  - Nếu có vòng refactor read-model tiếp theo, `ListAllAssignments` là ứng viên số 1 để join thêm tên node phạm vi từ cây `Office`

## Frontend Usage Check

Sau khi rà `Frontend_TBKT/src/apis/phanQuyenApi.ts` và `Frontend_TBKT/src/pages/PhanQuyen/index.tsx`:

- `GetMyPermissions`: không có client-side join, chỉ map DTO quyền
- `ListNhomNguoiDung`: không có client-side join
- `GetGroupPermissions`: không có client-side join
- `ListGroupUsers`: không có client-side join bắt buộc
- `ListAllAssignments`: có fallback UI cho `anchorNodeName`

## Decisions Locked

- Không dùng `$lookup` cho `GetMyPermissions`
- Không refactor `GetGroupPermissions` sang read-model joined nếu màn hình vẫn chỉ cần `checkedCodes + scopeType`
- Giữ `ListGroupUsers` và `ListAllAssignments` theo hướng aggregate read-model hiện tại
- Chỉ ưu tiên refactor read-model ở vòng sau cho `ListAllAssignments` nếu cần hiển thị đầy đủ tên node phạm vi

## Follow-up Candidates

Nếu cần đi tiếp ở vòng sau, thứ tự ưu tiên nên là:

1. `ListAllAssignments`: join thêm tên anchor node từ `Office`
2. `ListGroupUsers`: mở rộng DTO frontend để dùng `ScopeAttribute` nếu UI hiển thị ABAC scope
3. `ListNhomNguoiDung`: chỉ cân nhắc read-model mới nếu UI cần summary sâu hơn ngoài `userCount`
