from pathlib import Path
import json
r=Path(__file__).resolve().parent;d=json.loads((r/'scenes.json').read_text());out=['// Generated from scenes.json; no runtime JSON parsing.','typedef struct {uint16_t t; int16_t x,y; uint8_t face; int8_t head;} Key;']
for i,s in enumerate(d['shots']):
 assert s['keys'][0][0]==0 and s['keys'][-1][0]==d['durationMs'];assert all(a[0]<b[0] for a,b in zip(s['keys'],s['keys'][1:]))
 out.append('static const Key keys%d[]={%s};'%(i,','.join('{'+','.join(map(str,k))+'}' for k in s['keys'])))
out+=['static const Key *const tracks[]={keys0,keys1,keys2};','static const uint8_t counts[]={%s};'%','.join(str(len(s['keys'])) for s in d['shots']),'#define SHOT_DURATION %d'%d['durationMs']]
(r/'src/c/tracks.h').write_text('\n'.join(out)+'\n')
