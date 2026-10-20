Add-Type -AssemblyName System.Drawing

function Generate-CinemaIcon($size, $outputPath, $cornerRadius) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background: Dark Sleek Charcoal #111827 / #0b0f19
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 20, 24, 33)), ([System.Drawing.Color]::FromArgb(255, 11, 15, 25)), 45.0
    
    # Draw rounded background if corner radius > 0
    if ($cornerRadius -gt 0) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $cornerRadius * 2
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)

        # Subtle glowing red outer border
        $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 229, 9, 20)), ($size * 0.015)
        $g.DrawPath($borderPen, $path)
        $borderPen.Dispose()
        $path.Dispose()
    } else {
        $g.FillRectangle($bgBrush, $rect)
    }

    # Center scale factor for the N ribbon
    $scale = $size / 512.0

    # Ambient red glow under ribbon
    $glowRect = New-Object System.Drawing.RectangleF (140 * $scale), (180 * $scale), (232 * $scale), (240 * $scale)
    $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 229, 9, 20))
    $g.FillEllipse($glowBrush, $glowRect)
    $glowBrush.Dispose()

    # Left Vertical Stem (Dark Red #B81D24)
    $leftRect = New-Object System.Drawing.RectangleF (148 * $scale), (96 * $scale), (68 * $scale), (320 * $scale)
    $leftBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $leftRect, ([System.Drawing.Color]::FromArgb(255, 184, 29, 36)), ([System.Drawing.Color]::FromArgb(255, 120, 10, 15)), 0.0
    $g.FillRectangle($leftBrush, $leftRect)

    # Right Vertical Stem (Mid Red #DB0510)
    $rightRect = New-Object System.Drawing.RectangleF (296 * $scale), (96 * $scale), (68 * $scale), (320 * $scale)
    $rightBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rightRect, ([System.Drawing.Color]::FromArgb(255, 219, 5, 16)), ([System.Drawing.Color]::FromArgb(255, 150, 4, 12)), 0.0
    $g.FillRectangle($rightBrush, $rightRect)

    # Diagonal Ribbon (Vivid Bright Red #E50914) with Shadow
    $diagPoints = @(
        (New-Object System.Drawing.PointF (148 * $scale), (96 * $scale)),
        (New-Object System.Drawing.PointF (216 * $scale), (96 * $scale)),
        (New-Object System.Drawing.PointF (364 * $scale), (416 * $scale)),
        (New-Object System.Drawing.PointF (296 * $scale), (416 * $scale))
    )

    # Draw Shadow behind diagonal
    $shadowPoints = @(
        (New-Object System.Drawing.PointF ((148 - 6) * $scale), ((96 + 6) * $scale)),
        (New-Object System.Drawing.PointF ((216 - 6) * $scale), ((96 + 6) * $scale)),
        (New-Object System.Drawing.PointF ((364 - 6) * $scale), ((416 + 6) * $scale)),
        (New-Object System.Drawing.PointF ((296 - 6) * $scale), ((416 + 6) * $scale))
    )
    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(160, 0, 0, 0))
    $g.FillPolygon($shadowBrush, $shadowPoints)
    $shadowBrush.Dispose()

    # Draw vivid diagonal
    $diagRect = New-Object System.Drawing.RectangleF (148 * $scale), (96 * $scale), (216 * $scale), (320 * $scale)
    $diagBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $diagRect, ([System.Drawing.Color]::FromArgb(255, 255, 40, 45)), ([System.Drawing.Color]::FromArgb(255, 178, 7, 16)), 60.0
    $g.FillPolygon($diagBrush, $diagPoints)

    # Gold Crown VIP star at top center
    $starBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
    $g.FillEllipse($starBrush, (244 * $scale), (62 * $scale), (24 * $scale), (24 * $scale))
    $starBrush.Dispose()

    # Save PNG
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $leftBrush.Dispose()
    $rightBrush.Dispose()
    $diagBrush.Dispose()
    $bgBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated: $outputPath ($size x $size)"
}

$pubDir = "$PSScriptRoot\public"
Generate-CinemaIcon 512 "$pubDir\icon-512.png" 96
Generate-CinemaIcon 192 "$pubDir\icon-192.png" 36
Generate-CinemaIcon 180 "$pubDir\apple-touch-icon.png" 34
Generate-CinemaIcon 48  "$pubDir\favicon.png" 8
Copy-Item "$pubDir\favicon.png" "$pubDir\favicon.ico" -Force
Write-Output "All icons successfully created!"
