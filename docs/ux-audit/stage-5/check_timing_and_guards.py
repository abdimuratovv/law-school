"""Actual unload dialog, major-time announcements and deliberate finish safeguards."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5173';checks=[]
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
def check(name,ok):checks.append({'name':name,'passed':bool(ok)});print(name,bool(ok),flush=True)
def setup(browser,testId):
 sessions=json.loads(json.dumps(fixture['sessions']));now=int(time.time()*1000)
 for session in sessions.values():session['startedAt']=now;session['endsAt']=now+9000000 if session['mode']=='mock' else None
 c=browser.new_context(viewport={'width':1024,'height':768})
 seed={'hm.user':json.dumps({'phone':'901234567'}),'hm.sessions':json.dumps(sessions),'hm.attempts':'[]','hm.language':'uz'}
 c.add_init_script('''if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries('''+json.dumps(seed)+'''))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1')}const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===sessionStorage.getItem('fail-key'))throw new DOMException('blocked','QuotaExceededError');return write.call(this,k,v)}''')
 page=c.new_page();page.goto(BASE+'/exam/'+testId);page.wait_for_load_state('networkidle');return c,page
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 c,page=setup(b,'practice-1');dialogs=[]
 page.on('dialog',lambda dialog:(dialogs.append(dialog.type),dialog.accept()))
 page.evaluate('sessionStorage.setItem("fail-key","hm.sessions")');page.locator('button.opt').first.click();page.reload();page.wait_for_load_state('networkidle')
 check('Actual browser unload warning appears for blocked writes',dialogs==['beforeunload'])
 check('Accepted unsaved reload restores only last saved snapshot',page.locator('button.opt').first.get_attribute('aria-checked')=='false')
 page.evaluate('sessionStorage.removeItem("fail-key")');page.locator('button.opt').first.click();page.reload();page.wait_for_load_state('networkidle')
 check('Saved reload does not prompt and retains selected answer',dialogs==['beforeunload'] and page.locator('button.opt').first.get_attribute('aria-checked')=='true')
 page.locator('.ux-finish').click();expect(page.locator('#review-unanswered')).to_be_focused()
 check('Finish confirmation initially focuses safe review action',True)
 page.mouse.click(2,2);check('Backdrop cannot accidentally submit or dismiss confirmation',page.locator('#submit-title').is_visible() and page.evaluate('JSON.parse(localStorage.getItem("hm.attempts")).length')==0)
 page.keyboard.press('Escape');check('Escape cancels finish and restores invoking control',page.locator('dialog[open]').count()==0 and page.locator('.ux-finish').evaluate('e=>e===document.activeElement'))
 page.locator('.ux-finish').click();page.locator('#review-unanswered').click();expect(page.locator('#question-heading')).to_be_focused()
 check('Review unanswered goes to first unanswered without submitting',page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["practice-1"].current')==1 and page.evaluate('JSON.parse(localStorage.getItem("hm.attempts")).length')==0)
 c.close()
 c,page=setup(b,'mock-7')
 page.evaluate('''()=>{const end=JSON.parse(localStorage.getItem('hm.sessions'))['mock-7'].endsAt;const real=Date.now;const offset=end-119000-real();Date.now=()=>real()+offset}''')
 page.wait_for_function('document.querySelector(".assessment-frame>.sr-only[role=status]").textContent.length>0')
 before=page.locator('.assessment-frame>.sr-only[role="status"]').inner_text();timer=page.locator('.timer').get_attribute('aria-label')
 page.wait_for_timeout(1600)
 check('Crossed time threshold is announced once while countdown keeps updating',page.locator('.assessment-frame>.sr-only[role="status"]').inner_text()==before and page.locator('.timer').get_attribute('aria-label')!=timer)
 page.locator('#exam-options-toggle').click();page.locator('.assessment-options select').select_option('ru');check('Existing time announcement follows selected language',page.locator('.assessment-frame>.sr-only[role="status"]').inner_text() not in ['',before]);page.keyboard.press('Escape')
 page.locator('.assessment-actions button').nth(1).click();deadline=page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["mock-7"].endsAt');page.wait_for_timeout(1100)
 check('Time continues in modal without renewing deadline',page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["mock-7"].endsAt')==deadline)
 page.keyboard.press('Escape');page.evaluate('sessionStorage.setItem("fail-key","hm.sessions")');page.locator('button.opt').first.click();page.locator('.ux-finish').click();page.locator('#submit-now').click()
 first=page.evaluate('JSON.parse(localStorage.getItem("hm.attempts"))')
 for _ in range(3):page.locator('.assessment-pending button').click()
 check('Repeated cleanup retries preserve one immutable result',page.evaluate('JSON.parse(localStorage.getItem("hm.attempts"))')==first and len(first)==1)
 c.close();b.close()
(OUT/'timing-guard-results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(r['passed'] for r in checks)
