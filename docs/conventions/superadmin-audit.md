# SuperAdmin Audit Query

## Mục tiêu
Rà soát các lần bypass quyền của `IsSuperAdmin` theo thời gian thực tế vận hành.

## Nguồn dữ liệu
- Collection: `AuthzAuditLog`
- Event: `EventType = "SUPERADMIN_BYPASS"`
- Trường chính:
  - `UserId`
  - `UserName`
  - `Method`
  - `Target`
  - `At` (UTC)

## Script truy vấn nhanh
Chạy script:

```powershell
mongosh "mongodb://localhost:27017/quanly_dmcanbo" Backend/scripts/query-superadmin-bypass-audit.js
```

Tuỳ chọn:

```powershell
mongosh "mongodb://localhost:27017/quanly_dmcanbo" --eval "var days=30; var limit=500;" Backend/scripts/query-superadmin-bypass-audit.js
```

## Màn dashboard tối thiểu (gợi ý)
- KPI:
  - Tổng số bypass 24h/7d/30d
  - Số user super admin có activity
- Bảng:
  - Top user theo số lần bypass
  - Last activity time
- Event stream:
  - Danh sách bypass mới nhất theo `At desc`
  - Lọc theo `UserId`, `Method`, `Target`

