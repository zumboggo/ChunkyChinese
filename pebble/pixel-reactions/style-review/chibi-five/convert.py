from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent
source=Image.open(root/'source.png').convert('RGBA')
bounds=source.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
source=source.crop(bounds);source.thumbnail((30,30),Image.Resampling.NEAREST)
im=Image.new('RGBA',(32,32));im.paste(source,((32-source.width)//2,31-source.height))
palette=[(46,27,23),(139,86,55),(80,78,81),(184,182,181),(255,211,170)]
for y in range(32):
 for x in range(32):
  r,g,b,a=im.getpixel((x,y))
  if a<128:im.putpixel((x,y),(0,0,0,0));continue
  if r>205 and g>160 and b<210:idx=4
  elif max(r,g,b)-min(r,g,b)<35:idx=3 if r>135 else 2 if r>55 else 0
  elif r>85:idx=1
  else:idx=0
  im.putpixel((x,y),(*palette[idx],255))
# Restore eye and mouth clusters lost between sampling points at 32 pixels.
for x,y in [(14,15),(15,15),(14,16),(15,16),(14,17),(15,17),(20,15),(21,15),(20,16),(21,16),(20,17),(21,17),(17,20)]:
 im.putpixel((x,y),(*palette[0],255))
for x,y in [(14,15),(20,15)]:im.putpixel((x,y),(*palette[3],255))
im.save(root/'alden-chibi-32-five-colors.png')
large=im.resize((512,512),Image.Resampling.NEAREST)
preview=Image.new('RGBA',(512,512),'white');preview.alpha_composite(large);preview.convert('RGB').save(root/'alden-chibi-16x.png')
colors=sorted(set(p[:3] for p in im.getdata() if p[3]));assert len(colors)==5 and im.size==(32,32)
assert set(p[3] for p in im.getdata())=={0,255}
(root/'validation.json').write_text(json.dumps({'dimensions':[32,32],'visibleColorCount':5,'palette':['#%02x%02x%02x'%c for c in colors],'transparency':'binary; white preview background not encoded in sprite','paletteStatus':'Design palette preserves requested peach skin; not yet mapped to Pebble 64-color hardware palette','enlargement':'16x nearest-neighbor','status':'Static user-review asset, no animation'},indent=2)+'\n')
print('Validated 32x32, exactly five visible colors, binary alpha')
