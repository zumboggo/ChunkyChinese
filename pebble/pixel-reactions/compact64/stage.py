from pathlib import Path
import sys
r=Path(__file__).resolve().parent;count=int(sys.argv[1]);assert count in (8,16)
s=(r.parent/'hybrid-prototype/stage.py').read_text()
s=s.replace("r=Path(__file__).resolve().parent;pebble=r.parent.parent;dst=r.parent/'.local/hybrid-reader'",f"r=Path({str(r)!r});pebble=r.parent.parent;dst=r.parent/'.local/compact{count}-reader'")
s=s.replace("j['version']='1.9.2'",f"j['version']='1.9.{3 if count==16 else 4}'")
s=s.replace("'Alden Lab'",f"'Alden {count} Lab'")
s=s.replace("a7b670c8-0444-4d13-a4d2-985da22c17aa",f"b7b670c8-0444-4d13-a4d2-985da22c17{count:02d}")
s=s.replace("r/'alden.layers'",f"r/'{count}/alden.bin'").replace("r/'hybrid.inc'","r/'compact.inc'")
exec(compile(s,str(r/'stage.py'),'exec'))
