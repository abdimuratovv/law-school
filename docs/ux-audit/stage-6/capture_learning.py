"""Rendered learning-loop layouts, independent text enlargement, contrast and copy."""
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_fixture import make_fixture
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];BASE='http://127.0.0.1:5173';(OUT/'screenshots').mkdir(exist_ok=True)
sys.path.insert(0,str(OUT.parent/'stage-2'));from measure_reference import pixel_probe
refresh='--refresh-progress' in sys.argv
old={name:json.loads((OUT/name).read_text(encoding='utf-8')) for name in ['composition-matrix.json','stress-layouts.json','contrast.json']} if refresh else {}
matrix=[];stress=[];colors=[]
cases=[('result-pending','/results/mixed'),('result-final','/results/final'),('result-filter-empty','/results/final?filter=pending'),('review-choice','/results/mixed/q/2'),('review-written','/results/mixed/q/4'),('review-matching','/results/matching/q/1'),('saved-choice','/mistakes'),('saved-written','/mistakes'),('progress','/progress'),('profile','/profile')]
if refresh:cases=[row for row in cases if row[0]=='progress']
measure="""()=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const scope=document.querySelector('dialog[open]')??document.querySelector('main');const controls=[...scope.querySelectorAll('button,a[href],textarea,input,select')].filter(visible);const rect=document.querySelector('dialog[open]')?.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,main:document.querySelectorAll('main').length,h1:document.querySelectorAll('main h1').length,small:controls.map(e=>({name:(e.getAttribute('aria-label')||e.textContent).slice(0,70),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(e=>e.width<43.9||e.height<43.9),clipped:controls.filter(e=>e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),reviewInFlow:!document.querySelector('.learning-review-nav')||getComputedStyle(document.querySelector('.learning-review-nav')).position==='static',tableScroll:!!document.querySelector('.learning-table-scroll')&&document.querySelector('.learning-table-scroll').scrollWidth>document.querySelector('.learning-table-scroll').clientWidth,dialog:rect?{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight}:null}}"""
def inspect(page,name,config,target):
 row={'case':name,**config,**page.evaluate(measure)};d=row['dialog'];row['passed']=not row['overflow'] and not row['small'] and not row['clipped'] and row['main']==1 and row['h1']==1 and row['reviewInFlow'] and (not d or d['left']>=0 and d['right']<=d['width']+1 and d['top']>=0 and d['bottom']<=d['height']+1);target.append(row);return row
