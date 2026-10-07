from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
errors=[]
for folder in [root/'documents']+[p for p in (root/'assets').iterdir() if p.is_dir()]:
    files=[p for p in folder.iterdir() if p.is_file() and (folder.name=='documents' or p.suffix.lower() in {'.png','.jpg','.jpeg','.webp','.svg','.gif','.avif'})]
    nums=sorted(int(m[1]) for p in files if (m:=re.search(r'_(\d{3})\.[^.]+$',p.name)))
    if nums!=list(range(len(files))):errors.append(str(folder))
if list(root.rglob('*.json')):errors.append('Unexpected JSON files')
print('PASS' if not errors else 'FAIL: '+str(errors))
raise SystemExit(bool(errors))
