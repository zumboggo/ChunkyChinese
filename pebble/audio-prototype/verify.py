"""Local emulator playback checks; never alter reader content or saves."""
import subprocess,time,re,json,hashlib,wave
from pathlib import Path
root=Path(__file__).resolve().parent;out=root/'verification';cli=str(Path.home()/'.local/bin/pebble')
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=root,check=True,capture_output=True,text=True,timeout=40)
def press(k):run('emu-button','click',k)
def log():return (out/'watch.log').read_text()
def expect(pattern,offset=0):
 deadline=time.monotonic()+15
 while time.monotonic()<deadline:
  m=re.search(pattern,log()[offset:])
  if m:return m
  time.sleep(.1)
 raise AssertionError('Missing '+pattern+'; '+log()[offset:])
def fnv(data):
 v=2166136261
 for b in data:v=((v^b)*16777619)&0xffffffff
 return v
for hz in [8000,16000]:
 data=(root/'resources'/f'phrase-{hz}.pcm').read_bytes()
 with wave.open(str(root/'audio'/f'chinese-{hz}.wav')) as w:
  assert w.getframerate()==hz and w.getsampwidth()==1 and w.getnchannels()==1
  assert bytes(b^128 for b in w.readframes(w.getnframes()))==data
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=root,stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(.6);run('install',root/'build/audio-prototype.pbw');expect('AUDIO ready');time.sleep(.3)
  run('screenshot','--no-open',out/'ready.png')
  results=[]
  pattern=r'AUDIO finish rate=(\d+) reason=(\d+) sent=(\d+) crc=(\d+)[\s\S]*?AUDIO heap idle=(\d+) min=(\d+) after=(\d+)[\s\S]*?AUDIO time ms=(\d+) ticks=(\d+)'
  for hz,key in [(8000,'up'),(16000,'down'),(8000,'up'),(16000,'down')]:
   pos=len(log());press(key);m=expect(pattern,pos);v=list(map(int,m.groups()));data=(root/'resources'/f'phrase-{hz}.pcm').read_bytes()
   assert v[0]==hz and v[1]==0 and v[2]==len(data) and v[3]==fnv(data),v
   results.append(dict(zip(['rate','reason','sent','checksum','idleFree','minFree','afterFree','elapsedMs','pumpCallbacks'],v)))
   run('screenshot','--no-open',out/f'finished-{hz}.png')
  # Stop early, then ensure playback can recover.
  pos=len(log());press('up');press('select');m=expect(pattern,pos);stopReason=int(m[2]);assert stopReason in [0,1]
  pos=len(log());press('down');m=expect(pattern,pos);assert int(m[2])==0
  assert not any(x in log() for x in ['App fault','resource read failure','memory full'])
  report={'passed':True,'pbwSha256':hashlib.sha256((root/'build/audio-prototype.pbw').read_bytes()).hexdigest(),'checks':['offline resources','both sample rates complete','all PCM bytes accepted with matching checksum','repeat playback','stop/recovery','WAV previews match watch PCM'],'stopReason':stopReason,'measurements':results,'audioBufferBytes':512,'physicalWatchTested':False,'readerIntegrationTested':False,'systemAudioHeapMeasured':False}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
 finally:logs.terminate();logs.wait(timeout=5)
