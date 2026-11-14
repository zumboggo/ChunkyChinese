from pathlib import Path
import subprocess,time,re,json
from pebble_tool.sdk import emulator
from libpebble2.communication import PebbleConnection
from libpebble2.services.notifications import Notifications
r=Path(__file__).resolve().parent;out=r/'verification';cli=str(r/'cli.sh');store=r/'.local/emulator'
emulator.get_sdk_persist_dir=lambda platform,version=None:str(store/(version or '4.44')/platform)
emulator.get_emulator_info_path=lambda:str(store/'emulators.json')
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=r,check=True,capture_output=True,text=True,timeout=40)
c=PebbleConnection(emulator.ManagedEmulatorTransport('emery','4.44'));c.connect();c.run_async()
with (out/'focus.log').open('w') as f:
 logs=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=r,stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(.5);run('install',r/'build/visual-novel-prototype.pbw');time.sleep(.5)
  Notifications(c).send_notification(subject='Local scene test',message='Checking pause and resume',sender='Prototype')
  time.sleep(1);run('emu-button','click','back');time.sleep(5)
  text=(out/'focus.log').read_text();events=re.findall(r'STAGE focus=([01]) action=(\d+) ambient=(\d+)',text)
  lost=next(e for e in events if e[0]=='0');gained=next(e for e in events if e[0]=='1');assert lost[1:]==gained[1:] and int(lost[1])<4000,events
  assert 'STAGE held shot=0' in text
  report={'passed':True,'events':events,'clocksPausedWhileUnfocused':True,'completedAfterResume':True};(out/'focus-report.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
 finally:logs.terminate();logs.wait(timeout=5)
