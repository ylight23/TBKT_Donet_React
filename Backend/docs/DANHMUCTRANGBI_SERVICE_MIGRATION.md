# DanhMucTrangBi Service Migration (Phase 1)

## Goal
- Separate `DanhMucTrangBi` from generic `CatalogService`.
- Keep runtime behavior stable while migrating.

## Implemented in Phase 1
- Added gRPC service implementation: `Backend/src/Services/DanhMucTrangBiService.cs`
  - RPCs: `GetListTree`, `GetTree`, `SaveTree`, `DeleteTree`.
  - CRUD reads/writes directly on collection `DanhMucTrangBi`.
- Added dedicated domain model/repository:
  - `Backend/src/Services/DanhMucTrangBiModel.cs`
  - `Backend/src/Services/DanhMucTrangBiRepository.cs`
- Registered service in gRPC pipeline:
  - `Backend/src/Global.cs` via `app.MapGrpcService<DanhMucTrangBiServiceImpl>()`.
- Added temporary read bridge:
  - Read primary collection `DanhMucTrangBi`.
  - If primary has no data, read fallback `Catalog_DanhMucTrangBi`.
  - Write path (`Save/Delete`) always targets `DanhMucTrangBi`.
- Updated token-revocation middleware to recognize new gRPC route:
  - `/DanhMucTrangBi.DanhMucTrangBiService`.

## Frontend integration
- Regenerated proto to include `DanhMucTrangBi_pb.ts`.
- Added `danhMucTrangBiClient` in `Frontend_TBKT/src/grpc/grpcClient.ts`.
- Refactored `Frontend_TBKT/src/apis/danhMucTrangBiApi.ts` to call new gRPC service directly.
- Replaced `catalogApi` dependency for DanhMucTrangBi pages/components with `danhMucTrangBiApi`.

## Data migration helper
- Script: `scripts/migrate-danhmuctrangbi-from-catalog.mongosh.js`
- Usage:
```powershell
mongosh "mongodb://<host>/<db>" --file scripts/migrate-danhmuctrangbi-from-catalog.mongosh.js
```

## Phase 2 (cut dependency cleanup)
- Remove read bridge fallback after data migration is complete.
- Remove remaining `DanhMucTrangBi` branches from `CatalogService`.
- Optionally archive/deprecate generic tree RPCs if not used by any module.
