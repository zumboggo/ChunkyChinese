"""One full native reading route, including animations and queued Garden completion.
Use only the isolated test emulator: this deliberately restarts its reading run.
"""
import subprocess,json,time,argparse,hashlib,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/reading-emulator';out.mkdir(parents=True,exist_ok=True)
plan=json.loads(subprocess.check_output(['node','scripts/reading-plan.mjs'],cwd=root,text=True))
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',250)
def shot(name):run('screenshot','--no-open',out/(name+'.png'))
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  # Start at a normal reading screen in the dedicated emulator.
  run('emu-bt-connection','--connected','no')
  press('back');press('down',4);press('select');press('down');press('select');shot('opening')
  for i,step in enumerate(plan['steps']):
   if step.get('wait'):time.sleep(step['wait']/1000)
   press('select',step['presses']);shot('route-'+str(i))
   print('Read segment',i,flush=True)
  time.sleep(2);shot('complete');press('back');press('down',5);press('select');time.sleep(2);shot('garden-status')
  log=(out/'watch.log').read_text()
  library=json.loads((root/'scenes/library.json').read_text());ids={s['id']:s['nativeId'] for s in library['scenes']}
  assert [int(n) for n in re.findall(r'Scene (\d+) held',log)]==[ids[s['scene']] for s in plan['steps'] if s.get('scene')],log
  assert not any(x in log for x in ['INPUT ERROR','memory full','App fault','SAVE ERROR'])
  (out/'report.json').write_text(json.dumps({'episode':plan['episode'],'fullRouteOffline':True,'segments':len(plan['steps']),'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False},indent=2)+'\n')
  print('PASS full native route without runtime/save errors',flush=True)
 finally:
  run('emu-bt-connection','--connected','yes');logs.terminate();logs.wait(timeout=5)
