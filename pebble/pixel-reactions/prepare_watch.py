"""Explicit 5-color mapping for the Pebble hardware; retain approved design sources."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent/'characters/alden-chibi'
m=json.loads((root/'manifest.json').read_text());old=[tuple(bytes.fromhex(c[1:])) for c in m['palette']]
new=[(85,0,0),(170,85,0),(85,85,85),(170,170,170),(255,255,170)]
out=root/'watch';out.mkdir(exist_ok=True)
for entries in m['animations'].values():
 for entry in entries:
  im=Image.open(root/entry['file']).convert('RGBA');im.putdata([(*new[old.index(p[:3])],255) if p[3] else (0,0,0,0) for p in im.getdata()])
  dest=out/entry['file'];dest.parent.mkdir(exist_ok=True);im.save(dest)
m['palette']=['#%02x%02x%02x'%p for p in new]
m['paletteNote']='Watch-native approximation: cream skin, brown hair, charcoal hoodie and light gray shirt. Original peach design palette retained one directory above.'
(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
