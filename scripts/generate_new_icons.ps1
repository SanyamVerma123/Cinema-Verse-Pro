Add-Type -AssemblyName System.Drawing

function Generate-NewCinemaVerseIcon($size, $outputPath, $cornerRadius) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    $scale = $size / 512.0

    # 1. Background: Deep Obsidian Charcoal Gradient (#0b0e17 -> #04060a)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, `
        ([System.Drawing.Color]::FromArgb(255, 18, 24, 38)), `
        ([System.Drawing.Color]::FromArgb(255, 6, 8, 14)), 45.0
    
    if ($cornerRadius -gt 0) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = [Math]::Max(4, [int]($cornerRadius * 2))
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($bgBrush, $path)

        # Dual Neon Border Ring (Crimson & Cosmic Purple)
        $neonPen1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 229, 9, 20)), ([Math]::Max(1.5, 4.0 * $scale))
        $g.DrawPath($neonPen1, $path)
        $neonPen1.Dispose()

        $innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $inset = [Math]::Max(2, [int](6.0 * $scale))
        $id = [Math]::Max(4, $d - ($inset * 2))
        $innerPath.AddArc($inset, $inset, $id, $id, 180, 90)
        $innerPath.AddArc($size - $inset - $id, $inset, $id, $id, 270, 90)
        $innerPath.AddArc($size - $inset - $id, $size - $inset - $id, $id, $id, 0, 90)
        $innerPath.AddArc($inset, $size - $inset - $id, $id, $id, 90, 90)
        $innerPath.CloseFigure()
        $neonPen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, 168, 85, 247)), ([Math]::Max(1.0, 2.0 * $scale))
        $g.DrawPath($neonPen2, $innerPath)
        $neonPen2.Dispose()
        $innerPath.Dispose()
        $path.Dispose()
    } else {
        $g.FillRectangle($bgBrush, $rect)
    }

    # 2. Ambient Cosmic Glow in center
    $glowRect1 = New-Object System.Drawing.RectangleF (120 * $scale), (120 * $scale), (272 * $scale), (272 * $scale)
    $glowBrush1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(45, 229, 9, 20))
    $g.FillEllipse($glowBrush1, $glowRect1)
    $glowBrush1.Dispose()

    $glowRect2 = New-Object System.Drawing.RectangleF (220 * $scale), (180 * $scale), (200 * $scale), (200 * $scale)
    $glowBrush2 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(35, 139, 92, 246))
    $g.FillEllipse($glowBrush2, $glowRect2)
    $glowBrush2.Dispose()

    # 3. Layered 3D CinemaVerse Play Prism (Interlocking C-V Play Falcon)
    # Left Facet (Crimson Neon)
    $leftFacetPoints = @(
        (New-Object System.Drawing.PointF (150 * $scale), (120 * $scale)),
        (New-Object System.Drawing.PointF (245 * $scale), (175 * $scale)),
        (New-Object System.Drawing.PointF (245 * $scale), (345 * $scale)),
        (New-Object System.Drawing.PointF (150 * $scale), (400 * $scale))
    )
    $leftRect = New-Object System.Drawing.RectangleF (150 * $scale), (120 * $scale), (100 * $scale), (280 * $scale)
    $leftBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $leftRect, `
        ([System.Drawing.Color]::FromArgb(255, 255, 45, 65)), `
        ([System.Drawing.Color]::FromArgb(255, 180, 8, 16)), 90.0
    $g.FillPolygon($leftBrush, $leftFacetPoints)
    $leftBrush.Dispose()

    # Center Play Arrow Head (Vivid Cinema Scarlet with Highlight)
    $playPoints = @(
        (New-Object System.Drawing.PointF (245 * $scale), (175 * $scale)),
        (New-Object System.Drawing.PointF (390 * $scale), (260 * $scale)),
        (New-Object System.Drawing.PointF (245 * $scale), (345 * $scale))
    )
    $playRect = New-Object System.Drawing.RectangleF (245 * $scale), (175 * $scale), (145 * $scale), (170 * $scale)
    $playBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $playRect, `
        ([System.Drawing.Color]::FromArgb(255, 255, 75, 90)), `
        ([System.Drawing.Color]::FromArgb(255, 210, 10, 22)), 45.0
    $g.FillPolygon($playBrush, $playPoints)
    $playBrush.Dispose()

    # Cosmic Verse Wing (Cyan/Purple Prism Diagonal Arc)
    $cosmicPoints = @(
        (New-Object System.Drawing.PointF (245 * $scale), (345 * $scale)),
        (New-Object System.Drawing.PointF (340 * $scale), (230 * $scale)),
        (New-Object System.Drawing.PointF (390 * $scale), (260 * $scale)),
        (New-Object System.Drawing.PointF (295 * $scale), (400 * $scale))
    )
    $cosmicRect = New-Object System.Drawing.RectangleF (245 * $scale), (230 * $scale), (150 * $scale), (170 * $scale)
    $cosmicBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $cosmicRect, `
        ([System.Drawing.Color]::FromArgb(230, 56, 189, 248)), `
        ([System.Drawing.Color]::FromArgb(240, 168, 85, 247)), 30.0
    $g.FillPolygon($cosmicBrush, $cosmicPoints)
    $cosmicBrush.Dispose()

    # Upper Specular Cut Reflection
    $specPoints = @(
        (New-Object System.Drawing.PointF (150 * $scale), (120 * $scale)),
        (New-Object System.Drawing.PointF (245 * $scale), (175 * $scale)),
        (New-Object System.Drawing.PointF (390 * $scale), (260 * $scale)),
        (New-Object System.Drawing.PointF (350 * $scale), (235 * $scale)),
        (New-Object System.Drawing.PointF (230 * $scale), (160 * $scale)),
        (New-Object System.Drawing.PointF (160 * $scale), (120 * $scale))
    )
    $specBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 255, 255, 255))
    $g.FillPolygon($specBrush, $specPoints)
    $specBrush.Dispose()

    # 4. VIP Gold Starburst at upper right (395, 140)
    $starX = 385 * $scale
    $starY = 145 * $scale
    $starR = 26 * $scale
    $goldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
        (New-Object System.Drawing.RectangleF ($starX - $starR), ($starY - $starR), ($starR * 2), ($starR * 2)), `
        ([System.Drawing.Color]::FromArgb(255, 254, 240, 138)), `
        ([System.Drawing.Color]::FromArgb(255, 234, 179, 8)), 45.0
    
    $starPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $sp1 = New-Object System.Drawing.PointF $starX, ($starY - $starR)
    $sp2 = New-Object System.Drawing.PointF ($starX + ($starR * 0.28)), ($starY - ($starR * 0.28))
    $sp3 = New-Object System.Drawing.PointF ($starX + $starR), $starY
    $sp4 = New-Object System.Drawing.PointF ($starX + ($starR * 0.28)), ($starY + ($starR * 0.28))
    $sp5 = New-Object System.Drawing.PointF $starX, ($starY + $starR)
    $sp6 = New-Object System.Drawing.PointF ($starX - ($starR * 0.28)), ($starY + ($starR * 0.28))
    $sp7 = New-Object System.Drawing.PointF ($starX - $starR), $starY
    $sp8 = New-Object System.Drawing.PointF ($starX - ($starR * 0.28)), ($starY - ($starR * 0.28))
    $starPath.AddPolygon(@($sp1, $sp2, $sp3, $sp4, $sp5, $sp6, $sp7, $sp8))
    $g.FillPath($goldBrush, $starPath)
    $starPath.Dispose()
    $goldBrush.Dispose()

    # Center Star Diamond Sparkle
    $diamondBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillEllipse($diamondBrush, ($starX - (4 * $scale)), ($starY - (4 * $scale)), (8 * $scale), (8 * $scale))
    $diamondBrush.Dispose()

    # Save to file
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $bgBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully generated: $outputPath ($size x $size)"
}

$pubDir = "d:\apps\FMR\public"
Generate-NewCinemaVerseIcon 512 "$pubDir\icon-512.png" 116
Generate-NewCinemaVerseIcon 192 "$pubDir\icon-192.png" 44
Generate-NewCinemaVerseIcon 180 "$pubDir\apple-touch-icon.png" 40
Generate-NewCinemaVerseIcon 48  "$pubDir\favicon.png" 10
Copy-Item "$pubDir\favicon.png" "$pubDir\favicon.ico" -Force
Write-Output "All CinemaVerse new logo icons generated successfully!"
