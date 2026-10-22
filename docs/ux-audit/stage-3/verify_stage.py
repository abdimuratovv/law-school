"""Check milestone evidence and immutable data contracts, record final source hashes."""
import hashlib,json,zipfile
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
matrix=read('shell-matrix.json');routes=read('route-landmarks.json')
interactions=read('interaction-checks.json');localization=read('localization-checks.json');components=read('component-results.json')
assert len(matrix)==48 and len({(r['width'],r['theme'],r['language'],r['kind']) for r in matrix})==48
assert all(r['passed'] for r in matrix+routes+interactions+localization+components)
assert len(routes)==69 and len(components)==39
for r in matrix:
 name=f"{r['kind']}-{r['width']}-{r['theme']}-{r['language']}.png"
 assert (OUT/'screenshots'/name).is_file()
for name in ['loading.png','load-error.png','large-text-student.png','large-text-teacher.png']:
 assert (OUT/'screenshots'/name).is_file()
flows=read('regressions/flow-results.json')+read('regressions/discovery-results.json')
expected={'Exam ArrowRight shortcut advances','Storage failure is surfaced','Editor draft survives reload'}
assert {r['name'] for r in flows if r['status']=='fail'}==expected
immutable=['src/state/AppState.tsx','src/data/types.ts','src/data/questions.ts','src/data/tests.ts','src/data/admin.ts','src/lib/storage.ts','src/lib/grading.ts']
with zipfile.ZipFile(OUT/'source-before.zip') as backup:
 for path in immutable:assert backup.read(path)==(ROOT/path).read_bytes(),path
 changed=[name for name in backup.namelist() if name.startswith('src/') and (ROOT/name).is_file() and backup.read(name)!=(ROOT/name).read_bytes()]
 added=[p.relative_to(ROOT).as_posix() for p in (ROOT/'src').rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in backup.namelist()]
report={'stage':3,'gate':'passed for scoped browser checks; await user confirmation before stage 4','shellConfigurations':len(matrix),'routeRenders':len(routes),'interactionAssertions':len(interactions),'localizationAssertions':len(localization),'sharedComponentAssertions':len(components),'baselineCounts':dict(Counter(r['status'] for r in flows)),'knownBaselineFailures':sorted(expected),'immutableContracts':immutable,'changedSourceFiles':changed,'addedSourceFiles':added,'productionBuild':'passed: tsc --noEmit and Vite build','buildGzipKB':{'entry':118.07,'css':13.08},'sourceHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()},'limitations':['Chromium only; no screen-reader listening session or native-language signoff','Drawers fit at 320px/200% root text; existing catalog body has 5px overflow, assigned stage 4','DOM observer retained until full page migration in stage 8','Assessment save failures and global arrow shortcuts remain stage 5; teacher drafts remain stage 7','No authentication/backend/deployment changes']}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceHashes','changedSourceFiles']},ensure_ascii=True,indent=2))
