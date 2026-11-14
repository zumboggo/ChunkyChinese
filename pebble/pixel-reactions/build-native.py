"""Compile approved source packs into one streamed watch resource; retain old story aliases."""
from pathlib import Path
from PIL import Image
import json,struct
R=Path(__file__).resolve().parent;P=R.parent
# Young Alden keeps his child silhouette and yellow clothing; authored pose changes only.
names=['neutral','curious','confused','thoughtful','worried'];ims=[Image.open(P/f'reader/resources/images/YoungAlden-{n}-64.png').convert('RGB') for n in names]
sheet=Image.new('RGB',(320,64),'white')
for i,im in enumerate(ims):sheet.paste(im,(i*64,0))
sheet.putdata([(255,255,255) if min(c)>240 else c for c in sheet.getdata()]);q=sheet.quantize(colors=8,dither=Image.Dither.NONE);tiles=[];maps=[]
for i in range(5):
 ids=[]
 for y in range(0,64,8):
  for x in range(0,64,8):
   v=list(q.crop((i*64+x,y,i*64+x+8,y+8)).getdata());b=b''.join(sum(v[j+k]<<(21-3*k) for k in range(8)).to_bytes(3,'big') for j in range(0,64,8))
   if b not in tiles:tiles.append(b)
   ids.append(tiles.index(b))
 maps.append(ids)
