param(
    [string]$MongoUri = "mongodb://localhost:27017",
    [string]$Database = "quanly_dmcanbo",
    [string]$OutputDir = "$PSScriptRoot\mongo-data",
    [string[]]$Collections = @(),
    [string[]]$ExcludeCollections = @()
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command '$Name'. Install MongoDB Database Tools and mongosh, then add them to PATH."
    }
}

function Join-MongoDatabaseUri {
    param(
        [string]$Uri,
        [string]$DbName
    )

    $trimmed = $Uri.TrimEnd("/")
    if ($trimmed -match "/[^/?]+(\?.*)?$") {
        return $trimmed
    }

    return "$trimmed/$DbName"
}

Assert-Command "mongosh"
Assert-Command "mongoexport"

$dbUri = Join-MongoDatabaseUri -Uri $MongoUri -DbName $Database
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

if ($Collections.Count -eq 0) {
    $rawCollections = & mongosh $dbUri --quiet --eval "db.getCollectionNames().sort().join('\n')"
    if ($LASTEXITCODE -ne 0) {
        throw "Cannot read collection list from MongoDB."
    }

    $Collections = $rawCollections |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        ForEach-Object { $_.Trim() }
}

$excluded = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($name in $ExcludeCollections) {
    [void]$excluded.Add($name)
}

$manifest = [ordered]@{
    mongoUri = $MongoUri
    database = $Database
    exportedAt = (Get-Date).ToUniversalTime().ToString("o")
    collections = @()
}

foreach ($collection in $Collections) {
    if ($excluded.Contains($collection)) {
        Write-Host "Skip $collection"
        continue
    }

    $outFile = Join-Path $OutputDir "$collection.json"
    Write-Host "Export $collection -> $outFile"
    & mongoexport --uri $dbUri --collection $collection --out $outFile --jsonArray
    if ($LASTEXITCODE -ne 0) {
        throw "mongoexport failed for collection '$collection'."
    }

    $manifest.collections += [ordered]@{
        name = $collection
        file = "$collection.json"
    }
}

$manifestPath = Join-Path $OutputDir "manifest.json"
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host ""
Write-Host "Export completed."
Write-Host "Data directory: $OutputDir"
Write-Host "Manifest: $manifestPath"
