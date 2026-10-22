"""Fail closed on incomplete evidence or unintended source changes."""
import hashlib, json, zipfile
from collections import Counter
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
def read(name): return json.loads((OUT/name).read_text(encoding='utf-8'))
def sha(data): return hashlib.sha256(data).hexdigest()

expected = {'composition-matrix.json':360,'stress-layouts.json':54,'route-smoke.json':69,'authoring-checks.json':56,'component-results.json':39,'assessment-results.json':40,'timing-guard-results.json':11,'validation-layouts.json':36}
for name, count in expected.items():
    rows = read(name)
    assert len(rows) == count and all(r['passed'] for r in rows), name
for name in ['edge-checks.json','contrast.json','copy-coverage.json']:
    rows = read(name)
    assert rows and all(r['passed'] for r in rows), name
baseline = read('regressions/flow-results.json') + read('regressions/discovery-results.json')
counts = Counter(r['status'] for r in baseline)
assert counts == {'pass':28,'observed':10}, counts

previous = json.loads((OUT.parent/'stage-6/verification.json').read_text(encoding='utf-8'))
allowed = {'src/i18n/LanguageProvider.tsx','src/styles/app.css',*[f'src/pages/admin/{name}.tsx' for name in ['Overview','Bank','Editor','Import','Builder']]}
changed=[]; protected=[]
with zipfile.ZipFile(OUT/'source-before.zip') as archive:
    for name in archive.namelist():
        before=archive.read(name)
        assert sha(before)==previous['sourceHashes'][name], 'Intervening pre-stage change: '+name
        after=(ROOT/name).read_bytes()
        if before!=after:
            assert name in allowed, 'Unintended change: '+name
            changed.append(name)
        else: protected.append(name)
added=sorted(str(f.relative_to(ROOT)).replace('\\','/') for f in (ROOT/'src').rglob('*') if f.is_file() and str(f.relative_to(ROOT)).replace('\\','/') not in previous['sourceHashes'])
assert set(added)=={'src/lib/authoring.ts','src/components/authoring/Draft.tsx','src/i18n/authoringMessages.ts'}, added
report={
    'stage':7,'completed':'2026-10-21','gate':'Complete; wait for user confirmation before stage 8',
    'compositionRenders':360,'stressRenders':54,'validationStressRenders':36,'routeRenders':69,
    'authoringAssertions':len(read('authoring-checks.json'))+len(read('edge-checks.json')),
    'retainedAssessmentAssertions':51,'sharedComponentAssertions':39,
    'contrastProbes':len(read('contrast.json')),'minimumMeasuredTextContrast':min(r['ratio'] for r in read('contrast.json')),
    'explicitCopyKeys':len(read('copy-coverage.json')),'baselineCounts':dict(counts),'knownBaselineFailures':[],
    'changedSourceFiles':sorted(changed),'addedSourceFiles':added,'protectedFiles':sorted(protected),
    'typecheck':'passed','productionBuild':'passed',
    'buildGzipKB':{'entry':158.20,'teacherChunk':21.46,'css':17.34},
    'buildSizeSource':'Vite 5.4.21 production build console, 96 modules; no dependencies changed',
    'sourceHashes':{str(f.relative_to(ROOT)).replace('\\','/'):sha(f.read_bytes()) for f in sorted((ROOT/'src').rglob('*')) if f.is_file()},
    'buildHashes':{str(f.relative_to(ROOT)).replace('\\','/'):sha(f.read_bytes()) for f in sorted((ROOT/'dist').rglob('*')) if f.is_file()},
    'limits':[
        'Browser-local preview drafts; no backend publishing, Excel parsing, assignment or account synchronization',
        'Accepting unsaved reload/close can lose browser-memory changes; only successful writes can recover',
        'Conflict checks are conservative localStorage comparisons, not atomic multi-tab collaboration',
        'Malformed global draft JSON is preserved; external repair/removal is required if Retry cannot read it',
        'Chromium automation and screenshot review; native-language signoff and assistive-technology listening remain outstanding',
        'Narrow and 200% root-text probes are not 400% browser-zoom certification',
        'Stage-8 teacher review screens retain legacy localization until their authorized stage',
        'No deployment or performance improvement claim'
    ]
}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceHashes','buildHashes','protectedFiles']},ensure_ascii=True,indent=2))
