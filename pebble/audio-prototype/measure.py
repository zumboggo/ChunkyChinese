"""Build a temporary static control to measure the audio implementation's cost."""
from pathlib import Path
import shutil,re,subprocess,tempfile,json
root=Path(__file__).resolve().parent
cli='/Users/david.hepting/.local/bin/pebble'
def build(path):
 subprocess.run([cli,'clean'],cwd=path,capture_output=True,text=True,check=True)
 r=subprocess.run([cli,'build'],cwd=path,capture_output=True,text=True,check=True)
 return {name:int(re.search(pattern,r.stdout)[1]) for name,pattern in [('resourcesBytes',r'Total size of resources:\s+(\d+)'),('ramFootprintBytes',r'Total footprint in RAM:\s+(\d+)')]}
audio=build(root)
with tempfile.TemporaryDirectory(prefix='audio-static-') as tmp:
 out=Path(tmp)
 for name in ['wscript','package.json','src','resources']:
  if (root/name).is_dir():shutil.copytree(root/name,out/name)
  else:shutil.copy2(root/name,out/name)
 s=(root/'src/c/main.c').read_text()
 s=s.replace('#define AUDIO_ENABLED 1','#define AUDIO_ENABLED 0')
 (out/'src/c/main.c').write_text(s)
 baseline=build(out)
report={'audio':audio,'staticControl':baseline,'addedRamFootprintBytes':audio['ramFootprintBytes']-baseline['ramFootprintBytes'],'note':'Build footprint includes code and static data, not just heap. Static control omits the audio buffer, streaming, timers and callbacks but retains the same shell and controls. Not an integrated-reader measurement.'}
(root/'verification/size-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
