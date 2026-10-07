param([string]$Id,[string]$Source)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$b=Join-Path $PSScriptRoot '..'
$b=[IO.Path]::GetFullPath($b)
$qpath=Join-Path $b '01_design/06_prototype_queue.json'
$q=Get-Content -LiteralPath $qpath -Raw -Encoding UTF8 | ConvertFrom-Json
$a=$q.assets | Where-Object id -eq $Id
if(-not $a){throw 'Unknown ID'}
$cat=Join-Path $b $a.category
New-Item -ItemType Directory -Force -Path "$cat/04_images","$cat/05_sources" | Out-Null
$raw="$cat/05_sources/$($a.id)_$($a.name)_source.png"
if(Test-Path -LiteralPath $raw){
 if([IO.Path]::GetFullPath($Source) -ne [IO.Path]::GetFullPath($raw)){throw 'Source already saved'}
}else{Copy-Item -LiteralPath $Source -Destination $raw}
$im=[System.Drawing.Bitmap]::FromFile($raw)
$w=$im.Width; $h=$im.Height
$out=Join-Path $b $a.file
if($w -eq $a.width -and $h -eq $a.height -and $a.transparent){Copy-Item -LiteralPath $raw -Destination $out}
else{
 $bmp=New-Object System.Drawing.Bitmap([int]$a.width,[int]$a.height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($bmp)
 if($a.transparent){$g.Clear([System.Drawing.Color]::Transparent)}else{$g.Clear([System.Drawing.Color]::FromArgb(255,248,243,228))}
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 # Export geometry only; preserve aspect, contain for cutouts and cover for opaque backgrounds.
 $sx=$a.width/$w;$sy=$a.height/$h
 $scale=if($a.transparent){[Math]::Min($sx,$sy)}else{[Math]::Max($sx,$sy)}
 $dw=[single]($w*$scale);$dh=[single]($h*$scale)
 $g.DrawImage($im,[single](($a.width-$dw)/2),[single](($a.height-$dh)/2),$dw,$dh)
 $g.Dispose()
 $bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
 $bmp.Dispose()
}
$im.Dispose()
$check=[System.Drawing.Bitmap]::FromFile($out)
$amin=255;$amax=0
for($y=0;$y -lt $check.Height;$y+=8){for($x=0;$x -lt $check.Width;$x+=8){$alpha=$check.GetPixel($x,$y).A;$amin=[Math]::Min($amin,$alpha);$amax=[Math]::Max($amax,$alpha)}}
$check.Dispose()
$a.status='generated_pending_game_qa'
$a | Add-Member source_width $w -Force
$a | Add-Member source_height $h -Force
$a | Add-Member export_width $a.width -Force
$a | Add-Member export_height $a.height -Force
$a | Add-Member alpha_min_sampled $amin -Force
$a | Add-Member alpha_max_sampled $amax -Force
$a | Add-Member sha256 (Get-FileHash -LiteralPath $out).Hash -Force
$a | Add-Member source_file "$($a.category)/05_sources/$($a.id)_$($a.name)_source.png" -Force
$q | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $qpath -Encoding UTF8
$checklist=Join-Path $b '01_design/05_prototype_checklist.md'
$body=Get-Content -LiteralPath $checklist -Raw -Encoding UTF8
$body=$body.Replace("- [ ] $Id —","- [x] $Id —")
Set-Content -LiteralPath $checklist -Value $body -Encoding UTF8
[pscustomobject]@{id=$Id;source="$w x $h";export="$($a.width) x $($a.height)";alpha_min=$amin;alpha_max=$amax} | ConvertTo-Json

