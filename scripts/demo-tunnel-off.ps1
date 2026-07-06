# =====================================================================
#  Restaura EXPO_PUBLIC_SUPABASE_URL a la IP local de esta red (para
#  volver a trabajar en local tras una demo con tunel).
#     .\scripts\demo-tunnel-off.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '..\.env'

$ip = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue |
       Where-Object { $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress
if (-not $ip) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
         Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } |
         Select-Object -First 1).IPAddress
}
if (-not $ip) { $ip = '127.0.0.1' }

$local = "http://${ip}:54321"
$content = Get-Content $envPath
$content = $content -replace '^EXPO_PUBLIC_SUPABASE_URL=.*', "EXPO_PUBLIC_SUPABASE_URL=$local"
[System.IO.File]::WriteAllLines($envPath, [string[]]$content)

Write-Host "Restaurado a: $local" -ForegroundColor Green
Write-Host "Reinicia Expo:  npx expo start --clear"
