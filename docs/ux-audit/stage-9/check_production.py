"""Production route/theme/language matrix and axe audit; isolated synthetic storage."""
import json,sys,time,tarfile
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5174'
sys.path.insert(0,str(OUT.parent/'stage-0'));from capture_baseline import ROUTES
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'));now=int(time.time()*1000)
for s in fixture['sessions'].values():s.update(startedAt=now,endsAt=now+9000000 if s['mode']=='mock' else None)
with tarfile.open(OUT/'tools/axe-core-4.10.3.tgz') as a:
 axe=a.extractfile('package/axe.min.js').read().decode()
rows=[];audits=[];stress=[]
if '--refresh-static' in sys.argv:
 ROUTES=[r for r in ROUTES if r[1]=='/results/baseline/q/1']
 def retained(name):return [r for r in json.loads((OUT/name).read_text(encoding='utf-8')) if r['route']!='/results/baseline/q/1']
 rows=retained('production-routes.json');audits=retained('axe-results.json');stress=retained('production-reflow.json')
MEASURE="""()=>({overflow:document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.teacher-main')].some(e=>e.scrollWidth>e.clientWidth+1),main:document.querySelectorAll('main').length,h1:document.querySelectorAll('main h1').length,lang:document.documentElement.lang,body:!!document.querySelector('main')?.innerText.trim(),width:innerWidth,height:innerHeight})"""
def goto(page,path):
 page.goto(BASE+path,wait_until='domcontentloaded',timeout=60000);page.wait_for_load_state('networkidle',timeout=60000);page.evaluate('document.fonts.ready')
def seed(theme,lang):
 v={'hm.user':json.dumps({'phone':'901234567'}),'hm.theme':json.dumps(theme),'hm.language':lang,'hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.mistakes':json.dumps(['Q-0051'])}
 return 'if(!sessionStorage.getItem("seeded")){for(const[k,v]of Object.entries('+json.dumps(v)+'))localStorage.setItem(k,v);sessionStorage.setItem("seeded","1")}'
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for w,h in [(1440,900),(1366,768),(1024,768)]:
  for theme in ['light','dark']:
   for lang in ['uz','kaa','ru']:
    c=b.new_context(viewport={'width':w,'height':h},color_scheme=theme);c.add_init_script(seed(theme,lang));page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
    for name,path in ROUTES:
     goto(page,path);row={'route':path,'viewport':[w,h],'theme':theme,'language':lang,'actual':page.url.removeprefix(BASE),'errors':list(errors),**page.evaluate(MEASURE)};errors.clear()
     row['passed']=row['actual']==path and row['main']==1 and row['h1']==1 and row['lang']==lang and row['body'] and not row['errors'] and not row['overflow'];rows.append(row)
     if w==1366:
      page.add_script_tag(content=axe)
      report=page.evaluate("""async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});return {version:r.testEngine.version,violations:r.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,html:n.html,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passRules:r.passes.length}}""")
      audits.append({'route':path,'theme':theme,'language':lang,**report,'passed':not report['violations']})
      if lang=='ru' and name in ['exam','results','bank','grading','analytics','design']:
       page.screenshot(path=str(OUT/'screenshots'/f'production-{name}-{theme}.png'),full_page=True,animations='disabled')
    c.close();print('Production matrix',w,theme,lang,len(rows),flush=True)
    for n,v in [('production-routes.json',rows),('axe-results.json',audits)]: (OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf-8')
 # Effective 400% reflow geometry (1280/4), plus separate 200% root text at desktop.
 for width,height,scale,theme,lang in [(320,256,100,t,l) for t in ['light','dark'] for l in ['uz','kaa','ru']]+[(1024,768,200,'light',l) for l in ['uz','kaa','ru']]:
  c=b.new_context(viewport={'width':width,'height':height},color_scheme=theme);c.add_init_script(seed(theme,lang));page=c.new_page();page.on('dialog',lambda d:d.accept())
  for name,path in ROUTES:
   goto(page,path);page.evaluate('s=>document.documentElement.style.fontSize=s+"%"',scale)
   row={'route':path,'theme':theme,'language':lang,'rootTextPercent':scale,**page.evaluate(MEASURE)};row['passed']=not row['overflow'] and row['main']==1 and row['h1']==1 and row['body'];stress.append(row)
   if lang=='ru' and name in ['exam','grading','bank','design']:page.screenshot(path=str(OUT/'screenshots'/f'reflow-{name}-{width}-{scale}-{theme}.png'),full_page=True,animations='disabled')
  c.close();print('Production stress',width,scale,theme,lang,flush=True);(OUT/'production-reflow.json').write_text(json.dumps(stress,ensure_ascii=False,indent=2),encoding='utf-8')
 b.close()
failed=[r for r in rows+audits+stress if not r['passed']]
print('Failures',len(failed),json.dumps([{'route':r['route'],'theme':r['theme'],'language':r['language'],'violations':r.get('violations'),'overflow':r.get('overflow')} for r in failed],ensure_ascii=True));assert not failed
