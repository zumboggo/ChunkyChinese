"""Review every atlas expression in an isolated emulator, using the real download/portrait path.
This installs the candidate, downloads a temporary gallery and stops before its ending.
Run episode scene/reading checks afterwards to restore the intended content.
"""
import argparse,json,subprocess,time,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--cli',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'.local/portrait-emulator';out.mkdir(parents=True,exist_ok=True)
atlases=json.loads((root/'art/reaction-atlases.json').read_text())['atlases']
nodes=[{'type':'reaction','actor':x['actor'],'emotion':e,'scene':'gallery'} for x in atlases for e in x['emotions']]
pack={'format':1,'id':'portrait-review-1','version':'000000000001','title':'Portrait review','shortTitle':'Portrait review','number':1,'entry':0,'nodes':[*nodes,{'type':'end'}],'cast':[x['actor'] for x in atlases],'art':[x['actor']+'-'+x['emotion'] for x in nodes],'sources':[],'notice':'Isolated emulator verification only.'}
file=out/'gallery.json';file.write_text(json.dumps(pack))
def run(*args):return subprocess.run([a.cli,*map(str,args),'--emulator','emery'],cwd=root/'reader',check=True,capture_output=True,text=True,timeout=60)
def press(k,n=1):run('emu-button','click',k,'--repeat',n,'--interval',250)
run('screenshot','--no-open',out/'before.png');run('install',root/'reader/build/reader.pbw');time.sleep(2)
subprocess.run(['python3',str(root/'scripts/test-transfer-emulator.py'),'--cli',a.cli,'--pack',str(file)],check=True)
with (out/'watch.log').open('w') as f:
 logs=subprocess.Popen([a.cli,'logs','--emulator','emery'],cwd=root/'reader',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1)
  # Opening or retained gallery position, no overlay after install.
  press('back');press('down',4);press('select');press('down');press('select')
  for n in nodes:
   press('select');run('screenshot','--no-open',out/(n['actor']+'-'+n['emotion']+'.png'))
  assert logs.poll() is None,'Lost emulator log connection'
  log=(out/'watch.log').read_text();assert not any(e in log for e in ['INPUT ERROR','memory full','App fault','SAVE ERROR'])
  (out/'report.json').write_text(json.dumps({'portraits':len(nodes),'pbwSha256':hashlib.sha256((root/'reader/build/reader.pbw').read_bytes()).hexdigest(),'physicalWatchTested':False},indent=2)+'\n')
  print('PASS native portrait gallery:',len(nodes),'expressions')
 finally:logs.terminate();logs.wait(timeout=5)
