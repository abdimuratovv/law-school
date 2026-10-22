from pathlib import Path
OUT=Path(__file__).resolve().parent
(OUT/'production-assessment').mkdir(exist_ok=True)
for name in ['check_assessment.py','check_timing_and_guards.py']:
 source=OUT.parent/'stage-5'/name
 code=source.read_text(encoding='utf-8').replace("BASE='http://127.0.0.1:5173'","BASE='http://127.0.0.1:5174'")
 code=code.replace("(OUT.parent/'stage-0/fixture.json')", "(OUT.parent.parent/'stage-0/fixture.json')")
 exec(compile(code,str(source),'exec'),{'__file__':str(OUT/'production-assessment'/name),'__name__':'__main__'})
