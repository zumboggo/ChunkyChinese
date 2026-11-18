from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,io,base64,json
r=Path(__file__).resolve().parent;(r/'.local').mkdir(exist_ok=True);exe=r/'.local/render'
subprocess.run(['cc','-O2',str(r/'host.c'),'-o',str(exe)],check=True)
def frame(shot,t,ambient,mode,hardware=0):return Image.open(io.BytesIO(subprocess.check_output([str(exe),str(shot),str(t),str(ambient),str(mode),str(hardware)],cwd=r))).convert('RGB')
def url(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
data={}
for hardware in [0,1]:
 for shot in range(3):
  for mode in range(4):
   data[f'{hardware}-{shot}-{mode}']={'action':[url(frame(shot,t,t,mode,hardware)) for t in range(0,4000,100)],'hold':[url(frame(shot,4000,t,mode,hardware)) for t in (range(0,4800,100) if mode else [0])]}
images=[]
for t in range(0,6000,100):
 board=Image.new('RGB',(600,228))
 for shot in range(3):board.paste(frame(shot,min(t,4000),t,3),(shot*200,0))
 images.append(board)
images[0].save(r/'preview/combined.gif',save_all=True,append_images=images[1:],duration=100,loop=0,disposal=2)
board=Image.new('RGB',(600,228))
for shot,t in enumerate([1000,2250,2350]):board.paste(frame(shot,t,1500,3),(shot*200,0))
board.save(r/'preview/poses.png')
html='''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alden · a little room to act</title>
<style>body{background:#eee8de;color:#302a26;font:17px system-ui;max-width:1000px;margin:40px auto;padding:0 20px}h1{font:38px Georgia;margin-bottom:10px}p{line-height:1.5}nav{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}button,select{font:inherit;padding:10px 14px;border:1px solid #b7aa98;border-radius:8px;background:#fffaf0;color:inherit}button{cursor:pointer}.shots{display:flex;gap:24px;flex-wrap:wrap}.card{background:#fffaf0;padding:18px;border-radius:14px;box-shadow:0 3px 14px #675a4920}h2{font:21px Georgia}img{width:200px;height:228px;image-rendering:pixelated;display:block;margin-bottom:14px}.state{font-size:13px;color:#716455;margin-left:8px}.note{font-size:14px;max-width:760px}button:focus-visible,select:focus-visible{outline:3px solid #6c8990}</style>
<h1>A little room to act</h1><p>Alden’s approved face, a simple hoodie, and three small performances.<br>The character settles; the room can keep moving.</p>
<nav><button id="all">Replay all</button><button id="pause">Pause</button><label>Room <select id="mode"><option value="3">Fan + screensaver</option><option value="1">Fan only</option><option value="2">Screensaver only</option><option value="0">Still</option></select></label><label>Palette <select id="palette"><option value="0">Original artwork</option><option value="1">Watch RGB approximation</option></select></label></nav>
<div class="shots">'''
for i,name in enumerate(['A small surprise','One last fry','An unexpected message']):html+=f'<section class="card"><h2>{name}</h2><img id="shot{i}" alt="Alden performing {name.lower()}"><button data-shot="{i}">Replay</button><span class="state" id="state{i}">Playing</span></section>'
html+='''</div><p class="note">Actual watch-size previews: 200 × 228. These frames come from the same C scene renderer as the watch prototype, sampled at 10 fps. Original artwork colours differ from the watch’s limited palette; the RGB approximation is not a physical-display calibration. No lower-body animation.</p><p class="note">On the watch: Up changes scene; Select replays; Down cycles background motion. Hold Select to hide the labels. Back exits.</p><script>const frames='''+json.dumps(data,separators=(',',':'))+''';let mode=3,palette=0,paused=false,last=performance.now(),times=[0,0,0];function draw(){for(let i=0;i<3;i++){const set=frames[`${palette}-${i}-${mode}`],t=times[i],held=t>=4000;document.querySelector('#shot'+i).src=held?set.hold[mode?Math.floor(t%4800/100):0]:set.action[Math.min(39,Math.floor(t/100))];document.querySelector('#state'+i).textContent=held?'Held':'Playing';}}function tick(now){if(!paused)times=times.map(t=>t+Math.min(100,now-last));last=now;draw();requestAnimationFrame(tick)}document.querySelector('#all').onclick=()=>{times=[0,0,0];draw()};document.querySelectorAll('[data-shot]').forEach(b=>b.onclick=()=>{times[Number(b.dataset.shot)]=0;draw()});document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Resume':'Pause'};document.querySelector('#mode').onchange=e=>{mode=Number(e.target.value);draw()};document.querySelector('#palette').onchange=e=>{palette=Number(e.target.value);draw()};document.addEventListener('visibilitychange',()=>{last=performance.now()});window.prototypeState=()=>({mode,palette,paused,times:[...times]});draw();requestAnimationFrame(tick);</script>'''
(r/'preview/index.html').write_text(html)
# Exact scene invariants, using the shared renderer rather than a second animation model.
for shot in range(3):
 assert frame(shot,4000,0,0).tobytes()==frame(shot,8000,4500,0).tobytes()
 assert frame(shot,0,0,0).tobytes()!=frame(shot,2000,0,0).tobytes()
 assert frame(shot,4000,0,3).tobytes()==frame(shot,4000,4800,3).tobytes()
 assert frame(shot,4000,0,3).tobytes()!=frame(shot,4000,1200,3).tobytes()
print('Generated offline preview and GIF; passed finite holds, visible gestures, moving ambience and exact loop continuity.')
