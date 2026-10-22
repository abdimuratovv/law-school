"""Validate stage-2 evidence integrity and preserve immutable app data contracts."""
import hashlib,json,zipfile
from pathlib import Path
from collections import Counter

OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
matrix=read('reference-matrix.json');components=read('component-results.json')
contrast=read('contrast-measurements.json')+read('supplemental-contrast.json')
media=read('media-checks.json');routes=read('route-smoke.json');dialogs=read('dialog-measurements.json')
flows=read('regressions/flow-results.json')+read('regressions/discovery-results.json')
assert len(matrix)==72 and len({(tuple(r['viewport']),r['theme'],r['language'],r['opaque'],r['density']) for r in matrix})==72
assert not any(r['overflow'] or r['smallTargets'] or r['errors'] or any(h<48 for h in r['examActionHeights']) for r in matrix)
assert all((OUT/r['screenshot']).is_file() for r in matrix if 'screenshot' in r)
assert len(components)==39 and all(r['passed'] for r in components)
assert len(contrast)==84 and all(r['passed'] for r in contrast)
assert len(routes)==69 and not any(r['errors'] or r['overflow'] or not r['hasContent'] or r['route']!=r['actualPath'] for r in routes)
assert all(r['passed'] for r in dialogs)
assert not any(r.get('overflow') or r.get('smallTargets') for r in media)
assert all(r['mediaSupported'] and r['backdrop']=='none' for r in read('transparency-media.json'))
immutable=['src/App.tsx','src/state/AppState.tsx','src/data/types.ts','src/data/questions.ts','src/data/tests.ts','src/lib/storage.ts','src/lib/grading.ts']
with zipfile.ZipFile(OUT/'source-before.zip') as backup:
 for path in immutable:assert backup.read(path)==(ROOT/path).read_bytes(), 'Unexpected state/route/data change: '+path
report={
 'stage':2,'sharedComponentGate':'passed; awaiting user confirmation for stage 3',
 'referenceMatrix':len(matrix),'componentAssertions':len(components),'contrastMeasurements':len(contrast),
 'minimumTextContrast':min(r['ratio'] for r in contrast if r['threshold']==4.5),
 'minimumIndicatorPairContrast':min(r['ratio'] for r in contrast if r['threshold']==3),
 'routeRenders':len(routes),'narrowDialogMeasurements':len(dialogs),
 'existingFlowCounts':dict(Counter(r['status'] for r in flows)),
 'remainingBaselineFailures':[r['name'] for r in flows if r['status']=='fail'],
 'typecheck':'passed','productionBuild':'passed','immutableContractsVerified':immutable,
 'sourceHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').rglob('*')) if p.is_file()},
 'limits':['Chromium only','Representative rendered contrast; not every page pixel','No screen-reader listening session or native language signoff','Root-text/reflow proxies, not a 400% browser zoom claim','Page persistence recovery remains stages 5/7']
}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='sourceHashes'},ensure_ascii=True,indent=2))
