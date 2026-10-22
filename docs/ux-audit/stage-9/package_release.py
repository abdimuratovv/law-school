"""Create reviewable static/source candidates without deploying or modifying browser data."""
import hashlib,json,zipfile,os
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
verification=json.loads((OUT/'verification.json').read_text(encoding='utf-8'))
for name,digest in {**verification['sourceHashes'],**verification['buildHashes']}.items():assert sha(ROOT/name)==digest,name
with zipfile.ZipFile(OUT/'release-dist.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted((ROOT/'dist').rglob('*')):
  if f.is_file():z.write(f,f.relative_to(ROOT/'dist').as_posix())
with zipfile.ZipFile(OUT/'release-source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for top in ['src','public']:
  for f in sorted((ROOT/top).rglob('*')):
   if f.is_file():z.write(f,f.relative_to(ROOT).as_posix())
 for n in ['README.md','package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json','.gitignore']:z.write(ROOT/n,n)
 for directory,dirs,files in os.walk(ROOT/'docs/ux-audit'):
  dirs[:]=sorted(d for d in dirs if d not in ['baseline-workspace','screenshots','__pycache__'])
  for name in sorted(files):
   f=Path(directory)/name
   if f.suffix in ['.md','.json','.py','.cjs','.tgz'] and f.name!='release-manifest.json':z.write(f,f.relative_to(ROOT).as_posix())

manifest={'stage':9,'status':'Local release candidate; human acceptance and release approval pending; not deployed','artifacts':{n:{'sha256':sha(OUT/n),'bytes':(OUT/n).stat().st_size} for n in ['source-before.zip','release-dist.zip','release-source.zip']},'verificationSHA256':sha(OUT/'verification.json'),'distFiles':verification['buildHashes'],'sourceArchiveScope':'Application source/public/build inputs, README, audit documents, reports and runners. Screenshot files, historical backup zips, baseline benchmark workspace and dependencies are excluded. Inspect screenshots in the original workspace.','rollback':'Stage 8 checkpoint; preserves data schema but restores known static-label and teacher-scroll defects. See RELEASE-AND-ROLLBACK.md.'}
manifest['status']=verification['status']+'; not deployed'
manifest['performanceAcceptance']=verification['performanceAcceptance']
(OUT/'release-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8');print(json.dumps(manifest['artifacts'],indent=2))
