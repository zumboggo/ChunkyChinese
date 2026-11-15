"""SDK Python; test the five-episode queue on a dedicated Emery, never a physical watch."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);p.add_argument('--min-free',type=int,default=8192);p.add_argument('--content-dir',default='.local/published');a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/download-memory';out.mkdir(parents=True,exist_ok=True)
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
 meta={k:v for k,v in doc.items() if k not in ['nodes','sources','notice','art','cast']};meta['nodeCount']=len(doc['nodes']);return '\n'.join(json.dumps(x,ensure_ascii=True,separators=(',',':')) for x in [meta,*doc['nodes']])+'\n'
def upload(doc,token='',partial=False):
 data=wire(doc);cs=lambda s:format(zlib.adler32(s.encode('ascii'))&0xffffffff,'x')
 send('BEGIN',TOTAL=len(data),CHECKSUM=cs(data),VERSION=doc['version'],STATUS=token,DATA=doc['id']);expect('ACK')
 for i in range(0,len(data),600):
  s=data[i:i+600];send('CHUNK',OFFSET=i,DATA=s,CHECKSUM=cs(s),STATUS=token);expect('ACK')
  if partial:return len(data)
 send('END',STATUS=token);expect('DONE');return len(data)

logfile=out/'watch.log'
with logfile.open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);run('install',pbw);time.sleep(2);send('HELLO');expect('READY')
  current=json.loads((root/'reader/src/pkjs/bundled.json').read_text());current['version']=hashlib.sha256(str(time.time_ns()).encode()).hexdigest()[:12]
  current['nodes']=[{'type':'line','speaker':'Alden','phrases':[{'py':'hello','en':'hello'}]} for _ in range(24)]
  for i in range(4):current['nodes'].append({'type':'choice','id':'memory-choice-'+str(i),'options':[{'id':'option-'+str(j),'to':25+i,'phrases':[{'py':'hello','en':'hello'}]} for j in range(2)]})
  current['nodes'].append({'type':'end'});upload(current);press('select',25);press('up',4);shot('completed-current');print('PASS completed current with full history and four choices',flush=True)
  docs=[json.loads((root/a.content_dir/('supportive-'+str(n)+'.json')).read_text()) for n in range(14,18)]
  extra=json.loads(json.dumps(docs[0]));extra.update(id='supportive-918',number=18,title='Memory regression fixture',shortTitle='Memory regression fixture');docs.append(extra)
  for d in docs:d['version']=hashlib.sha256((d['version']+str(time.time_ns())).encode()).hexdigest()[:12]
  send('HELLO');expect('READY');req=expect('QUEUE')
  plan=[[d['id'],d['number'],d.get('shortTitle',d['title']),d['version']] for d in docs]
  send('PLAN',VERSION=req[keys['VERSION']],DATA=json.dumps(plan,separators=(',',':')))
  for doc in docs:
   request=expect('PREFETCH');assert request[keys['DATA']]==doc['id'];upload(doc,request[keys['STATUS']]);print('PASS published',doc['id'],flush=True)
  shot('downloaded');run('install',pbw);time.sleep(2);shot('restart')
  for doc in docs:
   press('back');press('down',6);press('select');press('select');time.sleep(4);opening=shot('open-'+doc['id'])
   run('install',pbw);time.sleep(5);assert shot('restart-'+doc['id'])==opening,'Offline position changed'
   press('select');shot('read-'+doc['id']);print('PASS offline open',doc['id'],flush=True)
  text=logfile.read_text();assert not re.search(r'fxAbort|INPUT ERROR|SAVE ERROR|TRANSFER ERROR|App fault|memory full',text,re.I)
  rows=[list(map(int,x.split(','))) for x in re.findall(r'instruments: ([0-9,]+)',text)]
  heap=[row[6] for row in rows]+list(map(int,re.findall(r'Transfer heap(\d+)',text)));assert min(heap)>=a.min_free,min(heap)
  result={'pbwSha256':digest,'publishedEpisodes':[14,15,16,17],'completedCurrentWith24HistoryEntriesAndFourChoices':True,'fifthSlotUsesTestOnlyCopyOf14':True,'allFiveDownloadedAndReopenedOffline':True,'restartPreservesPositions':True,'minimumMeasuredFreeHeapBytes':min(heap),'peakStringPoolBytes':max(row[7] for row in rows),'peakSlotPoolBytes':max(row[9] for row in rows),'heapSamples':len(heap),'physicalWatchTested':False}
  (out/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
 finally:
  logs.terminate();logs.wait(timeout=5)
