# Phase 0 image pipeline (temporary, PowerShell/System.Drawing).
# Turns Daar's 20-30MP camera originals into web-sized derivatives for the style board.
# Replaced in Phase 1 by a sharp-based Node pipeline that also emits AVIF/WebP + blur placeholders.

param(
    [string]$SourceRoot = "C:\Users\BEAST IZZI\Desktop\DAAR WEBSITE",
    [string]$OutDir     = "C:\Users\BEAST IZZI\Desktop\daar-website\design\img",
    [int]$MaxEdge       = 1600,
    [int]$Quality       = 82
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }

# Curated selection: atmosphere from "daar AESTHETIC", a few plated items for menu cards.
$picks = @(
    @{ src = 'daar AESTHETIC\DSC00348.jpg'; out = 'packaging-marble.jpg' }
    @{ src = 'daar AESTHETIC\DSC09506.jpg'; out = 'patience-plates.jpg'  }
    @{ src = 'daar AESTHETIC\DSC09581.jpg'; out = 'terrace-drink.jpg'    }
    @{ src = 'daar AESTHETIC\DSC09488.jpg'; out = 'interior-01.jpg'      }
    @{ src = 'daar AESTHETIC\DSC09673.jpg'; out = 'interior-02.jpg'      }
    @{ src = 'daar AESTHETIC\DSC00404.jpg'; out = 'counter.jpg'          }
    @{ src = 'daar AESTHETIC\DSC09739.jpg'; out = 'atmos-01.jpg'         }
    @{ src = 'daar AESTHETIC\DSC09735.jpg'; out = 'atmos-02.jpg'         }
    @{ src = 'daar new menu\DSC00002.jpg';  out = 'item-tart.jpg'        }
    @{ src = 'daar new menu\DSC02255.jpg';  out = 'item-latte.jpg'       }
    @{ src = 'daar new menu\DSC01730.jpg';  out = 'item-03.jpg'          }
    @{ src = 'daar new menu\DSC02513.jpg';  out = 'item-04.jpg'          }
    @{ src = 'daar new menu\DSC00164.jpg';  out = 'item-05.jpg'          }
    @{ src = 'daar new menu\DSC01444.jpg';  out = 'item-06.jpg'          }
)

foreach ($p in $picks) {
    $src = Join-Path $SourceRoot $p.src
    if (-not (Test-Path $src)) { Write-Output "SKIP (missing): $($p.src)"; continue }

    $img = $null; $bmp = $null; $g = $null
    try {
        $img = [System.Drawing.Image]::FromFile($src)

        $ratio = $MaxEdge / [Math]::Max($img.Width, $img.Height)
        if ($ratio -gt 1) { $ratio = 1 }
        $nw = [int]($img.Width * $ratio)
        $nh = [int]($img.Height * $ratio)

        $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($img, 0, 0, $nw, $nh)

        $ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, [int]$Quality)

        $dest = Join-Path $OutDir $p.out
        $bmp.Save($dest, $jpegCodec, $ep)

        $kb = [math]::Round((Get-Item $dest).Length / 1KB)
        Write-Output ("OK  {0,-22} {1}x{2}  {3} KB" -f $p.out, $nw, $nh, $kb)
    }
    catch {
        Write-Output "FAIL $($p.src) -> $($_.Exception.Message)"
    }
    finally {
        if ($g)   { $g.Dispose() }
        if ($bmp) { $bmp.Dispose() }
        if ($img) { $img.Dispose() }
    }
}
