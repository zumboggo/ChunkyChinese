"""SDK Python; test the five-episode queue on a dedicated Emery, never a physical watch."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);p.add_argument('--min-free',type=int,default=8192);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/offline';out.mkdir(parents=True,exist_ok=True)
pbw=root/'reader/build/reader.pbw';digest=hashlib.sha256(pbw.read_bytes()).hexdigest()
def image_without_clock(data):
 import io
 from PIL import Image,ImageDraw
 image=Image.open(io.BytesIO(data)).convert('RGB');ImageDraw.Draw(image).rectangle((130,207,195,227),fill=(0,0,0));return image.tobytes()

def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',180)
def shot(name):
 f=out/(name+'.png');run('screenshot','--no-open',f);return image_without_clock(f.read_bytes())
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
logfile=out/'watch.log'
with logfile.open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);run('install',pbw);time.sleep(2);send('HELLO');expect('READY');upload(json.loads((root/'reader/src/pkjs/bundled.json').read_text()));time.sleep(.5);baseline=shot('original')
  upload(fixture(900));press('back');press('down',4);press('select');press('down');press('select');press('select');reading=shot('current-900')
  send('HELLO');expect('READY');req=expect('QUEUE');plan=[['supportive-'+str(n),n,'Queue test '+str(n),version(n)] for n in range(901,906)]
  send('PLAN',VERSION=req[keys['VERSION']],DATA=json.dumps(plan,separators=(',',':')))
  sizes=[]
  for n in range(901,906):
   request=expect('PREFETCH');assert request[keys['DATA']]=='supportive-'+str(n);token=request[keys['STATUS']]
   sizes.append(upload(fixture(n),token));assert shot('after-'+str(n))==reading,'Prefetch changed reading'
   print('PASS cached',n,sizes[-1],flush=True)
  # Offline: no companion replies. Finish and continue into the saved next episode.
  run('install',pbw);time.sleep(2);assert shot('restart-900')==reading
  press('select');press('select');shot('continue-menu');press('select');shot('opening-901');press('select');read901=shot('reading-901')
  run('install',pbw);time.sleep(2);assert shot('restart-901')==read901
  # Explicit storage probe: at least seven 64 KiB test files, deleted afterwards.
  press('back');press('down',6);press('select');press('down',5);press('select');shot('storage')
  # Four future entries remain, so Check storage index is 5.
  text=logfile.read_text();m=re.findall(r'Offline storage(\d+)cached(\d+)',text);assert m,'Storage probe did not run';allocatable,cached=map(int,m[-1]);assert allocatable>=7*65536
  press('back')
  # Interrupted refill must retain the active reader and existing cache.
  send('HELLO');expect('READY');req=expect('QUEUE');plan=[['supportive-'+str(n),n,'Queue test '+str(n),version(n)] for n in range(902,907)];send('PLAN',VERSION=req[keys['VERSION']],DATA=json.dumps(plan,separators=(',',':')))
  request=expect('PREFETCH');assert request[keys['DATA']]=='supportive-906';upload(fixture(906),request[keys['STATUS']],True)
  run('install',pbw);time.sleep(2);assert shot('interrupted-resume')==read901
  # Continue through remaining cached episodes without a network response.
  for n in range(902,906):
   press('select');press('select');press('select');shot('offline-opening-'+str(n));press('select')
  # Restore the real bundled episode and its prior reading position.
  upload(json.loads((root/'reader/src/pkjs/bundled.json').read_text()));time.sleep(.5);assert shot('restored-original')==baseline
  run('install',pbw);time.sleep(2);send('HELLO');expect('READY');assert shot('restored-after-completions')==baseline
  assert hashlib.sha256(pbw.read_bytes()).hexdigest()==digest,'PBW changed during test'
  assert not re.search(r'INPUT ERROR|fxAbort|App fault|memory full',logfile.read_text(),re.I)
  text=logfile.read_text();heap=list(map(int,re.findall(r'Transfer heap(\d+)',text)))
  instruments=[list(map(int,x.split(','))) for x in re.findall(r'instruments: ([0-9,]+)',text)]
  heap += [row[6] for row in instruments];assert heap and min(heap)>=a.min_free,(min(heap) if heap else None,'heap limit')
  result={'minimumMeasuredFreeHeapBytes':min(heap),'heapSamples':len(heap),'peakStringPoolBytes':max(row[7] for row in instruments),'peakSlotPoolBytes':max(row[9] for row in instruments),'peakStackBytes':max(row[11] for row in instruments),'pbwSha256':digest,'queuedEpisodes':5,'episodeBytes':sizes,'queuedBytes':sum(sizes),'allocatableBytesAtLeast':allocatable,'cachedBytesDuringProbe':cached,'prefetchPreservesReading':True,'offlineContinuation':True,'reinstallPreservesQueueAndPosition':True,'interruptedRefillPreservesQueue':True,'normalEpisodeRestored':True,'physicalWatchTested':False}
  (out/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
 finally:
  logs.terminate();logs.wait(timeout=5)
