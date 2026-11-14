"""Small, palette-indexed facial overlays. Never alter an approved source part.
Coordinates are in the original 64px portrait; Gorgon's eye pixels stay untouched.
"""
import struct
from PIL import Image, ImageDraw
NAMES=[['exhausted','holding-back-sadness','quietly-determined'],['sheepish','strained-smile','reassuring'],['deadpan-disbelief','uncomfortable-concern','grudging-approval'],['sleepy','awkward-concern','sincere-encouragement'],['weary-patience','restrained-disapproval','reluctant-softening'],['tearful','frightened','small-brave-resolve']]
def unpack(data,i):
 at=struct.unpack_from('<I',data,32+4*i)[0];x,y,w,h,alpha=data[at:at+5];at+=5;s=(w*3+7)//8;ms=(w+7)//8;im=Image.new('RGBA',(64,64))
 for yy in range(h):
  v=int.from_bytes(data[at+yy*s:at+(yy+1)*s],'big')
  for xx in range(w):
   if not alpha or data[at+h*s+yy*ms+xx//8]&(128>>(xx%8)):
    p=(v>>(s*8-3*(xx+1)))&7;im.putpixel((x+xx,y+yy),(p,p,p,255))
 return im

def pack(im):
 x,y,x2,y2=im.getbbox();w=x2-x;h=y2-y;s=(w*3+7)//8;ms=(w+7)//8;out=bytearray([x,y,w,h,1])
 for yy in range(y,y2):
  v=0
  for xx in range(x,x2):v=(v<<3)|im.getpixel((xx,yy))[0]
  out+=(v<<(s*8-w*3)).to_bytes(s,'big')
 for yy in range(y,y2):
  v=0
  for xx in range(x,x2):v=(v<<1)|int(bool(im.getpixel((xx,yy))[3]))
  out+=(v<<(ms*8-w)).to_bytes(ms,'big')
 return bytes(out)

def expand(data,who,patches):
 count=data[5];parts=[]
 for i in range(count):
  at=struct.unpack_from('<I',data,32+4*i)[0];end=struct.unpack_from('<I',data,36+4*i)[0] if i+1<count else len(data);parts.append(data[at:end])
 def add(im):
  p=pack(im)
  if p not in parts:parts.append(p)
  return parts.index(p)
 def draw(im):return ImageDraw.Draw(im)
 def c(i):return (i,i,i,255)
 timelines={}
 if who<4:
  # Keep glasses, freckles, hair and individual eye construction from the pack.
  sources=[['eyes-open','eyes-open','eyes-look'],['eyes-look','eyes-open','eyes-open'],['eyes-look','eyes-open','eyes-open'],['eyes-open','eyes-open','eyes-open']][who]
  mouths=[['mouth-small','mouth-worried','mouth-think'],['mouth-small','mouth-rest','mouth-rest'],['mouth-think','mouth-worried','mouth-small'],['mouth-small','mouth-worried','mouth-rest']][who]
  ink=[0,1,0,0][who];skin=[2,4,3,4][who]
  eyes=[(22,38,30),(24,39,27),(24,38,28),(25,39,26)][who]
  for j,name in enumerate(NAMES[who]):
   im=unpack(data,patches.index(sources[j]));d=draw(im);lx,rx,ey=eyes
   if j==0 and who in (0,3):
    # Upper lids descend; pupils remain visible below the lids.
    for x in (lx,rx):d.line((x-1,ey-1,x+4,ey-1),fill=c(skin),width=2);d.line((x-1,ey,x+4,ey),fill=c(ink))
   # Replace the existing brows in place, rather than adding a second brow.
   boxes=[[(22,23,28,25),(39,24,43,26)],[(24,24,29,25),(38,24,43,25)],[(24,23,28,24),(37,23,42,24)],[(25,22,29,24),(38,22,42,24)]][who]
   for side,(x,y,x2,y2) in enumerate(boxes):
    d.rectangle((x,y,x2,y2),fill=c(skin))
    if j==1:pts=(x,y2 if side==0 else y,x2,y if side==0 else y2)
    elif j==2 and who==0:pts=(x,y if side==0 else y2,x2,y2 if side==0 else y)
    elif j==2:pts=(x,y+1,x2,y if side==0 else y+1)
    else:pts=(x,y+1,x2,y+1 if who in (0,2,3) else y)
    d.line(pts,fill=c(ink))
   eye=add(im);mouth=patches.index(mouths[j])
   if (who==1 and j in (0,1)) or (who==2 and j==2) or (who==0 and j==0):
    m=unpack(data,mouth);dd=draw(m);my=40 if who<2 else 38;dd.rectangle((28,my-2,38,my+1),fill=c(skin));dd.line((30,my,35,my),fill=c(ink));dd.point((36,my-1),fill=c(ink));mouth=add(m)
   timelines[name]=[(220,patches.index('eyes-open'),patches.index('mouth-rest'),0,0),(180,eye,patches.index('mouth-rest'),0,0),(1100,eye,mouth,0,0)]
 else:
  # Overlay only the marked pixels over neutral pose 0. f.mouth != 255 marks
  # this composition; old held-pose frames retain the sentinel and exact pixels.
  for j,name in enumerate(NAMES[who]):
   im=Image.new('RGBA',(64,64));d=draw(im)
   if who==4:
    # Do not touch either eye (x16..24/y22..25, x29..36/y21..24).
    if j==0:d.line((18,20,24,20),fill=c(4));d.line((30,19,36,19),fill=c(4))
    elif j==1:d.line((18,19,24,20),fill=c(6));d.line((30,19,36,18),fill=c(6))
    else:d.line((18,20,23,19),fill=c(3));d.line((30,19,35,19),fill=c(3))
    m=Image.new('RGBA',(64,64));dd=draw(m);dd.rectangle((25,32,31,34),fill=c(2));dd.line([(26,34 if j==1 else 33),(29,33 if j<2 else 34),(31,34 if j==1 else 33)],fill=c(6))
   else:
    if j==0:
     d.line((23,26,28,25),fill=c(6));d.line((36,25,41,26),fill=c(6))
     d.line((24,33,24,36),fill=c(1));d.line((40,33,40,35),fill=c(1))
    elif j==1:
     d.line((23,26,28,24),fill=c(7));d.line((36,24,41,26),fill=c(7));d.line((24,29,28,29),fill=c(1));d.line((37,29,40,29),fill=c(1))
    else:d.line((23,27,28,28),fill=c(6));d.line((36,28,41,27),fill=c(6))
    m=Image.new('RGBA',(64,64));dd=draw(m);dd.rectangle((29,39,36,41),fill=c(3))
    if j==1:dd.rectangle((31,39,34,41),fill=c(7));dd.line((32,40,33,40),fill=c(5))
    else:dd.line([(30,40),(33,39 if j==0 else 40),(36,40)],fill=c(6))
   eye=add(im);mouth=add(m);timelines[name]=[(240,0,255,0,0),(180,eye,eye,0,0),(1100,eye,mouth,0,0)]
 out=bytearray(data[:32]);out[5]=len(parts);offset=32+4*len(parts)
 for p in parts:out+=struct.pack('<I',offset);offset+=len(p)
 return bytes(out+b''.join(parts)),timelines
