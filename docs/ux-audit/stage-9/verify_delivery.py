"""Require complete passing technical evidence; keep human release gates pending."""
import json,hashlib,zipfile,re,platform,os
from collections import Counter
from pathlib import Path
from datetime import datetime
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(n):return json.loads((OUT/n).read_text(encoding='utf-8'))
def sha(data):return hashlib.sha256(data).hexdigest()
expected={'review-checks.json':48,'review-edge-checks.json':14,'authoring-checks.json':56,'edge-checks.json':19,'assessment-results.json':40,'timing-guard-results.json':11,'component-results.json':39,'journey-results.json':48,'edge-results.json':15,'localized-routes.json':207,'live-language-checks.json':13,'copy-coverage.json':680,'production-routes.json':414,'axe-results.json':138,'production-reflow.json':207,'target-audit.json':92,'teacher-scroll-checks.json':36,'static-answer-checks.json':24,'keyboard-checks.json':23,'primary-link-checks.json':60,'contrast-measurements.json':72,'supplemental-contrast.json':12,'scrolled-glass-contrast.json':16,'dialog-measurements.json':4,'production-assessment/assessment-results.json':40,'production-assessment/timing-guard-results.json':11}
for n,count in expected.items():
 rows=read(n);assert len(rows)==count and all(r['passed'] for r in rows),n
reference=read('reference-matrix.json');assert len(reference)==72 and not any(r['overflow'] or r['smallTargets'] or r['errors'] or any(h<48 for h in r['examActionHeights']) for r in reference)
assert all(r['mediaSupported'] and r['backdrop']=='none' for r in read('transparency-media.json'))
media=read('media-checks.json');assert not any(r.get('overflow') or r.get('smallTargets') for r in media);assert next(r for r in media if r['name']=='Reduced motion')['spinnerAnimation']=='none';assert next(r for r in media if r['name']=='Forced colors')['active']
assert len(read('keyboard-focus.json'))==14 and all(r['visible'] and r['unobscured'] and r['outline']=='solid' and r['outlineWidth']=='3px' for r in read('keyboard-focus.json'))
audit=read('source-copy-audit.json');assert not audit['violations'] and audit['mutationRemoved'] and audit['fuzzyFallbackRemoved']
baseline=read('regressions/flow-results.json')+read('regressions/discovery-results.json');counts=Counter(r['status'] for r in baseline);assert counts=={'pass':28,'observed':10}
previous=json.loads((OUT.parent/'stage-8/verification.json').read_text(encoding='utf-8'));changed=[]
with zipfile.ZipFile(OUT/'source-before.zip') as z:
 for n in ['package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json']:assert z.read(n)==(ROOT/n).read_bytes(),'Unreviewed build configuration change: '+n
 for n,h in previous['sourceHashes'].items():
  assert sha(z.read(n))==h,'Checkpoint mismatch: '+n
  if sha((ROOT/n).read_bytes())!=h:changed.append(n)
assert set(changed)=={'src/components/exam/parts.tsx','src/styles/app.css'},changed
sourceHashes={f.relative_to(ROOT).as_posix():sha(f.read_bytes()) for f in sorted((ROOT/'src').rglob('*')) if f.is_file()}
assert set(sourceHashes)==set(previous['sourceHashes']),'Unreviewed source addition/removal'
assert all(sourceHashes[n]==previous['sourceHashes'][n] for n in sourceHashes if n not in changed)
html=(ROOT/'dist/index.html').read_text(encoding='utf-8')
for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"',html):assert (ROOT/'dist'/asset.lstrip('/')).is_file(),asset
probes=sum([read(n) for n in ['contrast-measurements.json','supplemental-contrast.json','scrolled-glass-contrast.json','primary-link-checks.json']],[])
assert len(probes)==160 and all(r['passed'] for r in probes)
assert all(r['scrollTop']>0 for r in read('scrolled-glass-contrast.json'))
perf=read('performance-summary.json');samples=read('performance-samples.json');assert len(samples)==36 and len(perf['summary'])==6 and all(r['runs']==6 for r in perf['summary'])
assert all(r['fcp'] is not None and r['fcp']>0 and r['lcp']>0 for r in samples),'Invalid or missing paint observations'
assert all(r['scroll']['applicable'] and len(r['scroll']['deltas'])==60 for r in samples),'Missing matched scroll samples'
assert all(r.get('allAnswersSaved',True) for r in perf['summary'])
incomplete=Counter(v['id'] for r in read('axe-results.json') for v in r['incomplete']);assert set(incomplete)<= {'color-contrast'},dict(incomplete)
evidenceHashes={}
for directory,dirs,files in os.walk(OUT):
 dirs[:]=[d for d in dirs if d not in ['baseline-workspace','screenshots','__pycache__']]
 for name in files:
  f=Path(directory)/name
  if f.suffix=='.json' and name not in ['verification.json','release-manifest.json']:evidenceHashes[f.relative_to(OUT).as_posix()]=sha(f.read_bytes())
report={'stage':9,'verifiedAt':datetime.now().astimezone().isoformat(),'status':'Technical validation and release preparation complete; human acceptance and public release approval pending','typecheck':'passed','productionBuild':'passed','checks':expected,'sharedReferenceConfigurations':72,'contrastProbes':160,'minimumMeasuredTextContrast':min(r['ratio'] for r in probes if r['threshold']==4.5),'minimumMeasuredNonTextContrast':min(r['ratio'] for r in probes if r['threshold']==3),'targetAppearances':sum(r['targets'] for r in read('target-audit.json')),'axeIncompleteAuditsByRule':dict(incomplete),'baselineCounts':dict(counts),'fixedFindings':['S9-A01 static answer label semantics','S9-A02 teacher content scroll reachability'],'changedSourceFiles':sorted(changed),'sourceHashes':sourceHashes,'buildHashes':{f.relative_to(ROOT).as_posix():sha(f.read_bytes()) for f in sorted((ROOT/'dist').rglob('*')) if f.is_file()},'evidenceHashes':evidenceHashes,'performance':perf,'humanGates':{'nativeLanguageReview':'not run','NVDAWindowsListening':'not run','VoiceOverSafariApple':'not run','actualBrowserZoom':'not run','representativeLearners':'0 of minimum 5','representativeTeachers':'0 of planned 2'},'deployment':'not performed','applicationDependencies':'unchanged; axe-core is an isolated pinned audit tool, not an application dependency','python':platform.python_version()}
report['status']='Automated validation and release preparation delivered; full Stage 9 acceptance pending loading-performance finding S9-P01 and human reviews'
report['performanceAcceptance']='Pending: unresolved loading regression S9-P01; no blur-specific cause established'
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k not in ['sourceHashes','buildHashes','evidenceHashes','performance']},ensure_ascii=True,indent=2))
