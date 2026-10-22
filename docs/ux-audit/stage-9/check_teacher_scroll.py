"""Wheel/keyboard/focus reachability beyond the fixed teacher viewport."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;sys.path.insert(0,str(OUT));from check_production_helpers import seed,goto
paths=['/admin','/admin/bank','/admin/editor','/admin/editor/Q-0051','/admin/import','/admin/builder','/admin/grading','/admin/students','/admin/analytics'];rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width,height,scale in [(1366,768,100),(320,568,100),(320,256,100),(1024,768,200)]:
  c=b.new_context(viewport={'width':width,'height':height});c.add_init_script(seed('light','ru'));page=c.new_page()
  for path in paths:
   goto(page,path);page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale);main=page.locator('.teacher-main');main.evaluate('(e)=>e.scrollTop=0');bounds=main.bounding_box();extent=main.evaluate('(e)=>e.scrollHeight-e.clientHeight')
   page.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+min(bounds['height']/2,50));page.mouse.wheel(0,600);page.wait_for_timeout(200);wheel=main.evaluate('(e)=>e.scrollTop')
   main.evaluate('(e)=>e.scrollTop=0');main.focus();page.keyboard.press('PageDown');page.wait_for_timeout(200);keyboard=main.evaluate('(e)=>e.scrollTop')
   buttons=main.locator('button:visible:not(:disabled),a[href]:visible,input:visible:not(:disabled),select:visible:not(:disabled),textarea:visible:not(:disabled)');last=buttons.last;last.focus();page.wait_for_timeout(50)
   focused=last.evaluate("""e=>{const r=e.getBoundingClientRect(),m=e.closest('main').getBoundingClientRect();return r.top>=m.top-1&&r.bottom<=m.bottom+1&&r.left>=m.left-1&&r.right<=m.right+1}""")
   menu=page.locator('.workspace-topbar');navVisible=not menu.count() or menu.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}')
   row={'route':path,'viewport':[width,height],'rootTextPercent':scale,'scrollExtent':extent,'wheelTop':wheel,'keyboardTop':keyboard,'lastControlVisible':focused,'navigationVisible':navVisible,'horizontalOverflow':main.evaluate('(e)=>e.scrollWidth>e.clientWidth+1')};row['passed']=(extent<=1 or wheel>0 and keyboard>0) and focused and navVisible and not row['horizontalOverflow'];rows.append(row)
  c.close();print('Teacher scroll',width,height,scale,flush=True)
 b.close()
(OUT/'teacher-scroll-checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps([r for r in rows if not r['passed']],ensure_ascii=True));assert len(rows)==36 and all(r['passed'] for r in rows)
