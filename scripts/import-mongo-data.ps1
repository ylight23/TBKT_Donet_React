param(
    [string]$MongoUri = "mongodb://localhost:27017",
    [string]$Database = "quanly_dmcanbo",
    [string]$InputDir = "$PSScriptRoot\mongo-data",
    [switch]$NoDrop
)

$ErrorActionPreference = "Stop"

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command '$Name'. Install MongoDB Database Tools and add them to PATH."
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

Assert-Command "mongoimport"

if (-not (Test-Path -LiteralPath $InputDir)) {
    throw "Input directory does not exist: $InputDir"
}

$dbUri = Join-MongoDatabaseUri -Uri $MongoUri -DbName $Database
$manifestPath = Join-Path $InputDir "manifest.json"

if (Test-Path -LiteralPath $manifestPath) {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $items = @($manifest.collections | ForEach-Object {
        [pscustomobject]@{
            Name = [string]$_.name
            File = Join-Path $InputDir ([string]$_.file)
        }
    })
} else {
    $items = Get-ChildItem -LiteralPath $InputDir -Filter "*.json" |
        Where-Object { $_.Name -ne "manifest.json" } |
        Sort-Object Name |
        ForEach-Object {
            [pscustomobject]@{
                Name = $_.BaseName
                File = $_.FullName
            }
        }
}

if ($items.Count -eq 0) {
    throw "No JSON collection files found in: $InputDir"
}

foreach ($item in $items) {
    if (-not (Test-Path -LiteralPath $item.File)) {
        throw "Missing data file for collection '$($item.Name)': $($item.File)"
    }

    Write-Host "Import $($item.Name) <- $($item.File)"
    $args = @(
        "--uri", $dbUri,
        "--collection", $item.Name,
        "--file", $item.File,
        "--jsonArray"
    )

    if (-not $NoDrop) {
        $args += "--drop"
    }

    & mongoimport @args
    if ($LASTEXITCODE -ne 0) {
        throw "mongoimport failed for collection '$($item.Name)'."
    }
}

Write-Host ""
Write-Host "Import completed."
Write-Host "Database: $Database"
Write-Host "Source directory: $InputDir"
