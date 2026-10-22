"""Stage 4 stateful browser checks; disposable Chromium contexts and local Vite."""
import json,time,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5173'
(OUT/'screenshots').mkdir(exist_ok=True)
checks=[]
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(name.encode('ascii','backslashreplace').decode(),bool(passed),flush=True)
def context(browser,auth=True,width=1366,lang='uz',extra=None):
 c=browser.new_context(viewport={'width':width,'height':900},timezone_id='Asia/Tashkent')
 seed={'hm.language':lang,'hm.sessions':'{}','hm.attempts':'[]','hm.mistakes':'[]','hm.theme':'"light"'}
 if auth:seed['hm.user']=json.dumps({'phone':'901234567','name':'','group':''})
 seed.update(extra or {})
 c.add_init_script('if(!sessionStorage.getItem("seeded")){for(const [k,v] of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v);sessionStorage.setItem("seeded","1")}window.MutationObserver=class{observe(){} disconnect(){}}')
 return c
def visit(page,path):
 page.goto(BASE+path);page.wait_for_load_state('networkidle')
def click_submit(page):page.locator('form button[type="submit"]').click()
def shot(page,name):page.screenshot(path=str(OUT/'screenshots'/(name+'.png')),full_page=True,animations='disabled')
def block(page,key):page.evaluate('k=>{window.originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,v){if(key===k)throw new DOMException("blocked","QuotaExceededError");return originalSet.call(this,key,v)}}',key)
def unblock(page):page.evaluate('()=>{Storage.prototype.setItem=window.originalSet}')
def sample_third(page):
 page.locator('.tutorial-actions button[aria-haspopup="dialog"]').click();page.locator('.tutorial-map button').nth(2).click();page.wait_for_timeout(80)

