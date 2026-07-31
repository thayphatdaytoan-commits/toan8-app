param([switch]$Push, [string]$Source = '', [string]$Dest = '')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $Source) { $Source = Join-Path (Split-Path -Parent (Split-Path -Parent $repoRoot)) 'TAI LIEU DANG WEB' }
# Fallback common path
if (-not (Test-Path -LiteralPath $Source)) {
  $Source = 'C:\Users\ADMIN\Downloads\web to' + [char]0x00E1 + 'n\TAI LIEU DANG WEB'
}
if (-not $Dest) { $Dest = Join-Path $repoRoot 'tai-lieu-dang-web' }
if (-not (Test-Path -LiteralPath $Source)) { throw "Missing source. Pass -Source 'full\path'" }
if (-not (Test-Path -LiteralPath $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }
$exts = @('.pdf','.docx','.doc','.png','.jpg','.jpeg','.webp','.gif','.bmp','.tif','.tiff')
$copied=0; $skipped=0
$files = @(Get-ChildItem -LiteralPath $Source -Recurse -File | Where-Object { $exts -contains $_.Extension.ToLowerInvariant() })
foreach ($f in $files) {
  $rel = $f.FullName.Substring($Source.Length).TrimStart('\')
  $target = Join-Path $Dest $rel
  $dir = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $need=$true
  if (Test-Path -LiteralPath $target) {
    $t=Get-Item -LiteralPath $target
    if ($t.Length -eq $f.Length -and $t.LastWriteTimeUtc -ge $f.LastWriteTimeUtc) { $need=$false }
  }
  if ($need) { Copy-Item -LiteralPath $f.FullName -Destination $target -Force; $copied++; Write-Output "COPY $rel" } else { $skipped++ }
}
Write-Output "Done Copied=$copied Skipped=$skipped Scanned=$($files.Count)"
if ($Push) {
  Set-Location $repoRoot
  git add -- tai-lieu-dang-web scripts/sync-tai-lieu-dang-web.ps1
  if (-not (git status --porcelain -- tai-lieu-dang-web scripts/sync-tai-lieu-dang-web.ps1)) { Write-Output 'No changes.'; exit 0 }
  git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m ("Sync tai-lieu-dang-web from local (" + (Get-Date -Format 'yyyy-MM-dd HH:mm') + ")")
  git push origin HEAD
  Write-Output 'Pushed.'
}