"""Read-only baseline against Vite; requires Python Playwright and installed Chrome.
Run from the repository root: python docs/ux-audit/stage-0/capture_baseline.py
Uses disposable contexts, never the user's browser profile.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:5173'
ROUTES = [
 ('sign-in','/sign-in'), ('home','/'), ('getting-started','/getting-started'),
 ('tests','/tests'), ('lobby','/tests/practice-1'), ('timed-lobby','/tests/mock-7'),
 ('exam','/exam/practice-1'), ('timed-exam','/exam/mock-7'),
 ('results','/results/baseline'), ('review','/results/baseline/q/1'),
 ('mistakes','/mistakes'), ('progress','/progress'), ('profile','/profile'),
 ('admin','/admin'), ('bank','/admin/bank'), ('editor-new','/admin/editor'),
 ('editor-existing','/admin/editor/Q-0051'), ('import','/admin/import'),
 ('builder','/admin/builder'), ('grading','/admin/grading'),
 ('students','/admin/students'), ('analytics','/admin/analytics'), ('design','/design')]

MEASURE = """() => {
 const visible=e=>{const r=e.getBoundingClientRect(); const s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 const controls=[...document.querySelectorAll('button,a[href],input,select,textarea,[role="checkbox"]')].filter(visible);
 return {title:document.title, headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent.trim()),
 mainCount:document.querySelectorAll('main,[role="main"]').length,
 horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
 smallTargets:controls.filter(e=>{let r=e.getBoundingClientRect();return r.width<44||r.height<44}).map(e=>({tag:e.tagName,role:e.getAttribute('role'),text:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('placeholder')||'').trim().slice(0,95),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height),class:e.className})),
 unnamedButtons:controls.filter(e=>e.tagName==='BUTTON'&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.textContent.trim()&&!e.getAttribute('title')).map(e=>e.outerHTML.slice(0,250))};
}"""

def ready(page):
 page.wait_for_load_state('networkidle')
 page.evaluate('document.fonts.ready')

def main():
 (OUT/'screenshots').mkdir(parents=True, exist_ok=True)
 records=[]
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='chrome',headless=True)
  ctx=browser.new_context(); page=ctx.new_page(); page.goto(BASE); ready(page)
  fixture=page.evaluate("""async()=>{
   const {TESTS}=await import('/src/data/tests.ts'); const {getQuestion}=await import('/src/data/questions.ts');
   const now=Date.now(); const sessions={};
   for(const id of ['practice-1','mock-7']) { const t=TESTS.find(t=>t.id===id); sessions[id]={testId:id,mode:t.mode,startedAt:now,endsAt:t.timeLimit?now+t.timeLimit*1000:null,answers:{},flags:{},current:0}; }
   const t=TESTS.find(t=>t.id==='practice-1');const answers={};
   for(const id of t.questionIds){const q=getQuestion(id); answers[id]=q.kind==='single'?'A':(q.accepted[0]||'review')+'x';}
   return {sessions,attempts:[{id:'baseline',testId:t.id,mode:t.mode,submittedAt:now,durationSec:180,answers,flags:{}}],questions:t.questionIds.map(id=>getQuestion(id))};
  }""")
  (OUT/'fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2),encoding='utf-8');ctx.close()
  for width,height in [(1440,900),(1366,768),(1024,768)]:
   for theme in ['light','dark']:
    for lang in ['uz','kaa','ru']:
     ctx=browser.new_context(viewport={'width':width,'height':height},color_scheme=theme,timezone_id='Asia/Tashkent')
     init={'hm.user':json.dumps({'phone':'901234567','name':'','group':''}),'hm.theme':json.dumps(theme),'hm.language':lang,'hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.mistakes':json.dumps(['Q-0051'])}
     ctx.add_init_script('const seed='+json.dumps(init)+'; if(!sessionStorage.getItem("baseline-seeded")){for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem("baseline-seeded","1")}')
     page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     for name,path in ROUTES:
      page.goto(BASE+path);ready(page)
      filename=f'{width}x{height}-{theme}-{lang}-{name}.png'
      page.screenshot(path=str(OUT/'screenshots'/filename),full_page=True)
      records.append({'route':path,'viewport':[width,height],'theme':theme,'language':lang,'screenshot':'screenshots/'+filename,'actualPath':page.url.removeprefix(BASE),'errors':list(errors),**page.evaluate(MEASURE)})
      errors.clear()
     ctx.close()
     (OUT/'browser-observations.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
     print(f'{width}x{height} {theme} {lang}: {len(records)} captures',flush=True)
  browser.close()
 print('Baseline capture complete',flush=True)

if __name__=='__main__':main()
