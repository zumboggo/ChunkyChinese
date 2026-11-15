"""Pack constant drawing commands into a streamed resource; preserve their exact order."""
from pathlib import Path
import json,re,struct,sys
root=Path(__file__).resolve().parents[1]
source=(root/'reader/src/c/visual_novel_draw.h').read_text()
pattern=re.compile(r'\b(box|line)\(([^();]+)\);')
colors={'WALL':0xf6f4ee,'LIGHT':0xd7dcd5,'LINE':0x889b9e,'DARK':0x506971}
records=[];groups=[]
for m in pattern.finditer(source):
 tokens=[v.strip() for v in m[2].split(',')];name=tokens[-1]
 if len(tokens)!=(5 if m[1]=='box' else 6) or not re.fullmatch(r'WALL|LIGHT|LINE|DARK|0x[0-9a-fA-F]+|pal\[[0-7]\]',name):continue
 coords=[];flags=0
 for i,v in enumerate(tokens[:-1]):
  if re.fullmatch(r'-?\d+',v):coords.append(int(v));continue
  mm=re.fullmatch(('x' if i%2==0 else 'y')+r'([+-]\d+)?',v)
  if not mm or i>=(2 if m[1]=='box' else 4):break
  coords.append(int(mm[1] or 0));flags|=1<<i
 else:
  color=colors[name] if name in colors else 0x1000000+int(name[4]) if name.startswith('pal[') else int(name,16)
  records.append(struct.pack('<BB5hI',int(m[1]=='line'),flags,*(coords+[0]*(5-len(coords))),color))
  relative=(1 if flags&5 else 0)|(2 if flags&10 else 0)
  if groups and groups[-1][4]==relative and not source[groups[-1][1]:m.start()].strip():groups[-1][1]=m.end();groups[-1][3]+=1
  else:groups.append([m.start(),m.end(),len(records)-1,1,relative])
for a,b,start,count,relative in reversed(groups):source=source[:a]+f'vn_paint({start},{count},'+('x' if relative&1 else '0')+','+('y' if relative&2 else '0')+');'+source[b:]
helper='''typedef char VNWireLayout[(sizeof(VNKey)==8 && sizeof(VNScene)==8)?1:-1];
// Fixed geometry streams from flash; no retained bitmap or frame allocation.
static void vn_paint(unsigned start,unsigned count,int x,int y){
 uint8_t b[16];
 for(unsigned i=0;i<count;i++){
  resource_load_byte_range(resource_get_handle(RESOURCE_ID_STAGE),(start+i)*16,b,16);
  int16_t v[5];for(int j=0;j<5;j++){v[j]=(int16_t)(b[2+j*2]|b[3+j*2]<<8);if(b[1]&(1<<j))v[j]+=j&1?y:x;}
  uint32_t color=(uint32_t)b[12]|(uint32_t)b[13]<<8|(uint32_t)b[14]<<16|(uint32_t)b[15]<<24;
  if(color&0x1000000)color=pal[color&7];
  if(b[0])line(v[0],v[1],v[2],v[3],v[4],color);else box(v[0],v[1],v[2],v[3],color);
 }
}
'''
pos=source.index('static void poly(');source=source[:pos]+helper+source[pos:]
# Keyframes and installed-scene descriptors also stream from the same resource.
data=(root/'reader/src/c/visual_novel_data.h').read_text();blob=bytearray(b''.join(records));offsets=[]
for match in re.finditer(r'static const VNKey vn_keys_\d+\[\]=\{(.*?)\};',data):
 offsets.append(len(blob))
 for row in re.findall(r'\{([^{}]+)\}',match[1]):blob.extend(struct.pack('<HhhBb',*[int(v) for v in row.split(',')]))
