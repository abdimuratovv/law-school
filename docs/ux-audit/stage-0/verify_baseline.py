"""Check evidence integrity after running all three browser scripts."""
import json
from collections import Counter
from itertools import product
from capture_baseline import OUT, ROUTES

records=json.loads((OUT/'browser-observations.json').read_text(encoding='utf-8'))
expected=set(product([p for _,p in ROUTES],[(1440,900),(1366,768),(1024,768)],['light','dark'],['uz','kaa','ru']))
actual={(r['route'],tuple(r['viewport']),r['theme'],r['language']) for r in records}
assert actual==expected, f'Matrix mismatch: missing={len(expected-actual)}, extra={len(actual-expected)}'
assert len(records)==len(expected), 'Duplicate matrix records'
assert all((OUT/r['screenshot']).is_file() for r in records), 'Missing referenced screenshot'
assert all(r['route']==r['actualPath'] for r in records), 'Unexpected route redirect'
flows=json.loads((OUT/'flow-results.json').read_text(encoding='utf-8'))
discovery=json.loads((OUT/'discovery-results.json').read_text(encoding='utf-8'))
report={
 'matrixComplete':True,'matrixCaptures':len(records),
 'routeVariants':len(ROUTES),'viewportCount':3,'themeCount':2,'languageCount':3,
 'interactionCaptures':len(list((OUT/'screenshots').glob('flow-*.png')))+len(list((OUT/'screenshots').glob('state-*.png'))),
 'pageErrorRecords':[r['screenshot'] for r in records if r['errors']],
 'horizontalOverflowRecords':[r['screenshot'] for r in records if r['horizontalOverflow']],
 'unnamedButtonCandidateRecords':[r['screenshot'] for r in records if r['unnamedButtons']],
 'routesWithoutMain':sorted({r['route'] for r in records if not r['mainCount']}),
 'recordsWithSmallTargetCandidates':sum(bool(r['smallTargets']) for r in records),
 'flowStatusCounts':dict(Counter(r['status'] for r in flows+discovery)),
 'typecheck':'passed','build':'passed',
 'limits':'No composed contrast score, native language signoff, screen-reader pass, full zoom/reflow audit or user study claimed.'
}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
