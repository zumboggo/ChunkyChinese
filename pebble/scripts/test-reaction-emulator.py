"""SDK Python: verify all reactions in a downloaded episode on an isolated emulator."""
import argparse,hashlib,json,re,subprocess,time,queue,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
from libpebble2.services.notifications import Notifications
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];out=root/'.local/reactions';out.mkdir(exist_ok=True)
cat=json.loads((root/'pixel-reactions/native-catalogue.json').read_text());bundled=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',180)
def shot(name):
 f=out/(name+'.png');run('screenshot','--no-open',f);return f.read_bytes()
run('screenshot','--no-open',out/'emulator-before.png')
port=json.loads(Path(a.emulator_info).read_text())['emery']['4.44']['pypkjs']['port'];c=PebbleConnection(WebsocketTransport('ws://localhost:'+str(port)+'/'));c.connect();c.run_async();service=AppMessageService(c);replies=queue.Queue()
info=json.loads((root/'reader/build/appinfo.json').read_text());keys=info['messageKeys'];target=uuid.UUID(info['uuid']);service.register_handler('appmessage',lambda tx,app,data:replies.put(data) if app==target else None)
def send(command,expected,**values):
 service.send_message(target,{keys[k]:(Uint32(v) if isinstance(v,int) else CString(v)) for k,v in {'COMMAND':command,**values}.items()});end=time.monotonic()+30
 while time.monotonic()<end:
  r=replies.get(timeout=max(.1,end-time.monotonic()));cmd=r.get(keys['COMMAND'])
  if cmd==expected:return r
  if cmd=='ERROR':raise AssertionError(r)
 raise AssertionError('Missing '+expected)
def upload(doc):
 meta={k:v for k,v in doc.items() if k!='nodes'};meta['nodeCount']=len(doc['nodes']);wire='\n'.join(json.dumps(x,ensure_ascii=True,separators=(',',':')) for x in [meta,*doc['nodes']])+'\n'
 checksum=lambda s:format(zlib.adler32(s.encode('ascii'))&0xffffffff,'x')
 send('BEGIN','ACK',TOTAL=len(wire),CHECKSUM=checksum(wire),VERSION=doc['version'])
 for at in range(0,len(wire),600):
  text=wire[at:at+600];send('CHUNK','ACK',OFFSET=at,DATA=text,CHECKSUM=checksum(text))
 send('END','DONE');time.sleep(.3)
logfile=out/'watch.log'
with logfile.open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);run('install',root/'reader/build/reader.pbw');time.sleep(2);baseline=shot('before');send('HELLO','READY')
  fixture={'format':1,'id':'supportive-996','number':996,'version':'reactions001','title':'Reaction verification','entry':0,'nodes':[{'type':'reaction','actor':x['actor'],'emotion':x['emotion']} for x in cat]+[{'type':'end'}]};upload(fixture);press('back');press('down',4);press('select');press('down');press('select');results=[]
  def expect(pattern,at=0):
   until=time.monotonic()+12
   while time.monotonic()<until:
    m=re.search(pattern,logfile.read_text()[at:])
    if m:return m
    time.sleep(.1)
   raise AssertionError('Missing '+pattern+'\n'+logfile.read_text()[at:])
  for item in cat:
   id=item['id']-1000;at=logfile.stat().st_size;press('select');expect(f'Reaction {id} started',at)
   if id==2:
    Notifications(c).send_notification(subject='Reaction pause test',message='Local emulator only',sender='Reader test');time.sleep(3)
    paused=logfile.read_text()[at:];assert 'Scene focus 0' in paused and f'Reaction {id} held' not in paused,paused
    press('back');expect('Scene focus 1',at)
   press('select') # a fresh early press must not skip the reaction
   m=expect(f'Reaction {id} held free=(\\d+) max=(\\d+)',at);free,cost=map(int,m.groups());assert free>=2048,(id,free);assert cost<=83,(id,cost)
   time.sleep(.3);held=shot(str(id)+'-held');time.sleep(.35);assert held==shot(str(id)+'-still')
   if item['emotion'] in ('blink','neutral'):
    at=logfile.stat().st_size;press('down');expect(f'Reaction {id} started',at);m2=expect(f'Reaction {id} held free=(\\d+)',at);assert int(m2[1])>=free-256;time.sleep(.3)
   results.append({'id':id,'actor':item['actor'],'emotion':item['emotion'],'freeBytes':free,'maxDrawMs':cost});print('PASS',item['actor'],item['emotion'],free,cost,flush=True)
  upload(bundled);time.sleep(.4);assert shot('after')==baseline,'Episode switch changed reading position'
  assert not re.search(r'fxAbort|memory full|INPUT ERROR|SAVE ERROR',logfile.read_text(),re.I)
  (out/'report.json').write_text(json.dumps({'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'reactions':results,'stableHolds':True,'focusPauseResume':True,'readingPositionPreserved':True,'physicalWatchTested':False},indent=2)+'\n')
 finally:logs.terminate();logs.wait(timeout=5)
