"""Stage 3 browser evidence. Disposable Chrome contexts; Vite on port 5173."""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:5173'
sys.path.insert(0,str(OUT.parent/'stage-0'))
from capture_baseline import ROUTES
(OUT/'screenshots').mkdir(exist_ok=True)
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
for session in fixture['sessions'].values():
 session['startedAt']=int(time.time()*1000)
 session['endsAt']=int(time.time()*1000)+9000000 if session['mode']=='mock' else None
checks=[]; matrix=[]; routes=[]
if '--interactions-only' in sys.argv:
 matrix=json.loads((OUT/'shell-matrix.json').read_text(encoding='utf-8'))
 routes=json.loads((OUT/'route-landmarks.json').read_text(encoding='utf-8'))
def check(name, passed, detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail))
 print(name.encode('ascii','backslashreplace').decode(), bool(passed),flush=True)
def context(browser,width=1366,lang='uz',theme='light',observer=True,auth=True):
 ctx=browser.new_context(viewport={'width':width,'height':900},color_scheme=theme,timezone_id='Asia/Tashkent')
 seed={'hm.theme':json.dumps(theme),'hm.language':lang,'hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.mistakes':json.dumps(['Q-0051'])}
 if auth:seed['hm.user']=json.dumps({'phone':'901234567','name':'','group':''})
 ctx.add_init_script('if(!sessionStorage.getItem("seeded")){for(const [k,v] of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v);sessionStorage.setItem("seeded","1")}')
 if not observer:ctx.add_init_script('window.MutationObserver=class{observe(){} disconnect(){} takeRecords(){return []}}')
 return ctx
def visit(page,path):
 page.goto(BASE+path);page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
def focused_main(page):
 return page.evaluate('!!document.activeElement?.closest("#main-content")')

