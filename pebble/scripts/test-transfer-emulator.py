"""Send the selected episode through the native transfer path in an isolated emulator."""
import argparse,json,subprocess,time,zlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--pack',help='Optional isolated-test episode JSON');a=p.parse_args();root=Path(__file__).resolve().parents[1]
pack=json.loads(Path(a.pack).read_text()) if a.pack else json.loads((root/'reader/src/pkjs/bundled.json').read_text())
if a.pack:
 meta={k:v for k,v in pack.items() if k!='nodes'};meta['nodeCount']=len(pack['nodes']);wire=''.join(json.dumps(n,ensure_ascii=True,separators=(',',':'))+'\n' for n in [meta,*pack['nodes']])
else:wire=(root/'reader/resources/data/story.ndjson').read_text()
keys=json.loads((root/'reader/build/appinfo.json').read_text())['appKeys'] if (root/'reader/build/appinfo.json').exists() else None
if not keys:
 import zipfile
 with zipfile.ZipFile(root/'reader/build/reader.pbw') as z:keys=json.loads(z.read('appinfo.json'))['appKeys']
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',capture_output=True,text=True,check=True,timeout=60)
def send(strings,ints={}):
 args=['send-app-message','--app-uuid','ee2d7d38-8c88-4134-8c1f-a8cf8860d1ee']
 if strings:args+=['--string']+[str(keys[k])+'='+str(v) for k,v in strings.items()]
 if ints:args+=['--uint']+[str(keys[k])+'='+str(v) for k,v in ints.items()]
 run(*args)
out=root/'.local/transfer-emulator';out.mkdir(parents=True,exist_ok=True)
# Boot sequentially before starting the concurrent log connection.
run('screenshot','--no-open',out/'before-test.png')
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1)
  send({'COMMAND':'BEGIN','CHECKSUM':format(zlib.adler32(wire.encode()),'x'),'VERSION':pack['version']},{'TOTAL':len(wire)})
  for i in range(0,len(wire),600):
   chunk=wire[i:i+600];send({'COMMAND':'CHUNK','DATA':chunk,'CHECKSUM':format(zlib.adler32(chunk.encode()),'x')},{'OFFSET':i})
  send({'COMMAND':'END'});time.sleep(3);run('screenshot','--no-open',out/'after-transfer.png')
  log=(out/'watch.log').read_text();assert logs.poll() is None,'Emulator log connection exited';assert not any(x in log for x in ['TRANSFER ERROR','memory full','fxAbort','App fault']),log
  assert 'Episode activated'+pack['id']+pack['version'] in log,log
  print('PASS native transfer activated the exact selected episode',flush=True)
 finally:logs.terminate();logs.wait(timeout=5)
