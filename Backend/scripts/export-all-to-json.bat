
@echo off
set DB_NAME=quanly_dmcanbo
set OUT_DIR=backup

echo Exporting collections from %DB_NAME%...

set collections=UserPermission Office FormConfig DynamicMenuDataSource DanhMucChuyenNganh PhanQuyenNguoiDung PermissionCatalog PhanQuyenNhomNguoiDung PhanQuyenPhanHeNguoiDung DynamicMenu NguoiDungNhomNguoiDung FieldSet TemplateLayout DynamicField PhanQuyenPhanHeNhomNguoiDung CapBac NhomNguoiDung Employee LichSuPhanQuyenScope

for %%c in (%collections%) do (
    echo Exporting %%c...
    mongoexport --db %DB_NAME% --collection %%c --out %OUT_DIR%\%%c.json --jsonArray
)

echo Export completed. Files are in %OUT_DIR%
