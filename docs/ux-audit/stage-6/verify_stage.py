"""Validate milestone evidence and source preservation; emit a reviewable checkpoint."""
import hashlib,json,re,zipfile
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
matrix=read('composition-matrix.json');stress=read('stress-layouts.json');routes=read('route-smoke.json')
journey=read('journey-results.json');edges=read('edge-results.json');assessment=read('assessment-results.json');timing=read('timing-guard-results.json')
components=read('component-results.json');contrast=read('contrast.json');copy=read('copy-coverage.json')
assert len(matrix)==300 and len({(r['case'],tuple(r['viewport']),r['theme'],r['language']) for r in matrix})==300
assert (len(stress),len(routes),len(journey),len(edges),len(assessment),len(timing),len(components),len(contrast),len(copy))==(42,69,48,15,40,11,39,40,143)
assert all(r['passed'] for r in matrix+stress+routes+journey+edges+assessment+timing+components+contrast+copy)
for row in matrix:assert (OUT/row['screenshot']).is_file(),row['screenshot']
flows=read('regressions/flow-results.json')+read('regressions/discovery-results.json')
assert {r['name'] for r in flows if r['status']=='fail'}=={'Editor draft survives reload'}
protected=['src/App.tsx','src/main.tsx','src/data/types.ts','src/data/questions.ts','src/data/tests.ts','src/data/admin.ts','src/data/topics.ts','src/lib/storage.ts','src/lib/grading.ts','src/lib/assessment.ts','src/components/exam/parts.tsx']
protected += ['src/pages/student/'+name+'.tsx' for name in ['Exam','Dashboard','Catalog','Lobby','GettingStarted','SignIn']]
methods=['saveSession','dropSession','beginSession','retrySession','finishSession','addAttempt','completeIntroduction','restartIntroduction']
with zipfile.ZipFile(OUT/'source-before.zip') as backup:
 for path in protected:assert backup.read(path)==(ROOT/path).read_bytes(),path
 before=backup.read('src/state/AppState.tsx').decode('utf-8').replace('\r\n','\n');after=(ROOT/'src/state/AppState.tsx').read_text(encoding='utf-8')
 for name in methods:
  pattern=rf'  const {name} = useCallback\([\s\S]*?\n  \}}, \[[^\]]*\]\);'
  old=re.search(pattern,before);new=re.search(pattern,after)
  assert old and new and old.group()==new.group(),name
 changed=[name for name in backup.namelist() if name.startswith('src/') and (ROOT/name).is_file() and backup.read(name)!=(ROOT/name).read_bytes()]
 added=[p.relative_to(ROOT).as_posix() for p in (ROOT/'src').rglob('*') if p.is_file() and p.relative_to(ROOT).as_posix() not in backup.namelist()]
assets=ROOT/'dist/assets';entry=assets/'index-DuxEf72T.js';css=assets/'index-BU5Lfmjr.css'
assert entry.is_file() and css.is_file(), 'Final successful build artifacts must match the recorded Vite output'
report={'stage':6,'completed':'2026-10-21','gate':'Complete; await user confirmation before stage 7','compositionRenders':len(matrix),'stressRenders':len(stress),'routeRenders':len(routes),'learningJourneyAssertions':len(journey)+len(edges),'retainedAssessmentAssertions':len(assessment)+len(timing),'sharedComponentAssertions':len(components),'contrastProbes':len(contrast),'minimumMeasuredTextContrast':min(r['ratio'] for r in contrast),'explicitCopyKeys':len(copy),'baselineCounts':dict(Counter(r['status'] for r in flows)),'knownBaselineFailures':['Editor draft survives reload — stage 7'],'protectedFiles':protected,'protectedStateMethods':methods,'changedSourceFiles':changed,'addedSourceFiles':added,'typecheck':'passed: npm run typecheck','productionBuild':'passed: npm run build (TypeScript and Vite)','buildGzipKB':{'entry':148.57,'css':16.30},'buildSizeSource':'Final Vite console output','buildHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [entry,css]},'sourceHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()},'limits':['Chromium only; VoiceOver/Safari and NVDA listening, native-language signoff and representative learner sessions remain outstanding','Root text at 200% and narrow viewports are reflow probes, not actual 400% browser-zoom certification','Preview records remain browser-local and shared on this browser; teacher grading and account sync are not connected','Retry responses are unrecorded in-memory practice; closing or switching retry clears only that practice response','Stage-5 blocked-write limitation remains: accepting reload/close can lose unsaved in-memory work','No simultaneous multi-tab editing guarantee','Teacher drafts remain stage 7; translation observer remains for unmigrated teacher screens until stage 8','No performance improvement or deployment claim; entry gzip grew 6.86 kB and CSS 1.05 kB from stage 5']}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceHashes','buildHashes']},ensure_ascii=True,indent=2))
