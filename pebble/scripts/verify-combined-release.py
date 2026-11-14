"""Verify one frozen combined PBW against its native and protocol evidence."""
from pathlib import Path
import json,re,hashlib,sys
root=Path(__file__).resolve().parents[1];folder=root/sys.argv[1]
def read(name):return json.loads((folder/name).read_text())
build=read('build-report.json');scenes=read('emulator-report.json');reactions=read('reaction-report.json');downloads=read('downloadable-report.json');offline=read('offline-report.json');transfer=read('transfer-report.json');upgrades=read('upgrade-report.json')
reports=[scenes,reactions,downloads,offline,transfer,upgrades]
for report in reports:assert report['pbwSha256']==build['pbwSha256'],'Mixed release evidence'
assert len(scenes['scenes'])==42 and len(reactions['reactions'])==53
assert downloads['newRecipesTransferredWithoutRebuild']==26 and len(downloads['installedHandTransfers'])==12
assert offline['queuedEpisodes']==5 and offline['allocatableBytesAtLeast']>=458752
assert upgrades['fiveOlderCachedEpisodesPlayableAfterUpgrade'] and len(upgrades['readingPositionAndDisplayPreservedFrom'])==3
assert transfer['restartAndComplete'] and transfer['duplicateEnd'] and transfer['badChunkRejected']
free=[r['freeBytes'] for r in scenes['scenes']+reactions['reactions']]+downloads['heldFreeBytes']+[r['freeBytes'] for r in downloads['installedHandTransfers']]+[offline['minimumMeasuredFreeHeapBytes']]
for name in ['scene-watch.log','reaction-watch.log','downloadable-watch.log','offline-watch.log','transfer-watch.log']:
 text=(folder/name).read_text(errors='replace')
 if name!='transfer-watch.log' and 'evaluating creation record' in text:text=text[text.index('evaluating creation record'):]
 assert not re.search(r'fxAbort|App fault|memory full|INPUT ERROR|SAVE ERROR',text,re.I),name
 free += list(map(int,re.findall(r'(?:started;? free=|held;? free=|Transfer heap)(\d+)',text)))
 free += [int(row.split(',')[6]) for row in re.findall(r'instruments: ([0-9,]+)',text)]
assert min(free)>=12288,(min(free),'12 KiB measured heap limit')
log=(folder/'native-build.log').read_text();resources=int(re.search(r'Total size of resources:\s+(\d+)',log)[1]);native=int(re.search(r'Total footprint in RAM:\s+(\d+)',log)[1]);assert resources<=262144
sections=dict((name,int(n)) for name,n in re.findall(r'^([.\w]+)\s+(\d+)\s+\d+$',(folder/'native-sections.txt').read_text(),re.M));static=sum(sections.get(k,0) for k in ['.data','.bss','.got','.got.plt'])
assert read('browser-parity.json')['pixelExactFrames']==570 and read('pixel-verification.json')['nativeFinalPosesMatched']==53
pbw=root/'release'/('chunky-chinese-time2-supportive-13-v'+build['appVersion']+'.pbw');assert hashlib.sha256(pbw.read_bytes()).hexdigest()==build['pbwSha256']
result={'appVersion':build['appVersion'],'pbwSha256':build['pbwSha256'],'pbwBytes':pbw.stat().st_size,'resourceBytes':resources,'additionalResourceBytesVsOfflineV113':resources-144488,'additionalResourceBytesVsExpressionV113':resources-140277,'nativeCodeAndStaticBytes':native,'nativeCodeBytes':native-static,'nativeStaticBytes':static,'nativeBytesSavedVsExpressionV113':18358-native,'minimumMeasuredFreeHeapBytes':min(free),'minimumRequiredFreeHeapBytes':12288,'heapSamples':len(free),'vmPoolsBytes':{'stack':4608,'slots':35840,'strings':9216},'sharedArtworkCacheBytes':512,'queuedEpisodeCount':5,'queuedEpisodeBytes':offline['queuedBytes'],'storageProbeAdditionalBytesAtLeast':offline['allocatableBytesAtLeast'],'reactionCount':53,'sceneCount':42,'sceneAverageMsRange':[min(x['drawAverageMs'] for x in scenes['scenes']),max(x['drawAverageMs'] for x in scenes['scenes'])],'maximumSceneDrawMs':max(x['drawMaximumMs'] for x in scenes['scenes']),'maximumReactionDrawMs':max(x['maxDrawMs'] for x in reactions['reactions']),'downloadedRecipesVerified':26,'installedHandTransfersVerified':12,'memoryAcceptancePassed':True,'physicalWatchTested':False,'emulatorReconnectRelaunchRequired':True}
(folder/'metrics.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
