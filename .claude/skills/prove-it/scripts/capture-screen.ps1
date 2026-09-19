# SON ÇARE — yalnız masaüstü UYGULAMALARI için (web sayfası için
# capture-page.mjs kullan). Birincil ekranın TAMAMINI yakalar: uygulama
# dışındaki her pencere ve özel içerik görüntüye girebilir. Commit'ten önce
# görüntüyü aç ve kontrol et; ilgisiz pencere/özel içerik varsa ham görüntüyü
# commit'leme, sil — yalnız temiz (kırpılmış) bir sürüm commit'lenebilir.
# Kullanım: powershell -NoProfile -ExecutionPolicy Bypass -File capture-screen.ps1 -Out "C:\yol\ekran.png"
param(
    [Parameter(Mandatory)]
    [string]$Out
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$Out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)

$outDir = Split-Path -Parent $Out
if ($outDir -and -not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = $null
$graphics = $null
try {
    $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    if ($graphics) { $graphics.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
}

Write-Output "Kaydedildi: $Out"
