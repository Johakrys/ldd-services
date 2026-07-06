# =====================================================================
#  Expone la Supabase LOCAL (puerto 54321) a internet con Cloudflare y
#  actualiza EXPO_PUBLIC_SUPABASE_URL en .env con la URL publica temporal.
#
#  Uso (desde la raiz del proyecto):
#     .\scripts\demo-tunnel.ps1
#  Deja esa ventana abierta (mantiene el tunel) y, en OTRA terminal:
#     npx expo start --tunnel --clear
#
#  ADVERTENCIA: mientras el tunel este activo, tu base local queda
#  accesible desde internet. Cierra la ventana (Ctrl+C) al terminar.
# =====================================================================
$ErrorActionPreference = 'Stop'

$cf = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cf) { $cf = 'C:\Program Files (x86)\cloudflared\cloudflared.exe' }
if (-not (Test-Path $cf)) { Write-Error 'No se encontro cloudflared. Instalalo con: winget install --id Cloudflare.cloudflared'; exit 1 }

$envPath = Join-Path $PSScriptRoot '..\.env'
if (-not (Test-Path $envPath)) { Write-Error "No se encontro .env en $envPath"; exit 1 }

$log = Join-Path $env:TEMP 'cf-supabase.log'
if (Test-Path $log) { Remove-Item $log -Force }

# URL local actual (para poder restaurarla despues)
$prev = (Get-Content $envPath | Select-String -Pattern '^EXPO_PUBLIC_SUPABASE_URL=(.*)').Matches.Groups[1].Value
if ($prev) { Write-Host "URL actual (guardala para restaurar): $prev" -ForegroundColor DarkGray }

Write-Host 'Iniciando tunel de Supabase (Cloudflare)...' -ForegroundColor Cyan
$proc = Start-Process -FilePath $cf `
  -ArgumentList 'tunnel', '--url', 'http://localhost:54321' `
  -RedirectStandardError $log -RedirectStandardOutput "$log.out" -PassThru -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-Path $log) {
    $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m) { $url = $m.Matches[0].Value; break }
  }
}
if (-not $url) {
  Write-Error 'No se obtuvo la URL del tunel. Revisa el log en:'
  Write-Host $log
  if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  exit 1
}

Write-Host ''
Write-Host "Supabase publico en: $url" -ForegroundColor Green

# Actualiza EXPO_PUBLIC_SUPABASE_URL en .env (UTF-8 sin BOM)
$content = Get-Content $envPath
$content = $content -replace '^EXPO_PUBLIC_SUPABASE_URL=.*', "EXPO_PUBLIC_SUPABASE_URL=$url"
[System.IO.File]::WriteAllLines($envPath, [string[]]$content)
Write-Host '.env actualizado con la URL publica.' -ForegroundColor Green

Write-Host ''
Write-Host 'AHORA, en OTRA terminal, corre:' -ForegroundColor Yellow
Write-Host '   npx expo start --tunnel --clear' -ForegroundColor Yellow
Write-Host 'Y comparte el QR (Expo Go) o el link.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Deja ESTA ventana ABIERTA (mantiene el tunel). Ctrl+C para terminar.' -ForegroundColor Yellow

try {
  Wait-Process -Id $proc.Id
} finally {
  if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  Write-Host 'Tunel cerrado.' -ForegroundColor DarkGray
}
