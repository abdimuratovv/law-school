from pathlib import Path
OUT=Path(__file__).resolve().parent
for name in ['check_assessment.py','check_timing_and_guards.py']:
 source=OUT.parent/'stage-5'/name
 exec(compile(source.read_text(encoding='utf-8'),str(source),'exec'),{'__file__':str(OUT/name),'__name__':'__main__'})
