from pathlib import Path
R=Path(__file__).resolve().parent
original=(R.parent/'alden-sincere/build.py').read_text();tail=original[original.index('# Timelines:'):]
setup='''from PIL import Image,ImageDraw
from pathlib import Path
import json,struct,io,base64,hashlib
R=Path(DEST)
palette=[tuple(bytes.fromhex(c)) for c in ['ffffff','392016','85421f','c57b39','ffbc80','d68a50','292d43','53688c']]
white,ink,hair,highlight,skin,mouth,shirt,blue=palette
base=Image.open(R/'source/base-shocked.png').convert('RGB');laugh=Image.open(R/'source/laughing.png').convert('RGB')
headmask=Image.new('L',(64,64));d=ImageDraw.Draw(headmask);d.rectangle((0,0,63,48),fill=255);d.rectangle((24,49,39,52),fill=255)
head=base.convert('RGBA');head.putalpha(headmask)
for y in range(64):
 for x in range(64):
  if base.getpixel((x,y))==white:head.putpixel((x,y),(0,0,0,0))
body=base.convert('RGBA');body.putalpha(Image.eval(headmask,lambda x:255-x))
neck=Image.new('RGBA',(64,64));ImageDraw.Draw(neck).rectangle((27,43,38,54),fill=(*skin,255));neck.alpha_composite(body);body=neck
patches={}
def tile(n,box,source):patches[n]=(box[:2],source.crop(box))
def drawn(n,box,fn):
 im=Image.new('RGB',(box[2]-box[0],box[3]-box[1]),skin);fn(ImageDraw.Draw(im));patches[n]=(box[:2],im)
eye=(20,23,46,31);m=(26,37,41,44)
for n,source in [('eyes-open',base),('eyes-shock',base),('eyes-laugh',laugh),('eyes-blink',laugh)]:tile(n,eye,source)
look=base.crop(eye);ref=look.copy()
for x,y,w,h in [(1,1,8,6),(16,1,8,6)]:
 for yy in range(y,y+h):
  for xx in range(x,x+w-1):look.putpixel((xx,yy),ref.getpixel((xx+1,yy)))
patches['eyes-look']=(eye[:2],look)
tile('mouth-shock',m,base);tile('mouth-laugh',m,laugh)
drawn('mouth-rest',m,lambda d:d.line([(4,2),(6,3),(8,3),(10,2)],fill=ink))
drawn('mouth-small',m,lambda d:d.ellipse((6,1,9,4),fill=ink))
drawn('mouth-talk',m,lambda d:(d.polygon([(4,1),(11,1),(9,5),(6,5)],fill=ink),d.line((6,4,9,4),fill=mouth)))
drawn('mouth-think',m,lambda d:d.line((5,3,9,3),fill=ink))
drawn('mouth-worried',m,lambda d:d.line([(4,4),(6,3),(8,3),(10,4)],fill=ink))
'''.replace('DEST',repr(str(R)))
tail=tail.replace("[eyes,'cheeks','nose',mouthname]","[eyes,mouthname]").replace('alden-sincere','hannah-sincere').replace('Alden','Hannah').replace('Gentle Sincerity','Gentle Warmth').replace('Gentle sincerity','Gentle Warmth').replace('Bright curiosity','Gentle Warmth')
exec(compile(setup+tail,str(R/'build.py'),'exec'),{})
