"""Additional entry/discovery and teacher-state baseline captures."""
import json
from playwright.sync_api import sync_playwright
from capture_baseline import BASE, OUT, ready

results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 ctx=browser.new_context(viewport={'width':1024,'height':768});page=ctx.new_page()
 def visit(path):page.goto(BASE+path);ready(page)
 def shot(name):page.screenshot(path=str(OUT/'screenshots'/('state-'+name+'.png')),full_page=True)
 def record(name,ok,detail):results.append({'name':name,'status':'pass' if ok else 'fail','detail':detail})
 visit('/sign-in');page.locator('button[type="submit"]').click();shot('phone-error')
 record('Phone validation',page.locator('input[aria-invalid="true"]').count()==1,'Empty submit marks phone invalid.')
 page.locator('input').first.fill('901234567');page.locator('button[type="submit"]').click();shot('otp')
 page.locator('.otp input').first.fill('123456');page.wait_for_url(BASE+'/');ready(page)
 record('Demo OTP accepts six digits',page.url==BASE+'/','Full-code input in first OTP box; local demo only.')
 for lang in ['uz','kaa','ru']:
  page.evaluate('(v)=>localStorage.setItem("hm.language",v)',lang);visit('/tests')
  title=page.locator('.test-card h2').first.inner_text();page.locator('input').fill(title)
  record('Visible-title search '+lang,page.locator('.test-card').count()>0,{'query':title,'matches':page.locator('.test-card').count()})
  page.locator('input').fill('NO-MATCH-AUDIT-987654');shot('catalog-empty-'+lang)
  record('Empty search '+lang,page.locator('.test-card').count()==0,'No matching cards, clear-filter recovery rendered.')
 page.evaluate('localStorage.setItem("hm.language","uz")');visit('/admin/bank');page.locator('input').first.fill('NO-MATCH-AUDIT-987654');shot('bank-empty')
 visit('/admin/import');page.locator('input[type="file"]').set_input_files({'name':'audit.xlsx','mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','buffer':b'audit fixture, not Excel bytes'})
 shot('import-validation');record('Import accepts filename and renders fixture validation',page.locator('body').inner_text().find('audit.xlsx')>=0,'Intentionally invalid Excel bytes; demonstrates fixture behavior, not format support.')
 page.locator('.dock-bar button').last.click();shot('import-preview')
 page.locator('.dock-bar button').last.click();shot('import-summary')
 results.append({'name':'Import preview and completion','status':'observed','detail':'Advanced through fixture validation to preview and completion; no questions added to bank.'})
 visit('/admin/builder');shot('builder-details')
 # The primary dock action advances through the local four-stage preview.
 for n in [2,3,4]:
  action=page.locator('.dock-bar button').last
  if action.is_disabled():
   results.append({'name':'Builder stage '+str(n),'status':'blocked','detail':'Current selection count disables Next; no forced bypass.'});break
  action.click();shot('builder-'+str(n))
  results.append({'name':'Builder stage '+str(n),'status':'observed','detail':page.locator('h2').all_text_contents()})
 # Isolate focus behavior of shared theme radios.
 visit('/profile');group=page.locator('[role="radiogroup"]').first
 radios=group.locator('[role="radio"]');radios.first.focus();before=radios.evaluate_all('(els)=>els.map(e=>e.getAttribute("aria-checked"))')
 page.keyboard.press('ArrowRight');after=radios.evaluate_all('(els)=>els.map(e=>e.getAttribute("aria-checked"))')
 record('Segmented arrow-key selection',before!=after,{'before':before,'after':after,'tabIndexes':radios.evaluate_all('(els)=>els.map(e=>e.tabIndex)')})
 ctx.close();browser.close()
(OUT/'discovery-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=True,indent=2))
