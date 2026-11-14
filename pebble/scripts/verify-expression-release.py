"""Enforce the agreed v1.13 acceptance limits against native test evidence."""
from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1];folder=root/sys.argv[1]
read=lambda name:json.loads((folder/name).read_text())
build=read('build-report.json');scenes=read('emulator-report.json');reactions=read('reaction-report.json');downloads=read('downloadable-report.json');log=(folder/'native-build.log').read_text()
for report in [scenes,reactions,downloads]:assert report['pbwSha256']==build['pbwSha256'],'Evidence from different PBWs'
resource=int(re.search(r'Total size of resources:\s+(\d+)',log)[1]);native=int(re.search(r'Total footprint in RAM:\s+(\d+)',log)[1])
assert resource-136122<=8192,(resource,'resource budget exceeded')
assert native-17390<=2048,(native,'native budget exceeded')
assert len(scenes['scenes'])==42 and len(reactions['reactions'])==53
assert len(downloads['installedHandTransfers'])==12 and downloads['newRecipesTransferredWithoutRebuild']==26
free=[e['freeBytes'] for e in scenes['scenes']]+[e['freeBytes'] for e in reactions['reactions']]+downloads['heldFreeBytes']+[e['freeBytes'] for e in downloads['installedHandTransfers']]
# Include logged scene/reaction entry measurements, not only settled holds.
for path in folder.glob('*watch.log'):free.extend(map(int,re.findall(r'(?:started;? free=|held;? free=)(\d+)',path.read_text(errors='replace'))))
assert min(free)>=12288,(min(free),'heap acceptance limit failed')
sections=dict((name,int(size)) for name,size in re.findall(r'^([.\w]+)\s+(\d+)\s+\d+$',(folder/'native-sections.txt').read_text(),re.M));static=sum(sections[n] for n in ['.data','.bss','.got','.got.plt'])
result={'nativeStaticBytes':static,'additionalNativeStaticBytes':static-1216,'additionalNativeCodeBytes':native-17390-(static-1216),'pbwSha256':build['pbwSha256'],'baseline':'v1.12.0','resourceBytes':resource,'additionalResourceBytes':resource-136122,'nativeCodeAndStaticBytes':native,'additionalNativeCodeAndStaticBytes':native-17390,'minimumMeasuredFreeHeapBytes':min(free),'sharedArtworkCacheBytes':512,'artAndTimingBytes':len((root/'reader/resources/data/reactions.bin').read_bytes()),'sceneAverageMsRange':[min(e['drawAverageMs'] for e in scenes['scenes']),max(e['drawAverageMs'] for e in scenes['scenes'])],'maximumSceneDrawMs':max(e['drawMaximumMs'] for e in scenes['scenes']),'maximumReactionDrawMs':max(e['maxDrawMs'] for e in reactions['reactions']),'allAcceptanceBudgetsPassed':True,'physicalWatchTested':False}
(folder/'metrics.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
