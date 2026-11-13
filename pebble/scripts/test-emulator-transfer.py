"""Exercise the real watch receiver via the local emulator (SDK Python required)."""
import hashlib,json,queue,subprocess,time,uuid,zlib
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
def send(command,expected,**values):
 data={'COMMAND':command,**values}; service.send_message(target,{keys[k]:(Uint32(v) if isinstance(v,int) else CString(v)) for k,v in data.items()})
 deadline=time.monotonic()+30
 while time.monotonic()<deadline:
  response=replies.get(timeout=max(.1,deadline-time.monotonic())); cmd=response.get(keys['COMMAND'])
  if cmd==expected:return response
  if cmd=='ERROR':raise AssertionError(response)
 raise AssertionError('No response: '+command)
def begin():send('BEGIN','ACK',TOTAL=len(wire),CHECKSUM=checksum(wire),VERSION=version)
def chunk(offset):
 data=wire[offset:offset+600];r=send('CHUNK','ACK',OFFSET=offset,DATA=data,CHECKSUM=checksum(data));assert r[keys['OFFSET']]==offset+len(data)
cli=str(Path.home()/'.local/bin/pebble')
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
(root/'.local/emulator/transfer-report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
# Process exit closes the local websocket.
