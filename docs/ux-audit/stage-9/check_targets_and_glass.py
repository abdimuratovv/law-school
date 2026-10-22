"""Production hit-region audit and composited narrow navigation after scrolling."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(OUT.parent/'stage-0'));from capture_baseline import ROUTES
sys.path.insert(0,str(OUT.parent/'stage-2'));from measure_reference import pixel_probe
sys.path.insert(0,str(OUT));from check_production_helpers import seed,goto
rows=json.loads((OUT/'target-audit.json').read_text(encoding='utf-8')) if '--glass-only' in sys.argv else [];probes=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width in ([] if '--glass-only' in sys.argv else [1366,320]):
  for theme in ['light','dark']:
   c=b.new_context(viewport={'width':width,'height':768},color_scheme=theme);c.add_init_script(seed(theme,'ru'));page=c.new_page();page.on('dialog',lambda d:d.accept())
   for name,path in ROUTES:
    goto(page,path)
    targets=page.evaluate("""()=>[...document.querySelectorAll('button,a[href],input,select,textarea,summary,[role=switch],[role=checkbox]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.classList.contains('skip-link')&&!e.classList.contains('ds-skip')).map(e=>{const hit=e.matches('input[type=checkbox],input[type=radio]')?e.closest('label')??e:e;const r=hit.getBoundingClientRect();return {name:(e.getAttribute('aria-label')||e.textContent||e.id).trim().slice(0,90),tag:e.tagName,class:e.className,width:r.width,height:r.height,inlineLink:e.tagName==='A'&&!!e.closest('p')&&!e.classList.contains('btn')}})""")
    small=[t for t in targets if (t['width']<43.9 or t['height']<43.9) and not t['inlineLink']]
    rows.append({'route':path,'viewport':width,'theme':theme,'language':'ru','targets':len(targets),'inlineTextLinkExceptions':[t for t in targets if t['inlineLink']],'small':small,'passed':not small})
   c.close()
 for theme in ['light','dark']:
  for opaque in [False,True]:
   for path in ['/tests','/admin/bank']:
    c=b.new_context(viewport={'width':768,'height':768},color_scheme=theme);c.add_init_script(seed(theme,'ru'));c.add_init_script('localStorage.setItem("hm.rt",'+json.dumps(json.dumps(opaque))+')');page=c.new_page();goto(page,path)
    scrolled=page.evaluate("""()=>{const main=document.querySelector('.teacher-main');const e=main&&main.scrollHeight>main.clientHeight+10?main:document.scrollingElement;e.scrollTop=400;return e.scrollTop}""");page.wait_for_timeout(100)
    for selector in ['.workspace-menu span','.workspace-current']:
     probes.append({'route':path,'theme':theme,'opaque':opaque,'scrollTop':scrolled,**pixel_probe(page,selector,'scrolled navigation text')})
    page.screenshot(path=str(OUT/'screenshots'/f'glass-{path.split("/")[-1]}-{theme}-{opaque}.png'),animations='disabled');c.close()
 b.close()
for n,v in [('target-audit.json',rows),('scrolled-glass-contrast.json',probes)]: (OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
print('Target failures',json.dumps([r for r in rows if not r['passed']],ensure_ascii=True));print('Contrast failures',[r for r in probes if not r['passed']]);assert all(r['passed'] for r in rows+probes)
