"""Verify the exact packaged memory-fix build against its retained regression evidence."""
from pathlib import Path
import hashlib,json,re
root=Path(__file__).resolve().parents[1];folder=root/'verification/download-memory-v1.14.3'
def read(name):return json.loads((folder/(name+'.json')).read_text())
build=read('build-report');digest=build['pbwSha256'];pbw=root/'release'/('chunky-chinese-time2-'+build['episodeId']+'-v'+build['appVersion']+'.pbw')
assert hashlib.sha256(pbw.read_bytes()).hexdigest()==digest
for path,sha in build['runtimeFiles'].items():assert hashlib.sha256((root/path).read_bytes()).hexdigest()==sha,path
for name in ['download-report','controls-report','upgrade-report','emulator-report','metrics']:assert read(name)['pbwSha256']==digest,name
assert read('download-report')['allFiveDownloadedAndReopenedOffline']
assert read('download-report')['completedCurrentWith24HistoryEntriesAndFourChoices']
assert read('controls-report')['lightDurationSeconds']==120 and read('controls-report')['lightRestartsAndTimesOut']
assert read('upgrade-report')['fiveOlderCachedEpisodesPlayableAfterUpgrade']
assert len(read('emulator-report')['scenes'])==4
heap=[]
for name in ['download','controls','scene']:
 log=(folder/(name+'-watch.log')).read_text();assert not re.search(r'fxAbort|INPUT ERROR|SAVE ERROR|TRANSFER ERROR|App fault|allocation:.*failed',log,re.I),name
 rows=[list(map(int,x.split(','))) for x in re.findall(r'instruments: ([0-9,]+)',log)]
 heap += [row[6] for row in rows]+[int(a or b) for a,b in re.findall(r'free=(\d+)|(?:Runtime|Transfer) heap(\d+)',log)]
assert min(heap)>=8192 and min(heap)==read('metrics')['minimumMeasuredFreeHeapBytes']
print('PASS',build['appVersion'],digest,'native free minimum',min(heap),'samples',len(heap))
