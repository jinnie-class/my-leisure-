# ===========================================================
#  "Nauiyeoga" single-file builder
#  Inlines css/ + js/ + vendor/ into ONE html file so the app
#  can be copied around or opened without the folder structure.
#
#  Usage:  powershell -ExecutionPolicy Bypass -File .\build-single-file.ps1
#  Output: single-file.html  (same folder)
#
#  NOTE: this script is intentionally ASCII-only, because Windows
#  PowerShell 5.1 reads .ps1 files as ANSI unless they have a BOM.
#  All Korean text comes from index.html / css / js, which are read
#  explicitly as UTF-8.
# ===========================================================

param(
  [string]$Out = '',        # output path (default: single-file.html next to this script)
  [int]$MaxSide = 1500,     # longest edge for embedded cover/wallpaper
  [int]$Quality = 82,       # JPEG quality for embedded cover/wallpaper
  [int]$ResizeOverKB = 400  # only shrink embedded pictures larger than this
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Read-Utf8($rel) {
  # index.html carries a ?v=... cache-busting suffix; drop it before reading.
  $clean = ($rel -split '\?')[0]
  $path = Join-Path $root $clean
  if (-not (Test-Path -LiteralPath $path)) { throw "missing file: $clean" }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

$htmlText = Read-Utf8 'index.html'

# --- inline <link rel="stylesheet" href="..."> -------------------------------
$htmlText = [regex]::Replace($htmlText,
  '<link[^>]*href="(css/[^"]+)"[^>]*media="print"[^>]*/?>',
  {
    param($m)
    $css = Read-Utf8 $m.Groups[1].Value
    return "<style media=""print"">`n$css`n</style>"
  })
$htmlText = [regex]::Replace($htmlText,
  '<link[^>]*rel="stylesheet"[^>]*href="(css/[^"]+)"[^>]*/?>',
  {
    param($m)
    $css = Read-Utf8 $m.Groups[1].Value
    return "<style>`n$css`n</style>"
  })

# --- inline <script src="..."></script> --------------------------------------
$htmlText = [regex]::Replace($htmlText,
  '<script\s+src="([^"]+)"\s*>\s*</script>',
  {
    param($m)
    $rel = $m.Groups[1].Value
    $js = Read-Utf8 $rel
    return "<!-- $rel -->`n<script>`n$js`n</script>"
  })

# --- embed the cover + wallpaper so the single file works on its own ----------
# The paths are read out of the inlined JS (App.IMAGE_BASE), so this script
# stays ASCII-only even though the file names are Korean.
function Embed-Asset([string]$text, [string]$key) {
  # The value must be an images/... path. Without this guard, a key like
  # 'speaker' would also match the SVG icon table in js/data/icons.js.
  $m = [regex]::Match($text, "$key\s*:\s*'(images/[^']+)'")
  if (-not $m.Success) { return $text }
  $rel = $m.Groups[1].Value
  $file = Join-Path $root ($rel -replace '/', '\')
  if (-not (Test-Path -LiteralPath $file)) {
    Write-Host "  skip (not found): $rel"
    return $text
  }
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $ext = [System.IO.Path]::GetExtension($file).ToLower()
  $mime = switch ($ext) {
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.webp' { 'image/webp' }
    '.gif'  { 'image/gif' }
    default { 'application/octet-stream' }
  }

  # Big pictures are shrunk for the single-file build only, so the one file
  # stays small enough to copy around and open on a classroom tablet.
  # The folder build (index.html) always uses the original file.
  if ($bytes.Length -gt ($ResizeOverKB * 1KB) -and ($ext -eq '.png' -or $ext -eq '.jpg' -or $ext -eq '.jpeg')) {
    try {
      Add-Type -AssemblyName System.Drawing
      $ms = New-Object System.IO.MemoryStream(,$bytes)
      $img = [System.Drawing.Image]::FromStream($ms)
      $scale = [math]::Min(1.0, $MaxSide / [math]::Max($img.Width, $img.Height))
      $w = [int][math]::Round($img.Width * $scale)
      $h = [int][math]::Round($img.Height * $scale)
      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $out = New-Object System.IO.MemoryStream
      if ($script:PreserveAlpha) {
        # Button icons sit on the wallpaper with no background of their own,
        # so their transparency must survive - keep PNG, do not fill white.
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($img, 0, 0, $w, $h)
        $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
        $mime = 'image/png'
      } else {
        $g.Clear([System.Drawing.Color]::White)
        $g.DrawImage($img, 0, 0, $w, $h)
        $jpg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
               Where-Object { $_.MimeType -eq 'image/jpeg' } | Select-Object -First 1
        $prm = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $prm.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
          [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
        $bmp.Save($out, $jpg, $prm)
        $mime = 'image/jpeg'
      }
      $bytes = $out.ToArray()
      Write-Host "  resized $key -> ${w}x${h}"
      $g.Dispose(); $bmp.Dispose(); $img.Dispose(); $ms.Dispose(); $out.Dispose()
    } catch {
      Write-Host "  (resize skipped: $($_.Exception.Message))"
    }
  }
  $dataUri = "data:$mime;base64," + [System.Convert]::ToBase64String($bytes)
  $kb = [math]::Round($bytes.Length / 1KB)
  # NOTE: must be Write-Host, not Write-Output — anything written to the
  # output stream here would be concatenated into the returned HTML.
  Write-Host "  embedded $key ($kb KB)"
  # Replace only inside the App.IMAGE_BASE declaration.
  return $text.Replace("$key" + ": '" + $rel + "'", "$key" + ": '" + $dataUri + "'")
}

$htmlText = Embed-Asset $htmlText 'cover'
$htmlText = Embed-Asset $htmlText 'wallpaper'
$htmlText = Embed-Asset $htmlText 'mapbg'      # leisure-map backdrop (optional)

# Button pictures (sound / fullscreen / gear) - small, so embed them at icon size
# with their own limits, independent of the cover settings above.
$savedMax = $MaxSide; $savedQ = $Quality; $savedOver = $ResizeOverKB
$MaxSide = 128; $ResizeOverKB = 20; $script:PreserveAlpha = $true
foreach ($k in @('speaker','fullscreen','gear','home')) { $htmlText = Embed-Asset $htmlText $k }
$script:PreserveAlpha = $false
$MaxSide = 512; $ResizeOverKB = 60
foreach ($k in @('indoor','outdoor','tried','like','challenge','unsure')) {
  $htmlText = Embed-Asset $htmlText $k
}
$script:PreserveAlpha = $false
# plan-sheet title underline: wide (3:1) hand drawing, needs transparency
$MaxSide = 768; $ResizeOverKB = 40; $script:PreserveAlpha = $true
$htmlText = Embed-Asset $htmlText 'planLine'
$script:PreserveAlpha = $false
$MaxSide = $savedMax; $Quality = $savedQ; $ResizeOverKB = $savedOver

if ($Out) { $outPath = $Out } else { $outPath = Join-Path $root 'single-file.html' }
[System.IO.File]::WriteAllText($outPath, $htmlText, $utf8)

$kb = [math]::Round((Get-Item -LiteralPath $outPath).Length / 1KB)
Write-Output "built: $outPath ($kb KB)"
Write-Output "note: the single-file build always uses the built-in SVG pictures (no images/ folder)."
