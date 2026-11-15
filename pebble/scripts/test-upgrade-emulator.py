"""SDK Python: run legacy/offline upgrade modes on separate dedicated emulator stores."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);p.add_argument('--mode',choices=['legacy','offline'],required=True);p.add_argument('--v112-pbw',required=True);p.add_argument('--expressions-pbw',required=True);p.add_argument('--offline-pbw',required=True);p.add_argument('--label',default='offline-v1.13');p.add_argument('--compare-reading-body',action='store_true');a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/offline';out.mkdir(parents=True,exist_ok=True)
pbw=root/'reader/build/reader.pbw';digest=hashlib.sha256(pbw.read_bytes()).hexdigest()
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',180)
def shot(name):
 f=out/(name+'.png');run('screenshot','--no-open',f)
 if a.compare_reading_body:
  from PIL import Image
  return Image.open(f).convert('RGB').crop((0,23,200,207)).tobytes()
 return f.read_bytes()
port=json.loads(Path(a.emulator_info).read_text())['emery']['4.44']['pypkjs']['port'];c=PebbleConnection(WebsocketTransport('ws://localhost:'+str(port)+'/'));c.connect();c.run_async();service=AppMessageService(c);replies=queue.Queue()
info=json.loads((root/'reader/build/appinfo.json').read_text());keys=info['messageKeys'];target=uuid.UUID(info['uuid']);service.register_handler('appmessage',lambda tx,app,data:replies.put(data) if app==target else None)
def send(command,**values):service.send_message(target,{keys[k]:(Uint32(v) if isinstance(v,int) else CString(v)) for k,v in {'COMMAND':command,**values}.items()})
def expect(command,timeout=30):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  r=replies.get(timeout=max(.1,end-time.monotonic()));cmd=r.get(keys['COMMAND'])
  if cmd==command:return r
  if cmd=='ERROR':raise AssertionError(r)
 raise AssertionError('Missing '+command)
def wire(doc):
 meta={k:v for k,v in doc.items() if k!='nodes'};meta['nodeCount']=len(doc['nodes']);return '\n'.join(json.dumps(x,ensure_ascii=True,separators=(',',':')) for x in [meta,*doc['nodes']])+'\n'
def upload(doc,token='',partial=False):
 data=wire(doc);cs=lambda s:format(zlib.adler32(s.encode('ascii'))&0xffffffff,'x')
 send('BEGIN',TOTAL=len(data),CHECKSUM=cs(data),VERSION=doc['version'],STATUS=token,DATA=doc['id']);expect('ACK')
 for i in range(0,len(data),600):
  s=data[i:i+600];send('CHUNK',OFFSET=i,DATA=s,CHECKSUM=cs(s),STATUS=token);expect('ACK')
  if partial:return len(data)
 send('END',STATUS=token);expect('DONE');return len(data)
stamp=str(int(time.time())%100000000).zfill(8)
def version(n):return 'q'+stamp+str(n%1000).zfill(3)
def fixture(n):
 line={'type':'line','speaker':'Alden','phrases':[{'py':'hello','en':'hello'}]}
 padding={'type':'line','speaker':'Alden','phrases':[{'py':'hello '*12,'en':'hello '*12}]}
 return {'format':1,'id':'supportive-'+str(n),'number':n,'version':version(n),'title':'Queue test '+str(n),'chinese':False,'entry':0,'nodes':[line,{'type':'end'}]+[padding]*100}
out=root/'.local/upgrades';out.mkdir(exist_ok=True)
current=pbw
olds=[('v1.12',Path(a.v112_pbw).resolve()),('expressions-v1.13',Path(a.expressions_pbw).resolve())] if a.mode=='legacy' else []
def reset_reading():
 press('back');press('down',4);press('select');press('down');press('select');press('select')
checks=[]
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1)
  for label,old in olds:
   run('install',old);time.sleep(2);send('HELLO');expect('READY');upload(json.loads((root/'reader/src/pkjs/bundled.json').read_text()));reset_reading();time.sleep(.5);before=shot(label+'-before')
   run('install',current);time.sleep(2);assert shot(label+'-after')==before,label
   checks.append(label);print('PASS upgrade',label,'reading position and display retained',flush=True)
  if a.mode=='offline':
   old=Path(a.offline_pbw).resolve()
   run('install',old);time.sleep(2);send('HELLO');expect('READY');upload(fixture(900));reset_reading();before=shot(a.label+'-before')
   while not replies.empty():replies.get_nowait()
   send('HELLO');expect('READY');req=expect('QUEUE');plan=[['supportive-'+str(n),n,'Queue test '+str(n),version(n)] for n in range(901,906)]
   send('PLAN',VERSION=req[keys['VERSION']],DATA=json.dumps(plan,separators=(',',':')))
   for n in range(901,906):
    request=expect('PREFETCH');assert request[keys['DATA']]=='supportive-'+str(n);upload(fixture(n),request[keys['STATUS']])
   run('install',current);time.sleep(2);assert shot(a.label+'-after')==before
   for n in range(901,906):
    press('select');press('select');press('select');shot('upgraded-offline-opening-'+str(n));press('select')
  result={'pbwSha256':digest,'readingPositionAndDisplayPreservedFrom':checks+([a.label] if a.mode=='offline' else []),'fiveOlderCachedEpisodesPlayableAfterUpgrade':a.mode=='offline','comparedArea':'reading body' if a.compare_reading_body else 'full screen','physicalWatchTested':False}
  (out/('report-'+a.mode+'.json')).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
 finally:logs.terminate();logs.wait(timeout=5)
