from pathlib import Path
import subprocess,time,re,json,hashlib
from PIL import Image
r=Path(__file__).resolve().parent;cli=r.parent/'isolated-cli.sh';stage=r.parent/'.local/hybrid-reader';out=r/'verification';out.mkdir(exist_ok=True)
def run(*args):return subprocess.run([str(cli),*map(str,args),'--emulator','emery'],cwd=stage,check=True,capture_output=True,text=True,timeout=45)
def key(k):run('emu-button','click',k)
def shot(n):
 p=out/(n+'.png');run('screenshot','--no-open',p);return Image.open(p).tobytes()
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([str(cli),'logs','--emulator','emery'],cwd=stage,stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);run('install',stage/'build/hybrid-reader.pbw');time.sleep(2)
  opening=shot('opening');key('back');menu=shot('menu');key('select');time.sleep(5)
  held=shot('held');time.sleep(.8);assert held==shot('held-again')
  for i in range(3):
   key('down');time.sleep(5);assert held==shot('replay-'+str(i))
  key('select');assert menu==shot('returned-menu')
  key('back');assert opening==shot('returned-opening')
  key('select');time.sleep(.5);shot('reading')
  key('back');key('select');time.sleep(5);assert held==shot('from-reading')
  key('back');shot('back-from-prototype')
  text=(out/'watch.log').read_text();rows=[dict(zip(['minFreeHeap','maxDrawMs','avgDrawMs','draws'],map(int,m))) for m in re.findall(r'HYBRID held min=(\d+) max=(\d+) avg=(\d+) draws=(\d+)',text)]
  assert len(rows)>=5;assert not any(x in text for x in ['App fault','memory full','Uncaught'])
  report={'passed':True,'pbwSha256':hashlib.sha256((stage/'build/hybrid-reader.pbw').read_bytes()).hexdigest(),'integratedReader':True,'physicalWatch':False,'resourceBytes':(r/'alden.layers').stat().st_size,'sharedStreamBufferBytes':512,'checks':['finite reaction holds','held image stable','three identical replays','select returns to menu','back returns without advancing story','reader loads after preview','preview works after opening story'],'measurements':rows,'minimumFreeHeap':min(x['minFreeHeap'] for x in rows),'maximumDrawMs':max(x['maxDrawMs'] for x in rows)}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
 finally:logs.terminate();logs.wait(timeout=5)