young=b'GT64'+struct.pack('<BBH',1,5,len(tiles))+bytes(q.getpalette()[:24])+b''.join(tiles)+b''.join(struct.pack('<64H',*m) for m in maps)
def pose_tiles(data):
 # Normalize held-pose packs to the same cropped-tile decoder as facial patches.
 palette=[tuple(data[8+i*3:11+i*3]) for i in range(8)];count=data[5];n=struct.unpack_from('<H',data,6)[0];parts=[]
 for pose in range(count):
  im=Image.new('RGB',(64,64),'white');ids=struct.unpack_from('<64H',data,32+n*24+pose*128)
  for k,t in enumerate(ids):
   for y in range(8):
    bits=int.from_bytes(data[32+t*24+y*3:35+t*24+y*3],'big')
    for x in range(8):im.putpixel((k%8*8+x,k//8*8+y),palette[(bits>>(21-3*x))&7])
  points=[(x,y) for y in range(64) for x in range(64) if im.getpixel((x,y))!=(255,255,255)]
  x=min(p[0] for p in points);y=min(p[1] for p in points);w=max(p[0] for p in points)-x+1;h=max(p[1] for p in points)-y+1
  part=bytearray([x,y,w,h,0]);stride=(w*3+7)//8
  for yy in range(y,y+h):
   value=0
   for xx in range(x,x+w):value=(value<<3)|palette.index(im.getpixel((xx,yy)))
   part+=(value<<(stride*8-w*3)).to_bytes(stride,'big')
  parts.append(part)
 out=bytearray(b'AS64'+bytes([1,count,8,3])+data[8:32]);offset=32+4*count
 for part in parts:out+=struct.pack('<I',offset);offset+=len(part)
 return bytes(out+b''.join(parts))
def transparent_bodies(data,tiled):
 # Flood only exterior white. Preserve white shirts, eyes and enclosed highlights.
 count=data[5];parts=[]
 for i in range(count):
  at=struct.unpack_from('<I',data,32+i*4)[0];end=struct.unpack_from('<I',data,36+i*4)[0] if i+1<count else len(data)
  part=bytearray(data[at:end]);x,y,w,h,alpha=part[:5];stride=(w*3+7)//8
  if not alpha and (tiled or i==0):
   white={j for j in range(8) if min(data[8+j*3:11+j*3])>=240}
   ids=[[((int.from_bytes(part[5+yy*stride:5+(yy+1)*stride],'big')>>(stride*8-3*(xx+1)))&7) for xx in range(w)] for yy in range(h)]
   outside=set();todo=[(xx,yy) for yy in range(h) for xx in range(w) if xx in (0,w-1) or yy in (0,h-1)]
   while todo:
    xx,yy=todo.pop()
    if not(0<=xx<w and 0<=yy<h) or (xx,yy) in outside or ids[yy][xx] not in white:continue
    outside.add((xx,yy));todo.extend([(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)])
   part[4]=1;ms=(w+7)//8
   for yy in range(h):
    mask=bytearray(ms)
    for xx in range(w):
     if (xx,yy) not in outside:mask[xx//8]|=128>>(xx%8)
    part+=mask
  parts.append(part)
 out=bytearray(data[:32]);offset=32+4*count
 for part in parts:out+=struct.pack('<I',offset);offset+=len(part)
 return bytes(out+b''.join(parts))
actors=[('Alden','alden-sincere','alden-sincere'),('Hannah','hannah-sincere','hannah-sincere'),('Boe','cast-reactions/bo','bo'),('Jeremy','cast-reactions/jeremy','jeremy'),('Gorgon','gorgon-reactions','gorgon'),('YoungAlden',None,None)]
blob=bytearray();adesc=[];anims=[];aliases={};catalog=[]
common={'neutral':'blink','warm':'blink','calm':'blink','sad':'worried','worried':'worried','embarrassed':'worried','curious':'surprised','surprised':'surprised','excited':'laughing','amused':'laughing','thoughtful':'thinking','skeptical':'thinking','determined':'thinking'}
for actor,folder,stem in actors:
 actoridx=len(adesc);at=len(blob);manifest=json.loads((R/folder/'manifest.json').read_text()) if folder else None
 data=(R/folder/(stem+'.bin')).read_bytes() if folder else young
 if actor=='Hannah':
  # Keep the selected navy shirt blue on the limited hardware palette.
  data=bytearray(data);data[8+6*3:11+6*3]=bytes([0,0,85]);data=bytes(data)
 tiled=data[:4]==b'GT64'
 if tiled:data=pose_tiles(data)
 data=transparent_bodies(data,tiled)
 blob+=data
 patches=[p['name'] for p in manifest['patches']] if folder and actor!='Gorgon' else []
 adesc.append((at,int(tiled),patches.index('cheeks') if 'cheeks'in patches else 255,patches.index('nose') if 'nose'in patches else 255))
 timelines={}
 if patches:
  for name,a in manifest['animations'].items():timelines[name]=[(f['ms'],patches.index(f['eyes']),patches.index(f['mouth']),f['dx'],f['dy']) for f in a['frames']]
 elif actor=='Gorgon':
  for name,a in manifest['animations'].items():timelines[name]=[(s['ms'],s['pose'],255,0,0) for s in a['steps']]
 else:
  for i,name in enumerate(names):timelines[name]=[(350,0,255,0,0),(1400,i,255,0,0)]
 ids={}
 for name,steps in timelines.items():
  idx=len(anims);ids[name]=1000+idx;anims.append((len(blob),actoridx,len(steps)))
  blob+=b''.join(struct.pack('<HBBbb',*s) for s in steps)
  catalog.append({'actor':actor,'emotion':name,'id':1000+idx})
 for name,id in ids.items():aliases[actor+'-'+name+'-full']=id
 if patches:
  for old,new in common.items():aliases[actor+'-'+old+'-full']=ids[new]
assert len(blob)<65536
header='/* Generated by pixel-reactions/build-native.py. */\n'
header+='typedef struct { uint16_t offset; uint8_t tiled,cheeks,nose; } ReactionActor;\n'
header+='typedef struct { uint16_t offset; uint8_t actor,count; } ReactionAnim;\n'
header+='static const ReactionActor reaction_actors[]={'+','.join('{'+','.join(map(str,a))+'}' for a in adesc)+'};\n'
header+='static const ReactionAnim reaction_anims[]={'+','.join('{'+','.join(map(str,a))+'}' for a in anims)+'};\n'
header+=f'#define REACTION_COUNT {len(anims)}\n'
(P/'reader/src/c/reaction_data.h').write_text(header)
(P/'reader/resources/data/reactions.bin').write_bytes(blob)
(R/'native-aliases.json').write_text(json.dumps(aliases,indent=2)+'\n')
(R/'native-catalogue.json').write_text(json.dumps(catalog,indent=2)+'\n')
(P/'reader/src/embeddedjs/reactions.js').write_text("export const reactionGroups="+json.dumps([a[0]+' reactions' for a in actors])+";\nexport function reactionActor(i){return reactionGroups[i<24?Math.floor(i/6):i<30?4:5].slice(0,-10); }\nexport function reactionName(i){const names=i<24?'blink|surprised|thinking|talking|laughing|worried':i<30?'neutral|attentive|thoughtful|skeptical|serious|amused':'neutral|curious|confused|thoughtful|worried';let n=i<24?i%6:i<30?i-24:i-30,at=0;while(n--)at=names.indexOf('|',at)+1;const end=names.indexOf('|',at);return names.slice(at,end<0?undefined:end); }\nexport function reactionIds(group){const n=reactionGroups.indexOf(group),start=n<4?n*6:n===4?24:30,count=n===5?5:6;return Array.from({length:count},(_,i)=>1000+start+i); }\n")

(R/'native-measurements.json').write_text(json.dumps({'artAndTimingsBytes':len(blob),'reactions':len(anims),'actors':len(actors)},indent=2)+'\n');print('Native resource',len(blob),'bytes;',len(anims),'reactions')
