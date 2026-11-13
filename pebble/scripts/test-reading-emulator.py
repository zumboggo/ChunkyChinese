"""One full native reading route, including animations and queued Garden completion.
Use only the isolated test emulator: this deliberately restarts its reading run.
"""
import subprocess,json,time,argparse,re,dbm,os,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--offline',action='store_true');p.add_argument('--from-reading',action='store_true',help='Start at an ordinary reading/card screen rather than animation groups');a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/reading-emulator';out.mkdir(parents=True,exist_ok=True)
storage=Path(os.environ.get('PEBBLE_TEST_PHONE_STORAGE',root/'.local/isolated-emulator/4.44/emery/localstorage/ee2d7d38-8c88-4134-8c1f-a8cf8860d1ee'))
def credits():
 try:
  with dbm.open(str(storage),'r') as d:return json.loads(d.get(b'garden-outbox',b'[]'))
 except dbm.error:return []
before_credits={e['id'] for e in credits()}
plan=json.loads(subprocess.check_output(['node','scripts/reading-plan.mjs'],cwd=root,text=True))
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',400)
def shot(name):run('screenshot','--no-open',out/(name+'.png'))
# Boot sequentially before starting the concurrent log connection.
run('screenshot','--no-open',out/'before-test.png')
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  # Scene regression leaves the animation group picker open.
  press('back');press('down',4 if a.from_reading else 2);press('select');press('down');press('select');shot('opening')
  if a.offline:run('emu-bt-connection','--connected','no')
  log_offset=0
  scene_ids={s['id']:s['nativeId'] for s in json.loads((root/'scenes/library.json').read_text())['scenes']}
  for i,step in enumerate(plan['steps']):
   if step.get('wait'):
    deadline=time.monotonic()+30
    pattern='Scene '+str(scene_ids[step['scene']])+' held;'
    while pattern not in (out/'watch.log').read_text()[log_offset:]:
     if time.monotonic()>deadline:raise AssertionError('Reading did not reach '+step['scene'])
     time.sleep(.2)
    time.sleep(5);log_offset=len((out/'watch.log').read_text())
   press('select',step['presses']);shot('route-'+str(i))
   print('Read segment',i,flush=True)
  time.sleep(2);shot('complete')
  pack=json.loads((root/'reader/src/pkjs/bundled.json').read_text());end=next(i for i,n in enumerate(pack['nodes']) if n['type']=='end')
  # The episode has ended offline; reconnect before using the phone-side installer.
  if a.offline:
   run('emu-bt-connection','--connected','yes')
   info=json.loads((root/'reader/build/appinfo.json').read_text());keys=info.get('appKeys') or info['messageKeys']
   run('send-app-message','--app-uuid',info['uuid'],'--string',str(keys['COMMAND'])+'=HELLO')
  restart_offset=len((out/'watch.log').read_text());run('install',root/'reader/build/reader.pbw')
  deadline=time.monotonic()+30
  while 'Save restored'+str(end) not in (out/'watch.log').read_text()[restart_offset:]:
   if time.monotonic()>deadline:raise AssertionError('Ending not saved')
   time.sleep(.2)
  shot('restored')
  assert (out/'complete.png').read_bytes()==(out/'restored.png').read_bytes(),'Ending changed after reinstall'
  deadline=time.monotonic()+20
  while not any(e['id'] not in before_credits and e['episode']==plan['episode'] for e in credits()):
   if time.monotonic()>deadline:raise AssertionError('No new credit delivered: inspect and acknowledge older synthetic fixture credits in the isolated watch queue, then verify its new completion; no real Garden account may be used')
   time.sleep(.2)
  press('back');press('down',5);press('select');time.sleep(2);shot('garden-status')
  log=(out/'watch.log').read_text();assert any(e['id'] not in before_credits and e['episode']==plan['episode'] for e in credits()),'No new completed-episode credit';assert logs.poll() is None,'Emulator log connection exited';assert not any(x in log for x in ['INPUT ERROR','memory full','App fault','SAVE ERROR'])
  assert len([e for e in credits() if e['id'] not in before_credits and e['episode']==plan['episode']])==1,'Duplicate completion credit'
  expected=[scene_ids[x['scene']] for x in plan['steps'] if x.get('scene')]
  assert [int(x) for x in re.findall(r'Scene (\d+) held;',log)]==expected,'Animation sequence mismatch'
  (out/'report.json').write_text(json.dumps({'episode':plan['episode'],'animations':len(expected),'defaultRouteBluetoothDisabled':a.offline,'endingResumedAfterRestart':end,'newCompletionQueued':True,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False},indent=2)+'\n')
  print('PASS full native route, saved ending and new Garden credit',flush=True)
 finally:
  if a.offline:run('emu-bt-connection','--connected','yes')
  logs.terminate();logs.wait(timeout=5)
