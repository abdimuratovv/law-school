"""Require complete passing evidence and protect the stage-7 checkpoint."""
import hashlib,json,zipfile
from collections import Counter
from pathlib import Path
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
def read(name):return json.loads((OUT/name).read_text(encoding='utf-8'))
def sha(data):return hashlib.sha256(data).hexdigest()
expected={'review-checks.json':48,'review-edge-checks.json':14,'composition-matrix.json':300,'stress-layouts.json':60,'localized-routes.json':207,'live-language-checks.json':13,'authoring-checks.json':56,'edge-checks.json':19,'assessment-results.json':40,'timing-guard-results.json':11,'component-results.json':39,'journey-results.json':48,'edge-results.json':15,'primary-link-checks.json':60}
for name,count in expected.items():
 rows=read(name);assert len(rows)==count and all(r['passed'] for r in rows),name
for name in ['contrast.json','copy-coverage.json']:
 rows=read(name);assert rows and all(r['passed'] for r in rows),name
audit=read('source-copy-audit.json');assert not audit['violations'] and audit['mutationRemoved'] and audit['fuzzyFallbackRemoved']
baseline=read('regressions/flow-results.json')+read('regressions/discovery-results.json');counts=Counter(r['status'] for r in baseline);assert counts=={'pass':28,'observed':10},counts
previous=json.loads((OUT.parent/'stage-7/verification.json').read_text(encoding='utf-8'))
allowed={'src/i18n/LanguageProvider.tsx','src/i18n/messages.ts','src/styles/app.css','src/components/layout/AdminShell.tsx','src/components/ui/data.tsx',*[f'src/pages/admin/{n}.tsx' for n in ['Overview','Grading','Students','Analytics']]}
changed=[];protected=[]
with zipfile.ZipFile(OUT/'source-before.zip') as archive:
 for name in archive.namelist():
  before=archive.read(name);assert sha(before)==previous['sourceHashes'][name],name
  if before!=(ROOT/name).read_bytes():assert name in allowed,'Unintended change: '+name;changed.append(name)
  else:protected.append(name)
added=sorted(str(f.relative_to(ROOT)).replace('\\','/') for f in (ROOT/'src').rglob('*') if f.is_file() and str(f.relative_to(ROOT)).replace('\\','/') not in previous['sourceHashes'])
assert set(added)=={'src/i18n/reviewMessages.ts','src/state/TeacherReview.tsx'},added
report={
 'stage':8,'completed':'2026-10-21','gate':'Technical implementation complete; wait for user confirmation before stage 9. Human language/AT signoff remains outstanding.',
 'teacherReviewAssertions':62,'retainedAuthoringAssertions':75,'retainedAssessmentAssertions':51,'retainedLearningAssertions':63,'sharedComponentAssertions':39,
 'compositionRenders':300,'stressRenders':60,'localizedRouteRenders':207,'liveLanguageAssertions':13,
 'explicitLiteralKeys':len(audit['keys']),'checkedCopyKeys':len(read('copy-coverage.json')),'domTranslationRemoved':True,'wordFallbackRemoved':True,
 'primaryLinkLayoutRenders':60,'contrastProbes':len(read('contrast.json'))+len(read('primary-link-checks.json')),'minimumMeasuredTextContrast':min(r['ratio'] for r in read('contrast.json')+read('primary-link-checks.json')),
 'baselineCounts':dict(counts),'knownBaselineFailures':[],
 'typecheck':'passed','productionBuild':'passed','buildGzipKB':{'entry':165.34,'teacherChunk':21.34,'css':18.04},
 'buildSizeSource':'Final Vite 5.4.21 production console, 98 modules; dependencies unchanged',
 'changedSourceFiles':sorted(changed),'addedSourceFiles':added,'protectedFiles':sorted(protected),
 'sourceHashes':{str(f.relative_to(ROOT)).replace('\\','/'):sha(f.read_bytes()) for f in sorted((ROOT/'src').rglob('*')) if f.is_file()},
 'buildHashes':{str(f.relative_to(ROOT)).replace('\\','/'):sha(f.read_bytes()) for f in sorted((ROOT/'dist').rglob('*')) if f.is_file()},
 'limits':[
  'Sample grades/notes persist in memory across teacher navigation only; leaving the teacher workspace or reloading resets them',
  'Sample analytics and student histories are not connected to real learner attempts; no regrade, messaging or assignment effect',
  'No native-language reviewers participated; automated explicit coverage is not copy signoff',
  'Chrome automation/screenshot review only; VoiceOver/Safari, NVDA listening and representative user sessions remain release checks',
  'Root-text enlargement and narrow layouts are not 400% browser-zoom certification',
  'No performance improvement or deployment claim; entry gzip grew 7.14 kB and CSS 0.70 kB from stage 7'
 ]
}
(OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['sourceHashes','buildHashes','protectedFiles']},ensure_ascii=True,indent=2))
