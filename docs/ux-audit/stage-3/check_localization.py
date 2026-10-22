"""Exercise explicit shell/control translation, formatting and content boundaries."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
checks=[]
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(name,bool(passed),flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 c=b.new_context(viewport={'width':1366,'height':900})
 c.add_init_script('localStorage.setItem("hm.user",JSON.stringify({phone:"901234567"}));window.MutationObserver=class{observe(){} disconnect(){}}')
 page=c.new_page();page.goto('http://127.0.0.1:5173/tests');page.wait_for_load_state('networkidle')
 for path,labels in [('/tests',['Home','Tests','Progress','My mistakes','Profile']),('/admin/bank',['Overview','Question bank','Import','Test builder','Grading','Students','Analytics','Student app'])]:
  page.goto('http://127.0.0.1:5173'+path);page.wait_for_load_state('networkidle')
  for lang in ['uz','kaa','ru']:
   select=page.locator('.language-field select');select.focus();select.select_option(lang)
   expected=page.evaluate('''async ({labels,lang})=>{
    const {messages}=await import('/src/i18n/messages.ts');const {uxCopy}=await import('/src/i18n/uxCopy.ts');const {shellCopy}=await import('/src/i18n/shellMessages.ts');
    return labels.map(key=>(shellCopy[key]??uxCopy[key]??messages[key])[lang]);
   }''',{'labels':labels,'lang':lang})
   actual=page.locator('.workspace-links a>span:not(.workspace-count)').all_text_contents()
   check('Live explicit shell translation '+path+' '+lang,actual==expected,actual)
   check('Language change preserves control focus '+path+' '+lang,select.evaluate('e=>e===document.activeElement'))
   check('Document language and route title '+path+' '+lang,page.locator('html').get_attribute('lang')==lang and expected[1] in page.title())
 # Numeric locale fallback is deliberate and tested independently of mutable page data.
 data=page.evaluate('''async()=>{
  const {localizedNumber:n,localizedDate:d}=await import('/src/i18n/formatting.ts');const {safeStudentReturn:s}=await import('/src/lib/navigation.ts');
  return {numbers:['uz','kaa','ru'].map(l=>n(1234.5,l)),dates:['uz','kaa','ru'].map(l=>d('2026-10-19T12:34:00Z',l,true)),invalid:d('invalid','ru'),safe:s('/tests?mode=practice#catalog'),unsafe:['//example.com','https://example.com','/admin','/sign-in','/\\\\example.com',null].map(s)};
 }''')
 check('Numbers use supported locale conventions',data['numbers']==['1,234.5','1,234.5','1\u00a0234,5'],data['numbers'])
 check('Numeric dates include day, month, year and local time',all('19' in d and '10' in d and '2026' in d for d in data['dates']),data['dates'])
 check('Invalid dates are neutral',data['invalid']=='—')
 check('Auth return accepts student context and rejects other destinations',data['safe']=='/tests?mode=practice#catalog' and data['unsafe']==['/']*6)
 page.goto('http://127.0.0.1:5173/design');page.wait_for_load_state('networkidle')
 material=page.locator('[data-testid="student-preview"] .ds-question')
 content=material.inner_text()
 for lang in ['uz','kaa','ru']:
  page.locator('.language-field select').select_option(lang)
  check('Question material stays Karakalpak '+lang,material.get_attribute('lang')=='kaa' and material.inner_text()==content)
 # The input is actual learner content, not a localization target.
 textarea=page.locator('textarea').first;textarea.fill('Á á ǵ ó ú ı ń — Qaraqalpaqsha')
 page.locator('.language-field select').select_option('kaa')
 check('Language change preserves Karakalpak input',textarea.input_value()=='Á á ǵ ó ú ı ń — Qaraqalpaqsha')
 for path in ['/tests','/admin/bank']:
  page.goto('http://127.0.0.1:5173'+path);page.wait_for_load_state('networkidle')
  page.set_viewport_size({'width':320,'height':768});page.evaluate('document.documentElement.style.fontSize="200%"')
  page.locator('.workspace-menu').click()
  dims={'links':page.locator('.workspace-links a').evaluate_all('els=>els.map(e=>({text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}))'),'dialog':page.locator('dialog').evaluate('e=>({width:e.clientWidth,scroll:e.scrollWidth})'),'document':page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})')}
  page.screenshot(path=str(OUT/'screenshots'/('large-text-'+('teacher' if 'admin' in path else 'student')+'.png')),animations='disabled')
  check('Large text drawer reflows '+path,all(e['scroll']<=e['width'] for e in dims['links']) and dims['dialog']['scroll']<=dims['dialog']['width'],dims)
  page.set_viewport_size({'width':1366,'height':900});page.wait_for_timeout(100)
  check('Resizing open drawer closes it and focuses content '+path,page.locator('dialog[open]').count()==0 and page.evaluate('!!document.activeElement.closest("main")'))
  page.evaluate('document.documentElement.style.fontSize=""')
 b.close()
(OUT/'localization-checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(r['passed'] for r in checks)
