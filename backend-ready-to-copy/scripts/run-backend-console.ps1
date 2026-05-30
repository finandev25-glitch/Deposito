[CmdletBinding()]
param(
  [string]$AppDir = ""
)

$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($AppDir)) {
  $candidateRoot = $scriptRoot
  $candidateServer = Join-Path $candidateRoot "server-production.js"

  if (-not (Test-Path $candidateServer)) {
    $candidateRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot ".."))
    $candidateServer = Join-Path $candidateRoot "server-production.js"
  }

  if (-not (Test-Path $candidateServer)) {
    throw "No se encontró server-production.js en $scriptRoot ni en la carpeta padre. Ajusta -AppDir con la ruta correcta."
  }

  $AppDir = $candidateRoot
}

$AppDir = [System.IO.Path]::GetFullPath($AppDir)
Set-Location $AppDir

Write-Host "Iniciando backend en consola..."
Write-Host "Directorio: $AppDir"
Write-Host "Archivo: server-production.js"
Write-Host ""

node server-production.js
