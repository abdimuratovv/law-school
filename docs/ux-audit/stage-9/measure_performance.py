"""Retrospective paired production benchmark. Run with other browser suites idle."""
import json,sys,statistics,time,gzip,hashlib,zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[2]
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
for s in fixture['sessions'].values():s.update(startedAt=int(time.time()*1000),endsAt=int(time.time()*1000)+9000000 if s['mode']=='mock' else None)
samples=[]
observe="""window.__bench={lcp:0,longTasks:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__bench.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__bench.longTasks.push(e.duration)}).observe({type:'longtask',buffered:true});"""
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);browserVersion=b.version
 for run in range(6):
  for path in ['/','/exam/practice-1','/admin/bank']:
   for variant in (['baseline','redesign'] if run%2==0 else ['redesign','baseline']):
    port=5175 if variant=='baseline' else 5174;c=b.new_context(viewport={'width':1366,'height':768},color_scheme='light');c.route('https://fonts.googleapis.com/**',lambda r:r.abort());c.route('https://fonts.gstatic.com/**',lambda r:r.abort())
    seed={'hm.user':json.dumps({'phone':'901234567'}),'hm.theme':'"light"','hm.language':'uz','hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts'])}
    c.add_init_script('for(const[k,v]of Object.entries('+json.dumps(seed)+'))localStorage.setItem(k,v);'+observe);page=c.new_page();page.bring_to_front();cdp=c.new_cdp_session(page);cdp.send('Network.enable');cdp.send('Network.setCacheDisabled',{'cacheDisabled':True});cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
    page.goto(f'http://127.0.0.1:{port}'+path,wait_until='networkidle')
    ready='button.opt' if path.startswith('/exam') else ('.tbl tbody tr' if variant=='baseline' else '.authoring-table tbody tr') if path=='/admin/bank' else 'h1'
    page.locator(ready).first.wait_for(state='visible');page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    page.wait_for_function("performance.getEntriesByName('first-contentful-paint').length>0&&window.__bench.lcp>0",timeout=30000);page.wait_for_timeout(300)
    row={'run':run+1,'variant':variant,'route':path,**page.evaluate("""()=>{const n=performance.getEntriesByType('navigation')[0];return {responseEnd:n.responseEnd,domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,lcp:window.__bench.lcp,longTasks:window.__bench.longTasks.length,longTaskTotal:window.__bench.longTasks.reduce((a,b)=>a+b,0)}}""")}
    if path.startswith('/exam'):
     row['answerCommit']=page.evaluate("""async()=>{const start=performance.now();document.querySelector('button.opt').click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {ms:performance.now()-start,saved:!!JSON.parse(localStorage.getItem('hm.sessions'))['practice-1'].answers['Q-0051']}}""")
    row['scroll']=page.evaluate("""async()=>{const candidates=[document.scrollingElement,...document.querySelectorAll('*')].filter(e=>e&&e.clientHeight>100&&e.clientWidth>100&&e.scrollHeight>e.clientHeight+10&&(e===document.scrollingElement||['auto','scroll'].includes(getComputedStyle(e).overflowY)));const el=candidates.sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))[0];if(!el)return {applicable:false};const deltas=[];let last=performance.now();for(let i=0;i<60;i++){el.scrollTop+=20;await new Promise(requestAnimationFrame);const now=performance.now();deltas.push(now-last);last=now}return {applicable:true,deltas,framesOver25ms:deltas.filter(x=>x>25).length,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}}""")
    assert row['fcp'] and row['lcp']>0 and row['scroll']['applicable'],'Missing paint or actual scroll content'
    samples.append(row);c.close();print(run+1,path,variant,round(row['lcp']),flush=True)
    (OUT/'performance-samples.json').write_text(json.dumps(samples,indent=2),encoding='utf-8')
 b.close()
summary=[]
for path in ['/','/exam/practice-1','/admin/bank']:
 for variant in ['baseline','redesign']:
  rows=[r for r in samples if r['route']==path and r['variant']==variant]
  s={'route':path,'variant':variant,'runs':len(rows),'medians':{k:round(statistics.median(r[k] for r in rows),2) for k in ['fcp','lcp','domContentLoaded','load','longTaskTotal']}}
  interactions=[r['answerCommit']['ms'] for r in rows if 'answerCommit' in r]
  if interactions:s['medianAnswerCommitMs']=round(statistics.median(interactions),2);s['allAnswersSaved']=all(r['answerCommit']['saved'] for r in rows)
  frames=[d for r in rows if r['scroll']['applicable'] for d in r['scroll']['deltas']]
  if frames:s['scrollFrameP95Ms']=round(sorted(frames)[int(len(frames)*.95)-1],2);s['framesOver25ms']=sum(d>25 for d in frames);s['measuredFrames']=len(frames)
  summary.append(s)
bundles={}
for name,path in [('baseline',OUT/'baseline-workspace/dist'),('redesign',ROOT/'dist')]:
 bundles[name]=[{'file':f.relative_to(path).as_posix(),'bytes':len(f.read_bytes()),'gzipBytes':len(gzip.compress(f.read_bytes()))} for f in sorted(path.rglob('*')) if f.is_file() and f.suffix in ['.js','.css']]
report={'browserVersion':browserVersion,'method':'Retrospective matched-source production comparison; local Chrome, 1366x768, 4x CPU, cold browser cache, blocked remote fonts, six alternating paired runs; wait for actual route content and positive paint observations. Two-frame scripted answer commit, 60-frame scripted scroll. Not field INP or historical Stage 0 timings.','summary':summary,'bundles':bundles}
(OUT/'performance-summary.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2))
