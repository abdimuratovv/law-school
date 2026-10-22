"""Check stage evidence and protected source; record final hashes and limits."""
import gzip,hashlib,json,zipfile
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
matrix=read('workspace-matrix.json');stress=read('stress-layouts.json');routes=read('route-smoke.json')
assessment=read('assessment-results.json');timing=read('timing-guard-results.json')
components=read('component-results.json');contrast=read('contrast.json');copy=read('copy-coverage.json')
assert len(matrix)==210 and len({(r['case'],tuple(r['viewport']),r['theme'],r['language']) for r in matrix})==210
assert (len(stress),len(routes),len(assessment),len(timing),len(components),len(contrast),len(copy))==(24,69,40,11,39,46,68)
assert all(r['passed'] for r in matrix+stress+routes+assessment+timing+components+contrast+copy)
for row in matrix:assert (OUT/row['screenshot']).is_file(),row['screenshot']
flows=read('regressions/flow-results.json')+read('regressions/discovery-results.json')
assert {r['name'] for r in flows if r['status']=='fail'}=={'Editor draft survives reload'}
protected=['src/App.tsx','src/data/types.ts','src/data/questions.ts','src/data/tests.ts','src/data/admin.ts','src/lib/storage.ts','src/lib/grading.ts']
protected += ['src/pages/student/'+name+'.tsx' for name in ['Results','Review','Dashboard','Catalog','Lobby','GettingStarted','SignIn','Extras']]
with zipfile.ZipFile(OUT/'source-before.zip') as backup:
 for path in protected:assert backup.read(path)==(ROOT/path).read_bytes(),path
 changed=[name for name in backup.namelist() if name.startswith('src/') and (ROOT/name).is_file() and backup.read(name)!=(ROOT/name).read_bytes()]
 added=[p.relative_to(ROOT).as_posix() for p in (ROOT/'src').rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in backup.namelist()]
assets=ROOT/'dist/assets';entry=next(assets.glob('index-*.js'));css=next(assets.glob('index-*.css'))
report={'stage':5,'completed':'2026-10-21','gate':'Complete; await user confirmation before stage 6','workspaceRenders':len(matrix),'stressRenders':len(stress),'routeRenders':len(routes),'assessmentAssertions':len(assessment),'timingGuardAssertions':len(timing),'sharedComponentAssertions':len(components),'contrastProbes':len(contrast),'minimumMeasuredTextContrast':min(r['ratio'] for r in contrast),'explicitCopyKeys':len(copy),'baselineCounts':dict(Counter(r['status'] for r in flows)),'knownBaselineFailures':['Editor draft survives reload — stage 7'],'protectedFiles':protected,'changedSourceFiles':changed,'addedSourceFiles':added,'productionBuild':'passed (TypeScript and Vite)','buildGzipKB':{'entry':141.71,'css':15.25},'buildSizeSource':'Vite final build console report; index-BtFnE2Bl.js and index-CTS-8fvX.css','sourceHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()},'limits':['Chromium only; native-language signoff, learner sessions and screen-reader listening remain outstanding','Enlarged root text is not an actual 400% browser-zoom pass','Blocked writes retain work in memory only; accepting reload/close can lose unsaved answers','Device-local preview; no connected account sync or teacher review','No simultaneous multi-tab editing guarantee','Composition matrix precedes final focus and hidden-announcement refinements; 51 focused assertions rerun on final source','Teacher drafts remain stage 7; translation observer remains for unmigrated routes until stage 8']}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='sourceHashes'},ensure_ascii=True,indent=2))