def prepare(page,name,path):
 page.goto(BASE+path);page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
 if name.startswith('saved-'):page.locator('[id^="retry-"]').nth(0 if name=='saved-choice' else 1).click()
 page.evaluate('window.scrollTo(0,0)')
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);boot=b.new_page();boot.goto(BASE+'/sign-in');boot.wait_for_load_state('networkidle');fixture=make_fixture(boot)
 matching=boot.evaluate("""async()=>{const {QUESTIONS}=await import('/src/data/questions.ts');const q=QUESTIONS.find(q=>q.kind==='single'&&q.terms);return {id:'matching',testId:'archived-match',mode:'mock',submittedAt:Date.now(),durationSec:100,answers:{[q.id]:'A'},flags:{}}}""");boot.close()
 values={'hm.user':json.dumps({'phone':'901234567'}),'hm.sessions':json.dumps({'practice-1':fixture['session']}),'hm.attempts':json.dumps(fixture['attempts']+[matching]),'hm.mistakes':json.dumps([fixture['qs'][1]['id'],fixture['qs'][3]['id'],'missing-saved'])}
 def context(width,height,theme,lang):
  c=b.new_context(viewport={'width':width,'height':height},color_scheme=theme,timezone_id='Asia/Tashkent');seed={**values,'hm.theme':json.dumps(theme),'hm.language':lang};c.add_init_script('for(const[k,v]of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v);window.MutationObserver=class{observe(){}disconnect(){}}');return c
 for width,height in [(1440,900),(1366,768),(1024,768),(390,844),(320,568)]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=context(width,height,theme,lang);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for name,path in cases:
     prepare(page,name,path);row=inspect(page,name,{'viewport':[width,height],'theme':theme,'language':lang},matrix);row['errors']=list(errors);row['passed']=row['passed'] and not errors;errors.clear();filename=f'{name}-{width}-{theme}-{lang}.png';row['screenshot']='screenshots/'+filename;page.screenshot(path=str(OUT/'screenshots'/filename),full_page=True,animations='disabled')
     if width==1366 and lang=='ru':
      selectors={ 'result-pending':[('h1','preliminary heading'),('.learning-score figcaption strong','score status'),('.learning-counts dt','breakdown label'),('.learning-note','pending notice'),('.learning-card>.btn','review action')], 'result-final':[('h1','final heading'),('.learning-question-link','question row')], 'review-choice':[('.opt.wrong .txt','learner answer'),('.opt.right .txt','expected answer'),('.learning-review .body','prompt')], 'review-written':[('.learning-answer-text','written answer'),('.learning-models','model answer')], 'progress':[('.learning-table th','table heading'),('.learning-stats dt','statistic label'),('.learning-y','axis labels'),('.learning-table .tag','grading status')], 'profile':[('.learning-profile .fn','local scope'),('.learning-setting .hl','preference label')], 'saved-choice':[('.learning-retry .btn','retry action')], 'saved-written':[('.learning-retry .fn','retry limits')] }.get(name,[])
      for selector,label in selectors:colors.append({'theme':theme,'case':name,**pixel_probe(page,selector,label)})
    c.close()
   print('Learning layouts',width,theme,flush=True)
  if not refresh:(OUT/'composition-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2),encoding='utf-8')
 for width,height,scale in [(320,568,200),(1024,480,100)]:
  for lang in ['uz','kaa','ru']:
   c=context(width,height,'light',lang);page=c.new_page()
   for name,path in [row for row in cases if row[0] in ['result-pending','review-written','review-matching','saved-written','progress','profile']]:
    prepare(page,name,path);page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale);row=inspect(page,name,{'viewport':[width,height],'scale':scale,'language':lang},stress);page.screenshot(path=str(OUT/'screenshots'/f'stress-{name}-{width}-{scale}-{lang}.png'),full_page=True,animations='disabled')
   if not refresh:
    page.locator('#profile-signout').click();row=inspect(page,'signout-dialog',{'viewport':[width,height],'scale':scale,'language':lang},stress);page.screenshot(path=str(OUT/'screenshots'/f'stress-signout-{width}-{scale}-{lang}.png'),animations='disabled')
   c.close()
 page=b.new_page();page.goto(BASE+'/sign-in');page.wait_for_load_state('networkidle')
 keys=set()
 for file in ['src/pages/student/Results.tsx','src/pages/student/Review.tsx','src/pages/student/Extras.tsx','src/pages/student/Progress.tsx','src/components/exam/LearningParts.tsx']:
  keys.update(re.findall(r"\bt\('([^']+)'",(ROOT/file).read_text(encoding='utf-8')))
 keys.update(['Test','Submitted on','Mode','Score','Grading status','Action','Correct','Incorrect','Not answered','Awaiting grading','Practice','Mock exam','Auto','Light','Dark'])
 coverage=page.evaluate("""async keys=>{const modules=await Promise.all(['learningMessages','assessmentMessages','discoveryMessages','shellMessages','designMessages','uxCopy','messages'].map(n=>import('/src/i18n/'+n+'.ts')));const tables=modules.map(m=>Object.values(m).find(v=>v&&typeof v==='object'));return [...new Set([...keys,...Object.keys(modules[0].learningCopy)])].map(key=>{const row=tables.map(t=>t[key]).find(Boolean);return {key,passed:['uz','kaa','ru'].every(l=>!!row?.[l])}})}""",sorted(keys));b.close()
if refresh:
 matrix=[row for row in old['composition-matrix.json'] if row['case']!='progress']+matrix
 stress=[row for row in old['stress-layouts.json'] if row['case']!='progress']+stress
 colors=[row for row in old['contrast.json'] if row.get('case')!='progress']+colors
for filename,data in [('composition-matrix.json',matrix),('stress-layouts.json',stress),('contrast.json',colors),('copy-coverage.json',coverage)]: (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
failures=[r for r in matrix+stress+colors+coverage if not r['passed']];print('Failures',json.dumps(failures,ensure_ascii=True),flush=True);assert not failures
