param(
    [string]$Root = "D:\",
    [string]$Workspace = "D:\TBKT_Donet_React",
    [string]$OutFile = "D:\TBKT_Donet_React\recovery-scan.txt"
)

$ErrorActionPreference = "SilentlyContinue"

function Add-Section {
    param([string]$Title)
    Add-Content -Path $OutFile -Value ""
    Add-Content -Path $OutFile -Value ("=" * 80)
    Add-Content -Path $OutFile -Value $Title
    Add-Content -Path $OutFile -Value ("=" * 80)
}

function Write-Items {
    param($Items)
    if (-not $Items -or $Items.Count -eq 0) {
        Add-Content -Path $OutFile -Value "(khong thay)"
        return
    }

    foreach ($item in $Items) {
        Add-Content -Path $OutFile -Value $item
    }
}

if (Test-Path $OutFile) {
    Remove-Item -LiteralPath $OutFile -Force
}

Add-Content -Path $OutFile -Value "Recovery scan generated: $(Get-Date -Format s)"
Add-Content -Path $OutFile -Value "Workspace: $Workspace"
Add-Content -Path $OutFile -Value "Root scan: $Root"

$targetFiles = @(
    "src.csproj",
    "FormConfigService.cs",
    "ServerCallContextIdentityExtensions.cs",
    "ThamSoService.cs",
    "CatalogService.cs",
    "Program.cs",
    "appsettings.json"
)

Add-Section "1. Workspace hien tai"
$workspaceSnapshot = Get-ChildItem -Path $Workspace -Force -Recurse -Depth 2 |
    Select-Object -First 200 -ExpandProperty FullName
Write-Items $workspaceSnapshot

Add-Section "2. Tim file dich danh tren o dia"
$foundNamedFiles = foreach ($name in $targetFiles) {
    Get-ChildItem -Path $Root -Filter $name -Recurse -File | Select-Object -ExpandProperty FullName
}
Write-Items ($foundNamedFiles | Sort-Object -Unique)

Add-Section "3. Tim file nen / backup co lien quan"
$archives = Get-ChildItem -Path $Root -Recurse -File -Include *.zip, *.7z, *.rar, *.bak |
    Where-Object {
        $_.FullName -match 'TBKT|Backend|src|dotnet|react'
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 300 |
    ForEach-Object { "{0} | {1}" -f $_.LastWriteTime.ToString("s"), $_.FullName }
Write-Items $archives

Add-Section "4. Tim thu muc co ve la ban sao backend"
$dirs = Get-ChildItem -Path $Root -Directory -Recurse |
    Where-Object {
        $_.FullName -match 'TBKT|Backend|src|backup|copy|old'
    } |
    Sort-Object FullName |
    Select-Object -First 500 -ExpandProperty FullName
Write-Items $dirs

Add-Section "5. Cache Visual Studio"
$vsRoot = Join-Path $env:LOCALAPPDATA "Microsoft\VisualStudio"
$vsItems = @()
if (Test-Path $vsRoot) {
    foreach ($name in $targetFiles) {
        $vsItems += Get-ChildItem -Path $vsRoot -Recurse -File -Filter $name |
            Select-Object -ExpandProperty FullName
    }
}
Write-Items ($vsItems | Sort-Object -Unique)

Add-Section "6. Cache Rider / JetBrains"
$jbRoot = Join-Path $env:LOCALAPPDATA "JetBrains"
$jbItems = @()
if (Test-Path $jbRoot) {
    foreach ($name in $targetFiles) {
        $jbItems += Get-ChildItem -Path $jbRoot -Recurse -File -Filter $name |
            Select-Object -ExpandProperty FullName
    }
}
Write-Items ($jbItems | Sort-Object -Unique)

Add-Section "7. Cache VS Code / extension"
$codeRoots = @(
    (Join-Path $env:APPDATA "Code"),
    (Join-Path $env:USERPROFILE ".vscode"),
    (Join-Path $env:USERPROFILE ".vscode\extensions")
)
$codeItems = @()
foreach ($codeRoot in $codeRoots) {
    if (-not (Test-Path $codeRoot)) { continue }
    foreach ($name in $targetFiles) {
        $codeItems += Get-ChildItem -Path $codeRoot -Recurse -File -Filter $name |
            Select-Object -ExpandProperty FullName
    }
}
Write-Items ($codeItems | Sort-Object -Unique)

Add-Section "8. OneDrive / Documents / Desktop"
$commonRoots = @(
    (Join-Path $env:USERPROFILE "OneDrive"),
    (Join-Path $env:USERPROFILE "Desktop"),
    (Join-Path $env:USERPROFILE "Documents"),
    (Join-Path $env:USERPROFILE "Downloads")
)
$commonItems = @()
foreach ($commonRoot in $commonRoots) {
    if (-not (Test-Path $commonRoot)) { continue }
    foreach ($name in $targetFiles) {
        $commonItems += Get-ChildItem -Path $commonRoot -Recurse -File -Filter $name |
            Select-Object -ExpandProperty FullName
    }
}
Write-Items ($commonItems | Sort-Object -Unique)

Add-Section "9. Huong dan kiem tra thu cong"
Write-Items @(
    "Previous Versions: chuot phai thu muc D:\TBKT_Donet_React\Backend hoac src -> Properties -> Previous Versions",
    "Neu co ban luu: Open truoc, copy ra thu muc tam, khong restore de len ban hien tai ngay",
    "Sau khi tim duoc src.csproj va cac file .cs, copy nguoc ve D:\TBKT_Donet_React\Backend\src"
)

Write-Host "Da ghi ket qua vao: $OutFile"
