"""Integrated animation regression. Uses the existing Emery; never erases flash/saves.
Run after a build: python3 scripts/test-emulator.py --install
Without --install, launch the reader at a normal reading screen first.
"""
import argparse,hashlib,json,os,re,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--install',action='store_true')
p.add_argument('--cli',default=os.environ.get('PEBBLE_CLI','pebble'))
p.add_argument('--min-free',type=int,default=2048)
a=p.parse_args();root=Path(__file__).resolve().parents[1]
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
  press('back');press('down',2);press('select');menu=shot('menu')
  results=[]
  for scene in library['scenes']:
   sid=scene['nativeId'];offset=len(log())
   if sid>1:press('down',sid-1)
   press('select');expect(r'Scene '+str(sid)+r' started',offset)
   if scene.get('action'):
    time.sleep(scene['establish']/1000+2)
    assert not re.search(r'Scene 1 held',log()[offset:]),'Action advanced without Select'
    shot('phone-waiting');press('select')
   time.sleep(.5);moving=shot(str(sid)+'-moving')
   held=expect(r'Scene '+str(sid)+r' held; free=(\d+) draw avg/max=(\d+)/(\d+) ms',offset,10)
   free,avg,maximum=map(int,held.groups())
   assert free>=a.min_free,('Heap headroom',sid,free)
   assert maximum<=round(1000/library['fps']),('Frame budget',sid,maximum)
   time.sleep(.3);frozen=shot(str(sid)+'-held');time.sleep(1)
   assert frozen==shot(str(sid)+'-still'),'Final pose changed'
   assert frozen!=moving,'No visible movement'
   # Replay must restart this same scene without changing the saved story position.
   offset=len(log());press('down');expect(r'Scene '+str(sid)+r' started',offset)
   if scene.get('action'):
    time.sleep(scene['establish']/1000+.3);press('select')
   expect(r'Scene '+str(sid)+r' held',offset,10)
   # QEMU can run slower than wall time; give the fresh-press guard headroom.
   time.sleep(max(1.5,library['holdGuard']/1000*3));press('select')
   deadline=time.monotonic()+4
   while shot(str(sid)+'-returned')!=menu:
    if time.monotonic()>deadline:raise AssertionError('Select did not return to animation menu')
    time.sleep(.3)
   results.append({'id':scene['id'],'freeBytes':free,'drawAverageMs':avg,'drawMaximumMs':maximum})
   print('PASS '+scene['id'],flush=True)
  assert not re.search(r'INPUT ERROR|TRANSFER ERROR|out of memory|App fault',log(),re.I),'Runtime error; inspect watch.log'
  (out/'report.json').write_text(json.dumps({'scenes':results,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False},indent=2)+'\n')
 finally:
  logs.terminate()
  try:logs.wait(timeout=5)
  except subprocess.TimeoutExpired:logs.kill();logs.wait()
