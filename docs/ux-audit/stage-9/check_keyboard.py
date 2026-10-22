"""Complete a real production learner journey using Tab, arrows, typing and Enter only."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).resolve().parent;checks=[];focus=[]
def check(name,ok):
 checks.append({'name':name,'passed':bool(ok)});print(name,bool(ok),flush=True);assert ok,name
def tab_to(page,selector):
 target=page.locator(selector).first
 for _ in range(180):
  if target.count() and target.evaluate('(e)=>e===document.activeElement'):
   row=target.evaluate("""e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),x=Math.max(0,Math.min(innerWidth-1,r.left+r.width/2)),y=Math.max(0,Math.min(innerHeight-1,r.top+r.height/2)),hit=document.elementFromPoint(x,y);return {name:e.getAttribute('aria-label')||e.innerText||e.id,visible:r.top>=-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1,unobscured:!!hit&&(e===hit||e.contains(hit)),outline:s.outlineStyle,outlineWidth:s.outlineWidth,shadow:s.boxShadow}}""")
   focus.append(row);check('Keyboard target visible and unobscured: '+selector,row['visible'] and row['unobscured']);return
  page.keyboard.press('Tab')
 raise AssertionError('Tab could not reach '+selector)
def activate(page,selector):tab_to(page,selector);page.keyboard.press('Enter');page.wait_for_timeout(100)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);c=b.new_context(viewport={'width':1366,'height':768});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:5174/sign-in');page.wait_for_load_state('networkidle')
 activate(page,'button[type=submit]');check('Empty sign-in focuses invalid named phone field',page.locator('#phone').evaluate('(e)=>e===document.activeElement&&e.getAttribute("aria-invalid")==="true"'))
 page.keyboard.type('901234567');activate(page,'button[type=submit]');tab_to(page,'.otp input');page.keyboard.type('123456');activate(page,'button[type=submit]');expect(page).to_have_url('http://127.0.0.1:5174/')
 check('Keyboard demo sign-in persists identity',bool(page.evaluate('localStorage.getItem("hm.user")')))
 activate(page,'a[href="/tests"]');activate(page,'#open-practice-1');activate(page,'.prep-actions .btn-primary');expect(page).to_have_url('http://127.0.0.1:5174/exam/practice-1')
 tab_to(page,'button.opt');page.keyboard.press('Space');check('Keyboard answer saved locally',bool(page.evaluate('JSON.parse(localStorage.getItem("hm.sessions"))["practice-1"].answers["Q-0051"]')))
 activate(page,'.assessment-actions button:nth-child(2)');expect(page.locator('dialog[open]')).to_be_visible();page.keyboard.press('Escape');check('Map closes and restores keyboard trigger',page.locator('.assessment-actions button').nth(1).evaluate('(e)=>e===document.activeElement'))
 activate(page,'.ux-finish');expect(page.locator('#review-unanswered')).to_be_focused();activate(page,'#submit-now');expect(page).to_have_url(__import__('re').compile('/results/'))
 check('Keyboard submission writes one attempt and removes session',page.evaluate('JSON.parse(localStorage.getItem("hm.attempts")).filter(a=>!a.seedScore).length===1&&!JSON.parse(localStorage.getItem("hm.sessions"))["practice-1"]'))
 activate(page,'.learning-question-link');check('Review heading receives route focus',page.locator('main h1').evaluate('(e)=>e===document.activeElement'))
 activate(page,'.learning-response button[aria-pressed]');check('Keyboard save for practice persists',len(page.evaluate('JSON.parse(localStorage.getItem("hm.mistakes"))'))>0)
 activate(page,'a[href^="/mistakes?question="]');check('Saved question destination reached by keyboard','/mistakes?' in page.url)
 check('No production browser exceptions',not errors);c.close();b.close()
(OUT/'keyboard-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8');(OUT/'keyboard-focus.json').write_text(json.dumps(focus,ensure_ascii=False,indent=2),encoding='utf-8')
