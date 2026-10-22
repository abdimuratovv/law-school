"""Re-measure the approved shared materials against the production build."""
import sys
from pathlib import Path
OUT=Path(__file__).resolve().parent
sys.path.insert(0,str(OUT.parent/'stage-2'))
import measure_reference as ref
ref.OUT=OUT;ref.SHOTS=OUT/'screenshots';ref.BASE='http://127.0.0.1:5174'
ref.main()
source=OUT.parent/'stage-2/check_compositions.py'
exec(compile(source.read_text(encoding='utf-8'),str(source),'exec'),{'__file__':str(OUT/'check_compositions.py'),'__name__':'__main__'})
