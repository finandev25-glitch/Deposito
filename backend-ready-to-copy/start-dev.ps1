$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$env:VITE_API_BASE_URL = "http://localhost:3000"
$env:LOG_QUERIES = "true"

$logDir = Join-Path $root "logs"
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}

$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backendLogPath = Join-Path $logDir "dev-backend-$runStamp.log"
New-Item -ItemType File -Path $backendLogPath | Out-Null

Write-Host "Iniciando backend en http://localhost:3000 ..."
$backendCommand = @"
Set-Location '$root'
`$env:LOG_QUERIES = 'true'
node server.js *>&1 | Tee-Object -FilePath '$backendLogPath'
"@
Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand

Write-Host "Iniciando frontend en http://localhost:5173 ..."
$frontendCommand = @"
Set-Location '$root'
`$env:VITE_API_BASE_URL = 'http://localhost:3000'
npm run dev:frontend
"@
Start-Process -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand

Write-Host ""
Write-Host "Backend log tail:"
Write-Host "  $backendLogPath"
Write-Host ""
Write-Host "Esta consola mostrara las consultas procesadas por Kanban, depositos y demas endpoints."
Write-Host "El frontend corre en otra ventana separada."
Write-Host ""
Write-Host "Consultas procesadas por Kanban, depositos y demas endpoints"
Get-Content -Path $backendLogPath -Wait -Tail 50
