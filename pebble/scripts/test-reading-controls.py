"""SDK Python: verify clock, direct choices, saved progress, and the timed reading light."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/reading-controls';out.mkdir(parents=True,exist_ok=True)
port=json.loads(Path(a.emulator_info).read_text())['emery']['4.44']['pypkjs']['port']
c=PebbleConnection(WebsocketTransport('ws://localhost:'+str(port)+'/'));c.connect();c.run_async();service=AppMessageService(c);replies=queue.Queue()
info=json.loads((root/'reader/build/appinfo.json').read_text());keys=info['messageKeys'];target=uuid.UUID(info['uuid'])
service.register_handler('appmessage',lambda tx,app,data:replies.put(data) if app==target else None)
def image_without_clock(data):
 import io
 from PIL import Image,ImageDraw
 image=Image.open(io.BytesIO(data)).convert('RGB');ImageDraw.Draw(image).rectangle((130,207,195,227),fill=(0,0,0));return image.tobytes()

def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',180)
def shot(name):
 file=out/(name+'.png');run('screenshot','--no-open',file);return image_without_clock(file.read_bytes())
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
bundled=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1)
  options=next(n for n in bundled['nodes'] if n['type']=='choice')['options']
  choice={'type':'choice','id':'comfort','options':[dict(options[0],to=1),dict(options[1],to=2)]}
  path_a={'type':'line','speaker':'Alden','phrases':[{'py':'hello','en':' '.join(p['en'] for p in options[0]['phrases'])}]}
  path_b={'type':'line','speaker':'Alden','phrases':[{'py':'hello','en':' '.join(p['en'] for p in options[1]['phrases'])}]}
  fixture={'format':1,'id':'supportive-995','number':995,'version':'comfort12345','chinese':False,'title':'Reading controls','entry':0,'nodes':[choice,path_a,path_b,{'type':'end'}]}
  transfer(fixture);press('back');press('down',4);press('select');press('down');press('select');press('select')
  before=shot('choices');press('select');assert shot('select-no-choice')==before
  run('emu-button','click','select','--duration',800);assert shot('light-no-choice')==before
  assert 'Reading light 120s' in (out/'watch.log').read_text()
  press('up');chosen_a=shot('choice-a');assert chosen_a!=before
  run('emu-button','click','select','--duration',800);assert shot('light-no-page-turn')==chosen_a
  run('install',root/'reader/build/reader.pbw');time.sleep(1);assert shot('saved-a')==chosen_a
  assert 'Save restored1' in (out/'watch.log').read_text()
  press('up');assert shot('back-to-choices')==before
  press('down');chosen_b=shot('choice-b');assert chosen_b!=chosen_a
  run('install',root/'reader/build/reader.pbw');time.sleep(1);assert shot('saved-b')==chosen_b
  assert 'Save restored2' in (out/'watch.log').read_text()
  run('emu-set-time','03:04:50','--utc');time.sleep(.5);shot('clock-before');time.sleep(12);shot('clock-after')
  from PIL import Image
  aimg=Image.open(out/'clock-before.png');bimg=Image.open(out/'clock-after.png')
  assert aimg.crop((130,207,196,228)).tobytes()!=bimg.crop((130,207,196,228)).tobytes(),'Clock did not tick'
  assert image_without_clock((out/'clock-before.png').read_bytes())==image_without_clock((out/'clock-after.png').read_bytes())
  run('emu-time-format','--format','12h');run('emu-set-time','11:59:00','--utc');press('back');shot('clock-12-hour');press('back')
  run('emu-set-time','23:59:00','--utc');press('back');shot('clock-12-hour-pm');press('back')
  run('emu-time-format','--format','24h');press('back');shot('clock-24-hour');press('back')
  # A repeated hold extends the timed light without altering the current page.
  run('emu-button','click','select','--duration',800);time.sleep(5)
  offset=(out/'watch.log').stat().st_size;run('emu-button','click','select','--duration',800);time.sleep(31)
  assert 'Reading light off' not in (out/'watch.log').read_text()[offset:]
  time.sleep(60);time.sleep(31)
  log=(out/'watch.log').read_text();assert 'Reading light off' in log[offset:];assert shot('after-light-timeout')==chosen_b
  transfer(bundled)
  result={'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'englishChoicesDirectUpDown':True,'selectDoesNotChoose':True,'holdDoesNotChooseOrTurnPage':True,'choiceSavesAndBacktracking':True,'clockTicksWithoutPageTurn':True,'lightRestartsAndTimesOut':True,'lightDurationSeconds':120,'physicalWatchTested':False}
  (out/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
 finally:
  logs.terminate();logs.wait(timeout=5)
