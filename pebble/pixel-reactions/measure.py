"""Measure isolated playback without screenshots that can pause emulator rendering."""
from pathlib import Path
import subprocess,time,re,json
root=Path(__file__).resolve().parent;cli=str(root/'isolated-cli.sh');out=root/'verification'
with (out/'performance.log').open('w') as f:
 p=subprocess.Popen([cli,'logs','--emulator','emery'],cwd=root/'demo',stdout=f,stderr=subprocess.STDOUT)
 try:
  time.sleep(1)
  subprocess.run([cli,'install',str(root/'demo/build/demo.pbw'),'--emulator','emery'],cwd=root/'demo',check=True,capture_output=True)
  time.sleep(2)
  for _ in range(5):
   subprocess.run([cli,'emu-button','click','select','--emulator','emery'],cwd=root/'demo',check=True,capture_output=True);time.sleep(2)
  rows=[dict(zip(['emotion','freeHeapBytes','maxDrawMs','draws'],map(int,r))) for r in re.findall(r'held emotion=(\d+) free=(\d+) max_draw=(\d+) draws=(\d+)',(out/'performance.log').read_text())]
  assert set(r['emotion'] for r in rows)==set(range(6))
  report={'measurements':rows,'maxDrawMs':max(r['maxDrawMs'] for r in rows),'minimumFreeHeapBytes':min(r['freeHeapBytes'] for r in rows),'method':'Isolated emulator; no screenshots during playback. Wall-clock measurements, not physical watch CPU timings.'}
  (out/'performance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
 finally:p.terminate();p.wait(timeout=5)
