"""Supplemental rendered answer/dialog contrast, media and existing-route smoke."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from measure_reference import OUT,BASE,pixel_probe

results=[];route_results=[];media=[];dialogs=[]
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 for theme in ['light','dark']:
  ctx=browser.new_context(viewport={'width':1366,'height':768},color_scheme=theme)
  ctx.add_init_script('localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');')
  page=ctx.new_page();page.goto(BASE+'/design');page.wait_for_load_state('networkidle')
  for selector,label in [('.ds-question','question text'),('.ds-options .opt .txt','answer text'),('#demo-phone','input text')]:results.append({'theme':theme,**pixel_probe(page,selector,label)})
  page.locator('.ds-options .opt').first.click();results.append({'theme':theme,**pixel_probe(page,'.ds-options .opt.sel .txt','selected answer')})
  page.locator('.ds-exam-actions button').first.click();results.append({'theme':theme,**pixel_probe(page,'.ds-options .opt.right .txt','checked correct answer')})
  page.locator('#open-modal').click();results.append({'theme':theme,**pixel_probe(page,'dialog h2','modal heading')});page.screenshot(path=str(OUT/'screenshots'/f'modal-{theme}.png'),animations='disabled');page.keyboard.press('Escape')
  # Test the OS reduced-transparency media path independently of the preference.
  cdp=ctx.new_cdp_session(page);cdp.send('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-transparency','value':'reduce'}]})
  media.append({'theme':theme,'name':'OS reduced transparency','mediaSupported':page.evaluate('matchMedia("(prefers-reduced-transparency: reduce)").matches'),'backdrop':page.locator('.ds-controls').evaluate('(e)=>getComputedStyle(e).backdropFilter')})
  for width in [1024,320]:
   page.set_viewport_size({'width':width,'height':768});page.locator('#open-modal').click()
   d=page.locator('dialog[open]');dims=d.evaluate('(e)=>({width:e.getBoundingClientRect().width,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth})')
   dialogs.append({'theme':theme,'viewport':width,**dims,'passed':dims['left']>=0 and dims['right']<=width and dims['scroll']<=dims['client']})
   d.screenshot(path=str(OUT/'screenshots'/f'dialog-{theme}-{width}.png'),animations='disabled');page.keyboard.press('Escape')
  ctx.close()
 # Each current route variant renders with the shared changes; known omissions are recorded.
 import sys
 sys.path.insert(0,str(OUT.parent/'stage-0'));from capture_baseline import ROUTES
 fixture=json.loads((OUT/'regressions/fixture.json').read_text(encoding='utf-8'))
 for width in [1440,1366,1024]:
  ctx=browser.new_context(viewport={'width':width,'height':768});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  init={'hm.user':json.dumps({'phone':'901234567','name':'','group':''}),'hm.theme':json.dumps('light'),'hm.language':'uz','hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.mistakes':json.dumps(['Q-0051'])}
  ctx.add_init_script('if(!sessionStorage.getItem("smoke")){for(const [k,v] of Object.entries('+json.dumps(init)+'))localStorage.setItem(k,v);sessionStorage.setItem("smoke","1")}')
  for name,path in ROUTES:
   page.goto(BASE+path);page.wait_for_load_state('networkidle')
   route_results.append({'route':path,'width':width,'actualPath':page.url.removeprefix(BASE),'errors':list(errors),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'hasContent':bool(page.locator('body').inner_text().strip())})
   errors.clear()
  ctx.close();print('Routes at',width,'checked',flush=True)
 browser.close()
(OUT/'supplemental-contrast.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'route-smoke.json').write_text(json.dumps(route_results,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'dialog-measurements.json').write_text(json.dumps(dialogs,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'transparency-media.json').write_text(json.dumps(media,ensure_ascii=False,indent=2),encoding='utf-8')
assert all(r['passed'] for r in results),'Supplemental contrast failure'
assert not any(r['errors'] or r['overflow'] or r['route']!=r['actualPath'] or not r['hasContent'] for r in route_results),'Route smoke failure'
assert all(r['mediaSupported'] and r['backdrop']=='none' for r in media),'Reduced-transparency fallback failure'

assert all(r['passed'] for r in dialogs),'Narrow dialog overflow'
