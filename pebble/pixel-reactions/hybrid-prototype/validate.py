"""Verify the on-watch byte stream and reconstruct every rendered pose from it."""
from pathlib import Path
import struct,json
from PIL import Image,ImageChops
r=Path(__file__).resolve().parent;j=json.loads((r/'manifest.json').read_text());b=(r/'alden.layers').read_bytes();parts=[]
for i,name in enumerate(j['layers']):
 at=struct.unpack_from('<I',b,4*i)[0];x,y,w,h=b[at:at+4];at+=4;im=Image.new('RGBA',(200,228))
 assert 0<w<=200 and 0<h<=228 and x+w<=200 and y+h<=228
 for yy in range(h):
  runs=b[at];at+=1;row=[]
  if runs:
   for _ in range(runs):length,color=b[at:at+2];at+=2;assert length;row.extend([color]*length)
  else:row=list(b[at:at+w]);at+=w
  assert len(row)==w
  for xx,c in enumerate(row):
   assert c==0 or c>=192
   im.putpixel((x+xx,y+yy),((c>>4&3)*85,(c>>2&3)*85,(c&3)*85,255) if c else (0,0,0,0))
 end=struct.unpack_from('<I',b,4*(i+1))[0] if i+1<len(j['layers']) else len(b)
 assert at==end
 parts.append(im)
frames=[]
for kind,x,y in j['timeline']:
 k=['neutral','shock','embarrassed','smile'].index(kind);im=Image.new('RGBA',(200,228),'white')
 for index in [0,1]+([12] if k==1 else [])+[4+k,3,8+k,2]:im.alpha_composite(parts[index],(0,0) if index==0 else (x,y))
 frames.append(im)
assert all(f.crop((0,184,200,211)).tobytes()==frames[0].crop((0,184,200,211)).tobytes() for f in frames),'Torso moves'
assert all(f.tobytes()==frames[-1].tobytes() for f in frames[-6:]),'Final pose does not hold'
frames[-1].convert('RGB').save(r/'verification/expected-held.png')
actual=r/'verification/held.png'
if actual.exists():
 # Emulator screenshots apply a display-color lookup table rather than raw 0/85/170/255.
 mapping={}
 expected=frames[-1].convert('RGB').crop((0,0,200,211))
 observed=Image.open(actual).convert('RGB').crop((0,0,200,211))
 for want,got in zip(expected.getdata(),observed.getdata()):
  if want in mapping:assert mapping[want]==got,'Native shape differs from decoded resource'
  mapping[want]=got
 assert len(set(mapping.values()))==len(mapping),'Unexpected color collapse'
 (r/'verification/display-colors.json').write_text(json.dumps({str(k):v for k,v in mapping.items()},indent=2)+'\n')
print('PASS: 13 bounded layers, 31 frames, fixed torso, final hold, native pixel match when captured')
