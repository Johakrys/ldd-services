# Publica una actualización OTA (EAS Update) SIEMPRE con la config de producción
# (la nube), sin importar cómo esté tu .env local.
#
# Uso:   ./scripts/publish-update.ps1 "Descripción del cambio"
#
# Por qué: `eas update` empaqueta las variables del .env local. Si tu .env
# apunta a la base LOCAL (para desarrollo), la app en el celular quedaría sin
# conexión. Este script usa .env.cloud durante la publicación y luego restaura
# tu .env local automáticamente.

param(
  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
$cloud = Join-Path $root '.env.cloud'
$backup = Join-Path $root '.env.devbackup'

if (-not (Test-Path $cloud)) {
  Write-Host "No encuentro .env.cloud (config de la nube). Aborta." -ForegroundColor Red
  exit 1
}

# Respalda el .env actual (local) y pon la nube para el empaquetado.
Copy-Item $envFile $backup -Force
Copy-Item $cloud $envFile -Force
Write-Host "Publicando con la config de PRODUCCION (nube)..." -ForegroundColor Cyan

try {
  eas update --branch preview -m $Message
}
finally {
  # Restaura tu .env local pase lo que pase.
  Copy-Item $backup $envFile -Force
  Remove-Item $backup -Force
  Write-Host "`n.env local restaurado (desarrollo)." -ForegroundColor Green
}
