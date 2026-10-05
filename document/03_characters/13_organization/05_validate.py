from pathlib import Path
import json,re,hashlib,subprocess,zipfile,io,posixpath
r=Path(__file__).resolve().parents[3];root=r/'document/03_characters';org=root/'13_organization'
z=zipfile.ZipFile(io.BytesIO(subprocess.check_output(['git','archive','--format=zip','HEAD','document/03_characters'],cwd=r)))
baseline={x.filename:z.read(x) for x in z.infolist() if not x.is_dir()}
maps=json.loads((org/'02_path_migration.json').read_text(encoding='utf-8'));reverse={x['new']:x['old'] for x in maps}
def target(text,parent):
    text=text.strip('<>').split('#')[0].split('?')[0]
    if not text or re.match(r'^(?:https?:|mailto:|data:|[A-Z]:|chatgpt|app:|codex:)',text,re.I):return None
    return (r/text.lstrip('/')) if text.startswith('/document/') else parent/text
errors=[];historical=[];links=0
for p in root.rglob('*.md'):
    if 'source_documents' in p.as_posix():continue
    txt=p.read_text(encoding='utf-8-sig');rel=p.relative_to(r).as_posix();old=reverse.get(rel,rel)
    oldtxt=baseline.get(old,b'').decode('utf-8-sig');oldlinks=re.findall(r'\]\(([^)]+)\)',oldtxt)
    for i,a in enumerate(re.findall(r'\]\(([^)]+)\)',txt)):
        q=target(a,p.parent)
        if q is None:continue
        links+=1
        if not q.exists():
            orig=oldlinks[i] if i<len(oldlinks) else None
            oldq=target(orig,r/Path(old).parent) if orig else None
            oldexists=oldq and posixpath.normpath(oldq.relative_to(r).as_posix()) in baseline
            (errors if oldexists else historical).append({'file':rel,'link':a})
numbererrors=[]
asset=re.compile(r'^(?:CH|NPC|IT|BG|UI|FX|ENV|OBJ|SD|PZ|SC|MAP|FLOW|LIFE|ADV)\d*[_A-Z]',re.I)
for folder in root.rglob('*'):
    if not folder.is_dir():continue
    entries=[p for p in folder.iterdir() if not p.name.startswith('00_') and not (p.is_file() and (asset.match(p.name) or p.name=='COMMON_LOCKS.txt' or 'source_documents' in p.as_posix()))]
    nums=[int(m[1]) if (m:=re.match(r'^(\d+)_',p.name)) else -1 for p in entries]
    if sorted(nums)!=list(range(1,len(nums)+1)):numbererrors.append(str(folder.relative_to(r)))
inventory=json.loads((org/'04_file_inventory.json').read_text(encoding='utf-8'))
imagecheck=[x for x in inventory if Path(x['file']).suffix.lower() in {'.png','.jpg','.webp','.svg'}]
changedimages=[x['file'] for x in imagecheck if x['previous_sha256']!=hashlib.sha256((r/x['file']).read_bytes()).hexdigest()]
jsonerrors=[]
for p in root.rglob('*.json'):
    try:json.loads(p.read_text(encoding='utf-8-sig'))
    except Exception as e:jsonerrors.append({'file':str(p.relative_to(r)),'error':str(e)})
protected=['README.md','document/01_project_overview.md','document/02_worldview.md','document/03_characters.md','document/04_tech_stack.md']
protection=[{'file':p,'unchanged':subprocess.check_output(['git','show','HEAD:'+p],cwd=r).replace(b'\r\n',b'\n')==(r/p).read_bytes().replace(b'\r\n',b'\n'),'comparison':'Git content; checkout line endings normalized'} for p in protected]
report={'date':'2026-10-05','branch':'dev-jw','number_errors':numbererrors,'checked_image_files':len(imagecheck),'changed_images':changedimages,'checked_markdown_links':links,'new_broken_links':errors,'preexisting_missing_references':historical,'json_errors':jsonerrors,'protected_originals':protection,'source_file_count':len(inventory),'preserved_file_count':sum((r/x['file']).exists() for x in inventory)}
(org/'03_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