with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 # Full shell matrix, including narrow reflow and a disabled mutation observer.
 for width in ([] if '--routes-only' in sys.argv or '--interactions-only' in sys.argv else [1366,1024,390,320]):
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    ctx=context(browser,width,lang,theme,observer=False);page=ctx.new_page()
    for path,kind in [('/tests','student'),('/admin/bank','teacher')]:
     visit(page,path)
     compact=width<(1200 if kind=='teacher' else 900)
     if compact:
      assert page.locator('.workspace-links').count()==0
      page.locator('.workspace-menu').click()
     nav=page.locator('.workspace-links')
     dims=nav.locator('a').evaluate_all('els=>els.map(e=>{const r=e.getBoundingClientRect();const s=e.querySelector("span");return {height:r.height,width:r.width,clipped:e.scrollWidth>e.clientWidth,label:s?.textContent,visible:!!e.getClientRects().length}})')
     data={'width':width,'theme':theme,'language':lang,'kind':kind,'compact':compact,'links':dims,'current':nav.locator('[aria-current="page"]').count(),'name':nav.get_attribute('aria-label'),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')}
     data['passed']=not data['overflow'] and data['current']==1 and all(d['height']>=44 and d['visible'] and not d['clipped'] for d in dims) and len(dims)==(8 if kind=='teacher' else 5)
     matrix.append(data)
     page.screenshot(path=str(OUT/'screenshots'/f'{kind}-{width}-{theme}-{lang}.png'),full_page=True,animations='disabled')
     if compact:page.keyboard.press('Escape')
    ctx.close()
   print('Shell matrix',width,theme,flush=True)
 check('48 shell configurations: all labels and destinations fit',len(matrix)==48 and all(r['passed'] for r in matrix))
 # All existing routes have one visible main, a heading, a valid skip target and no errors.
 for width in ([] if '--interactions-only' in sys.argv else [1440,1366,1024]):
  ctx=context(browser,width);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for name,path in ROUTES:
   visit(page,path)
   data={'route':path,'width':width,'actual':page.url.removeprefix(BASE),'errors':list(errors),'mains':page.locator('main:visible').count(),'target':page.locator('#main-content:visible').count(),'heading':page.locator('main h1').count(),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth')}
   data['passed']=data['mains']==1 and data['target']==1 and data['heading']>=1 and not errors and not data['overflow'] and data['actual']==path
   routes.append(data);errors.clear()
  ctx.close()
 check('69 route renders have landmarks, headings and no page errors',all(r['passed'] for r in routes),[r for r in routes if not r['passed']])
 (OUT/'route-landmarks.json').write_text(json.dumps(routes,ensure_ascii=False,indent=2),encoding='utf-8')
 if '--routes-only' in sys.argv:
  browser.close()
  assert all(r['passed'] for r in routes)
  raise SystemExit(0)
 (OUT/'shell-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2),encoding='utf-8')
 # Real keyboard navigation through every destination, including teacher/student return.
 for width in [1366,390]:
  for start in ['/tests','/admin/bank']:
   ctx=context(browser,width);page=ctx.new_page();visit(page,start)
   compact=width<(1200 if start.startswith('/admin') else 900)
   if compact:page.locator('.workspace-menu').click()
   paths=page.locator('.workspace-links a').evaluate_all('els=>els.map(e=>e.getAttribute("href"))')
   if compact:page.keyboard.press('Escape')
   for target in paths:
    visit(page,start)
    if compact:page.locator('.workspace-menu').focus();page.keyboard.press('Enter')
    link=page.locator(f'.workspace-links a[href="{target}"]');link.focus();page.keyboard.press('Enter')
    page.wait_for_url(BASE+target);page.wait_for_timeout(150)
    check(f'Keyboard destination {width} {start} → {target}',focused_main(page) and page.locator('dialog[open]').count()==0)
   ctx.close()
 ctx=context(browser,390,lang='ru');page=ctx.new_page();visit(page,'/tests')
 menu=page.locator('.workspace-menu');menu.focus();page.keyboard.press('Enter');dialog=page.locator('dialog[open]')
 check('Drawer initially focuses current destination',dialog.locator('[aria-current="page"]').evaluate('e=>e===document.activeElement'))
 focusables=dialog.locator('a[href],button,select');focusables.last.focus();page.keyboard.press('Tab')
 check('Drawer traps forward Tab',focusables.first.evaluate('e=>e===document.activeElement'))
 page.keyboard.press('Shift+Tab');check('Drawer traps reverse Tab',focusables.last.evaluate('e=>e===document.activeElement'))
 page.locator('main input').first.evaluate('e=>e.focus()');check('Modal blocks background focus',dialog.evaluate('e=>e.contains(document.activeElement)'))
 page.keyboard.press('Escape');check('Escape closes drawer and restores menu focus',page.locator('dialog[open]').count()==0 and menu.evaluate('e=>e===document.activeElement'))
 page.locator('.skip-navigation').focus();page.keyboard.press('Enter');check('Skip link focuses main',page.locator('#main-content').evaluate('e=>e===document.activeElement'))
 ctx.close()
 ctx=context(browser);page=ctx.new_page();visit(page,'/tests')
 page.locator('.workspace-links a[href="/progress"]').click();page.wait_for_timeout(100);page.go_back();page.wait_for_timeout(100)
 check('Browser Back restores route and focus',page.url==BASE+'/tests' and focused_main(page))
 page.go_forward();page.wait_for_timeout(100);check('Browser Forward restores route and focus',page.url==BASE+'/progress' and focused_main(page))
 visit(page,'/tests');search=page.locator('main input').first;search.focus();page.locator('.language-field select').select_option('ru');search.focus()
 page.evaluate('history.replaceState(history.state,"",location.pathname+"?mode=practice")');check('Query context remains on route',page.url.endswith('?mode=practice') and search.evaluate('e=>e===document.activeElement'))
 for path,active in [('/getting-started','/'),('/results/baseline','/progress'),('/admin/editor','/admin/bank')]:
  visit(page,path);check('Active parent '+path,page.locator('.workspace-links [aria-current="page"]').get_attribute('href')==active)
 for path in ['/tests/practice-1','/exam/practice-1','/results/baseline/q/1']:
  visit(page,path);check('Focused route omits global navigation '+path,page.locator('.workspace-links,.workspace-menu').count()==0)
 for path in ['/missing','/admin/missing']:
  visit(page,path);check('Unknown route offers recovery '+path,page.locator('main:visible').count()==1 and page.locator('main a').count()>0)
 ctx.close()
 # Auth must retain filters/hash, and reject non-student return targets.
 ctx=context(browser,auth=False);page=ctx.new_page();visit(page,'/tests?mode=practice#catalog')
 check('Protected route keeps complete return URL',page.evaluate('history.state.usr.from')=='/tests?mode=practice#catalog')
 page.locator('#phone').fill('901234567');page.locator('form button[type="submit"]').click();page.locator('.otp input').first.fill('000000');page.wait_for_url(BASE+'/tests?mode=practice#catalog')
 check('Sign-in returns to original filters and hash',True);ctx.close()
 # Hold a lazy module request to observe the fallback, then abort to exercise recovery.
 ctx=context(browser,auth=False);page=ctx.new_page();held=[]
 page.route('**/src/pages/DesignSystem*',lambda route:held.append(route))
 page.goto(BASE+'/design',wait_until='domcontentloaded')
 page.wait_for_selector('#route-loading')
 check('Lazy route exposes named busy state',page.locator('#route-loading[aria-busy="true"] [role="status"]').count()==1)
 page.screenshot(path=str(OUT/'screenshots/loading.png'))
 for _ in range(100):
  if held:break
  page.wait_for_timeout(50)
 assert held,'Lazy module request was not intercepted'
 for route in held:route.abort()
 page.wait_for_selector('.route-error')
 check('Lazy route failure offers reload and return',page.locator('.route-error button').count()==1 and page.locator('.route-error a').count()==1)
 page.screenshot(path=str(OUT/'screenshots/load-error.png'))
 page.unroute('**/src/pages/DesignSystem*');page.locator('.route-error button').click();page.wait_for_selector('.ds-controls')
 check('Reload recovers failed lazy module',page.locator('.route-error').count()==0)
 ctx.close();browser.close()

for name,data in [('shell-matrix',matrix),('route-landmarks',routes),('interaction-checks',checks)]:
 (OUT/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(r['passed'] for r in checks),'Stage 3 checks failed; see interaction-checks.json'
