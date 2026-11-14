"""Regression oracle for installed reaction ABI, palettes and sparse overlays."""
from pathlib import Path
import hashlib,json,re,struct
root=Path(__file__).resolve().parents[1];data=(root/'reader/resources/data/reactions.bin').read_bytes();header=(root/'reader/src/c/reaction_data.h').read_text()
def table(n):return [list(map(int,x.split(','))) for x in re.findall(r'\{([\d,]+)\}',header.split(n+'[]={',1)[1].split('};',1)[0])]
actors=table('reaction_actors');anims=table('reaction_anims');expected=json.loads((root/'pixel-reactions/legacy-fingerprints.json').read_text())
def part(base,i):
 at=base+struct.unpack_from('<I',data,base+32+i*4)[0];x,y,w,h,a=data[at:at+5];n=5+h*((w*3+7)//8)+(h*((w+7)//8) if a else 0);return data[at:at+n]
hash=lambda b:hashlib.sha256(b).hexdigest()
for who,a in enumerate(actors):
 base=a[0];assert data[base+8:base+32].hex()==expected['palettes'][who]
 for i,h in enumerate(expected['parts'][who]):assert hash(part(base,i))==h,(who,i,'old artwork changed')
for i,h in enumerate(expected['timelines']):
 offset,actor,count=anims[i];assert hash(bytes([actor])+data[offset:offset+6*count])==h,('old reaction changed',i)
assert len(anims)==53 and len(actors)==6
cat=json.loads((root/'pixel-reactions/native-catalogue.json').read_text());aliases=json.loads((root/'pixel-reactions/native-aliases.json').read_text())
assert [c['id'] for c in cat]==list(range(1000,1053))
for name,id in expected['aliases'].items():assert aliases[name]==id
assert len(data)-expected['resourceBytes']<=8192
for offset,who,count in anims[35:]:
 assert count>=2
 steps=[struct.unpack_from('<HBBbb',data,offset+i*6) for i in range(count)];assert steps[-1][0]>=1000
 if who>=4:
  for _,eye,mouth,_,_ in steps[1:]:
   for i in (eye,mouth):
    p=part(actors[who][0],i);assert p[2]*p[3]<512 and p[4]==1,'full portrait duplicated'
print('PASS: 69 unchanged original parts, 35 unchanged reaction timelines/IDs, six palettes, legacy aliases, 18 sparse additions')
