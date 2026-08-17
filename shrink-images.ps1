<#
  나의 여가 — 그림 줄이기
  ======================
  그림을 화면에 필요한 크기로 줄여 앱이 빨리 열리게 합니다.

  왜 필요한가
    학생이 주소로 앱을 열면 이 그림들을 내려받습니다.
    1536px 그림 한 장이 2.3MB 인데, 화면에는 150px 로 나옵니다.
    학교 와이파이에서 장소 고르는 화면 하나가 11MB 나 되어 몇 초씩 멈춥니다.

  안전장치
    줄이기 전에 원본을 `images/_원본/` 에 그대로 복사해 둡니다.
    마음에 안 들면 그 폴더에서 다시 꺼내 쓰면 됩니다.
    (`_원본` 폴더는 `.gitignore` 에 들어 있어 깃허브에 올라가지 않습니다)

  쓰는 법
    powershell -ExecutionPolicy Bypass -File .\shrink-images.ps1
    powershell -ExecutionPolicy Bypass -File .\shrink-images.ps1 -WhatIf   # 무엇이 바뀌는지만 보기
#>
param(
  [switch]$WhatIf,
  [int]$Quality = 512          # 선택지 그림의 긴 변 (px)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$images = Join-Path $root 'images'
$backup = Join-Path $images '_원본'

# ── 폴더마다 목표 크기 ────────────────────────────────────────────
#   선택지 그림은 화면에서 가장 크게 나오는 곳이 150px 이라 512 면 3배 여유입니다.
#   여가지도는 지도 칸 전체 배경(폭 1014px)이라 줄이지 않습니다.
$targets = @{
  '장소'       = $Quality
  '시간'       = $Quality
  '또하기'     = $Quality
  '코너명'     = $Quality
  '얼굴표정'   = $Quality
  'activities' = $Quality
  'avatars'    = $Quality
}
$rootFiles = @{           # images 바로 밑에 있는 그림들
  '표지.png'     = 1500   # 첫 화면을 다 덮으므로 크게
  '여가지도.png' = 0      # 0 = 건드리지 않음
}
$rootDefault = $Quality   # 그 밖의 단추 그림 등

function Get-Target([System.IO.FileInfo]$f) {
  $dir = $f.Directory.Name
  if ($dir -eq 'images') {
    if ($rootFiles.ContainsKey($f.Name)) { return $rootFiles[$f.Name] }
    return $rootDefault
  }
  if ($targets.ContainsKey($dir)) { return $targets[$dir] }
  return 0
}

$files = Get-ChildItem $images -Recurse -Filter *.png |
         Where-Object { $_.FullName -notlike (Join-Path $backup '*') }

$before = 0; $after = 0; $done = 0; $skipped = 0

foreach ($f in $files) {
  $before += $f.Length
  $target = Get-Target $f
  if ($target -le 0) { $after += $f.Length; $skipped++; continue }

  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $w = $img.Width; $h = $img.Height
  $long = [Math]::Max($w, $h)
  if ($long -le $target) { $img.Dispose(); $after += $f.Length; $skipped++; continue }

  $scale = $target / $long
  $nw = [Math]::Max(1, [Math]::Round($w * $scale))
  $nh = [Math]::Max(1, [Math]::Round($h * $scale))

  if ($WhatIf) {
    Write-Host ("  [미리보기] {0}  {1}x{2} -> {3}x{4}  ({5:N0}KB)" -f $f.Name, $w, $h, $nw, $nh, ($f.Length/1KB))
    $img.Dispose(); $after += [int]($f.Length * $scale * $scale); $done++
    continue
  }

  # 원본 백업 (폴더 모양 그대로)
  $rel = $f.FullName.Substring($images.Length).TrimStart('\')
  $dest = Join-Path $backup $rel
  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force $destDir | Out-Null }
  if (-not (Test-Path $dest)) { Copy-Item $f.FullName $dest }

  # 투명한 배경을 살려서 줄입니다 (32bpp ARGB)
  $bmp = New-Object System.Drawing.Bitmap $nw, $nh, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.CompositingMode    = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
  $gfx.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $gfx.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $gfx.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $gfx.DrawImage($img, 0, 0, $nw, $nh)
  $gfx.Dispose(); $img.Dispose()

  $tmp = "$($f.FullName).tmp"
  $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Move-Item $tmp $f.FullName -Force

  $newLen = (Get-Item $f.FullName).Length
  $after += $newLen
  $done++
  Write-Host ("  {0}  {1}x{2} -> {3}x{4}   {5:N0}KB -> {6:N0}KB" -f `
    $f.Name, $w, $h, $nw, $nh, ($f.Length/1KB), ($newLen/1KB))
}

Write-Host ''
Write-Host ("줄인 그림 {0}장 · 그대로 둔 그림 {1}장" -f $done, $skipped)
Write-Host ("전체 {0:N1}MB -> {1:N1}MB" -f ($before/1MB), ($after/1MB))
if (-not $WhatIf) {
  Write-Host ("원본은 {0} 에 그대로 있습니다." -f $backup)
  Write-Host '※ 그림을 바꿨으니 index.html 의 ?v= 숫자를 올려 주세요.'
}
