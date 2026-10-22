"""Real rendered teacher pages: five viewports, two themes, three languages."""
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];BASE='http://127.0.0.1:5173';(OUT/'screenshots').mkdir(exist_ok=True)
sys.path.insert(0,str(OUT.parent/'stage-2'));from measure_reference import pixel_probe
measure="""()=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const scope=document.querySelector('dialog[open]')??document.querySelector('main');const controls=[...scope.querySelectorAll('button,a[href],textarea,input,select,summary')].filter(e=>visible(e)&&!e.matches('input[type=radio],input[type=checkbox]'));const rect=document.querySelector('dialog[open]')?.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,main:document.querySelectorAll('main').length,h1:document.querySelectorAll('main h1').length,small:controls.map(e=>({name:(e.getAttribute('aria-label')||e.textContent).slice(0,60),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(e=>e.width<43.9||e.height<43.9),clipped:controls.filter(e=>e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),dialog:rect?{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight}:null}}"""
cases=[('grading','/admin/grading'),('grading-manual','/admin/grading'),('grading-draft','/admin/grading'),('grading-dialog','/admin/grading'),('students-list','/admin/students'),('students-detail','/admin/students'),('students-empty','/admin/students?search=no-match-8274'),('analytics-issue','/admin/analytics?q=Q-0422'),('analytics-written','/admin/analytics?q=Q-0119'),('analytics-empty','/admin/analytics?search=no-match-8274')]
refresh='--refresh-grading' in sys.argv or '--refresh-primary' in sys.argv
refresh_primary='--refresh-primary' in sys.argv
def affected(name):return name in ['analytics-issue','analytics-written'] if refresh_primary else name.startswith('grading')
old={name:json.loads((OUT/name).read_text(encoding='utf-8')) for name in ['composition-matrix.json','stress-layouts.json','contrast.json']} if refresh else {}
if refresh:cases=[row for row in cases if affected(row[0])]
matrix=[];stress=[];colors=[]
def inspect(page,name,config,target):
 row={'case':name,**config,**page.evaluate(measure)};d=row['dialog'];row['passed']=not row['overflow'] and not row['small'] and not row['clipped'] and row['main']==1 and row['h1']==1 and (not d or d['left']>=0 and d['right']<=d['width']+1 and d['top']>=0 and d['bottom']<=d['height']+1);target.append(row);return row
def goto(page,url):
 for attempt in range(2):
  try:page.goto(url,wait_until='domcontentloaded',timeout=60000);page.wait_for_load_state('networkidle',timeout=60000);return
  except Exception:
   if attempt:raise
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 def context(w,h,theme,lang):
  c=b.new_context(viewport={'width':w,'height':h},color_scheme=theme,timezone_id='Asia/Tashkent');c.add_init_script('localStorage.setItem("hm.language",'+json.dumps(lang)+');localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');');return c
 def prepare(page,name,path):
  goto(page,BASE+path);page.evaluate('document.fonts.ready')
  if name in ['grading-manual','grading-dialog']:
   if page.locator('.review-queue details').get_attribute('open') is None:page.locator('.review-queue summary').click()
  if name=='grading-manual':page.locator('.review-queue-button').nth(3).click()
  if name in ['grading-draft','grading-dialog']:
   page.locator('.review-response [role=radio]').nth(1).click();page.locator('#review-note').fill('Á ǵ ı · local note')
   if name=='grading-dialog':page.locator('.review-queue-button').nth(3).click()
  if name=='students-detail':page.locator('.review-table button').first.click()
  if name.startswith('analytics-') and name!='analytics-empty':page.locator('tbody button').filter(has_text='Q-0119' if name=='analytics-written' else 'Q-0422').click()
  page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');page.evaluate('window.scrollTo(0,0)')
 for w,h in [(1440,900),(1366,768),(1024,768),(390,844),(320,568)]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=context(w,h,theme,lang);page=c.new_page();page.on('dialog',lambda d:d.accept());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for name,path in cases:
     prepare(page,name,path);row=inspect(page,name,{'viewport':[w,h],'theme':theme,'language':lang},matrix);row['errors']=list(errors);row['passed']=row['passed'] and not errors;errors.clear();filename=f'{name}-{w}-{theme}-{lang}.png';row['screenshot']='screenshots/'+filename;page.screenshot(path=str(OUT/'screenshots'/filename),full_page=name!='grading-dialog',animations='disabled')
     if w==1366 and lang=='ru':
      selectors={'grading':[('h1','page title'),('.review-scope p','session boundary'),('.review-answer','written answer'),('.review-queue-button span','queue state')],'grading-manual':[('.review-rubric dd','rubric explanation')],'grading-draft':[('.review-response [role=status]','draft status'),('.review-response .btn-primary','apply action')],'students-detail':[('.review-stat-grid span','final-only statistic'),('.trend-chart svg text','score axis'),('[data-pending=true] td:last-child','pending status')],'analytics-issue':[('.review-analytics-detail .btn-primary','question editor action'),('.review-issue','issue explanation'),('.review-chart-scale','percentage scale')],'analytics-written':[('.review-analytics-detail .btn-primary','written editor action'),('.review-analytics-detail .review-scope','source-kind mismatch')],'grading-dialog':[('.authoring-confirm h2','consequential dialog'),('#authoring-safe','safe action')]}.get(name,[])
      for selector,label in selectors:colors.append({'theme':theme,'case':name,**pixel_probe(page,selector,label)})
    c.close();print('Captured',w,theme,lang,flush=True)
   if not refresh:(OUT/'composition-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2),encoding='utf-8')
 for w,h,scale in [(320,568,200),(1024,480,100)]:
  for lang in ['uz','kaa','ru']:
   c=context(w,h,'light',lang);page=c.new_page();page.on('dialog',lambda d:d.accept())
   for name,path in cases:
    prepare(page,name,path);page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale);inspect(page,name,{'viewport':[w,h],'scale':scale,'language':lang},stress);page.screenshot(path=str(OUT/'screenshots'/f'stress-{name}-{w}-{scale}-{lang}.png'),full_page=name!='grading-dialog',animations='disabled')
   c.close();print('Stress',w,lang,flush=True)
 b.close()
if refresh:
 matrix=[r for r in old['composition-matrix.json'] if not affected(r['case'])]+matrix
 stress=[r for r in old['stress-layouts.json'] if not affected(r['case'])]+stress
 colors=[r for r in old['contrast.json'] if not affected(r['case'])]+colors
for filename,data in [('composition-matrix.json',matrix),('stress-layouts.json',stress),('contrast.json',colors)]: (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
failures=[r for r in matrix+stress+colors if not r['passed']];print('Failures',json.dumps(failures,ensure_ascii=True),flush=True);assert len(matrix)==300 and len(stress)==60 and not failures
