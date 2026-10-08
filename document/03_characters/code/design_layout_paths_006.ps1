function Get-LumiaFolderLeaf([string]$CategoryPath,[string]$Suffix) {
 $found=@(Get-ChildItem -LiteralPath $CategoryPath -Directory | Where-Object Name -match ('^\d{2}_'+[regex]::Escape($Suffix)+'$'))
 if($found.Count -ne 1){throw "Expected one folder: $CategoryPath / $Suffix"}
 return $found[0].Name
}
function Get-LumiaRecordLeaf([string]$CategoryPath,[string]$Suffix) {
 $found=@(Get-ChildItem -LiteralPath $CategoryPath -File | Where-Object Name -match ('^\d{2}_'+[regex]::Escape($Suffix)+'$'))
 if($found.Count -eq 1){return $found[0].Name}
 if($found.Count -gt 1){throw "Duplicate record: $Suffix"}
 $numbers=@(Get-ChildItem -LiteralPath $CategoryPath -File | ForEach-Object {if($_.Name -match '^(\d{2})_'){[int]$Matches[1]}})
 $next=if($numbers.Count){1+[int](($numbers|Measure-Object -Maximum).Maximum)}else{0}
 if($next -gt 99){throw 'Split the category before exceeding 99'}
 return ('{0:D2}_{1}' -f $next,$Suffix)
}
