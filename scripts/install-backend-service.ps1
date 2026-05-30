[CmdletBinding()]
param(
  [string]$ServiceName = "ControlDepositosBackend",
  [string]$AppDir = "",
  [string]$NodeExe = "node",
  [string]$NssmExe = "nssm",
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($AppDir)) {
  $AppDir = Join-Path $scriptRoot ".."
}

$AppDir = [System.IO.Path]::GetFullPath($AppDir)
$ServiceDisplayName = "Control Depositos Backend"
$LogDir = Join-Path $AppDir "logs"
$StdoutLog = Join-Path $LogDir "backend.out.log"
$StderrLog = Join-Path $LogDir "backend.err.log"
$EntryPoint = Join-Path $AppDir "server-production.js"

function Assert-Admin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Este script debe ejecutarse como Administrador."
  }
}

function Resolve-CommandPath([string]$CommandName) {
  $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

Assert-Admin

if (-not (Test-Path $EntryPoint)) {
  throw "No se encontró $EntryPoint. Asegúrate de ejecutar este script desde el proyecto correcto."
}

$resolvedNode = Resolve-CommandPath $NodeExe
if (-not $resolvedNode) {
  throw "No se encontró Node.js en PATH. Instala Node.js antes de continuar."
}

$resolvedNssm = Resolve-CommandPath $NssmExe
if (-not $resolvedNssm) {
  throw "No se encontró NSSM en PATH. Instala NSSM y vuelve a ejecutar el script."
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Write-Host "Eliminando servicio previo si existe..."
& $resolvedNssm remove $ServiceName confirm 2>$null | Out-Null

Write-Host "Instalando servicio $ServiceName..."
& $resolvedNssm install $ServiceName $resolvedNode $EntryPoint | Out-Null
& $resolvedNssm set $ServiceName AppDirectory $AppDir | Out-Null
& $resolvedNssm set $ServiceName AppParameters "" | Out-Null
& $resolvedNssm set $ServiceName DisplayName $ServiceDisplayName | Out-Null
& $resolvedNssm set $ServiceName Description "Backend de Control de Depositos" | Out-Null
& $resolvedNssm set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $resolvedNssm set $ServiceName AppStdout $StdoutLog | Out-Null
& $resolvedNssm set $ServiceName AppStderr $StderrLog | Out-Null
& $resolvedNssm set $ServiceName AppRotateFiles 1 | Out-Null
& $resolvedNssm set $ServiceName AppRotateOnline 1 | Out-Null
& $resolvedNssm set $ServiceName AppRotateBytes 10485760 | Out-Null
& $resolvedNssm set $ServiceName AppEnvironmentExtra "PORT=$Port" | Out-Null

Write-Host "Iniciando servicio..."
& $resolvedNssm start $ServiceName | Out-Null

Write-Host ""
Write-Host "Servicio instalado correctamente."
Write-Host "Nombre: $ServiceName"
Write-Host "Directorio: $AppDir"
Write-Host "Puerto: $Port"
Write-Host "Logs: $LogDir"
