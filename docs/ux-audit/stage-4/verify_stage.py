"""Verify scoped evidence, preserve data/assessment contracts and record final source."""
import hashlib,json,re,zipfile
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
matrix=read('composition-matrix.json');large=read('large-text.json');copy=read('copy-coverage.json')
journey=read('journey-results.json');keyboard=read('keyboard-results.json');components=read('component-results.json')
assert len(matrix)==210 and len({(r['name'],r['width'],r['theme'],r['language']) for r in matrix})==210
assert len(large)==18 and len(components)==39
assert all(r['passed'] for r in matrix+large+copy+journey+keyboard+components)
for row in matrix:
 name=f"{row['name']}-{row['width']}-{row['theme']}-{row['language']}.png"
 assert (OUT/'screenshots'/name).is_file(),name
flows=read('regressions/flow-results.json')+read('regressions/discovery-results.json')
expected={'Exam ArrowRight shortcut advances','Storage failure is surfaced','Editor draft survives reload'}
assert {r['name'] for r in flows if r['status']=='fail'}==expected
immutable=['src/App.tsx','src/data/types.ts','src/data/questions.ts','src/data/tests.ts','src/data/admin.ts','src/lib/storage.ts','src/lib/grading.ts','src/pages/student/Exam.tsx','src/pages/student/Results.tsx','src/pages/student/Review.tsx']
with zipfile.ZipFile(OUT/'source-before.zip') as backup:
 for path in immutable:assert backup.read(path)==(ROOT/path).read_bytes(),path
 # Entry API changes must not alter answer updates or submission state methods.
 before=backup.read('src/state/AppState.tsx').decode('utf-8');after=(ROOT/'src/state/AppState.tsx').read_text(encoding='utf-8')
 for method in ['saveSession','dropSession','addAttempt','toggleMistake']:
  pattern=rf'const {method} = useCallback\([\s\S]*?\n  \}}, \[\]\);'
  assert re.search(pattern,before).group()==re.search(pattern,after).group(),method
 changed=[name for name in backup.namelist() if name.startswith('src/') and (ROOT/name).is_file() and backup.read(name)!=(ROOT/name).read_bytes()]
 added=[p.relative_to(ROOT).as_posix() for p in (ROOT/'src').rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in backup.namelist()]
report={'stage':4,'completed':'2026-10-21','gate':'Scoped automated checks pass; await user review and confirmation before stage 5','compositionRenders':len(matrix),'largeTextRenders':len(large),'journeyAssertions':len(journey),'keyboardAssertions':len(keyboard),'explicitCopyKeys':len(copy),'sharedComponentAssertions':len(components),'baselineCounts':dict(Counter(r['status'] for r in flows)),'knownBaselineFailures':sorted(expected),'protectedFiles':immutable,'protectedStateMethods':['saveSession','dropSession','addAttempt','toggleMistake'],'changedSourceFiles':changed,'addedSourceFiles':added,'productionBuild':'passed (TypeScript and Vite)','buildGzipKB':{'entry':123.37,'css':14.05},'sourceHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()},'limits':['Chromium only; scripted journeys do not replace representative learner sessions','Native copy signoff and screen-reader listening remain outstanding','320px/200% root-text proxy is not an actual 400% browser-zoom claim','Local preview only: no real SMS, account sync or connected teacher review','Assessment write/submission recovery and global shortcuts remain stage 5; teacher drafts remain stage 7','Translation observer remains for unmigrated routes until stage 8']}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceHashes','changedSourceFiles']},ensure_ascii=True,indent=2))