with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 # Entry, validation, editing and explicit continuation preserve deep links.
 c=context(b,auth=False,width=390);page=c.new_page();visit(page,'/tests?mode=practice&q=1#catalog')
 click_submit(page);check('Phone error is associated and focused',page.locator('#phone').get_attribute('aria-invalid')=='true' and 'phone-err' in page.locator('#phone').get_attribute('aria-describedby') and page.locator('#phone').evaluate('e=>e===document.activeElement'))
 page.locator('#phone').fill('901234567');click_submit(page)
 click_submit(page);check('Incomplete code exposes associated error',page.locator('.otp input[aria-invalid="true"]').count()==6 and page.locator('#code-error').is_visible())
 page.locator('.otp input').first.fill('123456');page.wait_for_timeout(400)
 check('Whole code fills six positions without automatic navigation',page.locator('.otp input').evaluate_all('els=>els.map(e=>e.value).join("")')=='123456' and '/sign-in' in page.url)
 page.locator('.otp input').last.focus();page.keyboard.press('Backspace');check('Code Backspace edits only final digit',page.locator('.otp input').evaluate_all('els=>els.map(e=>e.value).join("")')=='12345')
 page.locator('.entry-number button').click();check('Change number retains value and focuses phone',page.locator('#phone').input_value().replace(' ','')=='901234567' and page.locator('#phone').evaluate('e=>e===document.activeElement'))
 click_submit(page);page.locator('.otp input').first.fill('654321');block(page,'hm.user');click_submit(page)
 check('Blocked sign-in stays on form without false authentication',page.locator('[role="alert"]').count()>0 and page.evaluate('localStorage.getItem("hm.user")') is None and '/sign-in' in page.url)
 shot(page,'entry-storage-error');unblock(page);click_submit(page);page.wait_for_url(BASE+'/tests?mode=practice&q=1#catalog')
 check('Continue retries and restores full deep link',True);c.close()
 # Fresh, returning, unavailable and active learner priorities.
 c=context(b);page=c.new_page();visit(page,'/');shot(page,'home-new')
 check('New learner has optional sample and no fabricated score',page.locator('.learning-next-actions .btn-primary').get_attribute('href')=='/getting-started' and page.locator('.learning-history').inner_text().find('%')<0)
 page.locator('.learning-next-actions .btn-plain').click();page.wait_for_url('**/tests?mode=practice');check('New learner can bypass sample',True)
 # URL search works in each visible language and survives details, reload and return.
 for lang in ['uz','kaa','ru']:
  visit(page,'/tests?mode=practice&topic=human-rights')
  page.locator('.workspace-sidebar select').select_option(lang)
  title=page.locator('.test-card h2').first.inner_text();search=page.locator('input[type="search"]');search.fill(title)
  check('Visible-title search '+lang,page.locator('.test-card').count()==1 and 'q=' in page.url)
  url=page.url;page.reload();page.wait_for_load_state('networkidle');check('Search survives reload '+lang,page.locator('input[type="search"]').input_value()==title)
  page.locator('.test-card a').click();page.wait_for_url('**/tests/practice-1');shot(page,'lobby-'+lang)
  page.locator('.lobby-top a').click();page.wait_for_url(url)
  check('Catalog return restores filters, search and originating card '+lang,page.url==url and page.locator('#open-practice-1').evaluate('e=>e===document.activeElement'))
  page.locator('input[type="search"]').fill('NO-MATCH-STAGE4');check('No-match state retains filters '+lang,page.locator('.test-card').count()==0 and page.locator('select.ux-select').input_value()=='human-rights')
  page.locator('main button.btn-plain').first.click();check('Clear filters resets mode, topic and search '+lang,'mode=' not in page.url and 'topic=' not in page.url and 'q=' not in page.url and page.locator('.test-card').count()==7)
 # Start failure is recoverable and does not invent an in-memory session.
 visit(page,'/tests/practice-1');block(page,'hm.sessions');page.locator('.prep-actions button').click()
 check('Failed start stays in lobby and retains no new session',page.url.endswith('/tests/practice-1') and page.locator('[role="alert"]').count()==1 and page.evaluate('localStorage.getItem("hm.sessions")')=='{}')
 shot(page,'lobby-save-error');unblock(page);page.locator('.prep-actions button').click();page.wait_for_url('**/exam/practice-1')
 saved=page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["practice-1"]')
 check('Start creates one untimed practice session',saved['mode']=='practice' and saved['endsAt'] is None)
 visit(page,'/tests/practice-1');page.locator('.prep-actions button').click();page.wait_for_url('**/exam/practice-1')
 check('Resume preserves existing session and timestamp',page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["practice-1"]')==saved)
 # Introduction return through lobby must retain the catalog origin.
 visit(page,'/tests?mode=practice&topic=human-rights&q=1');page.locator('.test-card a').click();page.wait_for_url('**/tests/practice-1')
 page.locator('.prep-actions a').click();page.wait_for_url('**/getting-started');shot(page,'sample-choice')
 before=page.evaluate('({sessions:localStorage.getItem("hm.sessions"),attempts:localStorage.getItem("hm.attempts")})')
 page.locator('.tutorial-question .opt').first.click();page.locator('.tutorial-actions .btn-primary').click();check('Sample checking reveals feedback',page.locator('.tutorial-question [role="status"]').count()==1)
 sample_third(page);check('Question-map selection focuses step heading',page.locator('#sample-step-title').evaluate('e=>e===document.activeElement') and page.locator('dialog[open]').count()==0)
 shot(page,'sample-written');page.locator('textarea').fill('Á á ǵ ó ú ı ń')
 page.locator('.workspace-sidebar select').select_option('kaa');check('Sample language change retains typed Karakalpak',page.locator('textarea').input_value()=='Á á ǵ ó ú ı ń')
 block(page,'hm.introductionComplete');page.locator('.tutorial-actions .btn-primary').click();check('Failed sample completion preserves sample state',page.url.endswith('/getting-started') and page.locator('[role="alert"]').count()==1)
 unblock(page);page.locator('.tutorial-actions .btn-primary').click();page.wait_for_url('**/tests/practice-1')
 check('Completion returns to lobby and creates no attempt',page.evaluate('({sessions:localStorage.getItem("hm.sessions"),attempts:localStorage.getItem("hm.attempts")})')==before and page.evaluate('localStorage.getItem("hm.introductionComplete")')=='true')
 page.locator('.lobby-top a').click();page.wait_for_url('**/tests?mode=practice&topic=human-rights&q=1');check('Lobby origin survives introduction round trip',True)
 visit(page,'/getting-started');sample_third(page);page.locator('textarea').fill('');page.locator('.tutorial-actions .btn-primary').click();page.wait_for_url('**/tests?mode=practice');check('Written sample can finish empty',True)
 visit(page,'/getting-started');before=page.evaluate('localStorage.getItem("hm.introductionComplete")');page.locator('.tutorial-actions a').click();page.wait_for_url(BASE+'/');check('Skip returns home without changing introduction status',page.evaluate('localStorage.getItem("hm.introductionComplete")')==before)
 shot(page,'home-active');check('Active session takes priority over completed introduction',page.locator('.learning-next-actions .btn-primary').get_attribute('href')=='/exam/practice-1')
 page.locator('.learning-next-actions .btn-primary').click();page.wait_for_url('**/exam/practice-1');check('Home resumes directly with home origin',page.evaluate('history.state.usr.from')=='/')
 visit(page,'/profile');page.locator('a[href="/getting-started"]').click();page.wait_for_url('**/getting-started');page.locator('.tutorial-actions a').click();page.wait_for_url('**/profile');check('Reopened sample skips back to profile',True)
 c.close()
 # Timed preview is honest and deadline is never renewed.
 c=context(b);page=c.new_page();visit(page,'/tests?mode=mock');check('Incomplete cards are explicitly preview-labelled',page.locator('.test-card .preview-label').count()==3)
 visit(page,'/tests/mock-7');shot(page,'lobby-preview');check('Preview lobby has one primary preview action',page.locator('.prep-actions .btn-primary').count()==1 and page.locator('.prep-card .notice-warning').count()==1)
 page.locator('.prep-actions button').click();page.wait_for_url('**/exam/mock-7');saved=page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["mock-7"]')
 check('Timed start uses configured 150-minute deadline',saved['endsAt']-saved['startedAt']==9000000)
 visit(page,'/tests/mock-7');page.locator('.prep-actions button').click();page.wait_for_url('**/exam/mock-7');check('Timed resume keeps original deadline',page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["mock-7"].endsAt')==saved['endsAt'])
 page.evaluate('let s=JSON.parse(localStorage.getItem("hm.sessions"));s["mock-7"].endsAt=Date.now()-1000;localStorage.setItem("hm.sessions",JSON.stringify(s))');visit(page,'/tests/mock-7')
 check('Expired lobby explains finishing existing attempt',page.locator('.prep-card .notice-warning').count()==2)
 page.locator('.prep-actions button').click();page.wait_for_url('**/results/*');check('Expired attempt completes once instead of restarting',page.evaluate('JSON.parse(localStorage.getItem("hm.attempts")).length')==1 and 'mock-7' not in page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))'))
 c.close()
 # Missing definitions/content, empty catalog, pending history, source-language boundaries.
 c=context(b,extra={'hm.sessions':json.dumps({'missing':{'testId':'missing','mode':'practice','startedAt':1,'endsAt':None,'answers':{'Q-0051':'A'},'flags':{},'current':0}})});page=c.new_page();visit(page,'/')
 check('Unavailable active record is explained and retained',page.locator('.discovery-home .notice-warning').count()==1 and 'missing' in page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))'))
 visit(page,'/tests/missing');check('Missing test has named recovery and no Start',page.locator('h1').count()==1 and page.locator('main a').count()==1 and page.locator('main button').count()==0)
 visit(page,'/tests/practice-1');page.evaluate('async()=>{const {getTest}=await import("/src/data/tests.ts");getTest("practice-1").questionIds.push("missing-question")}')
 # Refresh React through language change without reloading source modules.
 page.locator('.lobby-top select').select_option('ru');check('Missing question prevents start without substitute content',page.locator('.prep-actions button').count()==0 and page.locator('.notice-error').count()==1)
 visit(page,'/tests');page.evaluate('async()=>{const {TESTS}=await import("/src/data/tests.ts");TESTS.splice(0)}');page.locator('.workspace-sidebar select').select_option('kaa');check('Empty catalog offers sample recovery',page.locator('.test-card').count()==0 and page.locator('main a[href="/getting-started"]').count()==1)
 c.close()
 # Near-match written response is genuinely pending; seeded history is not personalized.
 fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
 attempt=fixture['attempts'][0]
 c=context(b,extra={'hm.attempts':json.dumps([attempt]),'hm.introductionComplete':'true'});page=c.new_page();visit(page,'/')
 check('Returning learner gets practice next and a genuine recent result',page.locator('.learning-next-actions .btn-primary').get_attribute('href')=='/tests?mode=practice' and page.locator('.learning-history a').first.get_attribute('href')=='/results/baseline')
 check('Pending result is labelled preliminary on home',page.locator('.learning-history .tag').inner_text() in ['Dastlabki natija','Dáslepki nátiyje','Предварительный результат']);shot(page,'home-returning');c.close()
 b.close()
(OUT/'journey-results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(r['passed'] for r in checks),'See journey-results.json'
