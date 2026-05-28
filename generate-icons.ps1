Add-Type -AssemblyName System.Drawing

$sourcePath = '.\src\assets\logo-master.png'  # Tu imagen maestra
$outputDir  = '.\public\assets\icons'
$sizes      = @(72, 96, 128, 144, 152, 192, 384, 512)

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImage, 0, 0, $size, $size)
    $g.Dispose()

    $outPath = Join-Path $outputDir "icon-${size}x${size}.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generado: icon-${size}x${size}.png"
}

$srcImage.Dispose()
Write-Host "`n¡Todos los iconos generados!"
