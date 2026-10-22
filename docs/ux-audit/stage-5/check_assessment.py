"""Assessment behavior, failure sequencing and native-history protection in Chrome."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5173'
(OUT/'screenshots').mkdir(exist_ok=True)
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(name,bool(ok),flush=True)
def context(browser,mode='practice-1',language='uz'):
 c=browser.new_context(viewport={'width':1366,'height':768},timezone_id='Asia/Tashkent')
 sessions=json.loads(json.dumps(fixture['sessions']));now=int(time.time()*1000)
 for s in sessions.values():s['startedAt']=now;s['endsAt']=now+9000000 if s['mode']=='mock' else None
 seed={'hm.user':json.dumps({'phone':'901234567','name':'','group':''}),'hm.sessions':json.dumps(sessions),'hm.attempts':'[]','hm.mistakes':'[]','hm.language':language,'hm.theme':'"light"'}
 c.add_init_script('''if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries('''+json.dumps(seed)+'''))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1')}window.MutationObserver=class{observe(){}disconnect(){}};
 const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===sessionStorage.getItem('fail-key'))throw new DOMException('blocked','QuotaExceededError');return original.call(this,k,v)};''')
 page=c.new_page();page.on('dialog',lambda dialog:dialog.accept());visit(page,'/exam/'+mode)
 return c,page
def visit(page,path):page.goto(BASE+path);page.wait_for_load_state('networkidle')
def stored(page,key):return page.evaluate('k=>JSON.parse(localStorage.getItem("hm."+k))',key)
def fail(page,key):page.evaluate('k=>sessionStorage.setItem("fail-key",k)','hm.'+key)
def recover(page):page.evaluate('sessionStorage.removeItem("fail-key")')
def map_open(page):page.locator('.assessment-actions button').nth(1).click();page.wait_for_selector('dialog[open]')
def go(page,n):map_open(page);page.locator('.assessment-map .cell').nth(n-1).click();expect(page.locator('#question-heading')).to_be_focused()
def finish(page):page.locator('.ux-finish').click();page.locator('#submit-now').click()
def shot(page,name):
 page.evaluate('window.scrollTo(0,0)')
 page.screenshot(path=str(OUT/'screenshots'/(name+'.png')),full_page=page.locator('dialog[open]').count()==0,animations='disabled')

with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 c,page=context(b);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 expect(page.locator('button.opt')).to_have_count(4)
 page.locator('button.opt').first.click();page.locator('button.opt').first.click()
 check('Repeated selection stays selected',stored(page,'sessions')['practice-1']['answers'].get('Q-0051')=='A')
 page.locator('.ux-clear-answer').click();check('Explicit clearing removes answer',not stored(page,'sessions')['practice-1']['answers'])
 page.locator('button.opt').nth(1).click();check('Practice choice editable before checking',page.locator('button.opt').first.is_enabled())
 page.locator('.assessment-question-heading button').click();page.locator('.assessment-primary').click()
 check('Deliberate check locks choice and persists flag/check',page.locator('button.opt').first.is_disabled() and stored(page,'sessions')['practice-1']['checked']['Q-0051'] and stored(page,'sessions')['practice-1']['flags']['Q-0051'])
 shot(page,'practice-checked');map_open(page)
 cell=page.locator('.assessment-map .cell').first
 check('Map distinguishes current answered flagged checked',all(s in cell.get_attribute('class') for s in ['cur','ans','is-flagged','is-checked']) and cell.get_attribute('aria-current')=='step')
 before=stored(page,'sessions')['practice-1']['current'];page.keyboard.press('ArrowRight');check('Map suppresses page shortcuts',stored(page,'sessions')['practice-1']['current']==before)
 shot(page,'question-map');page.keyboard.press('Escape');check('Map Escape restores trigger',page.locator('.assessment-actions button').nth(1).evaluate('e=>e===document.activeElement'))
 page.keyboard.press('ArrowRight');check('Global Right advances question without checking',stored(page,'sessions')['practice-1']['current']==1)
 check('Position does not inflate answered progress',len(stored(page,'sessions')['practice-1']['answers'])==1)
 page.locator('button.opt').first.focus();page.keyboard.press('ArrowRight');check('Radio arrows select locally without advancing question',stored(page,'sessions')['practice-1']['current']==1 and page.locator('button.opt').nth(1).get_attribute('aria-checked')=='true')
 go(page,4);text='Á ǵ ó ú ı ń — Qaraqalpaqsha';page.locator('textarea').fill(text);page.locator('textarea').focus();page.keyboard.press('ArrowRight');check('Typing suppresses global shortcuts',stored(page,'sessions')['practice-1']['current']==3)
 page.locator('.charbar .key').first.click();text+='ǵ';check('Character assistance inserts at caret',page.locator('textarea').input_value()==text)
 map_open(page);page.keyboard.press('Escape');check('Opening map preserves written answer',page.locator('textarea').input_value()==text)
 page.locator('.assessment-utilities button').nth(1).click();page.locator('.assessment-options select').select_option('ru');check('Language change preserves written input',page.locator('textarea').input_value()==text)
 page.locator('.assessment-options button.btn-plain').click();expect(page.locator('#exam-options-toggle')).to_be_focused();check('Closing options returns focus to its trigger',True)
 page.locator('#exam-options-toggle').click();page.locator('.assessment-options select').focus();page.keyboard.press('Escape');expect(page.locator('#exam-options-toggle')).to_be_focused();check('Escape closes options and returns focus',page.locator('#exam-options').count()==0)
 shot(page,'written');page.reload();page.wait_for_load_state('networkidle');check('Reload restores answer flag check and position',page.locator('textarea').input_value()==text and stored(page,'sessions')['practice-1']['flags']['Q-0051'] and stored(page,'sessions')['practice-1']['checked']['Q-0051'])
 c.set_offline(True);page.wait_for_timeout(100);check('Offline is independent of successful local saving',page.locator('.assessment-offline').count()==1 and not page.locator('.assessment-save').get_attribute('class').find('badc')>=0)
 shot(page,'offline');c.set_offline(False)
 fail(page,'sessions');page.locator('textarea').fill('Unsaved áń');check('Write failure is surfaced without discarding text',page.locator('[role="alert"]').count()==1 and page.locator('textarea').input_value()=='Unsaved áń')
 check('Unsaved work installs native unload guard',page.evaluate('()=>{const e=new Event("beforeunload",{cancelable:true});dispatchEvent(e);return e.defaultPrevented}'))
 go(page,1);go(page,4);check('Navigation retains unsaved answers in memory',page.locator('textarea').input_value()=='Unsaved áń')
 shot(page,'write-error');recover(page);page.locator('.assessment-frame>.notice button').click()
 check('Retry persists newest answers and clears failure',stored(page,'sessions')['practice-1']['answers']['Q-0418']=='Unsaved áń' and page.locator('.assessment-frame>.notice').count()==0)
 check('Successful retry removes unload warning',not page.evaluate('()=>{const e=new Event("beforeunload",{cancelable:true});dispatchEvent(e);return e.defaultPrevented}'))
 page.reload();page.wait_for_load_state('networkidle');check('Recovered written answer survives reload',page.locator('textarea').input_value()=='Unsaved áń')
 check('No unexpected player errors',not errors,errors);c.close()

 # Block only attempt writes. Answers remain durable; submission snapshot must freeze.
 c,page=context(b);page.locator('button.opt').first.click();fail(page,'attempts');finish(page)
 check('Failed result write keeps session and stays in workspace',page.url.endswith('/exam/practice-1') and 'practice-1' in stored(page,'sessions') and stored(page,'attempts')==[])
 expect(page.locator('.assessment-pending')).to_be_visible()
 check('Failed submission locks edits and offers recovery',page.locator('button.opt').first.is_disabled() and page.locator('.assessment-pending button').count()==1)
 shot(page,'submission-error');go(page,4);check('Frozen snapshot remains reviewable',page.locator('textarea').get_attribute('readonly') is not None)
 recover(page);page.locator('.assessment-pending button').click();page.wait_for_url('**/results/*')
 saved=stored(page,'attempts');check('Retry commits one snapshot before removing session',len(saved)==1 and saved[0]['answers']['Q-0051']=='A' and 'practice-1' not in stored(page,'sessions'))
 c.close()

 # Partial failure: result succeeded, session cleanup failed, stored session is older.
 c,page=context(b);page.locator('button.opt').first.click();fail(page,'sessions');page.locator('button.opt').nth(1).click();finish(page)
 expect(page.locator('.assessment-pending')).to_be_visible();first=stored(page,'attempts')[0]
 check('Partial commit reports durable result and retained session',first['answers']['Q-0051']=='B' and stored(page,'sessions')['practice-1']['answers']['Q-0051']=='A')
 shot(page,'cleanup-error');page.reload();page.wait_for_load_state('networkidle');expect(page.locator('.assessment-pending')).to_be_visible()
 check('Reload reuses durable result instead of stale session answers',stored(page,'attempts')==[first] and page.locator('button.opt').nth(1).get_attribute('aria-checked')=='true')
 recover(page);page.locator('.assessment-pending button').click();page.wait_for_url('**/results/*')
 check('Cleanup retry creates no duplicate and never overwrites result',stored(page,'attempts')==[first] and 'practice-1' not in stored(page,'sessions'));c.close()

 # Deadline crossing between timer ticks rejects the late event, superseding an open modal.
 c,page=context(b,mode='mock-7');deadline=stored(page,'sessions')['mock-7']['endsAt'];start=stored(page,'sessions')['mock-7']['startedAt'];fail(page,'attempts');map_open(page)
 page.evaluate('ends=>{Date.now=()=>ends+1}',deadline);page.wait_for_timeout(1200)
 expect(page.locator('.assessment-pending')).to_be_visible()
 check('Expiry closes modal and freezes even when result saving fails',page.locator('dialog[open]').count()==0 and page.locator('button.opt').first.is_disabled() and 'mock-7' in stored(page,'sessions'))
 shot(page,'expired-unsaved');go(page,2);recover(page);page.locator('.assessment-pending button').click();page.wait_for_url('**/results/*');saved=stored(page,'attempts')
 check('Expiry retry keeps original duration and commits exactly once',len(saved)==1 and saved[0]['durationSec']==round((deadline-start)/1000));c.close()
 c,page=context(b,mode='mock-7');deadline=stored(page,'sessions')['mock-7']['endsAt'];page.evaluate('ends=>{Date.now=()=>ends+1}',deadline)
 page.locator('button.opt').first.click();page.wait_for_url('**/results/*')
 check('Late answer event between ticks is rejected',stored(page,'attempts')[0]['answers']=={});c.close()

 # Real SPA Back and Forward use the native router blocker, no fake history entries.
 c,page=context(b);visit(page,'/tests');page.locator('#open-practice-1').click();page.locator('.prep-actions button').click();page.wait_for_url('**/exam/practice-1');page.locator('button.opt').first.click()
 page.evaluate('history.back()');page.wait_for_selector('#exit-title')
 check('Back is guarded with safe initial focus',page.url.endswith('/exam/practice-1') and page.locator('#keep-solving').evaluate('e=>e===document.activeElement'))
 page.keyboard.press('Escape');check('Cancelling Back preserves route and answer',page.url.endswith('/exam/practice-1') and page.locator('button.opt').first.get_attribute('aria-checked')=='true')
 page.evaluate('history.back()');page.wait_for_selector('#exit-title');page.locator('.assessment-dialog-actions button').last.click();page.wait_for_url('**/tests/practice-1')
 check('Confirmed Back reaches actual history destination',True)
 page.evaluate('history.forward()');page.wait_for_url('**/exam/practice-1');expect(page.locator('button.opt').first).to_have_attribute('aria-checked','true');check('Forward resumes saved answer without a reset',True)
 fail(page,'sessions');page.locator('button.opt').nth(1).click();page.locator('.assessment-utilities button').first.click();shot(page,'unsaved-exit')
 check('Unsaved exit names loss and still permits explicit leaving',page.locator('#keep-solving').evaluate('e=>e===document.activeElement') and page.locator('.assessment-dialog-actions button').count()==2)
 page.locator('#keep-solving').click();recover(page);page.locator('.assessment-frame>.notice button').click()
 c.close();b.close()
(OUT/'assessment-results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(r['passed'] for r in checks),'See assessment-results.json'
