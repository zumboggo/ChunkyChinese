from pathlib import Path
import subprocess,time,re,json,hashlib
r=Path(__file__).resolve().parent;cli=str(r/'cli.sh');out=r/'verification'
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=r,check=True,capture_output=True,text=True,timeout=45)
def press(key):run('emu-button','click',key)
def shot(name):
 run('screenshot','--no-open',out/(name+'.png'));return (out/(name+'.png')).read_bytes()
def logs():return (out/'watch.log').read_text()
def expect(pattern,offset=0):
 end=time.monotonic()+18
 while time.monotonic()<end:
  m=re.search(pattern,logs()[offset:])
  if m:return m
  time.sleep(.15)
 raise AssertionError('Missing '+pattern+' '+logs()[offset:])
with (out/'watch.log').open('w') as f:
 proc=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=r,stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(.5);run('install',r/'build/visual-novel-prototype.pbw');expect('STAGE start shot=0');press('down');expect('STAGE mode=0')
  for i in range(3):
   pos=len(logs())
   if i:press('up')
   else:press('select')
   expect('STAGE held shot='+str(i),pos);a=shot(f'{i}-held');time.sleep(.5);assert shot(f'{i}-held-again')==a
   pos=len(logs());press('select');time.sleep(1.4);assert shot(f'{i}-moving')!=a;expect('STAGE held shot='+str(i),pos);assert shot(f'{i}-replay')==a
  # Full foreground remains held while each independent background effect moves.
  for mode in [1,2,3]:
   press('down');a=shot(f'ambience-{mode}-a');time.sleep(.65);b=shot(f'ambience-{mode}-b');assert a!=b
  press('down');a=shot('off');time.sleep(.5);assert a==shot('off-again')
  assert not any(e in logs() for e in ['App fault','memory full','ERROR'])
  results=[dict(zip(['shot','minFree','maxDrawMs','draws'],map(int,m))) for m in re.findall(r'STAGE held shot=(\d+) free=(\d+) max=(\d+) draws=(\d+)',logs())]
  report={'passed':True,'checks':['three gestures','finite holds','deterministic replay','fan motion','screensaver motion','both motion','off freezes screen'],'measurements':results,'cacheBytes':512,'artBytes':(r/'resources/alden.bin').stat().st_size,'pbwSha256':hashlib.sha256((r/'build/visual-novel-prototype.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
 finally:proc.terminate();proc.wait(timeout=5)
