param([string]$Category)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'design_layout_paths_006.ps1')
$b=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$q=Get-Content "$b/00_design/05_prototype_queue.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$items=@($q.assets | Where-Object {$_.category -eq $Category -and $_.status -ne 'pending'})
if(-not $items.Count){throw 'No generated items'}
$cat=Join-Path $b $Category
$imagesLeaf=Get-LumiaFolderLeaf $cat 'images'
$sourcesLeaf=Get-LumiaFolderLeaf $cat 'sources'

$items | ConvertTo-Json -Depth 12 | Set-Content "$cat/$(Get-LumiaRecordLeaf $cat 'prototype_manifest.json')" -Encoding UTF8
[pscustomobject]@{common=$q.common;assets=$items} | ConvertTo-Json -Depth 12 | Set-Content "$cat/$(Get-LumiaRecordLeaf $cat 'prototype_prompts.json')" -Encoding UTF8
$doc="# $Category — Prototype 생성 결과\n\n생성 파일이며 게임 적용 QA는 미완료. $imagesLeaf 는 초기 테스트 규격, $sourcesLeaf 는 생성 원본. 리사이즈는 종횡비 유지(투명 개체는 contain, 불투명 배경은 cover). 크기 일치는 미술·알파·애니메이션 합격을 의미하지 않는다.\n\n"
foreach($a in $items){
 $leaf=Split-Path $a.file -Leaf
 $doc+="## $($a.id) $($a.name)\n\n- 원본: $($a.source_width)×$($a.source_height) / 테스트 파일: $($a.width)×$($a.height)\n- 상태: $($a.status), 샘플 알파: $($a.alpha_min_sampled)~$($a.alpha_max_sampled)\n\n![$($a.name)]($imagesLeaf/$leaf)\n\n"
}
$doc=$doc.Replace('\n',"`n")
if($Category -eq '01_characters'){$overview="$cat/02_prototype_overview.md"}else{$overview="$cat/01_overview.md"}
Set-Content -LiteralPath $overview -Value $doc -Encoding UTF8
$root="$b/00_README.md"
$body=Get-Content $root -Raw -Encoding UTF8
$link="$Category/"+(Split-Path $overview -Leaf)
if(-not $body.Contains($link)){Add-Content $root -Encoding UTF8 -Value ("- [Prototype "+$Category+"]("+$link+")")}
$manifestPath="$b/01_manifest.json"
$all=@(Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json)
foreach($a in $items){
 if(@($all | Where-Object id -eq $a.id).Count -eq 0){
 $all += [pscustomobject]@{id=$a.id;name=$a.name;category=$Category;file="document/03_characters/$($a.file)";prompt="document/03_characters/$Category/$(Get-LumiaRecordLeaf $cat 'prototype_prompts.json')";sha256=$a.sha256;status=$a.status;width=$a.width;height=$a.height}
 }
}
$all | ConvertTo-Json -Depth 12 | Set-Content $manifestPath -Encoding UTF8
$r=[IO.Path]::GetFullPath((Join-Path $b '../..'))
git -c "safe.directory=$r" -C $r add document/03_characters
git -c "safe.directory=$r" -C $r commit -m "Save prototype category $Category with checked export sizes"

