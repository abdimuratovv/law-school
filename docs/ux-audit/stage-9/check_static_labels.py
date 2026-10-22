"""Regression for named, noninteractive static answer groups in all actual consumers."""
import json,sys,tarfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(OUT));from check_production_helpers import seed,goto
with tarfile.open(OUT/'tools/axe-core-4.10.3.tgz') as a:axe=a.extractfile('package/axe.min.js').read().decode()
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for theme in ['light','dark']:
  for lang in ['uz','kaa','ru']:
   c=b.new_context(viewport={'width':1366,'height':768},color_scheme=theme);c.add_init_script(seed(theme,lang));page=c.new_page()
   for case,path in [('correct-review','/results/baseline/q/1'),('incorrect-review','/results/wrong/q/1'),('bank-preview','/admin/bank?q=Q-0051'),('editor-preview','/admin/editor/Q-0051')]:
    if case=='incorrect-review':page.evaluate("()=>{const a=JSON.parse(localStorage.getItem('hm.attempts'));const wrong={...a[0],id:'wrong',answers:{...a[0].answers,'Q-0051':'B'}};localStorage.setItem('hm.attempts',JSON.stringify([...a,wrong]))}")
    goto(page,path)
    if case=='bank-preview':page.locator('tbody .btn').first.click()
    if case=='editor-preview':page.locator('.authoring-form>.authoring-actions button').last.click()
    groups=page.locator('.opt[role=group]');expected=2 if case.endswith('-review') else 1;expect(groups).to_have_count(expected);labels=groups.evaluate_all('els=>els.map(e=>({name:e.getAttribute("aria-label"),tabIndex:e.tabIndex,radio:e.getAttribute("aria-checked")}))')
    page.add_script_tag(content=axe);report=page.evaluate("""async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['aria-allowed-attr','aria-prohibited-attr','aria-roles']}});return {violations:r.violations.map(v=>v.id),incomplete:r.incomplete.map(v=>v.id)}}""")
    row={'case':case,'theme':theme,'language':lang,'labels':labels,**report};row['passed']=len(labels)==expected and all(v['name'] and v['tabIndex']==-1 and v['radio'] is None for v in labels) and not report['violations'] and not report['incomplete'];rows.append(row)
   c.close()
 b.close()
(OUT/'static-answer-checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps([r for r in rows if not r['passed']],ensure_ascii=True));assert len(rows)==24 and all(r['passed'] for r in rows)
