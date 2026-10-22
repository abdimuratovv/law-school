"""Reuse prior checks, redirecting every result into this milestone."""
from pathlib import Path
import re,sys,runpy,json,time
OUT=Path(__file__).resolve().parent
for filename in (['check_components.py'] if '--discovery-only' not in sys.argv else []):
 source=OUT.parent/'stage-2'/filename
 code=source.read_text(encoding='utf-8')
 if filename=='check_components.py':
  # The historical checks read attributes immediately after synthetic key events.
  # Wait for React's render commit before inspecting; retain every original assertion.
  code=re.sub(r"page.keyboard.press\('[^']+'\)",lambda m:m.group(0)+";page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')",code)
 # Both entry points derive their output directory from __file__.
 exec(compile(code,str(source),'exec'),{'__file__':str(OUT/filename),'__name__':'__main__'})

sys.path.insert(0,str(OUT.parent/'stage-0'))
import capture_baseline
out=OUT/'regressions';(out/'screenshots').mkdir(parents=True,exist_ok=True)
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
now=int(time.time()*1000)
for session in fixture['sessions'].values():
 session['startedAt']=now;session['endsAt']=now+9000000 if session['mode']=='mock' else None
(out/'fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2),encoding='utf-8')
capture_baseline.OUT=out
for filename in (['check_discovery.py'] if '--discovery-only' in sys.argv else ['check_flows.py','check_discovery.py']):
 runpy.run_path(str(OUT.parent/'stage-0'/filename),run_name='__main__')
