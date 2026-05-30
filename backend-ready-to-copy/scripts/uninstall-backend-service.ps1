[CmdletBinding()]
param(
  [string]$ServiceName = "ControlDepositosBackend",
  [string]$NssmExe = "nssm"
)

$ErrorActionPreference = "Stop"

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

$resolvedNssm = Resolve-CommandPath $NssmExe
if (-not $resolvedNssm) {
  throw "No se encontró NSSM en PATH."
}

Write-Host "Deteniendo servicio si está en ejecución..."
try {
  & $resolvedNssm stop $ServiceName | Out-Null
} catch {
  Write-Host "El servicio no estaba en ejecución o no existía."
}

Write-Host "Eliminando servicio..."
try {
  & $resolvedNssm remove $ServiceName confirm | Out-Null
} catch {
  Write-Host "No se pudo eliminar el servicio. Puede que no exista."
}

Write-Host "Servicio eliminado."
