from pathlib import Path
from PIL import Image
import json,re,hashlib,shutil,statistics
r=Path(__file__).resolve().parent;manifest=json.loads((r/'manifest.json').read_text());summary={}
for count,version in [(16,'1.9.3'),(8,'1.9.4')]:
 folder=r/str(count);verification=folder/'verification';report=json.loads((verification/'report.json').read_text());stage=r.parent/f'.local/compact{count}-reader';pbw=stage/f'build/compact{count}-reader.pbw'
 assert hashlib.sha256(pbw.read_bytes()).hexdigest()==report['pbwSha256']
 assert (stage/'resources/alden.layers').read_bytes()==(folder/'alden.bin').read_bytes()
 # Verify the native image reproduces every indexed pixel, allowing the emulator's display LUT.
 want=Image.open(folder/'expected-native.png').convert('RGB').crop((0,0,200,211));got=Image.open(verification/'held.png').convert('RGB').crop((0,0,200,211));mapping={}
 for a,b in zip(want.getdata(),got.getdata()):
  if a in mapping:assert mapping[a]==b,'Native pixel geometry differs'
  mapping[a]=b
 assert len(set(mapping.values()))==len(mapping),'Unexpected color collapse'
 log=(verification/'watch.log').read_text();times=list(map(int,re.findall(r'HYBRID frame=\d+ draw=(\d+)',log)));ordinary=[t for t in times if t<140]
 data=manifest['variants'][str(count)];total=(stage/'build/emery/app_resources.pbpack').stat().st_size
 report.update(functionalChecksPassed=report.pop('passed',report.get('functionalChecksPassed',False)),nativePixelMatch=True,nativeFootprintBytes=27876,previousPrototypeNativeFootprintBytes=27876,nativeFootprintSavingBytes=0,totalResourceBytes=total,remainingResourceBytes=262144-total,resourceSavingBytes=data['savedBytes'],resourceSavingPercent=data['savingPercent'],ordinaryDrawMs={'min':min(ordinary),'median':statistics.median(ordinary),'max':max(ordinary)},clockAnomalies=len(times)-len(ordinary),timingNote='Emulator wall-clock samples only; prior prototype had clock discontinuities. Not physical-watch certification.')
 (verification/'report.json').write_text(json.dumps(report,indent=2)+'\n')
 name=f'alden-64-{count}-lab-v{version}.pbw';target=folder/name
 if target.exists():assert target.read_bytes()==pbw.read_bytes(),'Never overwrite a versioned PBW'
 else:shutil.copy(pbw,target)
 summary[str(count)]={k:report[k] for k in ['resourceBytes','resourceSavingPercent','minimumFreeHeap','nativeFootprintBytes','remainingResourceBytes','ordinaryDrawMs','clockAnomalies','nativePixelMatch','pbwSha256']}
summary['previous']={'resourceBytes':45244,'minimumFreeHeap':4020,'nativeFootprintBytes':27876,'remainingResourceBytes':15812}
(r/'measurements.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
