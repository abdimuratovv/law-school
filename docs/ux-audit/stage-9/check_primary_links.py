"""Composed text contrast and layout of primary teacher links, including authoring."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5174'
sys.path.insert(0,str(OUT.parent/'stage-2'));from measure_reference import pixel_probe
records=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for width,height in [(1366,768),(320,568)]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=b.new_context(viewport={'width':width,'height':height});c.add_init_script('localStorage.setItem("hm.language",'+json.dumps(lang)+');localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');');page=c.new_page();page.on('dialog',lambda d:d.accept())
    for name,path in [('overview','/admin'),('bank','/admin/bank'),('analytics-choice','/admin/analytics?q=Q-0422'),('analytics-written','/admin/analytics?q=Q-0119'),('import-complete','/admin/import')]:
     for attempt in range(2):
      try:page.goto(BASE+path,wait_until='domcontentloaded',timeout=60000);page.wait_for_load_state('networkidle',timeout=60000);break
      except Exception:
       if attempt:raise
     if name=='import-complete':
      page.locator('.authoring-form .authoring-actions button').nth(1).click()
      page.locator('.authoring-form>.authoring-card>.authoring-actions button').last.click()
      page.locator('.authoring-form>.authoring-card>.authoring-actions button').last.click()
     selector='.authoring-page a.btn-primary';link=page.locator(selector).first;link.wait_for()
     measurement=pixel_probe(page,selector,'primary teacher link')
     rect=link.bounding_box();overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
     row={'case':name,'viewport':[width,height],'theme':theme,'language':lang,**measurement,'overflow':overflow,'rect':rect};row['passed']=measurement['passed'] and not overflow and rect['width']>=43.9 and rect['height']>=43.9;records.append(row)
     link.screenshot(path=str(OUT/'screenshots'/f'primary-{name}-{width}-{theme}-{lang}.png'),animations='disabled')
    c.close();print('Primary links',width,theme,lang,flush=True)
 b.close()
(OUT/'primary-link-checks.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([r for r in records if not r['passed']],ensure_ascii=True))
assert len(records)==60 and all(r['passed'] for r in records)
