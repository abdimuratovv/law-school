"""Reconstruct the pre-foundation source in an isolated, nested benchmark workspace."""
import shutil,zipfile,hashlib,json
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];target=OUT/'baseline-workspace';target.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT.parent/'stage-2/source-before.zip') as z:
 for n in z.namelist():
  assert n.startswith('src/') and '..' not in Path(n).parts,n
 z.extractall(target)
 hashes={n:hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if not n.endswith('/')}
for n in ['package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json']:shutil.copy2(ROOT/n,target/n)
shutil.copytree(ROOT/'public',target/'public',dirs_exist_ok=True)
# Vite resolves the existing ancestor node_modules; no application dependency changes.
report={'archive':'../stage-2/source-before.zip','archiveSHA256':hashlib.sha256((OUT.parent/'stage-2/source-before.zip').read_bytes()).hexdigest(),'sourceHashes':hashes,'reusedBuildInputs':{n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json']},'method':'Stage 0/1 changed no application source; Stage 2 source-before is the pre-redesign source. Build configuration/public assets/dependencies reused from the candidate for controlled retrospective comparison.'}
(OUT/'baseline-provenance.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('Prepared isolated source snapshot:',len(hashes),'files')
