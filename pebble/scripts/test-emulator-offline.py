"""Read the default route offline in the emulator. Intentionally restarts its episode save."""
import hashlib,json,os,re,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[1];cli=os.environ.get('PEBBLE_CLI',str(Path.home()/'.local/bin/pebble'));out=root/'.local/emulator'
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=240)
def press(button,n=1):run('emu-button','click',button,'--repeat',n,'--interval',200)
with (out/'offline.log').open('w') as f:
 logs=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1);run('emu-bt-connection','--connected','no')
  press('back');press('down',4);press('select');press('down');press('select')
  # Enough fresh presses for all phrases/pages/portraits and the guarded animation holds.
  press('select',450);run('screenshot','--no-open',out/'offline-ending.png')
  run('install',root/'reader/build/reader.pbw');time.sleep(2)
  log=(out/'offline.log').read_text();pack=json.loads((root/'reader/src/pkjs/bundled.json').read_text());end=next(i for i,n in enumerate(pack['nodes']) if n['type']=='end')
  assert 'Save restored'+str(end) in log,log[-3000:]
  assert not re.search(r'INPUT ERROR|SAVE ERROR|fxAbort|out of memory|App fault',log,re.I),log[-3000:]
  for sid in range(1,6):assert re.search(r'Scene '+str(sid)+' held',log),sid
  run('screenshot','--no-open',out/'offline-restored.png')
  assert (out/'offline-ending.png').read_bytes()==(out/'offline-restored.png').read_bytes()
  result={'defaultRouteBluetoothDisabled':True,'allFiveStoryScenes':True,'endingResumedAfterRestart':end,'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False}
  (out/'offline-report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
 finally:
  run('emu-bt-connection','--connected','yes');logs.terminate();logs.wait(timeout=5)
