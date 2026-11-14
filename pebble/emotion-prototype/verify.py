"""Exercise only the standalone prototype in the existing emulator; preserve reader saves."""
import subprocess,time,re,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent
cli='/Users/david.hepting/.local/bin/pebble'
out=root/'verification'
def run(*args):
 return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=root,check=True,capture_output=True,text=True,timeout=30)
def press(key):run('emu-button','click',key)
def shot(name):
 run('screenshot','--no-open',out/(name+'.png'))
 return (out/(name+'.png')).read_bytes()
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=root,stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(.8)
  run('install',root/'build/emotion-prototype.pbw');time.sleep(1.4)
  for i,name in enumerate(['smile','eyebrow','surprise']):
   if i:press('up');time.sleep(1.2)
   end=shot(name);time.sleep(.3);assert end==shot(name+'-held'),'Held screen changed'
   press('select');time.sleep(1.2);assert end==shot(name+'-replay'),'Replay differs'
   press('down');assert end!=shot(name+'-original'),'Original toggle has no effect'
   press('down');time.sleep(1.2)
  for _ in range(4):
   for key in ['up','select','down','down']:press(key)
  time.sleep(1.3)
  log=(out/'watch.log').read_text()
  assert all('held id='+str(i) in log for i in range(3))
  assert not any(e in log for e in ['App fault','ERROR','memory full'])
  metrics=[dict(zip(['id','minFree','maxDrawMs','draws'],map(int,m))) for m in re.findall(r'held id=(\d+) min_free=(\d+) max_draw_ms=(\d+) draws=(\d+)',log)]
  report={'passed':True,'checks':['three expressions','held screens stable','replay deterministic','original toggle','rapid repeated controls'],'measurements':metrics,'baseBytes':(root/'resources/alden.rle').stat().st_size,'streamBufferBytes':512,'pbwSha256':hashlib.sha256((root/'build/emotion-prototype.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False,'integratedReaderTested':False}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
 finally:logs.terminate();logs.wait(timeout=5)
