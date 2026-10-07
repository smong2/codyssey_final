$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$b=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$qpath="$b/01_design/06_prototype_queue.json"
$q=Get-Content -LiteralPath $qpath -Raw -Encoding UTF8|ConvertFrom-Json
$rows=@()
foreach($a in $q.assets){
 $p=Join-Path $b $a.file
 if(-not(Test-Path -LiteralPath $p)){throw "Missing $($a.id)"}
 $im=[Drawing.Bitmap]::FromFile($p)
 $match=($im.Width -eq $a.width -and $im.Height -eq $a.height)
 $rows+=[pscustomobject]@{id=$a.id;file=$a.file;width=$im.Width;height=$im.Height;expected_width=$a.width;expected_height=$a.height;size_pass=$match;sha256=(Get-FileHash -LiteralPath $p).Hash}
 $im.Dispose()
 if(-not $match){throw "Size mismatch $($a.id)"}
 $a.sha256=$rows[-1].sha256
 $note=switch -Regex ($a.id){
 '^SD02$' {'failed_direction_and_halo';break}
 '^NPC03$|^UI07$' {'needs_halo_cleanup';break}
 '^ENV0[123]$' {'needs_tile_edge_and_pattern_matching';break}
 '^OBJ0[12]$' {'needs_state_anchor_alignment';break}
 default {'pending_in_game_visual_qa'}
 }
 $a|Add-Member qa_status $note -Force
}
$q|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $qpath -Encoding UTF8
$rows|ConvertTo-Json -Depth 12|Set-Content "$b/01_design/08_export_verification.json" -Encoding UTF8
foreach($cat in ($q.assets.category|Select-Object -Unique)){
 $items=@($q.assets|Where-Object category -eq $cat)
 ConvertTo-Json -InputObject $items -Depth 12|Set-Content "$b/$cat/03_prototype_manifest.json" -Encoding UTF8
 [pscustomobject]@{common=$q.common;assets=$items}|ConvertTo-Json -Depth 12|Set-Content "$b/$cat/02_prototype_prompts.json" -Encoding UTF8
}
$m=Get-Content "$b/00_manifest.json" -Raw -Encoding UTF8|ConvertFrom-Json
foreach($a in $q.assets){
 $entry=$m|Where-Object id -eq $a.id
 if(-not $entry){throw "Missing index $($a.id)"}
 $entry.sha256=$a.sha256
 $entry|Add-Member qa_status $a.qa_status -Force
}
$m|ConvertTo-Json -Depth 12|Set-Content "$b/00_manifest.json" -Encoding UTF8
$old=Get-Content "$b/02_characters/03_manifest.json" -Raw -Encoding UTF8|ConvertFrom-Json
$n=$old|Where-Object id -eq NPC03
$n.image_generated=$true;$n.status='generated_pending_production_qa'
$n|Add-Member image_file '04_images/NPC03_베른.png' -Force
$n|Add-Member production_prompt '02_prototype_prompts.json' -Force
$old|ConvertTo-Json -Depth 12|Set-Content "$b/02_characters/03_manifest.json" -Encoding UTF8
$root="$b/README.md"
$t=Get-Content $root -Raw -Encoding UTF8
$t=$t.Replace('캐릭터 32장 + 아이템 20장 + 배경 10장 = 총 62장. ID·이름·파일·프롬프트를 연결한다. NPC는 미생성이므로 이미지 목록에 포함하지 않는다.','기존 학생 32장 + 아이템 20장 + 배경 10장 = 62장. 이번 Prototype 제작 이미지 28장(베른 포함)을 더해 등록 PNG 90장이다. 원본 보관본·수정 시안과 퍼즐 SVG 8종은 이 수량에서 제외한다. 생성 저장과 게임 적용 QA 합격은 다르다.')
$t=$t.Replace('| 04 | [배경](04_backgrounds/01_overview.md) | 장소 10종 |',@'
| 04 | [배경](04_backgrounds/01_overview.md) | 장소 10종 |
| 05 | [UI 재료](05_ui/01_overview.md) | 5종 |
| 06 | [효과](06_effects/01_overview.md) | 공통 룬 빛 1종 |
| 07 | [탐험 환경](07_adventure_environment/01_overview.md) | 온실 13종 |
| 08 | [조사 오브젝트](08_adventure_objects/01_overview.md) | 상태 변화 포함 5종 |
| 09 | [SD 캐릭터](09_sd_character/01_overview.md) | 카엘 기준·걷기 시안 2종, 걷기 QA 불합격 |
| 10 | [퍼즐](10_puzzle/01_overview.md) | 바탕 1종·연결선 SVG 8종 |
'@)
Set-Content $root -Value $t -Encoding UTF8
$p="$b/01_design/05_prototype_checklist.md"
$t=Get-Content $p -Raw -Encoding UTF8
$t=$t.Replace('현재 수량: 베른1 + UI재료5 + 공통FX1 + 온실 환경 테스트13 + 사건 오브젝트5 = 25개 생성/편집 시안.','최초 큐 25개 + SD2개 + 퍼즐 바탕1개 = 28개 생성/편집 시안. 퍼즐 SVG 8개 별도.')
$t=$t.Replace('- [ ] 생성 원본은 보존하고 테스트/납품 크기와 구분.','- [x] 생성 원본은 보존하고 테스트/납품 크기와 구분.')
$t=$t.Replace('- [ ] 퍼즐 직선/곡선·시작/도착 SVG, 활성/비활성 2상태, 256×256 viewBox','- [x] 퍼즐 직선/곡선·시작/도착 SVG 8종, 활성/비활성 2상태, 256×256 viewBox')
$t=$t.Replace('768×2048, 24칸 자동 분리 후 방향·자세 QA','768×2048 시안 저장. 방향·후광 QA 불합격으로 게임용 24칸 자동 분리 미완료')
$t=$t.Replace('대표1인·8방향 Base→3Frame Walk 최대24, Cell/대표 인물 미확정. 답변/테스트 전 보류, Idle 중립 프레임 재사용','사용자 위임으로 카엘·256 Cell 시험. 기준과 시트 생성, 시트 방향 오류로 게임용 분리 미완료')
$t=$t.Replace('Grid/Tile TBD이므로 Rune Tile·직선/곡선·Start/Goal 크기 임의 확정 금지.','사용자 위임으로 3×3 Grid, 256 Tile 시험. 바탕 및 연결선 8종 생성.')
$t=[regex]::Replace($t,'(\r?\n){4,}',[Environment]::NewLine+[Environment]::NewLine)
Set-Content $p -Value $t -Encoding UTF8
$v=Get-ChildItem "$b/10_puzzle/04_images" -Filter *.svg
foreach($f in $v){[xml]$xml=Get-Content -LiteralPath $f.FullName -Raw; if($xml.svg.viewBox -ne '0 0 256 256'){throw 'SVG viewBox mismatch'}}
$missing=@();$badHash=@()
$repo=[IO.Path]::GetFullPath((Join-Path $b '../..'))
foreach($e in $m){
 $p=Join-Path $repo $e.file
 if(-not(Test-Path -LiteralPath $p)){$missing+=$e.id}
 elseif((Get-FileHash -LiteralPath $p).Hash -ne $e.sha256){$badHash+=$e.id}
}
[pscustomobject]@{new_rasters=$rows.Count;size_pass=@($rows|Where-Object size_pass).Count;svgs=$v.Count;indexed_pngs=$m.Count;missing=$missing;hash_mismatch=$badHash}|ConvertTo-Json -Depth 4
if($missing.Count -or $badHash.Count){throw 'Manifest verification failed'}

