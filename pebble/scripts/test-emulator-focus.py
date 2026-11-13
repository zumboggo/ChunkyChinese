"""Local notification interrupts a gesture; its two clocks must freeze while unfocused."""
import json,os,re,subprocess,time
from pathlib import Path
from pebble_tool.sdk.emulator import ManagedEmulatorTransport
from libpebble2.communication import PebbleConnection
from libpebble2.services.notifications import Notifications
root=Path(__file__).resolve().parents[1]; cli=os.environ.get('PEBBLE_CLI',str(Path.home()/'.local/bin/pebble'));out=root/'.local/emulator'
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(button,n=1):run('emu-button','click',button,'--repeat',n,'--interval',180)
c=PebbleConnection(ManagedEmulatorTransport('emery','4.44'));c.connect();c.run_async()
with (out/'focus.log').open('w') as f:
 logs=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);press('back');press('down',2);press('select');press('down',2);press('select');press('down');press('select') # Boe offers cup
  Notifications(c).send_notification(subject='Local emulator test',message='Checking scene pause and resume',sender='Reader test')
  time.sleep(2);press('back');time.sleep(6)
  log=(out/'focus.log').read_text();events=re.findall(r'Scene focus ([01]) id=(\d+) action=(\d+) ambient=(\d+)',log)
  assert len(events)>=2,log
  lost=next(e for e in events if e[0]=='0');gained=next(e for e in events if e[0]=='1');assert lost[1:]==gained[1:],events
  assert int(lost[2])<4800,events
  assert re.search('Scene 11 held',log),log
  press('back');press('back');press('back');press('back')
  run('screenshot','--no-open',out/'focus-returned.png')
  (out/'focus-report.json').write_text(json.dumps({'events':events,'clocksFrozenDuringFocusLoss':True,'gestureCompletedAfterResume':True,'physicalWatchTested':False},indent=2)+'\n');print('PASS focus clocks pause/resume',events,flush=True)
 finally:
  logs.terminate();logs.wait(timeout=5)
