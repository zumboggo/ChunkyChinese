from pathlib import Path
from PIL import Image
import struct,json,hashlib
r=Path(__file__).resolve().parent
m=json.loads((r/'manifest.json').read_text()); raw=(r/'gorgon.bin').read_bytes()
assert raw[:6]==b'GT64\x01\x06'
n=struct.unpack_from('<H',raw,6)[0]; palette=[tuple(raw[i:i+3]) for i in range(8,32,3)]
poses=[]
for p in range(6):
 im=Image.new('RGB',(64,64))
 ids=struct.unpack_from('<64H',raw,32+24*n+128*p)
 for k,idx in enumerate(ids):
  assert idx<n
  for y in range(8):
   bits=int.from_bytes(raw[32+24*idx+3*y:35+24*idx+3*y],'big')
   for x in range(8):im.putpixel((k%8*8+x,k//8*8+y),palette[(bits>>(21-3*x))&7])
 poses.append(im)
assert len(raw)==32+24*n+768
motion=(r/'gorgon.motion').read_bytes();assert motion[:6]==b'GM64\x01\x06';offset=6;count=0
for name,a in m['animations'].items():
 steps,hold=motion[offset:offset+2];offset+=2
 assert hold==1 and steps==len(a['steps'])
 for j,s in enumerate(a['steps']):
  ms,p=struct.unpack_from('<HB',motion,offset);offset+=3
  assert (ms,p)==(s['ms'],s['pose'])
  frame=Image.open(r/name/f'{j:02}.png').convert('RGB')
  assert frame.tobytes()==poses[p].tobytes()
  assert len(set(frame.getdata()))<=8
  count+=1
 gif=Image.open(r/'preview'/f'{name}.gif');assert 'loop' not in gif.info
assert offset==len(motion)
result={'verifiedFrames':count,'artBytes':len(raw),'motionBytes':len(motion),'totalBytes':len(raw)+len(motion),'sha256':hashlib.sha256(raw+motion).hexdigest()}
(r/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
