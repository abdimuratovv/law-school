"""Assessment compositions, no-occlusion/target bounds, localized copy and contrast."""
import json,re,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];BASE='http://127.0.0.1:5173'
(OUT/'screenshots').mkdir(exist_ok=True)
sys.path.insert(0,str(OUT.parent/'stage-2'));from measure_reference import pixel_probe
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
matrix=[];extra=[];colors=[]
cases=[('practice','practice-1',0),('checked','practice-1',0),('written','practice-1',3),('matching','mock-7',11),('timed','mock-7',0),('map','mock-7',0),('submit','mock-7',0)]
def seed(page,testId,current,case,seconds=None):
 now=int(time.time()*1000);sessions=json.loads(json.dumps(fixture['sessions']))
 for key,session in sessions.items():
  session['startedAt']=now;session['endsAt']=now+(seconds or 9000)*1000 if session['mode']=='mock' else None
  session['current']=current if key==testId else 0
 if case=='checked':sessions[testId].update(answers={'Q-0051':'B'},checked={'Q-0051':True},flags={'Q-0051':True})
 if case=='written':sessions[testId]['answers']={'Q-0418':'Á ǵ ó ú ı ń — Qaraqalpaqsha'}
 page.evaluate('s=>{localStorage.setItem("hm.sessions",JSON.stringify(s));localStorage.setItem("hm.attempts","[]")}',sessions)
 page.goto(BASE+'/exam/'+testId);page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
 if case=='map':page.locator('.assessment-actions button').nth(1).click()
 if case=='submit':page.locator('.ux-finish').click()
 page.evaluate('window.scrollTo(0,0)')
