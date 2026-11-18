from pathlib import Path
import subprocess,time,re,json,hashlib
r=Path(__file__).resolve().parent;cli=str(r/'cli.sh');out=r/'verification';lab=r/'.local/reader-lab'
def run(*args):return subprocess.run([cli,*map(str,args),'--emulator','emery'],cwd=lab,check=True,capture_output=True,text=True,timeout=45)
def press(k,n=1):run('emu-button','click',k,'--repeat',n,'--interval',200)
def log():return (out/'reader.log').read_text()
def expect(pattern,pos=0):
 end=time.monotonic()+20
 while time.monotonic()<end:
  m=re.search(pattern,log()[pos:])
  if m:return m
  time.sleep(.15)
 raise AssertionError('Missing '+pattern+' '+log()[pos:])
with (out/'reader.log').open('w') as f:
 proc=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=lab,stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(.5);run('install',lab/'build/reader-lab.pbw');expect('Chunky ready');time.sleep(.5);press('back')
  results=[]
  for i in range(3):
   if i:press('down',i)
   pos=len(log());press('select');m=expect(r'STAGE held shot=(\d+) free=(\d+) max=(\d+) draws=(\d+)',pos);assert int(m[1])==i;results.append(dict(zip(['shot','minFree','maxDrawMs','draws'],map(int,m.groups()))));run('screenshot','--no-open',out/f'reader-{i}.png');press('back')
  # Resume reading, then return to the lab without advancing the saved story in previews.
  press('down',3);press('select');run('screenshot','--no-open',out/'reader-resumed.png');press('back');pos=len(log());press('select');expect('STAGE held shot=0',pos)
  assert not any(x in log() for x in ['memory full','App fault','INPUT ERROR','SAVE ERROR'])
  report={'passed':True,'measurements':results,'checks':['reader boots','all three scene previews','return to reading','preview after reading'],'pbwSha256':hashlib.sha256((lab/'build/reader-lab.pbw').read_bytes()).hexdigest(),'fullEpisodeRegression':False,'networkTransferTested':False,'physicalWatchTested':False}
  (out/'reader-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
 finally:proc.terminate();proc.wait(timeout=5)
