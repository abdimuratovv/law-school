"""Retain authoring, learning and shared/baseline behavior after localization changes."""
import subprocess,sys
from pathlib import Path
OUT=Path(__file__).resolve().parent
for name in ([] if '--learning-only' in sys.argv else ['check_authoring.py','check_edges.py','run_regressions.py']):
 subprocess.run([sys.executable,str(OUT/name)],check=True)
sys.path.insert(0,str(OUT.parent/'stage-6'))
for name in ['check_learning.py','check_edges.py']:
 source=OUT.parent/'stage-6'/name
 code=source.read_text(encoding='utf-8').replace('Saqlashni qayta urinish','Qayta saqlash')
 exec(compile(code,str(source),'exec'),{'__file__':str(OUT/('retained-'+name)),'__name__':'__main__'})
