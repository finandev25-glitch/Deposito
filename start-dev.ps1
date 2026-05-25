$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$env:VITE_API_BASE_URL = "http://localhost:3000"

Write-Host "Iniciando backend en http://localhost:3000 ..."
$backendCommand = "Set-Location '$root'; node server.js"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", $backendCommand

Write-Host "Iniciando frontend en http://localhost:5173 ..."
npm run dev:frontend
