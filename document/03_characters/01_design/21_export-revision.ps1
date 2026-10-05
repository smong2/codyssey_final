param([string]$Category,[string]$Name,[string]$Source,[int]$Width,[int]$Height,[switch]$Opaque)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '25_layout_paths.ps1');Add-Type -AssemblyName System.Drawing
$b=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$cat=Join-Path $b $Category
$imagesLeaf=Get-LumiaFolderLeaf $cat 'images'
$sourcesLeaf=Get-LumiaFolderLeaf $cat 'sources'
$raw="$cat/$sourcesLeaf/$($Name)_source.png"
$out="$cat/$imagesLeaf/$Name.png"
if(Test-Path -LiteralPath $out){throw 'Use a new revision name'}
Copy-Item -LiteralPath $Source -Destination $raw
$im=[Drawing.Bitmap]::FromFile($raw);$sw=$im.Width;$sh=$im.Height
$bmp=New-Object Drawing.Bitmap($Width,$Height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[Drawing.Graphics]::FromImage($bmp)
if($Opaque){$g.Clear([Drawing.Color]::FromArgb(255,248,243,228))}else{$g.Clear([Drawing.Color]::Transparent)}
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$scale=[Math]::Min($Width/$sw,$Height/$sh);$dw=[single]($sw*$scale);$dh=[single]($sh*$scale)
$g.DrawImage($im,[single](($Width-$dw)/2),[single](($Height-$dh)/2),$dw,$dh)
$g.Dispose();$im.Dispose();$bmp.Save($out,[Drawing.Imaging.ImageFormat]::Png);$bmp.Dispose()
[pscustomobject]@{name=$Name;category=$Category;file="$Category/$imagesLeaf/$Name.png";source="$Category/$sourcesLeaf/$($Name)_source.png";source_width=$sw;source_height=$sh;width=$Width;height=$Height;sha256=(Get-FileHash -LiteralPath $out).Hash;qa='pending_review'}|ConvertTo-Json|Set-Content "$cat/$(Get-LumiaRecordLeaf $cat ($Name+'.json'))" -Encoding UTF8
Write-Output "$Name : $Width x $Height"

