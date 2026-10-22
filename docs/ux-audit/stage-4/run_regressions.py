"""Preserve earlier evidence; adapt only the authorized explicit code-submit flow."""
import json,re,sys,time
from pathlib import Path
OUT=Path(__file__).resolve().parent
source=OUT.parent/'stage-2/check_components.py'
code=source.read_text(encoding='utf-8')
code=re.sub(r"page.keyboard.press\('[^']+'\)",lambda m:m.group(0)+";page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')",code)
exec(compile(code,str(source),'exec'),{'__file__':str(OUT/'check_components.py'),'__name__':'__main__'})
sys.path.insert(0,str(OUT.parent/'stage-0'))
import capture_baseline
out=OUT/'regressions';(out/'screenshots').mkdir(parents=True,exist_ok=True)
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
now=int(time.time()*1000)
for session in fixture['sessions'].values():
 session['startedAt']=now;session['endsAt']=now+9000000 if session['mode']=='mock' else None
(out/'fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2),encoding='utf-8')
capture_baseline.OUT=out
for filename in ['check_flows.py','check_discovery.py']:
 source=OUT.parent/'stage-0'/filename;code=source.read_text(encoding='utf-8')
 if filename=='check_discovery.py':
  code=code.replace("page.locator('.otp input').first.fill('123456');", "page.locator('.otp input').first.fill('123456');page.locator('button[type=\"submit\"]').click();")
 exec(compile(code,str(source),'exec'),{'__file__':str(source),'__name__':'__main__'})