scene_at=len(blob)
rows=re.search(r'static const VNScene vn_scenes\[\]=\{(.*?)\};',data)[1]
for row in re.findall(r'\{([^{}]+)\}',rows):
 v=[int(x) for x in row.split(',')];v += [0]*(6-len(v));blob.extend(struct.pack('<5BxH',*v))
pose='static const uint16_t vn_key_offsets[]={'+','.join(map(str,offsets))+'};\n'+r"""
static VNKey vn_read_key(unsigned action,unsigned index){VNKey key;resource_load_byte_range(resource_get_handle(RESOURCE_ID_STAGE),vn_key_offsets[action]+index*sizeof(key),(uint8_t *)&key,sizeof(key));return key;}
static VNScene vn_scene(unsigned id){VNScene scene;resource_load_byte_range(resource_get_handle(RESOURCE_ID_STAGE),SCENE_OFFSET+id*sizeof(scene),(uint8_t *)&scene,sizeof(scene));return scene;}
static VNKey vn_pose(unsigned action,uint32_t t){
 int n=vn_counts[action];VNKey a=vn_read_key(action,n-1);if(t>=a.t)return a;
 a=vn_read_key(action,0);VNKey b=a;for(int i=1;i<n;i++){b=vn_read_key(action,i);if(t<b.t)break;a=b;}
 int f=(t-a.t)*1024/(b.t-a.t);f=f*f*(3072-2*f)/1048576;a.x+=(b.x-a.x)*f/1024;a.y+=(b.y-a.y)*f/1024;return a;
}
""".replace('SCENE_OFFSET',str(scene_at))
a=source.index('static VNKey vn_pose(');b=source.index('static void torso(',a);source=source[:a]+pose+source[b:]
# Pack polygon vertices too, including hand-local offsets, rather than emitting
# repeated stack initialization instructions into the RAM-resident native code.
poly_pattern=re.compile(r'POLY\((pal\[[0-7]\]|who==4\?pal\[4\]:pal\[5\]),([^;]+)\);')
poly_matches=[]
for m in poly_pattern.finditer(source):
 tokens=[v.strip() for v in m[2].split(',')];coords=[];relative=any('x' in v or 'y' in v for v in tokens)
 for i,v in enumerate(tokens):
  if relative:
   mm=re.fullmatch(('x' if i%2==0 else 'y')+r'([+-]\d+)?',v)
   if not mm:break
   coords.append(int(mm[1] or 0))
  elif re.fullmatch(r'-?\d+',v):coords.append(int(v))
  else:break
 else:
  at=len(blob);blob.extend(struct.pack('<'+'h'*len(coords),*coords));poly_matches.append((m.start(),m.end(),at,len(coords)//2,m[1],relative))
for a,b,at,n,color,relative in reversed(poly_matches):
 source=source[:a]+f'vn_polygon({at},{n},{color},'+('x,y' if relative else '0,0')+');'+source[b:]
helper=r"""
static void vn_polygon(unsigned at,unsigned n,uint32_t color,int x,int y){
 int p[16];int16_t pair[2];
 for(unsigned i=0;i<n;i++){resource_load_byte_range(resource_get_handle(RESOURCE_ID_STAGE),at+i*4,(uint8_t *)pair,4);p[i*2]=x+pair[0];p[i*2+1]=y+pair[1];}
 poly(p,n,color);
}
"""
pos=source.index('static int bounce(');source=source[:pos]+helper+source[pos:]
source='// Generated by scripts/pack-stage.py; edit visual_novel_draw.h.\n'+source
outputs={root/'reader/src/c/visual_novel_packed.h':source.encode(),root/'reader/resources/data/stage.bin':bytes(blob)}
for path,data in outputs.items():
 if '--check' in sys.argv:
  if not path.exists() or path.read_bytes()!=data:raise SystemExit('Stale packed stage: '+str(path))
 else:path.write_bytes(data)
print(f'Streamed {len(records)} exact drawing commands in {len(groups)} groups ({len(blob)} bytes including keyframes and scene descriptors)')
