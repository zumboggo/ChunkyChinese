"""SDK Python; requires a dedicated emulator. Uploads test content without rebuilding the PBW."""
import argparse,hashlib,json,queue,re,subprocess,time,uuid,zlib
from pathlib import Path
from libpebble2.communication import PebbleConnection
from libpebble2.communication.transports.websocket import WebsocketTransport
from libpebble2.services.appmessage import AppMessageService,CString,Uint32
from libpebble2.services.notifications import Notifications
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);p.add_argument('--emulator-info',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/downloadable-scenes';out.mkdir(parents=True,exist_ok=True)
port=json.loads(Path(a.emulator_info).read_text())['emery']['4.44']['pypkjs']['port']
c=PebbleConnection(WebsocketTransport('ws://localhost:'+str(port)+'/'));c.connect();c.run_async();service=AppMessageService(c);replies=queue.Queue()
info=json.loads((root/'reader/build/appinfo.json').read_text());keys=info['messageKeys'];target=uuid.UUID(info['uuid'])
service.register_handler('appmessage',lambda tx,app,data:replies.put(data) if app==target else None)
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(key,n=1):run('emu-button','click',key,'--repeat',n,'--interval',180)
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
bundled=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
recipe='1,1,3,2,0,4,0,0,0,0,0,1100,3,0,0,80,2100,3,0,0,80,3400,0,0,0,0'
recipe2='1,2,0,0,1,4,0,0,0,0,0,1500,2,-15,-39,30,2300,2,-15,-39,30,3800,0,0,0,0'
line=next(n for n in bundled['nodes'] if n['type']=='line').copy();line['phrases']=[next(p for n in bundled['nodes'] for p in n.get('phrases',[]) if len(p['py'])<16 and len(p['en'])<24)]
fixture={'chinese':bundled.get('chinese',True),'format':1,'id':'supportive-999','number':999,'version':'abcdef123456','title':'Download test','entry':0,'nodes':[{'type':'animation','id':'download-home-pause','recipe':recipe},line,{'type':'animation','id':'download-train-cup','recipe':recipe2},{'type':'end'}]}
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);send('HELLO','READY');transfer(fixture)
  press('back');press('down',4);press('select');press('down');press('select') # deliberate test-run reset
  # Freeze backgrounds, then prove the uploaded foreground moves and holds.
  motion(False);press('select');time.sleep(.4);moving=shot('home-moving');time.sleep(4);held=shot('home-held');time.sleep(.7);assert held==shot('home-still');assert held!=moving
  for i in range(3):press('down');time.sleep(4);assert held==shot('home-replay-'+str(i))
  press('down');Notifications(c).send_notification(subject='Local emulator test',message='Checking downloaded motion pause',sender='Reader test');time.sleep(2);press('back');time.sleep(4);assert held==shot('focus-resumed')
  focus=re.findall(r'Scene focus ([01]) id=(\d+) action=(\d+) ambient=(\d+)',(out/'watch.log').read_text());lost=next(e for e in focus if e[0]=='0' and e[1]=='65535');gained=next(e for e in focus if e[0]=='1' and e[1]=='65535');assert lost[1:]==gained[1:],focus
  fixture['version']='abcdef123457';fixture['nodes'][0]['recipe']=recipe.replace(',3400,0,0,0,0',',3400,3,0,0,80')
  transfer(fixture);time.sleep(4);assert held!=shot('updated-held'), 'Same-ID recipe update kept stale native poses'
  press('select');baseline=shot('reading')
  bad=json.loads(json.dumps(fixture));bad['version']='badbad123456';bad['nodes'][0]['recipe']='2,1'
  transfer(bad,'ERROR');assert shot('invalid-retained')==baseline
  # Reinstall after an interrupted transfer: previous downloaded content/save survives.
  w=wire(bad);send('BEGIN','ACK',TOTAL=len(w),CHECKSUM=checksum(w),VERSION=bad['version']);send('CHUNK','ACK',OFFSET=0,DATA=w[:600],CHECKSUM=checksum(w[:600]))
  run('install',root/'reader/build/reader.pbw');time.sleep(2);send('HELLO','READY');assert shot('restart')==baseline
  run('emu-bt-connection','--connected','no')
  # Turn ambience back on, then reach the second downloaded recipe offline.
  motion(True);press('select');time.sleep(4.5);first=shot('train-held');time.sleep(1.3);assert first!=shot('train-ambient')
  press('select');shot('offline-ending');run('emu-bt-connection','--connected','yes')
  log=(out/'watch.log').read_text();assert log.count('Scene 65535 held')>=5,log
  assert not re.search(r'INPUT ERROR|SAVE ERROR|fxAbort|memory full|App fault',log,re.I),log
  values=[int(v) for v in re.findall(r'Scene 65535 held; free=(\d+)',log)];assert min(values)>=1500,values
  assert max(values[:4])-min(values[:4])<=256,values
  # Validate every reusable gesture on each newly installed rig through the data path.
  motion(False)
  cast=json.loads((root/'scenes/ensemble/characters.json').read_text());verified=[]
  for who,name in enumerate(['gorgon','boe','jeremy','hannah','young-alden','alden']):
   for action,track in cast['actions'].items():
    trackkeys=track.get('downloadKeys',track['keys'])
    values=[1,who,3,2,int(action in ['offer','sip']),len(trackkeys)]
    for key in trackkeys:values += [*key[:4],round(key[4]*1000)]
    fixture['version']='casttest%04d'%(who*10+list(cast['actions']).index(action));fixture['nodes']=[{'type':'animation','id':'download-'+name+'-'+action,'recipe':','.join(map(str,values))},{'type':'end'}]
    transfer(fixture);press('back');press('down',4);press('select');press('down');press('select');press('select');time.sleep(.6);start=shot(name+'-'+action+'-moving');time.sleep(5);end=shot(name+'-'+action+'-held');time.sleep(.5);assert end==shot(name+'-'+action+'-still');assert start!=end,(name,action)
    if action=='listen':press('down');time.sleep(5.3);assert end==shot(name+'-replay')
    verified.append(name+'/'+action);print('PASS downloaded '+name+'/'+action,flush=True)
  log=(out/'watch.log').read_text();assert not re.search(r'INPUT ERROR|SAVE ERROR|fxAbort|memory full|App fault',log,re.I),log
  values=[int(v) for v in re.findall(r'Scene 65535 held; free=(\d+)',log)];assert min(values)>=1500,values
  result={'newRecipesTransferredWithoutRebuild':26,'verifiedActors':['gorgon','boe','jeremy','hannah','young-alden','alden'],'newCastGestureChecks':verified,'foregroundMovementAndHold':True,'replays':3,'focusClocksPreserved':True,'sameIdRecipeUpdateReplacedHeldPose':True,'invalidPackageRetainedPrevious':True,'interruptedUpdateRestartAndResume':True,'downloadedPlaybackOffline':True,'backgroundMotionSetting':True,'heldFreeBytes':values,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False}
  transfer(bundled);time.sleep(1)
  final_log=(out/'watch.log').read_text();assert 'Episode activated'+bundled['id']+bundled['version'] in final_log
  assert not re.search(r'INPUT ERROR|SAVE ERROR|fxAbort|memory full|App fault',final_log,re.I),final_log
  result['transportRetries']=transport_retries
  result['normalEpisodeRestored']=True
  (out/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
  # Leave the dedicated emulator on the normal episode.
 finally:logs.terminate();logs.wait(timeout=5)
