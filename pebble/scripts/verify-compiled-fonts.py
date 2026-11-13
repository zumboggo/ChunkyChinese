"""Check the actual generated PBFs, not merely the source TTF's character map."""
import json,os,pickle,struct,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sdk=Path(os.environ.get('PEBBLE_SDK_ROOT',Path.home()/'Library/Application Support/Pebble SDK/SDKs/current'))
sys.path[:0]=[str(sdk/'sdk-core/pebble/common/waftools'),str(sdk/'sdk-core/pebble/common/tools')]
glyphs=(root/'content/glyphs.txt').read_text();report={}
for name,size in [('latin',24),('latin',20),('chinese',28)]:
 p=root/f'reader/build/emery/resources/fonts/{name}.ttf.FONT_{name.upper()}_{size}.reso'
 data=pickle.load(p.open('rb')).data
 version,height,count,wildcard,buckets,codebytes,header,features=struct.unpack('<BBHHBBBB',data[:10])
 assert version==3 and height==size
 offsetbytes=2 if features&1 else 4;start=header+buckets*4;found=set()
 for i in range(buckets):
  _,length,offset=struct.unpack_from('<BBH',data,header+i*4)
  for j in range(length):
   code=int.from_bytes(data[start+offset+j*(codebytes+offsetbytes):start+offset+j*(codebytes+offsetbytes)+codebytes],'little');found.add(code)
 expected={ord(c) for c in glyphs if name=='chinese' or not '\u3400'<=c<='\u9fff'}
 assert not expected-found, 'Compiled font missing '+str(expected-found)
 report[f'{name}-{size}']={'glyphs':count,'bytes':len(data),'missing':0}
(root/'verification').mkdir(exist_ok=True)
(root/'verification/font-coverage.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
