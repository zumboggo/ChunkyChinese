"""SDK Python; requires a dedicated emulator. Uploads test content without rebuilding the PBW."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
from libpebble2.services.notifications import Notifications
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/catalogue-emulator';out.mkdir(parents=True,exist_ok=True)
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
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',350)
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

def wait_command(command):
 deadline=time.monotonic()+25
 while time.monotonic()<deadline:
  r=replies.get(timeout=max(.1,deadline-time.monotonic()))
  if r.get(keys['COMMAND'])==command:return r
 raise AssertionError(command)
def reply_page(request,items,total=None,offset=None):
 kind=request[keys['DATA']];offset=request.get(keys['OFFSET'],0) if offset is None else offset
 data={'kind':kind,'offset':offset,'total':len(items) if total is None else total,'items':items}
 service.send_message(target,{keys['COMMAND']:CString('CATALOG'),keys['DATA']:CString(json.dumps(data,separators=(',',':'))),keys['VERSION']:CString(request[keys['VERSION']])});time.sleep(.3)
def entry(p):return [p['id'],p['number'],p['title'],p['version']]
bundled=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
ep11=json.loads((root/'content/supportive-11.json').read_text());ep12=json.loads((root/'content/supportive-12.json').read_text());entries=[entry(ep11),entry(ep12),entry(bundled)]
def library():
 press('back');press('down',5);press('select');request=wait_command('CATALOG');reply_page(request,entries);return request
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(.5);send('HELLO','READY')
  # Reset only this dedicated fixture run; preserve all other emulator profiles.
  press('back');press('down',4);press('select');press('down');press('select')
  press('select');baseline13=shot('episode13-position')
  library();shot('library-11-13');press('select');shot('episode11-detail');press('select');request=wait_command('LOAD');assert request[keys['DATA']]=='supportive-11';transfer(ep11);time.sleep(.4);press('back');press('down',4);press('select');press('down');press('select');shot('episode11-opening')
  press('select');press('select');baseline11=shot('episode11-position')
  library();press('down',2);press('select');press('select');assert shot('episode13-resumed')==baseline13
  library();press('select');press('select');request=wait_command('LOAD');assert request[keys['DATA']]=='supportive-11';transfer(ep11);assert shot('episode11-resumed')==baseline11
  # The library navigates 150 episodes without sending all their titles to the watch.
  library();press('down',3);press('select');r=wait_command('CATALOG');assert r[keys['DATA']]=='groups';reply_page(r,[[i,i+9] for i in range(1,51,10)],15);shot('ranges-first')
  press('down',5);press('select');r=wait_command('CATALOG');assert r[keys['OFFSET']]==5;reply_page(r,[[i,i+9] for i in range(51,101,10)],15);shot('ranges-middle')
  press('down',6);press('select');r=wait_command('CATALOG');assert r[keys['OFFSET']]==10;reply_page(r,[[i,i+9] for i in range(101,151,10)],15);shot('ranges-last')
  press('down',4);press('select');r=wait_command('CATALOG');assert r[keys['DATA']]=='141'
  items=[['supportive-'+str(i),i,'Future test episode '+str(i),'abcdef123456'] for i in range(141,146)];reply_page(r,items,10)
  press('down',5);press('select');r=wait_command('CATALOG');assert r[keys['OFFSET']]==5
  items=[['supportive-'+str(i),i,'Future test episode '+str(i),'abcdef123456'] for i in range(146,151)];reply_page(r,items,10);shot('episodes-146-150')
  stress=[['x'*40+'-'+str(i),i,'Long published title '+('x'*59),'abcdef123456'] for i in range(146,151)];reply_page(r,stress,10);shot('maximum-title-page');reply_page(r,items,10)
  line=next(n for n in bundled['nodes'] if n['type']=='line').copy();line['phrases']=[next(p for n in bundled['nodes'] for p in n.get('phrases',[]) if len(p['py'])<16 and len(p['en'])<24)]
  fixture={'format':1,'chinese':False,'id':'supportive-149','number':149,'title':'Future test episode 149','version':'abcdef123456','entry':0,'nodes':[line,{'type':'end'}]}
  press('down',3);press('select');shot('episode149-detail');press('select');r=wait_command('LOAD');assert r[keys['DATA']]=='supportive-149';transfer(fixture)
  before_events={e['id'] for e in credit_events}
  press('back');press('down',4);press('select');press('down');press('select');press('select');press('select');ending=shot('fixture-completed')
  assert len({e['id'] for e in credit_events if e['episode']=='supportive-149' and e['id'] not in before_events})==1,'Expected one new full-run credit'
  press('back');press('down',5);press('select');r=wait_command('CATALOG');reply_page(r,items,10,5);shot('completion-marker')
  press('down',3);press('select');shot('completed-detail');press('select')
  # Interrupted replacement must not overwrite the active episode or its saved ending.
  w=wire(ep12);send('BEGIN','ACK',TOTAL=len(w),CHECKSUM=checksum(w),VERSION=ep12['version']);send('CHUNK','ACK',OFFSET=0,DATA=w[:600],CHECKSUM=checksum(w[:600]))
  run('install',root/'reader/build/reader.pbw');time.sleep(1);send('HELLO','READY');assert shot('restart-ending')==ending
  run('emu-bt-connection','--connected','no');press('back');press('down',5);press('select');time.sleep(.3);shot('offline-cached-list');press('down',3);press('select');shot('offline-completed-detail');press('select');assert shot('offline-resumed')==ending;run('emu-bt-connection','--connected','yes')
  transfer(bundled);time.sleep(.3)
  log=(out/'watch.log').read_text();assert not re.search(r'INPUT ERROR|SAVE ERROR|fxAbort|memory full|App fault',log,re.I),log
  assert 'Card episode 11: We Could Do Better' in log and 'Card episode 149: Future test episode 149' in log,'Wrong downloaded card title'
  report={'dynamicOpeningAndEndingTitles':True,'largeCatalogueEpisodes':150,'rangePagesTested':3,'selectedEpisode':149,'realEpisodesDownloaded':[11],'exactPositionRestored':[11,13],'completionMarkerPersisted':True,'interruptedTransferRetainedEpisode':True,'offlineResume':True,'syntheticCreditsOnly':True,'newCompletionCreditCount':1,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False}
  (out/'report.json').write_text(json.dumps(report,indent=2)+'\n');print('PASS catalogue navigation, saved positions, completion markers and offline resume',flush=True)
 finally:
  logs.terminate();logs.wait(timeout=5)
