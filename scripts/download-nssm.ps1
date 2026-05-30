[CmdletBinding()]
param(
  [string]$Build = "2.24-101-g897c7ad",
  [ValidateSet("win32", "win64")]
  [string]$Architecture = "win64",
  [string]$DestinationDir = ""
)

$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($DestinationDir)) {
  $DestinationDir = Join-Path $scriptRoot "tools\nssm"
}

function Assert-InternetDownloadSupport {
  if (-not (Get-Command Invoke-WebRequest -ErrorAction SilentlyContinue)) {
    throw "Este entorno no tiene Invoke-WebRequest disponible."
  }
}

$DestinationDir = [System.IO.Path]::GetFullPath($DestinationDir)
$downloadUrl = "https://www.nssm.cc/ci/nssm-$Build.zip"
$tempZip = Join-Path $env:TEMP "nssm-$Build.zip"
$extractDir = Join-Path $env:TEMP "nssm-$Build-extract"
$candidatePaths = @()

Assert-InternetDownloadSupport

Write-Host "Descargando NSSM desde:"
Write-Host "  $downloadUrl"
Write-Host "Arquitectura:"
Write-Host "  $Architecture"

Remove-Item -LiteralPath $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null

Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip
Expand-Archive -LiteralPath $tempZip -DestinationPath $extractDir -Force

$candidatePaths += Get-ChildItem -Path $extractDir -Recurse -Filter nssm.exe |
  Where-Object { $_.FullName -match "\\$Architecture\\" -or $_.FullName -match "/$Architecture/" } |
  Select-Object -ExpandProperty FullName

if (-not $candidatePaths) {
  $candidatePaths += Get-ChildItem -Path $extractDir -Recurse -Filter nssm.exe |
    Select-Object -ExpandProperty FullName
}

if (-not $candidatePaths) {
  throw "No se encontró nssm.exe dentro del ZIP descargado."
}

$selected = $candidatePaths | Select-Object -First 1
$targetExe = Join-Path $DestinationDir "nssm.exe"
Copy-Item -LiteralPath $selected -Destination $targetExe -Force

Remove-Item -LiteralPath $tempZip -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $extractDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "NSSM instalado correctamente."
Write-Host "Archivo:"
Write-Host "  $targetExe"
Write-Host ""
Write-Host "Ahora puedes ejecutar:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\install-backend-service.ps1 -NssmExe `"$targetExe`""
