"""Integrated animation regression. Uses the existing Emery; never erases flash/saves.
Run after a build: python3 scripts/test-emulator.py --install
Without --install, launch the reader at a normal reading screen first.
"""
import argparse,hashlib,json,os,re,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--install',action='store_true')
p.add_argument('--cli',default=os.environ.get('PEBBLE_CLI','pebble'))
p.add_argument('--episode',help='Require this bundled episode and matching build report')
p.add_argument('--min-free',type=int,default=2048)
a=p.parse_args();root=Path(__file__).resolve().parents[1]
pack=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
if a.episode and a.episode!=pack['id']:p.error('Requested episode does not match the generated bundle')
report=json.loads((root/'.local/build-report.json').read_text())
pbw_hash=hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest()
if report.get('episodeId')!=pack['id'] or report.get('episodeVersion')!=pack['version'] or report['pbwSha256']!=pbw_hash:p.error('Build report does not match episode/PBW; rebuild before emulator testing')
out=root/'.local'/'emulator';out.mkdir(parents=True,exist_ok=True)
library=json.loads((root/'scenes/library.json').read_text())
def run(*args):
 return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(button,n=1):run('emu-button','click',button,'--repeat',n,'--interval',180)
def shot(name):
 path=out/(name+'.png');run('screenshot','--no-open',path);return path.read_bytes()
logfile=out/'watch.log'
with logfile.open('w') as stream:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=stream,stderr=subprocess.STDOUT)
 try:
  time.sleep(1)
  if a.install:run('install',root/'reader/build/reader.pbw');time.sleep(2)
  def log():return logfile.read_text()
  def expect(pattern,offset=0,timeout=8):
   end=time.monotonic()+timeout
   while time.monotonic()<end:
    match=re.search(pattern,log()[offset:])
    if match:return match
    time.sleep(.2)
   raise AssertionError('Missing log event: '+pattern+'; see '+str(logfile))
  if a.install:expect(r'Chunky ready'+re.escape(pack['id']+pack['version']),timeout=10)
  if a.install:expect(r'Chunky ready',timeout=15)
  baseline=shot('reading-before')
  def motion(enabled):
   # Called from a reading screen. Set deterministically, regardless of prior preference.
   press('back');press('down',3);offset=len(log());press('select');m=expect(r'Background motion ([01])',offset)
   if int(m[1])!=int(enabled):press('select');expect(r'Background motion '+str(int(enabled)),offset)
   press('back')
  def open_groups():press('back');press('down',2);press('select')
  def foreground(data):
   import io
   from PIL import Image
   im=Image.open(io.BytesIO(data)).convert('RGB')
   return bytes(1 if c in [(0,0,85),(255,170,85),(85,51,0),(170,170,0)] else 0 for c in im.getdata())
  motion(False);open_groups();groups=list(dict.fromkeys(s['group'] for s in library['scenes']));results=[]
  # First pass: every action holds exactly with backgrounds disabled.
  for group in groups:
   press('select');scenes=[s for s in library['scenes'] if s['group']==group]
   for i,scene in enumerate(scenes):
    sid=scene['nativeId'];offset=len(log());press('select');expect(r'Scene '+str(sid)+r' started',offset)
    if scene.get('action'):
     time.sleep(scene['establish']/1000+1);assert not re.search(r'Scene 1 held',log()[offset:]);press('select')
    time.sleep(.2);moving=shot(str(sid)+'-moving')
    held=expect(r'Scene '+str(sid)+r' held; free=(\d+) draw avg/max=(\d+)/(\d+) ms',offset,15)
    free,avg,maximum=map(int,held.groups());assert free>=a.min_free,('Heap headroom',sid,free)
    assert maximum<=round(1000/library['fps']),('Frame budget',sid,maximum)
    time.sleep(.8);frozen=shot(str(sid)+'-held');time.sleep(.6);assert frozen==shot(str(sid)+'-still'),'Unfrozen final frame '+str(sid)
    if scene.get('ensemble') or sid<=5:assert moving!=frozen,'No action movement '+str(sid)
    # Replay one action per group and check a stable heap measurement.
    if i==0:
     offset=len(log());press('down');expect(r'Scene '+str(sid)+r' started',offset)
     if scene.get('action'):time.sleep(scene['establish']/1000+.5);press('select')
     replay=expect(r'Scene '+str(sid)+r' held; free=(\d+)',offset,15)
     assert int(replay[1])>=free-256,('Heap leak on replay',sid,free,replay[1]);time.sleep(1)
    press('select');shot(str(sid)+'-returned');results.append({'id':scene['id'],'freeBytes':free,'drawAverageMs':avg,'drawMaximumMs':maximum})
    print('PASS held '+scene['id'],flush=True);press('down')
   press('back');press('down')
  press('back');press('back');assert shot('reading-after')==baseline,'Preview changed reading position'
  # Reinstall same package: saved position and motion preference must survive.
  offset=len(log());run('install',root/'reader/build/reader.pbw');expect(r'Chunky ready',offset,15);expect(r'Background motion 0',offset)
  assert shot('reading-restored')==baseline,'Reinstall changed reading position'
  motion(True);open_groups()
  # Moving ambience while the foreground pose stays held, including all setting samples.
  for group in groups:
   press('select');scenes=[s for s in library['scenes'] if s['group']==group]
   for i,scene in enumerate(scenes):
    sid=scene['nativeId']
    if group!='Backgrounds' and i>0:press('down');continue
    offset=len(log());press('select');expect(r'Scene '+str(sid)+r' started',offset)
    if scene.get('action'):time.sleep(scene['establish']/1000+.5);press('select')
    expect(r'Scene '+str(sid)+r' held',offset,15);time.sleep(.7)
    first=shot(str(sid)+'-ambient-a');changed=False
    for attempt in range(5):
     time.sleep(1.3);second=shot(str(sid)+'-ambient-b');assert foreground(first)==foreground(second),'Foreground did not hold '+str(sid)
     if first!=second:changed=True;break
    assert changed,'No background movement '+str(sid)
    press('select');press('down');print('PASS ambience '+scene['id'],flush=True)
   press('back');press('down')
  press('back');press('back');assert shot('reading-final')==baseline
  assert not re.search(r'INPUT ERROR|TRANSFER ERROR|out of memory|App fault|fxAbort',log(),re.I),'Runtime error; inspect watch.log'
  (out/'report.json').write_text(json.dumps({'episodeId':pack['id'],'episodeVersion':pack['version'],'scenes':results,'motionPreferenceRestart':True,'previewProgressPreserved':True,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False},indent=2)+'\n')
 finally:
  logs.terminate()
  try:logs.wait(timeout=5)
  except subprocess.TimeoutExpired:logs.kill();logs.wait()
