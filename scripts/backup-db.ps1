# Respaldo COMPLETO de la base de datos de Supabase Cloud.
#
# Uso:   powershell -ExecutionPolicy Bypass -File scripts/backup-db.ps1
#   (o simplemente:  ./scripts/backup-db.ps1  desde PowerShell)
#
# Crea 3 archivos con fecha en la carpeta backups/ :
#   roles_<fecha>.sql    -> usuarios/roles de la base
#   schema_<fecha>.sql   -> estructura (tablas, funciones, políticas RLS...)
#   data_<fecha>.sql     -> todos los datos
#
# Con esos 3 archivos puedes recrear la base entera si algo se pierde.

$ErrorActionPreference = 'Stop'

# Raíz del proyecto (carpeta padre de /scripts) y carpeta de respaldos.
$root = Split-Path -Parent $PSScriptRoot
$dir  = Join-Path $root 'backups'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

# Fecha para nombrar los archivos, ej: 2026-07-06_1430
$ts = Get-Date -Format 'yyyy-MM-dd_HHmm'

# Contraseña de la base (la de Supabase Cloud: Dashboard > Settings > Database).
# Se pide una sola vez; si ya está en la variable de entorno, no vuelve a pedirla.
if (-not $env:SUPABASE_DB_PASSWORD) {
  $sec = Read-Host 'Contraseña de la base de datos de Supabase' -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  $env:SUPABASE_DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

Write-Host ""
Write-Host "Respaldando la base de datos en: $dir" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Roles..."
npx supabase db dump --linked --role-only -f (Join-Path $dir "roles_$ts.sql")

Write-Host "[2/3] Estructura (esquema)..."
npx supabase db dump --linked -f (Join-Path $dir "schema_$ts.sql")

Write-Host "[3/3] Datos..."
npx supabase db dump --linked --data-only --use-copy -f (Join-Path $dir "data_$ts.sql")

Write-Host ""
Write-Host "Respaldo terminado. Archivos creados:" -ForegroundColor Green
Get-ChildItem $dir -Filter "*_$ts.sql" | ForEach-Object {
  Write-Host ("  {0}  ({1} KB)" -f $_.Name, [math]::Round($_.Length / 1KB, 1))
}
Write-Host ""
Write-Host "Guarda esa carpeta en un lugar seguro (Drive, disco externo, etc.)." -ForegroundColor Yellow
