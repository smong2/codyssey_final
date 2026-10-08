param([string]$Direction,[string]$Source,[string]$Prompt)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'design_layout_paths_006.ps1')
Add-Type -AssemblyName System.Drawing
$b=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$cat="$b/08_sd_character"
New-Item -ItemType Directory -Force -Path "$cat/00_images/00_SD03_frames","$cat/01_sources/00_SD03_direction_strips"|Out-Null
$rawLeaf=Get-LumiaRecordLeaf "$cat/01_sources/00_SD03_direction_strips" ('SD03_'+$Direction+'.png')
$raw="$cat/01_sources/00_SD03_direction_strips/$rawLeaf"
if(-not(Test-Path -LiteralPath $raw)){Copy-Item -LiteralPath $Source -Destination $raw}
$im=[Drawing.Bitmap]::FromFile($raw)
$atlas=New-Object Drawing.Bitmap(768,256,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$ag=[Drawing.Graphics]::FromImage($atlas)
$frames=@()
for($i=0;$i -lt 3;$i++){
 $x0=[int][Math]::Round($im.Width*$i/3);$x1=[int][Math]::Round($im.Width*($i+1)/3)
 $minx=$x1;$miny=$im.Height;$maxx=$x0;$maxy=0
 for($y=0;$y -lt $im.Height;$y++){for($x=$x0;$x -lt $x1;$x++){
  if($im.GetPixel($x,$y).A -gt 24){$minx=[Math]::Min($minx,$x);$miny=[Math]::Min($miny,$y);$maxx=[Math]::Max($maxx,$x);$maxy=[Math]::Max($maxy,$y)}
 }}
 $bw=$maxx-$minx+1;$bh=$maxy-$miny+1
 $scale=[Math]::Min(184.0/$bh,200.0/$bw);$dw=[single]($bw*$scale);$dh=[single]($bh*$scale)
 $out=New-Object Drawing.Bitmap(256,256,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[Drawing.Graphics]::FromImage($out);$g.Clear([Drawing.Color]::Transparent)
 $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $dest=New-Object Drawing.RectangleF([single]((256-$dw)/2),[single](218-$dh),$dw,$dh)
 $srcRect=New-Object Drawing.RectangleF([single]$minx,[single]$miny,[single]$bw,[single]$bh)
 $g.DrawImage($im,$dest,$srcRect,[Drawing.GraphicsUnit]::Pixel)
 $g.Dispose()
 $name=Get-LumiaRecordLeaf "$cat/00_images/00_SD03_frames" ('SD03_'+$Direction+'_'+('{0:D2}' -f $i)+'.png')
 $out.Save("$cat/00_images/00_SD03_frames/$name",[Drawing.Imaging.ImageFormat]::Png)
 $ag.DrawImageUnscaled($out,$i*256,0)
 $frames+=[pscustomobject]@{file="00_images/00_SD03_frames/$name";direction=$Direction;frame=$i;width=256;height=256;baseline_y=218;sha256=(Get-FileHash "$cat/00_images/00_SD03_frames/$name").Hash}
 $out.Dispose()
}
$ag.Dispose();$im.Dispose()
$strip='00_images/'+(Get-LumiaRecordLeaf "$cat/00_images" ('SD03_'+$Direction+'_strip.png'))
$atlas.Save("$cat/$strip",[Drawing.Imaging.ImageFormat]::Png);$atlas.Dispose()
$record=[pscustomobject]@{direction=$Direction;source="01_sources/00_SD03_direction_strips/$rawLeaf";strip=$strip;prompt=$Prompt;frames=$frames;qa='pending_visual_and_game_check';normalization='Cell crop and proportional fit to height184 baseline218; no painted pixel edits'}
$record|ConvertTo-Json -Depth 8|Set-Content "$cat/$(Get-LumiaRecordLeaf $cat ('SD03_'+$Direction+'.json'))" -Encoding UTF8
[pscustomobject]@{direction=$Direction;frames=3;cell='256x256';strip='768x256'}|ConvertTo-Json

