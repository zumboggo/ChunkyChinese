"""Ensure silhouette masks preserve approved artwork when composited on white."""
from pathlib import Path
from PIL import Image
import struct,re,json
root=Path(__file__).resolve().parents[1];blob=(root/'reader/resources/data/reactions.bin').read_bytes();header=(root/'reader/src/c/reaction_data.h').read_text();actors=json.loads('['+re.search(r'reaction_actors\[\]=\{(.*)\};',header)[1].replace('{','[').replace('}',']')+']')
def decode(data,base,index):
 palette=[tuple(data[base+8+i*3:base+11+i*3]) for i in range(8)];im=Image.new('RGB',(64,64),'white')
 if data[base:base+4]==b'GT64':
  n=struct.unpack_from('<H',data,base+6)[0];ids=struct.unpack_from('<64H',data,base+32+n*24+index*128)
  for k,t in enumerate(ids):
   for y in range(8):
    bits=int.from_bytes(data[base+32+t*24+y*3:base+35+t*24+y*3],'big')
    for x in range(8):im.putpixel((k%8*8+x,k//8*8+y),palette[(bits>>(21-3*x))&7])
 else:
  at=base+struct.unpack_from('<I',data,base+32+index*4)[0];x,y,w,h,alpha=data[at:at+5];at+=5;stride=(w*3+7)//8;ms=(w+7)//8
  for yy in range(h):
   bits=int.from_bytes(data[at+yy*stride:at+(yy+1)*stride],'big')
   for xx in range(w):
    if alpha and not(data[at+h*stride+yy*ms+xx//8]&(128>>(xx%8))):continue
    im.putpixel((x+xx,y+yy),palette[(bits>>(stride*8-3*(xx+1)))&7])
 return im
sources=['alden-sincere/alden-sincere.bin','hannah-sincere/hannah-sincere.bin','cast-reactions/bo/bo.bin','cast-reactions/jeremy/jeremy.bin','gorgon-reactions/gorgon.bin'];count=0
for who,file in enumerate(sources):
 original=bytearray((root/'pixel-reactions'/file).read_bytes())
 if who==1:original[26:29]=bytes([0,0,85]) # Existing approved hardware navy correction.
 for part in range(original[5]):
  before=decode(original,0,part);after=decode(blob,actors[who][0],part)
  assert before.tobytes()==after.tobytes(),(file,part,'Artwork changed')
  count+=1
names=['neutral','curious','confused','thoughtful','worried'];sheet=Image.new('RGB',(320,64),'white')
for i,name in enumerate(names):sheet.paste(Image.open(root/f'reader/resources/images/YoungAlden-{name}-64.png').convert('RGB'),(i*64,0))
sheet.putdata([(255,255,255) if min(c)>240 else c for c in sheet.getdata()]);q=sheet.quantize(colors=8,dither=Image.Dither.NONE).convert('RGB')
for i in range(5):
 assert q.crop((i*64,0,i*64+64,64)).tobytes()==decode(blob,actors[5][0],i).tobytes(),('YoungAlden',i)
 count+=1
report={'passed':True,'unchangedApprovedPartsOrPoses':count,'sourcePacks':sources+['YoungAlden original five portraits, shared eight-colour quantization'],'comparison':'Exact RGB pixels composited on white; existing Hannah navy mapping retained.'}
out=root/'.local/visual-novel';out.mkdir(parents=True,exist_ok=True);(out/'art-integrity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
