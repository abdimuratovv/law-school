"""Real rendered teacher pages: five viewports, two themes, three languages."""
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];BASE='http://127.0.0.1:5173';(OUT/'screenshots').mkdir(exist_ok=True)
sys.path.insert(0,str(OUT.parent/'stage-2'));from measure_reference import pixel_probe
measure="""()=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const scope=document.querySelector('dialog[open]')??document.querySelector('main');const controls=[...scope.querySelectorAll('button,a[href],textarea,input,select,summary')].filter(e=>visible(e)&&!e.matches('input[type=radio],input[type=checkbox]'));const rect=document.querySelector('dialog[open]')?.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,main:document.querySelectorAll('main').length,h1:document.querySelectorAll('main h1').length,small:controls.map(e=>({name:(e.getAttribute('aria-label')||e.textContent).slice(0,60),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(e=>e.width<43.9||e.height<43.9),clipped:controls.filter(e=>e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),dialog:rect?{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight}:null}}"""
cases=[('overview','/admin'),('bank','/admin/bank'),('editor-new','/admin/editor'),('editor-matching','/admin/editor/Q-0412'),('builder-1','/admin/builder'),('builder-2','/admin/builder'),('builder-3','/admin/builder'),('builder-4','/admin/builder'),('import-1','/admin/import'),('import-2','/admin/import'),('import-3','/admin/import'),('discard-dialog','/admin/editor/Q-0412')]
refresh='--refresh-dialog' in sys.argv
old={n:json.loads((OUT/n).read_text(encoding='utf-8')) for n in ['composition-matrix.json','stress-layouts.json','contrast.json']} if refresh else {}
if refresh:cases=[row for row in cases if row[0]=='discard-dialog']
matrix=[];stress=[];colors=[]
def goto(page,url):
 for attempt in range(2):
  try:
   page.goto(url,wait_until='domcontentloaded',timeout=60000);page.wait_for_load_state('networkidle',timeout=60000);return
  except Exception:
   if attempt:raise
