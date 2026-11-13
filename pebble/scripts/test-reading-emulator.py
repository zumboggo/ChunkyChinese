"""One full native reading route, including animations and queued Garden completion.
Use only the isolated test emulator: this deliberately restarts its reading run.
"""
import subprocess,json,time,argparse
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
  # Scene regression leaves the animation group picker open.
  press('back');press('down',2);press('select');press('down');press('select');shot('opening')
  for i,step in enumerate(plan['steps']):
   if step.get('wait'):time.sleep(step['wait']/1000)
   press('select',step['presses']);shot('route-'+str(i))
   print('Read segment',i,flush=True)
  time.sleep(2);shot('complete');press('back');press('down',5);press('select');time.sleep(2);shot('garden-status')
  log=(out/'watch.log').read_text();assert not any(x in log for x in ['INPUT ERROR','memory full','App fault','SAVE ERROR'])
  print('PASS full native route without runtime/save errors',flush=True)
 finally:logs.terminate();logs.wait(timeout=5)