measure='''()=>{
 const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 const dialog=document.querySelector('dialog[open]');const scope=dialog??document.querySelector('.assessment-frame');
 const controls=[...scope.querySelectorAll('button,a[href],input,textarea,select')].filter(visible);
 const actions=document.querySelector('.assessment-actions'),article=document.querySelector('.assessment-question');
 const progress=document.querySelector('.assessment-progress .prog').getBoundingClientRect();
 const rect=dialog?.getBoundingClientRect();
 return {overflow:document.documentElement.scrollWidth>innerWidth,main:document.querySelectorAll('main:has(#question-heading)').length,h1:document.querySelectorAll('main h1').length,
 small:controls.map(e=>({name:(e.getAttribute('aria-label')||e.textContent||e.id).slice(0,80),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(e=>e.width<43.9||e.height<43.9),
 clipped:controls.filter(e=>e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),
 inFlow:getComputedStyle(actions).position==='static'&&actions.getBoundingClientRect().top>=article.getBoundingClientRect().bottom,
 progressVisible:progress.width>0&&progress.height>=4,sourceLanguage:document.querySelectorAll('.assessment-question [lang="kaa"]').length>0,
 dialog:rect?{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,viewport:[innerWidth,innerHeight],overflow:dialog.scrollWidth>dialog.clientWidth}:null};
}'''
def inspect(page,name,config,records):
 data={'case':name,**config,**page.evaluate(measure)}
 d=data['dialog'];data['passed']=not data['overflow'] and not data['small'] and not data['clipped'] and data['inFlow'] and data['progressVisible'] and data['sourceLanguage'] and data['main']==1 and data['h1']==1 and (not d or d['left']>=0 and d['top']>=0 and d['right']<=d['viewport'][0]+1 and d['bottom']<=d['viewport'][1]+1 and not d['overflow'])
 records.append(data)
 return data
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width,height in [(1440,900),(1366,768),(1024,768),(390,844),(320,568)]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=b.new_context(viewport={'width':width,'height':height},color_scheme=theme,timezone_id='Asia/Tashkent')
    c.add_init_script('localStorage.setItem("hm.user",JSON.stringify({phone:"901234567"}));localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');localStorage.setItem("hm.language",'+json.dumps(lang)+');window.MutationObserver=class{observe(){}disconnect(){}}')
    page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'/sign-in');page.wait_for_load_state('networkidle')
    for name,testId,current in cases:
     seed(page,testId,current,name)
     config={'viewport':[width,height],'theme':theme,'language':lang}
     data=inspect(page,name,config,matrix);data['errors']=list(errors);data['passed']=data['passed'] and not errors;errors.clear()
     filename=f'{name}-{width}-{theme}-{lang}.png';data['screenshot']='screenshots/'+filename
     page.screenshot(path=str(OUT/'screenshots'/filename),full_page=not data['dialog'],animations='disabled')
     if width==1366 and lang=='ru':
      selectors=[('.assessment-save','save status'),('.assessment-question>.body','question text')]
      if name in ['practice','timed']:selectors += [('.opt .txt','answer text'),('.assessment-primary','primary action')]
      if name=='checked':selectors += [('.assessment-feedback strong','feedback title'),('.opt.right .txt','correct answer'),('.opt.wrong .txt','incorrect answer')]
      if name=='map':selectors=[('dialog h2','map heading'),('.assessment-map .cell.cur','current map cell')]
      if name=='submit':selectors=[('dialog h2','submit heading'),('#submit-now','submit action')]
      for selector,label in selectors:colors.append({'theme':theme,'case':name,**pixel_probe(page,selector,label)})
    c.close()
   print('Workspace matrix',width,theme,flush=True)
  (OUT/'workspace-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2),encoding='utf-8')
 # Root-text scaling and short laptop height are independent layout stresses.
 for width,height,scale in [(320,568,200),(1024,480,100)]:
  for lang in ['uz','kaa','ru']:
   c=b.new_context(viewport={'width':width,'height':height})
   c.add_init_script('localStorage.setItem("hm.user",JSON.stringify({phone:"901234567"}));localStorage.setItem("hm.language",'+json.dumps(lang)+');window.MutationObserver=class{observe(){}disconnect(){}}')
   page=c.new_page();page.goto(BASE+'/sign-in');page.wait_for_load_state('networkidle')
   for name,testId,current in [cases[2],cases[3],cases[5],cases[6]]:
    seed(page,testId,current,name);page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale)
    data=inspect(page,name,{'viewport':[width,height],'scale':scale,'language':lang},extra)
    page.screenshot(path=str(OUT/'screenshots'/f'extra-{width}-{scale}-{lang}-{name}.png'),full_page=not data['dialog'],animations='disabled')
   c.close()
 # Timer warning/danger foregrounds on their real token backgrounds.
 for theme in ['light','dark']:
  c=b.new_context(viewport={'width':1366,'height':768});page=c.new_page();page.goto(BASE+'/sign-in');page.wait_for_load_state('networkidle');page.evaluate('t=>{localStorage.setItem("hm.user",JSON.stringify({phone:"901234567"}));localStorage.setItem("hm.theme",JSON.stringify(t))}',theme)
  for seconds,name in [(180,'timer warning'),(60,'timer danger')]:
   seed(page,'mock-7',0,'timed',seconds);colors.append({'theme':theme,**pixel_probe(page,'.timer',name)})
  c.close()
 # Dictionary coverage includes conditional dialog/recovery keys and map state copy.
 page=b.new_page();page.goto(BASE+'/sign-in');page.wait_for_load_state('networkidle')
 keys=set()
 for path in ['src/pages/student/Exam.tsx','src/components/exam/parts.tsx']:
  keys.update(re.findall(r"\bt\('([^']+)'",(ROOT/path).read_text(encoding='utf-8')))
 copy=page.evaluate('''async keys=>{const imports=await Promise.all(['assessmentMessages','discoveryMessages','shellMessages','designMessages','uxCopy','messages'].map(n=>import('/src/i18n/'+n+'.ts')));const tables=imports.map(m=>Object.values(m).find(v=>v&&typeof v==='object'));const own=Object.keys(imports[0].assessmentCopy);return [...new Set([...keys,...own])].map(key=>{const row=tables.map(t=>t[key]).find(Boolean);return {key,passed:['uz','kaa','ru'].every(l=>!!row?.[l])}})}''',sorted(keys))
 b.close()
for filename,data in [('workspace-matrix.json',matrix),('stress-layouts.json',extra),('contrast.json',colors),('copy-coverage.json',copy)]:
 (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Failures',json.dumps([r for r in matrix+extra+colors+copy if not r['passed']],ensure_ascii=True),flush=True)
assert all(r['passed'] for r in matrix+extra+colors+copy)
