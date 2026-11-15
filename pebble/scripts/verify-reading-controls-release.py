"""Check the packaged reading-controls release against retained emulator evidence."""
from pathlib import Path
import hashlib,json,re,sys,zipfile
root=Path(__file__).resolve().parents[1];folder=root/(sys.argv[1] if len(sys.argv)>1 else 'verification/reading-controls-v1.14.2')
def read(name):return json.loads((folder/(name+'.json')).read_text())
build=read('build-report');digest=build['pbwSha256'];pbw=root/'release'/('chunky-chinese-time2-'+build['episodeId']+'-v'+build['appVersion']+'.pbw')
assert hashlib.sha256(pbw.read_bytes()).hexdigest()==digest
reports={name:read(name) for name in ['emulator-report','reaction-report','downloadable-report','offline-report','controls-report','upgrade-report','metrics']}
assert all(r['pbwSha256']==digest for r in reports.values())
assert len(reports['emulator-report']['scenes'])==42 and len(reports['reaction-report']['reactions'])==53
assert read('pixel-verification')['nativeFinalPosesMatched']==53
assert reports['downloadable-report']['newRecipesTransferredWithoutRebuild']==26
assert len(reports['downloadable-report']['installedHandTransfers'])==12
assert reports['offline-report']['queuedEpisodes']==5
assert reports['upgrade-report']['fiveOlderCachedEpisodesPlayableAfterUpgrade']
for key in ['englishChoicesDirectUpDown','selectDoesNotChoose','holdDoesNotChooseOrTurnPage','choiceSavesAndBacktracking','clockTicksWithoutPageTurn','lightRestartsAndTimesOut']:
 assert reports['controls-report'][key],key
heap=[]
for name in ['scene','reaction','downloadable','offline','controls']:
 log=(folder/(name+'-watch.log')).read_text()
 assert not re.search(r'fxAbort|INPUT ERROR|SAVE ERROR|App fault',log,re.I),name
 rows=[list(map(int,x.split(','))) for x in re.findall(r'instruments: ([0-9,]+)',log)]
 heap += [row[6] for row in rows]+[int(a or b) for a,b in re.findall(r'free=(\d+)|(?:Runtime|Transfer) heap(\d+)',log)]
assert min(heap)>=12288 and min(heap)==reports['metrics']['minimumMeasuredFreeHeapBytes']
assert len(heap)==reports['metrics']['heapSamples']
with zipfile.ZipFile(pbw) as z:assert z.getinfo('emery/app_resources.pbpack').file_size==reports['metrics']['resourceBytes']
print('PASS',build['appVersion'],digest,'minimum free heap',min(heap),'samples',len(heap))
