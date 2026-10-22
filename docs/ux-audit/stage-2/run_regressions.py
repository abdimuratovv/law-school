"""Re-run baseline flows into stage-2 evidence; leave stage-0 history untouched."""
import json,runpy,sys,time
from pathlib import Path

OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(OUT.parent/'stage-0'))
import capture_baseline

out=OUT/'regressions';(out/'screenshots').mkdir(parents=True,exist_ok=True)
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'))
now=int(time.time()*1000)
for session in fixture['sessions'].values():
 session['startedAt']=now
 session['endsAt']=now+9000000 if session['mode']=='mock' else None
(out/'fixture.json').write_text(json.dumps(fixture,ensure_ascii=False,indent=2),encoding='utf-8')
capture_baseline.OUT=out
runpy.run_path(str(OUT.parent/'stage-0/check_flows.py'),run_name='__main__')
runpy.run_path(str(OUT.parent/'stage-0/check_discovery.py'),run_name='__main__')
