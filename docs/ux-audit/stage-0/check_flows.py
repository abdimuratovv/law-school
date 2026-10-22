"""Baseline behavior probes; reports existing failures without changing app code."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from capture_baseline import BASE, OUT, ready

checks=[]
def record(name,passed,detail):
 checks.append({'name':name,'status':'pass' if passed else 'fail','detail':detail})
 print(name,checks[-1]['status'],flush=True)

with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 ctx=browser.new_context(viewport={'width':1366,'height':768});page=ctx.new_page()
 page.goto(BASE);ready(page)
 fixture=json.loads((OUT/'fixture.json').read_text(encoding='utf-8'))
 def setstate(sessions=None,attempts=None):
  page.evaluate("""v=>{localStorage.setItem('hm.user',JSON.stringify({phone:'901234567',name:'',group:''}));localStorage.setItem('hm.language','uz');localStorage.setItem('hm.sessions',JSON.stringify(v.sessions));localStorage.setItem('hm.attempts',JSON.stringify(v.attempts));localStorage.setItem('hm.mistakes','[]')}""",{'sessions':sessions or {},'attempts':attempts or []})
 def visit(path):page.goto(BASE+path);ready(page)
 def session():return page.evaluate("JSON.parse(localStorage.getItem('hm.sessions'))['practice-1']")
 def capture(name):page.screenshot(path=str(OUT/'screenshots'/('flow-'+name+'.png')),full_page=True)
 setstate();visit('/')
 record('Fresh account has no fabricated history',page.evaluate("JSON.parse(localStorage.getItem('hm.attempts')).length") == 0,'Fresh isolated local storage; no attempts or sessions seeded by app.');capture('fresh-home')
 setstate(fixture['sessions']);visit('/exam/practice-1')
 page.locator('button.opt').first.click();page.locator('button.opt').first.click()
 record('Repeated choice keeps answer',session()['answers'].get('Q-0051')=='A','Same option clicked twice before checking.')
 page.reload();ready(page)
 record('Answer survives reload',page.locator('button.opt').first.get_attribute('aria-checked')=='true','Read back persisted answer after full document reload.')
 page.locator('.ux-clear-answer').click()
 record('Explicit clear removes answer','Q-0051' not in session()['answers'],'Clear answer button, not repeat selection.')
 page.locator('button.opt').nth(1).click()
 record('Practice answer editable before checking',page.locator('button.opt').first.is_enabled(),'Can change selection before Check answer.')
 page.locator('.ex-toolbar button').nth(2).click()
 record('Practice check locks choice and persists check',page.locator('button.opt').first.is_disabled() and session().get('checked',{}).get('Q-0051') is True,'Explicit check action; persisted checked map.');capture('practice-checked')
 page.locator('.ex-toolbar button').nth(1).click();capture('question-map')
 modal=page.locator('[role="dialog"]')
 record('Question map declares modal contract',modal.get_attribute('aria-modal')=='true','Desktop map traps focus; inspect aria-modal. Missing/false is a contract defect.')
 page.keyboard.press('Escape')
 record('Map Escape closes and returns focus',page.locator('[role="dialog"]').count()==0 and page.locator('.ex-toolbar button').nth(1).evaluate('(e)=>e===document.activeElement'),'Open map via click, Escape, compare focus with trigger.')
 before=session()['current'];page.keyboard.press('ArrowRight')
 record('Exam ArrowRight shortcut advances',session()['current']!=before,'Shortcut advertised by README; actual player has no keydown registration.')
 # Written answer near-match produces an actual pending grade.
 s=json.loads(json.dumps(fixture['sessions']));s['practice-1']['current']=3
 setstate(s);visit('/exam/practice-1')
 q=fixture['questions'][3];page.locator('textarea').fill(q['accepted'][0]+'x');page.reload();ready(page)
 record('Written Karakalpak answer survives reload',page.locator('textarea').input_value()==q['accepted'][0]+'x','Near-match fixture routes written answer to manual grading.');capture('written')
 ctx.set_offline(True);page.wait_for_timeout(250)
 record('Offline message is visible',page.locator('.ex-banner').count()==1,'Browser network switched offline after page load.');capture('offline');ctx.set_offline(False)
 page.locator('.ux-finish').click();capture('submit');page.locator('#submit-now').click();ready(page)
 attempt=page.evaluate("JSON.parse(localStorage.getItem('hm.attempts')).at(-1)")
 record('Submit preserves answers and drops live session',attempt['answers'].get(q['id'])==q['accepted'][0]+'x' and page.evaluate("!JSON.parse(localStorage.getItem('hm.sessions'))['practice-1']"),'Actual submit confirmation, persisted attempt and removed session.')
 record('Pending written grade is labeled preliminary','Dastlabki' in page.locator('body').inner_text(),'Near-match written answer; inspect result wording.');capture('pending-results')
 visit('/results/'+attempt['id']+'/q/4')
 record('Review route displays written learner answer',q['accepted'][0]+'x' in page.locator('body').inner_text(),'Navigate to actual submitted attempt question 4.')
 # Timed reload keeps absolute deadline; expired deadline submits once.
 setstate(fixture['sessions']);visit('/exam/mock-7')
 deadline=page.evaluate("JSON.parse(localStorage.getItem('hm.sessions'))['mock-7'].endsAt")
 page.reload();ready(page)
 record('Timed reload preserves deadline',deadline==page.evaluate("JSON.parse(localStorage.getItem('hm.sessions'))['mock-7'].endsAt"),'Absolute endsAt is preserved, not restarted.')
 page.evaluate("let s=JSON.parse(localStorage.getItem('hm.sessions'));s['mock-7'].endsAt=Date.now()-1000;localStorage.setItem('hm.sessions',JSON.stringify(s))")
 page.reload();ready(page)
 record('Expired timer submits exactly once',page.url.startswith(BASE+'/results/') and page.evaluate("JSON.parse(localStorage.getItem('hm.attempts')).length") == 1,'Forced expired persisted deadline then reload; isolated state.')
 # Block writes after loading: UI must not silently promise persistence.
 setstate(fixture['sessions']);visit('/exam/practice-1')
 page.evaluate("() => {Storage.prototype.setItem=function(){throw new DOMException('Audit quota probe','QuotaExceededError')}}")
 page.locator('button.opt').first.click();capture('write-failure')
 record('Storage failure is surfaced',bool(page.locator('[role="alert"]').count()),'Injected quota failure: answer changes in memory, but no alert is rendered. Confirm loss by reload.')
 page.reload();ready(page)
 record('Storage-failure probe demonstrates lost answer',page.locator('button.opt').first.get_attribute('aria-checked')=='false','Expected characterization of current failure, not an accepted product behavior.')
 visit('/admin/editor/Q-0051');area=page.locator('textarea').first;original=area.input_value();area.fill(original+' AUDIT-DRAFT');page.wait_for_timeout(1100);capture('editor-draft')
 page.reload();ready(page)
 record('Editor draft survives reload',page.locator('textarea').first.input_value().endswith(' AUDIT-DRAFT'),'Change draft, wait longer than autosave stamp delay, reload.')
 # Collect invalid routes/recovery behavior.
 for path in ['/tests/missing','/exam/missing','/results/missing','/results/baseline/q/999','/admin/editor/missing']:
  visit(path);checks.append({'name':'Recovery '+path,'status':'observed','detail':{'destination':page.url.removeprefix(BASE),'headings':page.locator('h1,h2').all_text_contents()}})
 ctx.close();browser.close()
(OUT/'flow-results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
