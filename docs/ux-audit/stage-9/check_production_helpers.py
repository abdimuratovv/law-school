"""Production route/theme/language matrix and axe audit; isolated synthetic storage."""
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;BASE='http://127.0.0.1:5174'
sys.path.insert(0,str(OUT.parent/'stage-0'));from capture_baseline import ROUTES
fixture=json.loads((OUT.parent/'stage-0/fixture.json').read_text(encoding='utf-8'));now=int(time.time()*1000)
for s in fixture['sessions'].values():s.update(startedAt=now,endsAt=now+9000000 if s['mode']=='mock' else None)
def goto(page,path):
 page.goto(BASE+path,wait_until='domcontentloaded',timeout=60000);page.wait_for_load_state('networkidle',timeout=60000);page.evaluate('document.fonts.ready')
def seed(theme,lang):
 v={'hm.user':json.dumps({'phone':'901234567'}),'hm.theme':json.dumps(theme),'hm.language':lang,'hm.sessions':json.dumps(fixture['sessions']),'hm.attempts':json.dumps(fixture['attempts']),'hm.mistakes':json.dumps(['Q-0051'])}
 return 'if(!sessionStorage.getItem("seeded")){for(const[k,v]of Object.entries('+json.dumps(v)+'))localStorage.setItem(k,v);sessionStorage.setItem("seeded","1")}'