def inspect(page,name,config,target):
 row={'case':name,**config,**page.evaluate(measure)};d=row['dialog'];row['passed']=not row['overflow'] and not row['small'] and not row['clipped'] and row['main']==1 and row['h1']==1 and (not d or d['left']>=0 and d['right']<=d['width']+1 and d['top']>=0 and d['bottom']<=d['height']+1);target.append(row);return row
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 def context(w,h,theme,lang):
  c=b.new_context(viewport={'width':w,'height':h},color_scheme=theme,timezone_id='Asia/Tashkent');c.add_init_script('localStorage.setItem("hm.language",'+json.dumps(lang)+');localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');window.MutationObserver=class{observe(){}disconnect(){}}');return c
 def prepare(page,name,path):
  page.evaluate("localStorage.removeItem('hm.authoringDrafts.v1')")
  if name.startswith('builder-') and name!='builder-1':
   payload={'step':int(name[-1]),'name':'Teacher draft · sample','mode':'mock','minutes':60,'method':'auto','picked':[],'single':2,'written':1,'groups':['11-A'],'from':'2026-10-21T09:00','until':'2026-10-28T18:00','shuffleQ':True,'shuffleO':False,'showKey':True}
   record={'kind':'builder','sourceVersion':'sample-pickable-v1','updatedAt':1792544400000,'revision':'layout','payload':payload};page.evaluate("r=>localStorage.setItem('hm.authoringDrafts.v1',JSON.stringify({version:1,drafts:{'builder:current':r}}))",record)
  if name.startswith('import-') and name!='import-1':
   payload={'step':int(name[-1]),'filename':'teacher-sample.xlsx','bytes':2048,'source':'file','mapped':True,'duplicate':'skip'};record={'kind':'import','sourceVersion':'import-fixture-v1','updatedAt':1792544400000,'revision':'layout','payload':payload};page.evaluate("r=>localStorage.setItem('hm.authoringDrafts.v1',JSON.stringify({version:1,drafts:{'import:current':r}}))",record)
  goto(page,BASE+path);page.evaluate('document.fonts.ready')
  if name.startswith(('builder-','import-')) and name not in ['builder-1','import-1']:page.locator('.authoring-save button').first.click()
  if name=='editor-matching':page.locator('.authoring-form>.authoring-actions .btn').click()
  if name=='discard-dialog':page.locator('.authoring-save button').last.click()
  page.evaluate('window.scrollTo(0,0)')
 for w,h in [(1440,900),(1366,768),(1024,768),(390,844),(320,568)]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=context(w,h,theme,lang);page=c.new_page();page.on('dialog',lambda d:d.accept());goto(page,BASE+'/admin');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for name,path in cases:
     prepare(page,name,path);row=inspect(page,name,{'viewport':[w,h],'theme':theme,'language':lang},matrix);row['errors']=list(errors);row['passed']=row['passed'] and not errors;errors.clear();filename=f'{name}-{w}-{theme}-{lang}.png';row['screenshot']='screenshots/'+filename;page.screenshot(path=str(OUT/'screenshots'/filename),full_page=name!='discard-dialog',animations='disabled')
     if w==1366 and lang=='ru':
      selectors={'overview':[('h1','page title'),('.authoring-card>p','sample explanation')],'editor-new':[('.authoring-save p','draft scope'),('.authoring-save .btn','draft action'),('label[for=md]','field label')],'editor-matching':[('.authoring-preview .body','question'),('.authoring-preview .opt.right .txt','answer key')],'builder-4':[('.authoring-review dt','review label'),('.authoring-review dd','review value')],'import-2':[('.authoring-disclosure','import disclosure'),('.authoring-import-rows h3','row status')],'discard-dialog':[('.authoring-confirm h2','dialog heading'),('#authoring-safe','safe choice')]}.get(name,[])
      for selector,label in selectors:colors.append({'theme':theme,'case':name,**pixel_probe(page,selector,label)})
    c.close();print('Captured',w,theme,lang,flush=True)
   print('Authoring layouts',w,theme,flush=True)
   if not refresh:(OUT/'composition-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2),encoding='utf-8')
 for w,h,scale in [(320,568,200),(1024,480,100)]:
  for lang in ['uz','kaa','ru']:
   c=context(w,h,'light',lang);page=c.new_page();page.on('dialog',lambda d:d.accept());goto(page,BASE+'/admin')
   for name,path in cases:
    if name in ['builder-1','builder-2','import-1']:continue
    prepare(page,name,path);page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale);row=inspect(page,name,{'viewport':[w,h],'scale':scale,'language':lang},stress);page.screenshot(path=str(OUT/'screenshots'/f'stress-{name}-{w}-{scale}-{lang}.png'),full_page=name!='discard-dialog',animations='disabled')
   c.close()
 keys=set()
 for f in ['Overview','Bank','Editor','Import','Builder']:
  for x in re.findall(r"'([^'\n]+)'",(ROOT/f'src/pages/admin/{f}.tsx').read_text(encoding='utf-8')):
   if re.match(r'[A-Z][a-z]|\{count\}',x):keys.add(x)
 for x in re.findall(r"'([^'\n]+)'",(ROOT/'src/components/authoring/Draft.tsx').read_text(encoding='utf-8')):
  if re.match(r'[A-Z][a-z]',x):keys.add(x)
 page=b.new_page();goto(page,BASE+'/admin')
 coverage=page.evaluate("""async keys=>{const m=await Promise.all(['authoringMessages','learningMessages','assessmentMessages','discoveryMessages','shellMessages','designMessages','uxCopy','messages'].map(n=>import('/src/i18n/'+n+'.ts')));const tables=m.map(m=>Object.values(m).find(v=>v&&typeof v==='object'));return [...new Set([...keys,...Object.keys(m[0].authoringCopy)])].map(key=>{const row=tables.map(t=>t[key]).find(Boolean);return {key,passed:['uz','kaa','ru'].every(l=>!!row?.[l])}})}""",sorted(keys));b.close()
if refresh:
 matrix=[r for r in old['composition-matrix.json'] if r['case']!='discard-dialog']+matrix
 stress=[r for r in old['stress-layouts.json'] if r['case']!='discard-dialog']+stress
 colors=[r for r in old['contrast.json'] if r['case']!='discard-dialog']+colors
for filename,data in [('composition-matrix.json',matrix),('stress-layouts.json',stress),('contrast.json',colors),('copy-coverage.json',coverage)]: (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
failures=[r for r in matrix+stress+colors+coverage if not r['passed']];print('Failures',json.dumps(failures,ensure_ascii=True),flush=True);assert not failures
