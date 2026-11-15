"""Verify the isolated prototype's package, compatibility and measured budgets."""
from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[1];out=root/(sys.argv[1] if len(sys.argv)>1 else 'verification/alden-body-v1.15.1')
def read(name):return json.loads((out/name).read_text())
build=read('build-report.json');sha=build['pbwSha256'];pbw=root/'release/chunky-chinese-time2-supportive-13-v1.15.1.pbw'
assert hashlib.sha256(pbw.read_bytes()).hexdigest()==sha
for name in ['prototype-scenes.json','emulator-report.json','offline-report.json','downloadable-report.json','transfer-report.json','size-metrics.json']:
 assert read(name)['pbwSha256']==sha,name
assert read('browser-parity.json')['pixelExactFrames']==570
assert read('preservation.json')['unchangedFrames']==243
assert {s['id'] for s in read('emulator-report.json')['scenes']}=={s['id'] for s in json.loads((root/'scenes/library.json').read_text())['scenes']}
offline=read('offline-report.json');assert offline['queuedEpisodes']==5 and offline['prefetchDuringBodyAnimation'] and offline['bodyScenesWithFullCache']==[21,31,42]
assert offline['interruptedRefillPreservesQueue'] and offline['reinstallPreservesQueueAndPosition']
assert read('downloadable-report.json')['newRecipesTransferredWithoutRebuild']>=26
sizes=read('size-metrics.json');art=(root/'reader/resources/data/reactions.bin').read_bytes();assert hashlib.sha256(art[:sizes['legacyArtPrefixBytes']]).hexdigest()==sizes['legacyArtPrefixSha256']
heap=[];instruments=[]
for name in ['scene-watch.log','offline-watch.log','downloadable-watch.log']:
 text=(out/name).read_text();assert not re.search(r'fxAbort|memory full|App fault|INPUT ERROR',text,re.I),name
 instruments += [list(map(int,x.split(','))) for x in re.findall(r'instruments: ([0-9,]+)',text)]
 heap += list(map(int,re.findall(r'(?:free=|Transfer heap)(\d+)',text)))
heap += [row[6] for row in instruments];assert heap and min(heap)>=12288,min(heap) if heap else 'No heap samples'
base=json.loads((root/'verification/reading-controls-v1.14.2/metrics.json').read_text());metrics=sizes.copy()
for key,index in [('peakStringPoolBytes',7),('peakSlotPoolBytes',9),('peakStackBytes',11)]:
 peak=max(row[index] for row in instruments);assert peak<=base[key],(key,peak,base[key]);metrics[key]=peak
metrics.update({'minimumMeasuredFreeHeapBytes':min(heap),'heapSamples':len(heap),'pixelExactFrames':570,'unchangedFrames':243,'queuedEpisodes':5,'prefetchDuringAnimation':True,'nativeSceneCount':42,'downloadedRecipes':26,'physicalWatchTested':False})
(out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n');print(json.dumps(metrics,indent=2))
