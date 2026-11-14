"""Independently decode final poses and compare pixel geometry with emulator captures.
Emery's screenshot renderer applies a display colour profile; verify a consistent,
one-to-one mapping of hardware palette entries rather than assuming raw RGB output.
"""
from pathlib import Path
from PIL import Image
import json,re,struct
root=Path(__file__).resolve().parents[1];data=(root/'reader/resources/data/reactions.bin').read_bytes();header=(root/'reader/src/c/reaction_data.h').read_text()
def table(name):return [list(map(int,x.split(','))) for x in re.findall(r'\{([\d,]+)\}',header.split(name+'[]={',1)[1].split('};',1)[0])]
actors=table('reaction_actors');anims=table('reaction_anims');mapping={};checked=[]
def piece(base,part,palette):
 at=base+struct.unpack_from('<I',data,base+32+part*4)[0];x,y,w,h,alpha=data[at:at+5];at+=5;stride=(w*3+7)//8;im=Image.new('RGBA',(w,h))
 for yy in range(h):
  bits=int.from_bytes(data[at:at+stride],'big');at+=stride
  for xx in range(w):im.putpixel((xx,yy),(*palette[(bits>>(stride*8-3*(xx+1)))&7],255))
 if alpha:
  stride=(w+7)//8
  for yy in range(h):
   bits=int.from_bytes(data[at:at+stride],'big');at+=stride
   for xx in range(w):
    if not(bits>>(stride*8-1-xx))&1:im.putpixel((xx,yy),(0,0,0,0))
 return (x,y),im
for idx,(offset,actor,count) in enumerate(anims):
 base,tiled,cheeks,nose=actors[actor];f=struct.unpack_from('<HBBbb',data,offset+(count-1)*6);ms,eyes,mouth,dx,dy=f
 palette=[tuple(((v+42)//85)*85 for v in data[base+8+i*3:base+11+i*3]) for i in range(8)];im=Image.new('RGBA',(64,64),'white')
 if tiled:
  pos,tile=piece(base,eyes,palette);im.alpha_composite(tile,pos)
 else:
  for part in [0,1,eyes,cheeks,nose,mouth]:
   if part==255:continue
   (x,y),tile=piece(base,part,palette);im.alpha_composite(tile,(x+(dx if part else 0),y+(dy if part else 0)))
 expected=im.convert('RGB').resize((192,192),Image.Resampling.NEAREST)
 actual=Image.open(root/f'.local/reactions/{idx}-held.png').convert('RGB').crop((4,9,196,201))
 for e,a in zip(expected.getdata(),actual.getdata()):
  if e in mapping:assert mapping[e]==a,(idx,e,mapping[e],a)
  else:assert a not in mapping.values(),(idx,'merged distinct hardware colours');mapping[e]=a
 checked.append(idx)
result={'nativeFinalPosesMatched':len(checked),'pixelGeometryMatched':True,'hardwarePaletteEntries':len(mapping),'displayProfileMapping':{str(k):v for k,v in mapping.items()}}
(root/'.local/reactions/pixel-verification.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
