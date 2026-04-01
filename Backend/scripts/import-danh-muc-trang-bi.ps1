# ============================================================
# Import DanhMucTrangBi từ file JSON vào MongoDB
# ------------------------------------------------------------
# Dùng: mongoimport --mode=upsert (idempotent, chạy nhiều lần an toàn)
# Số bản ghi: ~27,540
# ============================================================

param(
    [string]$DbName    = "quanly_dmcanbo",
    [string]$MongoHost = "localhost:27017",
    [string]$JsonFile  = "$PSScriptRoot\..\..\TCKT_HeSinhThai_Core.DanhMucTrangBi.json",
    [switch]$DryRun
)

$Collection = "DanhMucTrangBi"
$AbsFile    = Resolve-Path $JsonFile -ErrorAction Stop

Write-Host "=============================================="
Write-Host " Import DanhMucTrangBi"
Write-Host " DB         : $DbName"
Write-Host " Host       : $MongoHost"
Write-Host " Collection : $Collection"
Write-Host " File       : $AbsFile"
Write-Host " DryRun     : $DryRun"
Write-Host "=============================================="

if ($DryRun) {
    Write-Host "[DRY-RUN] Se chay: mongoimport --host $MongoHost --db $DbName --collection $Collection --file `"$AbsFile`" --jsonArray --mode=upsert"
    Write-Host "[DRY-RUN] Khong co gi duoc ghi vao database."
    exit 0
}

# Kiem tra mongoimport
if (-not (Get-Command mongoimport -ErrorAction SilentlyContinue)) {
    Write-Error "Khong tim thay mongoimport. Cai dat MongoDB Database Tools truoc: https://www.mongodb.com/try/download/database-tools"
    exit 1
}

Write-Host ""
Write-Host "Bat dau import..."

mongoimport `
    --host      $MongoHost `
    --db        $DbName `
    --collection $Collection `
    --file      "$AbsFile" `
    --jsonArray `
    --mode      upsert `
    --upsertFields "_id"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Import thanh cong!"
} else {
    Write-Error "Import that bai (exit code $LASTEXITCODE)"
    exit $LASTEXITCODE
}
