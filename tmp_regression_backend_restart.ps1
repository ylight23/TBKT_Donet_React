$logPath = 'd:\TBKT_Donet_React\Backend\src\runtime-regression.log'
$errPath = 'd:\TBKT_Donet_React\Backend\src\runtime-regression.err.log'

if (Test-Path $logPath) {
    Remove-Item $logPath -Force
}
if (Test-Path $errPath) {
    Remove-Item $errPath -Force
}

$existing = Get-Process -Name src -ErrorAction SilentlyContinue
if ($existing) {
    $existing | Stop-Process -Force
    Start-Sleep -Seconds 2
}

$started = Start-Process `
    -FilePath 'd:\TBKT_Donet_React\Backend\src\bin\Debug\net9.0\src.exe' `
    -WorkingDirectory 'd:\TBKT_Donet_React\Backend\src\bin\Debug\net9.0' `
    -RedirectStandardOutput $logPath `
    -RedirectStandardError $errPath `
    -PassThru

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri 'http://localhost:5213/' -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) {
            $ready = $true
            break
        }
    }
    catch {
    }
}

Write-Output "Started PID: $($started.Id) Ready=$ready"
if (Test-Path $logPath) {
    Get-Content -Path $logPath -Tail 60
}
if (Test-Path $errPath) {
    Get-Content -Path $errPath -Tail 40
}
