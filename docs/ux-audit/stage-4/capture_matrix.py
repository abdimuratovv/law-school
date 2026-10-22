"""Entry/discovery compositions: three desktop widths plus two reflow widths."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];BASE='http://127.0.0.1:5173'
(OUT/'screenshots').mkdir(exist_ok=True)
records=[];large=[];copy=[]
routes=[('entry','/sign-in'),('home','/'),('catalog','/tests'),('sample','/getting-started'),('practice-lobby','/tests/practice-1'),('preview-lobby','/tests/mock-7')]
measure='''()=>{
 const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 return {overflow:document.documentElement.scrollWidth>innerWidth,main:document.querySelectorAll('main').length,h1:document.querySelectorAll('main h1').length,small:[...document.querySelectorAll('main button,main a[href],main input,main select,main textarea')].filter(visible).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(r=>r.width<43.9||r.height<43.9)}
}'''
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width in [1440,1366,1024,390,320]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=b.new_context(viewport={'width':width,'height':900},color_scheme=theme,timezone_id='Asia/Tashkent')
    seed={'hm.user':json.dumps({'phone':'901234567','name':'','group':''}),'hm.theme':json.dumps(theme),'hm.language':lang,'hm.sessions':'{}','hm.attempts':'[]','hm.mistakes':'[]'}
    c.add_init_script('for(const [k,v] of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v);window.MutationObserver=class{observe(){} disconnect(){}}')
    page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    for name,path in routes:
     page.goto(BASE+path);page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
     filename=f'{name}-{width}-{theme}-{lang}.png';page.screenshot(path=str(OUT/'screenshots'/filename),full_page=True,animations='disabled')
     data={'name':name,'route':path,'width':width,'theme':theme,'language':lang,'screenshot':'screenshots/'+filename,'errors':list(errors),**page.evaluate(measure)}
     data['passed']=not data['overflow'] and not data['small'] and not errors and data['main']==1 and data['h1']==1
     records.append(data);errors.clear()
     if name=='entry':
      page.locator('#phone').fill('901234567');page.locator('button[type="submit"]').click()
      data={'name':'code','route':path,'width':width,'theme':theme,'language':lang,'errors':list(errors),**page.evaluate(measure)}
      data['passed']=not data['overflow'] and not data['small'] and not errors and data['main']==1 and data['h1']==1;records.append(data);errors.clear()
      page.screenshot(path=str(OUT/'screenshots'/f'code-{width}-{theme}-{lang}.png'),full_page=True,animations='disabled')
    c.close()
   print('Compositions',width,theme,flush=True)
  (OUT/'composition-matrix.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
 # Large text at the narrow viewport also covers the stage-3 catalog overflow finding.
 for lang in ['uz','kaa','ru']:
  c=b.new_context(viewport={'width':320,'height':900})
  c.add_init_script('localStorage.setItem("hm.user",JSON.stringify({phone:"901234567"}));localStorage.setItem("hm.language",'+json.dumps(lang)+');window.MutationObserver=class{observe(){} disconnect(){}}')
  page=c.new_page()
  for name,path in routes:
   page.goto(BASE+path);page.wait_for_load_state('networkidle');page.evaluate('document.documentElement.style.fontSize="200%"')
   data={'name':name,'language':lang,**page.evaluate(measure)};data['passed']=not data['overflow'] and not data['small'];large.append(data)
   page.screenshot(path=str(OUT/'screenshots'/f'large-{name}-{lang}.png'),full_page=True,animations='disabled')
  c.close()
 # Explicit key coverage for constant call sites plus tutorial step copy.
 page=b.new_page();page.goto(BASE+'/tests');page.wait_for_load_state('networkidle')
 sources=[ROOT/'src/pages/student'/f'{name}.tsx' for name in ['SignIn','Dashboard','Catalog','Lobby','GettingStarted']]
 keys=set()
 for source in sources:keys.update(re.findall(r"\bt\('([^']+)'",source.read_text(encoding='utf-8')))
 keys.update(['Select an option','Click an answer. You can change your choice before checking.','Change your answer','Choose an option, then try another. Press Check answer when you are ready.','Write an answer and use the map','Type a short answer. Use All questions to move between questions.'])
 copy=page.evaluate('''async keys=>{
 const {messages}=await import('/src/i18n/messages.ts');const {uxCopy}=await import('/src/i18n/uxCopy.ts');const {designCopy}=await import('/src/i18n/designMessages.ts');const {shellCopy}=await import('/src/i18n/shellMessages.ts');const {discoveryCopy}=await import('/src/i18n/discoveryMessages.ts');
 return keys.map(key=>({key,languages:Object.keys(discoveryCopy[key]??shellCopy[key]??designCopy[key]??uxCopy[key]??messages[key]??{}),passed:['uz','kaa','ru'].every(l=>(discoveryCopy[key]??shellCopy[key]??designCopy[key]??uxCopy[key]??messages[key])?.[l])}));
 }''',sorted(keys))
 b.close()
for filename,data in [('composition-matrix.json',records),('large-text.json',large),('copy-coverage.json',copy)]:
 (OUT/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Failed compositions',json.dumps([r for r in records+large if not r['passed']],ensure_ascii=True),flush=True)
print('Missing keys',json.dumps([r for r in copy if not r['passed']],ensure_ascii=True),flush=True)
assert all(r['passed'] for r in records+large+copy)
