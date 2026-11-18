"""Independent decoder proves the compact resource reproduces all 31 authored frames."""
from pathlib import Path
from PIL import Image
import struct,json,hashlib
r=Path(__file__).resolve().parent;m=json.loads((r/'manifest.json').read_text());data=(r/'alden-sincere.bin').read_bytes();assert data[:4]==b'AS64';version,n,colors,bits=data[4:8];assert(version,colors,bits)==(1,8,3)
palette=[tuple(data[8+i*3:11+i*3]) for i in range(8)];tiles={}
for i,p in enumerate(m['patches']):
 at=struct.unpack_from('<I',data,32+4*i)[0];end=struct.unpack_from('<I',data,32+4*(i+1))[0] if i+1<n else len(data)
 x,y,w,h,alpha=data[at:at+5];at+=5;assert w and h and x+w<=64 and y+h<=64
 im=Image.new('RGBA',(w,h));stride=(w*3+7)//8
 for yy in range(h):
  row=int.from_bytes(data[at:at+stride],'big');at+=stride
  for xx in range(w):idx=(row>>(stride*8-(xx+1)*3))&7;im.putpixel((xx,yy),(*palette[idx],255))
 if alpha:
  stride=(w+7)//8
  for yy in range(h):
   row=int.from_bytes(data[at:at+stride],'big');at+=stride
   for xx in range(w):
    if not((row>>(stride*8-xx-1))&1):im.putpixel((xx,yy),(*im.getpixel((xx,yy))[:3],0))
 assert at==end
 tiles[p['name']]=((x,y),im)
checked=0
for name,anim in m['animations'].items():
 for index,frame in enumerate(anim['frames']):
  im=Image.new('RGBA',(64,64),(255,255,255,255));pos,body=tiles['body'];im.alpha_composite(body,pos)
  head=Image.new('RGBA',(64,64));pos,part=tiles['head'];head.alpha_composite(part,pos)
  for key in [frame['eyes'],'cheeks','nose',frame['mouth']]:
   pos,patch=tiles[key];head.alpha_composite(patch,pos)
  im.alpha_composite(head,(frame['dx'],frame['dy']));actual=Image.open(r/name/f'{index:02d}.png').convert('RGB')
  assert im.convert('RGB').tobytes()==actual.tobytes(),(name,index)
  assert len(set(actual.getdata()))<=8;checked+=1
 assert anim['holdLast'] and anim['durationMs']==sum(f['ms'] for f in anim['frames'])
 gif=Image.open(r/'preview'/f'{name}.gif');assert 'loop' not in gif.info
report={'passed':True,'animations':6,'decodedFramesMatch':checked,'packedArtBytes':len(data),'resourceSha256':hashlib.sha256(data).hexdigest(),'colorLimit':8,'width':64,'height':64,'hardwarePaletteVerified':False,'nativePlaybackTested':False}
(r/'verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
motion=(r/'alden-sincere.motion').read_bytes();assert motion[:6]==b'MS64\x01\x06';names=[p['name'] for p in m['patches']]
for i,(name,anim) in enumerate(m['animations'].items()):
 at=struct.unpack_from('<H',motion,6+2*i)[0];steps,hold=motion[at:at+2];at+=2;assert steps==len(anim['frames']) and hold==1
 for frame in anim['frames']:
  ms,eye,mouth,dx,dy=struct.unpack_from('<HBBbb',motion,at);at+=6
  assert (ms,names[eye],names[mouth],dx,dy)==(frame['ms'],frame['eyes'],frame['mouth'],frame['dx'],frame['dy'])
report.update(packedMotionBytes=len(motion),combinedPackedBytes=len(data)+len(motion),motionTableMatches=True)
(r/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('Motion table verified:',len(motion),'bytes; total:',len(data)+len(motion))
