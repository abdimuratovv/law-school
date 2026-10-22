"""Every route in all three UI languages; explicit-key and live-switch checks."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2];BASE='http://127.0.0.1:5173'
sys.path.insert(0,str(OUT.parent/'stage-0'));from capture_baseline import ROUTES
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'));now=int(time.time()*1000)
for session in fixture['sessions'].values():session['startedAt']=now;session['endsAt']=now+9000000 if session['mode']=='mock' else None
rows=json.loads((OUT/'localized-routes.json').read_text(encoding='utf-8')) if '--refresh-copy' in sys.argv else [];live=[]
def goto(p,url):
 for attempt in range(2):
  try:p.goto(url,wait_until='domcontentloaded',timeout=60000);p.wait_for_load_state('networkidle',timeout=60000);return
  except Exception:
   if attempt:raise
def check(name,ok):live.append({'name':name,'passed':bool(ok)});print(name,bool(ok),flush=True);assert ok,name
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width in ([] if '--refresh-copy' in sys.argv else [1440,1366,1024]):
  for lang in ['uz','kaa','ru']:
   c=b.new_context(viewport={'width':width,'height':768});seed={'hm.user':json.dumps({'phone':'901234567','name':'Next Review'}),'hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.language':lang,'hm.theme':'"light"'}
   c.add_init_script('for(const[k,v]of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v);window.__mutationObservers=0;window.MutationObserver=class{constructor(){window.__mutationObservers++;throw new Error("Unexpected DOM translation observer")}}');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for name,path in ROUTES:
    goto(page,BASE+path)
    row={'width':width,'language':lang,'route':path,'actual':page.url.removeprefix(BASE),'main':page.locator('main:visible').count(),'h1':page.locator('main h1').count(),'documentLanguage':page.evaluate('document.documentElement.lang'),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'mutationObservers':page.evaluate('window.__mutationObservers'),'errors':list(errors)};row['passed']=row['actual']==path and row['main']==1 and row['h1']==1 and not row['overflow'] and row['documentLanguage']==lang and row['mutationObservers']==0 and not errors;rows.append(row);errors.clear()
   c.close();print('Localized routes',width,lang,flush=True)
   (OUT/'localized-routes.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
 c=b.new_context(viewport={'width':1366,'height':900});page=c.new_page();goto(page,BASE+'/admin/grading');page.locator('.review-response [role=radio]').nth(1).click();page.locator('#review-note').fill('Next Review · Á ǵ ı')
 source=page.locator('.review-answer').inner_text();labels=[]
 for lang in ['uz','kaa','ru']:
  page.locator('.language-field select').first.select_option(lang);expect(page.locator('html')).to_have_attribute('lang',lang);labels.append(page.locator('h1').inner_text());check('Live grading switch retains note and draft '+lang,page.locator('#review-note').input_value()=='Next Review · Á ǵ ı' and page.locator('.review-response [role=radio]').nth(1).get_attribute('aria-checked')=='true');check('Question material stays Karakalpak '+lang,page.locator('.review-answer').inner_text()==source and page.locator('.review-answer').get_attribute('lang')=='kaa')
 check('Heading changes through React in all three languages',len(set(labels))==3);page.locator('.review-queue-button').nth(3).click();check('Portal confirmation uses current explicit Russian copy','Отменить' in page.locator('dialog h2').inner_text());page.keyboard.press('Escape');page.locator('.review-response .review-actions button').first.click()
 goto(page,BASE+'/sign-in');page.evaluate("localStorage.setItem('hm.user',JSON.stringify({phone:'901234567',name:'Next Review'}))");goto(page,BASE+'/')
 for lang in ['uz','kaa','ru']:
  page.locator('.language-field select').first.select_option(lang);check('User name is never translated '+lang,page.locator('.workspace-identity strong').inner_text()=='Next Review')
 keys=json.loads((OUT/'source-copy-audit.json').read_text(encoding='utf-8'))['keys'];coverage=page.evaluate("""async keys=>{const m=await Promise.all(['reviewMessages','authoringMessages','learningMessages','assessmentMessages','discoveryMessages','shellMessages','designMessages','uxCopy','messages'].map(n=>import('/src/i18n/'+n+'.ts')));const tables=m.map(m=>Object.values(m).find(v=>v&&typeof v==='object'));return [...new Set([...keys,...Object.keys(m[0].reviewCopy)])].map(key=>{const row=tables.map(t=>t[key]).find(Boolean);return {key,passed:['uz','kaa','ru'].every(l=>!!row?.[l])}})}""",keys)
 # Edge/fallback coverage: unavailable states and typed input survive language changes.
 goto(page,BASE+'/admin/editor/missing');check('Missing teacher question has named localized recovery',page.locator('main h1').count()==1 and page.locator('main textarea').count()==0)
 check('Source contains no DOM mutator or fuzzy word fallback','MutationObserver' not in (ROOT/'src/i18n/LanguageProvider.tsx').read_text(encoding='utf-8') and 'wordFallback' not in (ROOT/'src/i18n/messages.ts').read_text(encoding='utf-8'))
 c.close();b.close()
for name,data in [('localized-routes.json',rows),('live-language-checks.json',live),('copy-coverage.json',coverage)]: (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
fail=[r for r in rows+live+coverage if not r['passed']];print('Failures',json.dumps(fail,ensure_ascii=True));assert len(rows)==207 and not fail
