"""Meaningful interaction regression coverage for shared stage-2 primitives.
Run with local Vite on 127.0.0.1:5173, Python Playwright and Chrome installed.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
BASE='http://127.0.0.1:5173'
results=[]
def check(name,condition,detail=''):
 results.append({'name':name,'passed':bool(condition),'detail':detail})
 print(name, bool(condition), flush=True)

with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 ctx=browser.new_context(viewport={'width':1366,'height':900})
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/design');page.wait_for_load_state('networkidle')
 group=page.locator('[role="radiogroup"]').nth(2);radios=group.locator('[role="radio"]')
 radios.first.focus();page.keyboard.press('ArrowRight')
 check('Radio arrows move focus and selection',radios.nth(1).get_attribute('aria-checked')=='true' and radios.nth(1).evaluate('(e)=>e===document.activeElement'))
 page.keyboard.press('ArrowRight');check('Radio wraps to first',radios.first.get_attribute('aria-checked')=='true')
 page.keyboard.press('End');check('Radio End selects last',radios.last.get_attribute('aria-checked')=='true')
 page.keyboard.press('Home');check('Radio Home selects first',radios.first.get_attribute('aria-checked')=='true')
 check('Radio has one tab stop',radios.evaluate_all('els=>els.filter(e=>e.tabIndex===0).length')==1)
 tabs=page.locator('[role="tab"]');tabs.first.focus();page.keyboard.press('ArrowRight')
 panel=page.locator('[role="tabpanel"]:visible')
 check('Tabs select linked visible panel',tabs.last.get_attribute('aria-selected')=='true' and panel.get_attribute('id')==tabs.last.get_attribute('aria-controls') and panel.get_attribute('aria-labelledby')==tabs.last.get_attribute('id'))
 check('Hidden panel has no tab stop',page.locator('[role="tabpanel"][hidden]').evaluate('(e)=>getComputedStyle(e).display')=='none')
 page.keyboard.press('Tab');check('Tab leaves tablist for current panel',panel.evaluate('(e)=>e===document.activeElement'))
 cb=page.locator('button[role="checkbox"]').first;cb.focus();before=cb.get_attribute('aria-checked');page.keyboard.press('Space')
 check('Checkbox Space toggles exactly once',cb.get_attribute('aria-checked')!=before)
 before=cb.get_attribute('aria-checked');page.keyboard.press('Enter');check('Checkbox Enter toggles exactly once',cb.get_attribute('aria-checked')!=before)
 switch=page.locator('[role="switch"]').nth(1);switch.focus();before=switch.get_attribute('aria-checked');page.keyboard.press('Space')
 check('Switch Space toggles',switch.get_attribute('aria-checked')!=before)
 page.locator('#example-state').select_option('Loading');busy=page.locator('#state-button')
 check('Loading action disabled with preserved name',busy.is_disabled() and busy.get_attribute('aria-busy')=='true' and bool(busy.inner_text()))
 page.locator('#example-state').select_option('Disabled');check('Disabled action cannot activate',busy.is_disabled())
 link=page.locator('a[aria-disabled="true"]');url=page.url;link.dispatch_event('click');check('Disabled navigation link does not navigate',page.url==url)
 page.locator('#example-state').select_option('Default')
 page.locator('#demo-phone').fill('901234567');check('Phone formatting preserves nine digits',page.locator('#demo-phone').input_value().replace(' ','')=='901234567')
 page.locator('.otp input').first.fill('123456');check('OTP whole-code input fills six positions',page.locator('.otp input').evaluate_all('els=>els.map(e=>e.value).join("")')=='123456')
 page.locator('.otp input').last.focus();page.keyboard.press('Backspace');check('OTP backspace edits last digit',page.locator('.otp input').evaluate_all('els=>els.map(e=>e.value).join("")')=='12345')
 invalid=page.locator('input[aria-invalid="true"]').first
 check('Validation error is associated',bool(invalid.get_attribute('aria-describedby')) and page.locator('[role="alert"]').count()>0)
 options=page.locator('[data-testid="student-preview"] button[role="radio"]');options.first.focus();page.keyboard.press('ArrowRight')
 check('Answer radio arrows select without checking',options.nth(1).get_attribute('aria-checked')=='true' and options.nth(1).is_enabled())
 check('Answer group has one tab stop',options.evaluate_all('els=>els.filter(e=>e.tabIndex===0).length')==1)
 page.locator('#open-modal').click();dialog=page.locator('dialog[open]')
 check('Modal has name, modality and safe initial focus',dialog.get_attribute('aria-modal')=='true' and dialog.get_attribute('aria-labelledby')=='example-modal-title' and page.locator('#example-modal-cancel').evaluate('(e)=>e===document.activeElement'))
 page.locator('#open-modal').evaluate('(e)=>e.focus()');check('Modal blocks background focus',page.evaluate('!!document.activeElement.closest("dialog[open]")'))
 trapped=True
 for _ in range(9):
  page.keyboard.press('Tab');trapped=trapped and page.evaluate('!!document.activeElement.closest("dialog[open]")')
 check('Modal Tab focus remains contained',trapped)
 page.mouse.click(5,5);check('Confirmation ignores backdrop click',dialog.count()==1)
 page.keyboard.press('Escape');check('Modal Escape closes and returns focus',page.locator('dialog[open]').count()==0 and page.locator('#open-modal').evaluate('(e)=>e===document.activeElement'))
 page.locator('#open-nonmodal').click();check('Nonmodal does not declare modality',page.locator('dialog[open]').get_attribute('aria-modal') is None)
 page.locator('#open-nonmodal').evaluate('(e)=>e.focus()');check('Nonmodal allows background focus',page.locator('#open-nonmodal').evaluate('(e)=>e===document.activeElement'))
 page.locator('dialog[open] button').focus();page.keyboard.press('Escape');check('Nonmodal Escape closes',page.locator('dialog[open]').count()==0)
 search=page.locator('[data-testid="teacher-preview"] input');search.fill('NO-MATCH-98765');check('Empty search exposes recovery',page.locator('[data-testid="teacher-preview"] .empty-state').count()==1)
 page.locator('[data-testid="teacher-preview"] .empty-state button').click();check('Reset restores sample table',page.locator('[data-testid="teacher-preview"] tbody tr').count()==3)
 check('Chart has equivalent table values',page.locator('.trend-chart tbody tr').count()==4 and '76%' in page.locator('.trend-chart table').inner_text())
 check('Progress has bounded named value',page.locator('[role="progressbar"]').get_attribute('aria-valuenow')=='3' and bool(page.locator('[role="progressbar"]').get_attribute('aria-label')))
 # Verify reference translations still work if legacy DOM mutation is completely disabled.
 for lang in ['uz','kaa','ru']:
  page.evaluate('(v)=>localStorage.setItem("hm.language",v)',lang)
  page.add_init_script('window.MutationObserver=class{observe(){} disconnect(){}}')
  page.reload();page.wait_for_load_state('networkidle')
  check('Explicit reference translation '+lang,page.locator('h1').inner_text() in ['O‘qish uchun sokin muhit','Oqıw ushın tınısh orta','Спокойное пространство для учёбы'])
  check('OTP accessible name translated '+lang,'One-time code' not in page.locator('.otp').get_attribute('aria-label'))
 check('No JavaScript page errors',not errors,errors)
 browser.close()
(OUT/'component-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(item['passed'] for item in results), 'See component-results.json'
