$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'design_layout_paths_006.ps1')
Add-Type -AssemblyName System.Drawing
$b=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repo=[IO.Path]::GetFullPath((Join-Path $b '../..'))
$m=@(Get-Content "$b/01_manifest.json" -Raw -Encoding UTF8|ConvertFrom-Json)
$new=@()
$files=@(Get-ChildItem "$b" -Recurse -Filter *.png|Where-Object {$_.FullName -match '[\\/]\d{2}_images[\\/]|[\\/]\d{2}_exports[\\/]'})
foreach($f in $files){
 $rel=$f.FullName.Substring($repo.Length+1).Replace('\','/')
 if(@($m|Where-Object file -eq $rel).Count){continue}
 $im=[Drawing.Bitmap]::FromFile($f.FullName)
 $status='revision_pending_visual_qa'
 if($f.Name -like 'SD03*'){$status='direction_corrected_motion_accessory_qa_pending'}
 if($f.Name -like 'ENV0*_v2.png'){$status='repeat_layout_visually_checked_in_game_qa_pending'}
 if($f.Name -like 'NPC03*_v*.png'){$status='rejected_halo_not_removed'}
 if($f.Name -like 'OBJ02*_v2.png'){$status='posture_improved_pot_alignment_pending'}
 if($f.DirectoryName -match '\d{2}_exports$'){$status='normalized_export_original_preserved'}
 $e=[pscustomobject]@{id=$f.BaseName;name=$f.BaseName;category=$rel.Split('/')[2];file=$rel;width=$im.Width;height=$im.Height;sha256=(Get-FileHash -LiteralPath $f.FullName).Hash;status=$status}
 $im.Dispose();$m+=$e;$new+=$e
}
$m|ConvertTo-Json -Depth 12|Set-Content "$b/01_manifest.json" -Encoding UTF8
$checks=@();$errors=@()
foreach($e in $m){
 $p=Join-Path $repo $e.file
 if(-not(Test-Path -LiteralPath $p)){$errors+="Missing $($e.id)";continue}
 if((Get-FileHash -LiteralPath $p).Hash -ne $e.sha256){$errors+="Hash $($e.id)"}
 $im=[Drawing.Bitmap]::FromFile($p)
 if($e.width -and ($e.width -ne $im.Width -or $e.height -ne $im.Height)){$errors+="Size $($e.id)"}
 if($e.id -like 'SD03*'){
  $expected=if($e.file -like '*SD03_frames*'){@(256,256)}elseif($e.file -like '*strip*'){@(768,256)}else{@(768,2048)}
  if($im.Width -ne $expected[0] -or $im.Height -ne $expected[1]){$errors+="SD expected size $($e.id)"}
 }
 $im.Dispose()
}
$ui=[Drawing.Bitmap]::FromFile("$b/04_ui/00_images/05_UI07_입학_초대장.png")
$edgeMax=0
for($x=0;$x -lt $ui.Width;$x++){foreach($y in @(0,1,($ui.Height-2),($ui.Height-1))){$edgeMax=[Math]::Max($edgeMax,$ui.GetPixel($x,$y).A)}}
for($y=0;$y -lt $ui.Height;$y++){foreach($x in @(0,1,($ui.Width-2),($ui.Width-1))){$edgeMax=[Math]::Max($edgeMax,$ui.GetPixel($x,$y).A)}}
$ui.Dispose()
$new=@($m|Where-Object {$_.status -in @('revision_pending_visual_qa','direction_corrected_motion_accessory_qa_pending','repeat_layout_visually_checked_in_game_qa_pending','rejected_halo_not_removed','posture_improved_pot_alignment_pending','normalized_export_original_preserved')})
$result=[pscustomobject]@{indexed_pngs=$m.Count;new_index_entries=$new.Count;new_entries=$new;ui07_outer_2px_alpha_max=$edgeMax;sd_frame_count=@(Get-ChildItem "$b/08_sd_character/00_images/00_SD03_frames" -Filter *.png).Count;errors=$errors}
$result|ConvertTo-Json -Depth 12|Set-Content "$b/00_design/11_revision_audit.json" -Encoding UTF8
$result|Select-Object indexed_pngs,new_index_entries,ui07_outer_2px_alpha_max,sd_frame_count,errors|ConvertTo-Json
if($errors.Count){throw 'Verification failed'}

