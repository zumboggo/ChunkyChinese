"""SDK Python; requires a dedicated emulator. Uploads test content without rebuilding the PBW."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
from libpebble2.services.notifications import Notifications
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/catalogue-reading';out.mkdir(parents=True,exist_ok=True)
port=json.loads(Path(a.emulator_info).read_text())['emery']['4.44']['pypkjs']['port']
c=PebbleConnection(WebsocketTransport('ws://localhost:'+str(port)+'/'));c.connect();c.run_async();service=AppMessageService(c);replies=queue.Queue()
info=json.loads((root/'reader/build/appinfo.json').read_text());keys=info['messageKeys'];target=uuid.UUID(info['uuid'])
credit_events=[]
def on_message(tx,app,data):
 if app!=target:return
 # This dedicated emulator contains test runs only. Acknowledge their local outbox
 # as a simulated phone/server would; never sends completion to an external service.
 if data.get(keys['COMMAND'])=='CREDIT':
  event=json.loads(data[keys['DATA']]);credit_events.append(event);service.send_message(target,{keys['COMMAND']:CString('CREDIT_ACK'),keys['DATA']:CString(event['id'])})
 else:replies.put(data)
service.register_handler('appmessage',on_message)
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',450)
def motion(enabled):
 press('back');press('down',3);offset=(out/'watch.log').stat().st_size;press('select')
 deadline=time.monotonic()+20
 while True:
  matches=re.findall(r'Background motion ([01])',(out/'watch.log').read_text()[offset:])
  if matches:break
  if time.monotonic()>deadline:raise AssertionError('Missing background preference event')
  time.sleep(.1)
 if int(matches[-1])!=int(enabled):press('select')
 press('back')
def shot(name):
 file=out/(name+'.png');run('screenshot','--no-open',file);return file.read_bytes()
def checksum(s):return format(zlib.adler32(s.encode('ascii')) & 0xffffffff,'x')
transport_retries=0
def send(command,expected,**values):
 global transport_retries
 message={keys[k]:(Uint32(v) if isinstance(v,int) else CString(v)) for k,v in {'COMMAND':command,**values}.items()}
 for attempt in range(5):
  service.send_message(target,message);end=time.monotonic()+6
  while time.monotonic()<end:
   try:r=replies.get(timeout=max(.1,end-time.monotonic()))
   except queue.Empty:break
   cmd=r.get(keys['COMMAND'])
   if cmd==expected:
    offset=0 if command=='BEGIN' else values.get('OFFSET',0)+len(values.get('DATA',''))
    if cmd=='ACK' and r.get(keys['OFFSET'])!=offset:continue
    return r
   if cmd=='ERROR':raise AssertionError(r)
  transport_retries+=1
 raise AssertionError('No '+expected+' after retries for '+command)
def wire(pack):
 meta={k:v for k,v in pack.items() if k!='nodes'};meta['nodeCount']=len(pack['nodes']);return '\n'.join(json.dumps(n,ensure_ascii=True,separators=(',',':')) for n in [meta,*pack['nodes']])+'\n'
def transfer(pack,expected='DONE'):
 w=wire(pack);send('BEGIN','ACK',TOTAL=len(w),CHECKSUM=checksum(w),VERSION=pack['version'])
 for i in range(0,len(w),600):
  chunk=w[i:i+600];send('CHUNK','ACK',OFFSET=i,DATA=chunk,CHECKSUM=checksum(chunk))
 return send('END',expected)


pack=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
plan=json.loads(subprocess.check_output(['node','scripts/reading-plan.mjs'],cwd=root,text=True))
scene_ids={s['id']:s['nativeId'] for s in json.loads((root/'scenes/library.json').read_text())['scenes']}
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  send('HELLO','READY');press('back');press('down',4);press('select');press('down');press('select');shot('opening')
  run('emu-bt-connection','--connected','no');offset=0
  for i,step in enumerate(plan['steps']):
   if step.get('wait'):
    deadline=time.monotonic()+30;pattern='Scene '+str(scene_ids[step['scene']])+' held;'
    while pattern not in (out/'watch.log').read_text()[offset:]:
     if time.monotonic()>deadline:raise AssertionError('Missing held scene '+step['scene'])
     time.sleep(.2)
    time.sleep(3);offset=len((out/'watch.log').read_text())
   press('select',step['presses']);print('Read segment',i,flush=True)
  ending=shot('offline-ending');run('emu-bt-connection','--connected','yes');send('HELLO','READY')
  deadline=time.monotonic()+20
  while not any(e['episode']==pack['id'] for e in credit_events):
   if time.monotonic()>deadline:raise AssertionError('No full-run credit')
   time.sleep(.2)
  before=len((out/'watch.log').read_text());run('install',root/'reader/build/reader.pbw');deadline=time.monotonic()+25
  end=next(i for i,n in enumerate(pack['nodes']) if n['type']=='end')
  while 'Save restored'+str(end) not in (out/'watch.log').read_text()[before:]:
   if time.monotonic()>deadline:raise AssertionError('Ending not saved')
   time.sleep(.2)
  send('HELLO','READY');assert shot('restored-ending')==ending
  ids={e['id'] for e in credit_events if e['episode']==pack['id']};assert len(ids)==1,ids
  log=(out/'watch.log').read_text();assert [int(x) for x in re.findall(r'Scene (\d+) held;',log)]==[6,8,8,6,8,6]
  assert not re.search(r'INPUT ERROR|SAVE ERROR|fxAbort|memory full|App fault',log,re.I),log
  report={'episode':pack['id'],'defaultRouteBluetoothDisabled':True,'animations':6,'endingResumedAfterRestart':end,'uniqueSyntheticCompletionCredits':1,'physicalWatchTested':False,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest()}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS full offline route, saved ending and single completion credit',flush=True)
 finally:
  run('emu-bt-connection','--connected','yes');logs.terminate();logs.wait(timeout=5)
