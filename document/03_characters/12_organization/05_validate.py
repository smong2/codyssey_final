from pathlib import Path
import re,json,hashlib,subprocess,zipfile,io,posixpath
r=Path(__file__).resolve().parents[3];root=r/'document/03_characters';org=root/'12_organization'
z=zipfile.ZipFile(io.BytesIO(subprocess.check_output(['git','archive','--format=zip','c6ceee5','document/03_characters'],cwd=r)))
oldfiles={x.filename:z.read(x) for x in z.infolist() if not x.is_dir()}
mapping=json.loads((org/'02_path_migration.json').read_text(encoding='utf-8-sig'));rev={x['new']:x['old'] for x in mapping}
errors=[];groups=[]
for folder in [root]+[p for p in root.rglob('*') if p.is_dir()]:
    for kind in ('folders','files'):
        entries=sorted([p for p in folder.iterdir() if p.is_dir()==(kind=='folders')],key=lambda p:p.name)
        nums=[int(m[1]) if (m:=re.match(r'^(\d{2})_',p.name)) else -1 for p in entries]
        row={'folder':folder.relative_to(r).as_posix(),'kind':kind,'count':len(entries),'pass':nums==list(range(len(entries)))}
        groups.append(row)
        if not row['pass']:errors.append(row)
inventory=json.loads((org/'04_file_inventory.json').read_text(encoding='utf-8-sig'))
images=[x for x in inventory if Path(x['file']).suffix.lower() in {'.png','.jpg','.webp','.svg'}]
changed=[x['file'] for x in images if x['previous_sha256']!=hashlib.sha256((r/x['file']).read_bytes()).hexdigest()]
jsonerrors=[];badlinks=[];legacy=[];checked=0
for p in root.rglob('*.json'):
    try:json.loads(p.read_text(encoding='utf-8-sig'))
    except Exception as e:jsonerrors.append({'file':str(p.relative_to(r)),'error':str(e)})
def resolve(a,parent):
    a=a.strip('<>').split('#')[0].split('?')[0]
    if not a or re.match(r'^(?:https?:|mailto:|data:|[A-Z]:|chatgpt|app:|codex:)',a,re.I):return None
    return parent/a
for p in root.rglob('*.md'):
    if 'source_documents' in p.as_posix():continue
    links=re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8-sig'));rel=p.relative_to(r).as_posix();old=rev.get(rel,rel)
    prior=re.findall(r'\]\(([^)]+)\)',oldfiles.get(old,b'').decode('utf-8-sig'))
    for i,a in enumerate(links):
        q=resolve(a,p.parent)
        if q is None:continue
        checked+=1
        if q.exists():continue
        oldq=resolve(prior[i],r/Path(old).parent) if i<len(prior) else None
        existed=oldq and posixpath.normpath(oldq.relative_to(r).as_posix()) in oldfiles
        row={'file':rel,'target':a}
        (legacy if old in oldfiles and not existed else badlinks).append(row)
protected=['README.md','document/01_project_overview.md','document/02_worldview.md','document/03_characters.md','document/04_tech_stack.md']
protection=[{'file':p,'unchanged':subprocess.check_output(['git','show','c6ceee5:'+p],cwd=r).replace(b'\r\n',b'\n')==(r/p).read_bytes().replace(b'\r\n',b'\n')} for p in protected]
result={'date':'2026-10-05','branch':'dev-jw','numbering':'Separate folder and file groups; both start at 00 with no gaps','groups':groups,'number_errors':errors,'previous_file_count':len(inventory),'preserved_file_count':sum((r/x['file']).exists() for x in inventory),'checked_image_files':len(images),'changed_images':changed,'checked_markdown_links':checked,'new_broken_links':badlinks,'preexisting_missing_references':legacy,'json_errors':jsonerrors,'protected_originals':protection}
(org/'03_validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items() if k!='groups'},ensure_ascii=False,indent=2))
