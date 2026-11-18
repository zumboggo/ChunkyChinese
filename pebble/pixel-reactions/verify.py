"""Exercise only the separate Alden demo in its dedicated emulator profile."""
from pathlib import Path
import subprocess,time,re,json,hashlib
root=Path(__file__).resolve().parent;cli=str(root/'isolated-cli.sh');out=root/'verification';out.mkdir(exist_ok=True)
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=root/'demo',check=True,capture_output=True,text=True,timeout=40)
def shot(name):
 p=out/(name+'.png');run('screenshot','--no-open',p);return p.read_bytes()
with (out/'watch.log').open('w') as file:
 logs=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=root/'demo',stdout=file,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);run('install',root/'demo/build/demo.pbw');time.sleep(2)
  for i,name in enumerate(['idle','surprised','thinking','talking','happy','worried']):
   if i:run('emu-button','click','select');time.sleep(1.8)
   held=shot(name);time.sleep(.4);assert held==shot(name+'-held'),'Unstable hold: '+name
   run('emu-button','click','down');time.sleep(1.8);assert held==shot(name+'-replay'),'Nondeterministic replay: '+name
   print('PASS',name,flush=True)
  for _ in range(3):
   for key in ['select','up','down']:run('emu-button','click',key)
  time.sleep(2)
  log=(out/'watch.log').read_text()
  assert all('held emotion='+str(i) in log for i in range(6))
  assert not any(s in log for s in ['App fault','memory full','ERROR'])
  rows=[dict(zip(['emotion','freeHeapBytes','maxDrawMs','draws'],map(int,r))) for r in re.findall(r'held emotion=(\d+) free=(\d+) max_draw=(\d+) draws=(\d+)',log)]
  assert rows
  report={'passed':True,'pbwSha256':hashlib.sha256((root/'demo/build/demo.pbw').read_bytes()).hexdigest(),'checks':['six finite reactions','held screens unchanged','replay deterministic','rapid next/previous/replay controls'],'measurements':rows,'minimumFreeHeapBytes':min(r['freeHeapBytes'] for r in rows),'maxDrawMs':max(r['maxDrawMs'] for r in rows),'rendererStateBytes':int(re.search(r'PIXEL state=(\d+)',log)[1]),'resourceBytes':5732,'rowBufferBytes':16,'physicalWatchTested':False,'integratedReaderTested':False}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
 finally:logs.terminate();logs.wait(timeout=5)
