"""Error summaries, written authoring and conflict choices under text/reflow stress."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
prefix=(OUT/'capture_authoring.py').read_text(encoding='utf-8').split('with sync_playwright() as p:')[0]
exec(compile(prefix,str(OUT/'capture_authoring.py'),'exec'))
records=[]
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',headless=True)
    for width,height,scale in [(320,568,200),(1024,480,100)]:
        for theme in ['light','dark']:
            for lang in ['uz','kaa','ru']:
                c=b.new_context(viewport={'width':width,'height':height})
                c.add_init_script('localStorage.setItem("hm.language",'+json.dumps(lang)+');localStorage.setItem("hm.theme",'+json.dumps(json.dumps(theme))+');window.MutationObserver=class{observe(){}disconnect(){}}')
                page=c.new_page();page.on('dialog',lambda d:d.accept())
                for name in ['question-errors','written-preview','conflict-dialog']:
                    page.goto(BASE+'/admin/editor'+('/Q-0414' if name=='written-preview' else ''));page.wait_for_load_state('networkidle')
                    if name!='conflict-dialog':page.locator('.authoring-form>.authoring-actions button').click()
                    else:
                        page.locator('.authoring-save button').first.click()
                        page.evaluate("""()=>{const k='hm.authoringDrafts.v1';const s=JSON.parse(localStorage.getItem(k));s.drafts['question:new'].revision='other-tab';localStorage.setItem(k,JSON.stringify(s))}""")
                        page.locator('#md').fill('Current fields remain in memory')
                        page.locator('dialog[open]').wait_for()
                    page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale)
                    inspect(page,name,{'viewport':[width,height],'scale':scale,'theme':theme,'language':lang},records)
                    page.screenshot(path=str(OUT/'screenshots'/f'validation-{name}-{width}-{theme}-{lang}.png'),animations='disabled')
                c.close()
            print('Validation layouts',width,theme,flush=True)
    b.close()
(OUT/'validation-layouts.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([r for r in records if not r['passed']],ensure_ascii=True))
assert len(records)==36 and all(r['passed'] for r in records)
