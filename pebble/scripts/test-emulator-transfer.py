"""Exercise the real watch receiver via the local emulator (SDK Python required)."""
import hashlib,json,queue,subprocess,time,uuid,zlib,os
from pathlib import Path
from pebble_tool.sdk.emulator import ManagedEmulatorTransport
from libpebble2.communication import PebbleConnection
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
root=Path(__file__).resolve().parents[1]
info=json.loads((root/'reader/build/appinfo.json').read_text()); keys=info['messageKeys']; target=uuid.UUID(info['uuid'])
wire=(root/'reader/resources/data/story.ndjson').read_text(); version=json.loads(wire.splitlines()[0])['version']
def checksum(s):return format(zlib.adler32(s.encode('ascii')) & 0xffffffff,'x')
c=PebbleConnection(ManagedEmulatorTransport('emery','4.44'));c.connect();c.run_async();service=AppMessageService(c); replies=queue.Queue()
service.register_handler('appmessage',lambda tx,app,data:replies.put(data) if app==target else None)
transport_retries=0
def send(command,expected,**values):
 global transport_retries
 data={'COMMAND':command,**values};message={keys[k]:(Uint32(v) if isinstance(v,int) else CString(v)) for k,v in data.items()}
 # Same bounded transport retry policy as the recipe-download suite. Retain its count.
 for attempt in range(5):
  service.send_message(target,message);deadline=time.monotonic()+6
  while time.monotonic()<deadline:
   try:response=replies.get(timeout=max(.1,deadline-time.monotonic()))
   except queue.Empty:break
   cmd=response.get(keys['COMMAND'])
   if cmd==expected:
    offset=0 if command=='BEGIN' else values.get('OFFSET',0)+len(values.get('DATA',''))
    if cmd=='ACK' and response.get(keys['OFFSET'])!=offset:continue
    return response
   if cmd=='ERROR':raise AssertionError(response)
  transport_retries+=1
 raise AssertionError('No response after retries: '+command)
def begin():send('BEGIN','ACK',TOTAL=len(wire),CHECKSUM=checksum(wire),VERSION=version)
def chunk(offset):
 data=wire[offset:offset+600];r=send('CHUNK','ACK',OFFSET=offset,DATA=data,CHECKSUM=checksum(data));assert r[keys['OFFSET']]==offset+len(data)
cli=os.environ.get('PEBBLE_CLI',str(Path.home()/'.local/bin/pebble'))
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
run('screenshot','--no-open',root/'.local/emulator/transfer-before.png')
send('HELLO','READY');begin();chunk(0)
send('END','ERROR') # incomplete package cannot activate
begin();chunk(0)
run('install',root/'reader/build/reader.pbw');time.sleep(2);send('HELLO','READY')
run('screenshot','--no-open',root/'.local/emulator/transfer-recovered.png')
assert (root/'.local/emulator/transfer-before.png').read_bytes()==(root/'.local/emulator/transfer-recovered.png').read_bytes(), 'Interrupted update changed reading position'

begin();send('CHUNK','ERROR',OFFSET=0,DATA=wire[:600],CHECKSUM='0')
# Restart from zero after both rejected transfers, then complete all acknowledged chunks.
begin()
for offset in range(0,len(wire),600):chunk(offset)
send('END','DONE');send('END','DONE') # duplicate completion is idempotent
result={'wireBytes':len(wire),'version':version,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'interruptedRestartPreservedPosition':True,'incompleteRejected':True,'badChunkRejected':True,'restartAndComplete':True,'duplicateEnd':True,'physicalWatchTested':False}
# A cover can share its compact pose with a reaction; overlays must still update.
from PIL import Image
def press(button):run('emu-button','click',button)
def shot(name):
 path=root/'.local/emulator'/('reaction-'+name+'.png');run('screenshot','--no-open',path);return Image.open(path).convert('RGB')
def upload_document(doc):
 meta={k:v for k,v in doc.items() if k!='nodes'};meta['nodeCount']=len(doc['nodes'])
 payload='\n'.join(json.dumps(x,ensure_ascii=True,separators=(',',':')) for x in [meta,*doc['nodes']])+'\n'
 send('BEGIN','ACK',TOTAL=len(payload),CHECKSUM=checksum(payload),VERSION=doc['version'])
 for offset in range(0,len(payload),600):
  text=payload[offset:offset+600];send('CHUNK','ACK',OFFSET=offset,DATA=text,CHECKSUM=checksum(text))
 send('END','DONE');time.sleep(.4)
fixture={'format':1,'id':'supportive-997','number':997,'version':'rxtest123456','title':'Reaction card One','cover':'Gorgon-neutral-full','entry':0,'nodes':[{'type':'reaction','actor':'Gorgon','emotion':'neutral'},{'type':'end'}]}
upload_document(fixture);press('back');[press('down') for _ in range(4)];press('select');press('down');press('select');first=shot('opening-one')
fixture['version']='rxtest123457';fixture['title']='Reaction card Two';upload_document(fixture);second=shot('opening-two');assert first.tobytes()!=second.tobytes(),'Same-cover title did not update'
press('select');time.sleep(2.5);reaction=shot('held');assert reaction.getpixel((0,170))==(255,255,255),'Opening overlay remained on reaction'
press('select');ending=shot('ending');assert ending.getpixel((0,170))==second.getpixel((0,170))!=(255,255,255),'Ending card overlay missing'
result['sameCoverTitleUpdated']=True;result['reactionToEndingOverlayUpdated']=True
upload_document(json.loads((root/'reader/src/pkjs/bundled.json').read_text()))
result['normalEpisodeRestored']=True
result['transportRetries']=transport_retries
(root/'.local/emulator/transfer-report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
# Process exit closes the local websocket.
