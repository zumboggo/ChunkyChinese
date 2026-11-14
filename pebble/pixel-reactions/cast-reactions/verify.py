from pathlib import Path
R=Path(__file__).resolve().parent
source=(R.parent/'alden-sincere/verify.py').read_text()
for character in ['bo','jeremy']:
 code=source.replace("r=Path(__file__).resolve().parent",f"r=Path({str(R/character)!r})").replace('alden-sincere',character).replace("[frame['eyes'],'cheeks','nose',frame['mouth']]","[frame['eyes'],frame['mouth']]")
 exec(compile(code,str(R/'verify.py'),'exec'),{})
