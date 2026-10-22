"""All existing route variants still render under the supported blocker-capable router."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5173'
sys.path.insert(0,str(OUT.parent/'stage-0'));from capture_baseline import ROUTES
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'));now=int(time.time()*1000)
for session in fixture['sessions'].values():session['startedAt']=now;session['endsAt']=now+9000000 if session['mode']=='mock' else None
records=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width in [1440,1366,1024]:
  c=b.new_context(viewport={'width':width,'height':768})
  values={'hm.user':json.dumps({'phone':'901234567','name':'','group':''}),'hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.language':'uz','hm.theme':'"light"'}
  c.add_init_script('for(const [k,v] of Object.entries('+json.dumps(values)+'))localStorage.setItem(k,v)')
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for name,path in ROUTES:
   page.goto(BASE+path);page.wait_for_load_state('networkidle')
   data={'width':width,'route':path,'actual':page.url.removeprefix(BASE),'main':page.locator('main:visible').count(),'heading':page.locator('main h1').count(),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'errors':list(errors)}
   data['passed']=data['actual']==path and data['main']==1 and data['heading']==1 and not data['overflow'] and not data['errors'];records.append(data);errors.clear()
  c.close();print('Routes',width,flush=True)
 b.close()
(OUT/'route-smoke.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([r for r in records if not r['passed']],ensure_ascii=True))
assert len(records)==69 and all(r['passed'] for r in records)
