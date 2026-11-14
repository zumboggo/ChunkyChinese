from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parent
source=Image.open(root/'source.png').convert('RGBA')
# Fit portrait in 30x30, preserving its slender aspect ratio and one-pixel margin.
alpha=source.getchannel('A').point(lambda a:255 if a>=128 else 0)
bounds=alpha.getbbox();crop=source.crop(bounds)
crop.thumbnail((30,30),Image.Resampling.NEAREST)
out=Image.new('RGBA',(32,32));out.paste(crop,((32-crop.width)//2,31-crop.height))
palette=[(85,0,0),(85,85,85),(170,85,0),(255,170,85)]
# Map the four source design roles into four exact Pebble color values.
for y in range(32):
 for x in range(32):
  r,g,b,a=out.getpixel((x,y))
  if a<128:out.putpixel((x,y),(0,0,0,0));continue
  if max(r,g,b)-min(r,g,b)<35:color=palette[1]
  elif r>205:color=palette[3]
  elif r>115:color=palette[2]
  else:color=palette[0]
  out.putpixel((x,y),(*color,255))
# Restore sparse facial features that fall between samples during reduction.
for x,y in [(17,14),(17,15),(21,14),(21,15),(19,19),(20,19)]:
 out.putpixel((x,y),(*palette[0],255))
out.putpixel((21,17),(*palette[2],255))
out.save(root/'alden-shonen-32.png')
large=out.resize((512,512),Image.Resampling.NEAREST)
background=Image.new('RGBA',large.size,'#f4f0e8');background.alpha_composite(large);background.convert('RGB').save(root/'alden-shonen-16x.png')
colors=sorted(set(p[:3] for p in out.getdata() if p[3]))
assert out.size==(32,32) and len(colors)==4
assert set(p[3] for p in out.getdata())=={0,255}
assert all(channel%85==0 for rgb in colors for channel in rgb)
report={'dimensions':[32,32],'visibleColors':['#%02x%02x%02x'%c for c in colors],'visibleColorCount':len(colors),'alpha':'binary transparency','enlargement':'16x nearest-neighbor; backdrop is not part of sprite palette','status':'Static design awaiting user review; not animated or installed'}
(root/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
