from pathlib import Path
import sys
r=Path(__file__).resolve().parent;count=int(sys.argv[1]);assert count in (8,16)
s=(r.parent/'hybrid-prototype/verify.py').read_text()
s=s.replace("r=Path(__file__).resolve().parent;cli=r.parent/'isolated-cli.sh';stage=r.parent/'.local/hybrid-reader';out=r/'verification';out.mkdir(exist_ok=True)",f"r=Path({str(r/count.__str__())!r});cli=r.parent.parent/'isolated-cli.sh';stage=r.parent.parent/'.local/compact{count}-reader';out=r/'verification';out.mkdir(exist_ok=True)")
s=s.replace("stage/'build/hybrid-reader.pbw'",f"stage/'build/compact{count}-reader.pbw'").replace("r/'alden.layers'","r/'alden.bin'")
s=s.replace("with (out/'watch.log').open('w') as f:","run('screenshot','--no-open',out/'preflight.png')\nwith (out/'watch.log').open('w') as f:")
exec(compile(s,str(r/'verify.py'),'exec'))
