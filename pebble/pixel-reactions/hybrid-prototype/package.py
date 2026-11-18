from pathlib import Path
import json,re,hashlib,shutil,statistics,ast
from PIL import Image
r=Path(__file__).resolve().parent;out=r/'verification';stage=r.parent/'.local/hybrid-reader'
report=json.loads((out/'report.json').read_text());log=(out/'watch.log').read_text();durations=[int(x) for x in re.findall(r'HYBRID frame=\d+ draw=(\d+)',log)];normal=[n for n in durations if n<140]
report.update(functionalChecksPassed=report.pop('passed',report.get('functionalChecksPassed',False)),timingReliable=False,timingNote='SDK wall-clock measurements include approximately +/-1000 ms discontinuities and unsigned underflow. Raw evidence retained; smoothness/performance is not certified.',ordinaryDrawSamplesMs={'min':min(normal),'median':statistics.median(normal),'max':max(normal),'count':len(normal)},anomalousDrawSamples=len(durations)-len(normal),nativeFootprintBytes=27876,baselineNativeFootprintBytes=25832,addedNativeFootprintBytes=2044,totalResourceBytes=246332,resourceBudgetBytes=262144,remainingResourceBytes=262144-246332)
(out/'report.json').write_text(json.dumps(report,indent=2)+'\n')
# Use the emulator's measured display color table for an accurate screen preview.
colors={ast.literal_eval(k):tuple(v) for k,v in json.loads((out/'display-colors.json').read_text()).items()}
im=Image.open(r/'preview/watch-palette.gif');frames=[];durations=[]
for i in range(im.n_frames):
 im.seek(i);frame=im.convert('RGB');frame.putdata([colors.get(p,p) for p in frame.getdata()]);frames.append(frame);durations.append(im.info.get('duration',140))
frames[0].save(r/'preview/emulator-colors.gif',save_all=True,append_images=frames[1:],duration=durations,loop=0,disposal=2)
target=r/'alden-hybrid-lab-v1.9.2.pbw'
source=stage/'build/hybrid-reader.pbw'
if target.exists() and target.read_bytes()!=source.read_bytes():raise RuntimeError('Versioned PBW differs; bump the lab version before packaging')
shutil.copy(source,target)
assert hashlib.sha256((r/'alden-hybrid-lab-v1.9.2.pbw').read_bytes()).hexdigest()==report['pbwSha256']
print(json.dumps({k:report[k] for k in ['functionalChecksPassed','minimumFreeHeap','ordinaryDrawSamplesMs','anomalousDrawSamples','remainingResourceBytes']}))
