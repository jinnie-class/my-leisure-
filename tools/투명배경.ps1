# 흰 배경 그림을 512px 투명 배경 PNG 로 바꿉니다.
#
#   .\tools\투명배경.ps1 "images\일기 낱말"
#
# 챗GPT 로 받은 그림은 배경이 흰색입니다. 그대로 넣으면 카드 위에
# 흰 네모로 보입니다. 이 도구는 **바깥쪽 흰 부분만** 걷어냅니다.
# 네 모서리에서 번져 들어가므로, 그림 안쪽의 흰색(크림색 종이 ·
# 하이라이트)은 바깥과 이어져 있지 않아 그대로 남습니다.
#
# ⚠ 이 파일은 한글이 들어 있어 **BOM 을 붙여** 저장해야 합니다.
#   없으면 파워셸 5.1 이 ANSI 로 읽어 경로가 깨지고, 오류도 없이 그냥 끝납니다.
param([string]$Dir = 'images', [int]$Size = 512, [int]$Cut = 238)

Add-Type -AssemblyName System.Drawing
$full = Resolve-Path $Dir
foreach ($f in Get-ChildItem "$full\*.png") {
  if ($f.Name -like '_*') { continue }
  $src = New-Object System.Drawing.Bitmap $f.FullName
  $W = $Size
  $H = [int][Math]::Round($src.Height * ([double]$Size) / $src.Width)
  $bmp = New-Object System.Drawing.Bitmap $W, $H, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'HighQuality'
  $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($src, 0, 0, $W, $H)
  $g.Dispose(); $src.Dispose()

  # 점 하나씩 GetPixel 로 다루면 26만 번이라 몇 분씩 걸립니다.
  # LockBits 로 바이트 배열을 한 번에 읽으면 몇 초입니다.
  $rect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $len = $data.Stride * $H
  $buf = New-Object byte[] $len
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $len)

  $seen = New-Object bool[] ($W * $H)
  $stack = New-Object System.Collections.Generic.Stack[int]
  foreach ($i in @(0, ($W-1), ($W*($H-1)), ($W*$H-1))) { $stack.Push($i) }
  $n = 0
  while ($stack.Count -gt 0) {
    $i = $stack.Pop()
    if ($i -lt 0 -or $i -ge ($W*$H)) { continue }
    if ($seen[$i]) { continue }
    $seen[$i] = $true
    $x = $i % $W; $y = [int](($i - $x) / $W)
    $o = $y * $data.Stride + $x * 4
    if ($buf[$o] -lt $Cut -or $buf[$o+1] -lt $Cut -or $buf[$o+2] -lt $Cut) { continue }
    $buf[$o+3] = 0
    $n++
    if ($x -lt $W-1) { $stack.Push($i+1) }
    if ($x -gt 0)    { $stack.Push($i-1) }
    if ($y -lt $H-1) { $stack.Push($i+$W) }
    if ($y -gt 0)    { $stack.Push($i-$W) }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $len)
  $bmp.UnlockBits($data)
  $bmp.Save($f.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  '{0,-22} {1}x{2}  투명 {3:N0}점' -f $f.Name, $W, $H, $n
}
Write-Host ''
Write-Host '끝났습니다. index.html 의 ?v= 숫자를 올려 주세요.'
