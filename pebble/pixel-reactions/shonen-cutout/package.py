from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,base64,hashlib,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent;m=json.loads((ROOT/'manifest.json').read_text());preview=ROOT/'preview';preview.mkdir(exist_ok=True)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',17)
images={};data={};report={'durationMs':1800,'frameIntervalMs':100,'playback':'once then hold','animations':{}}
for e,a in m['animations'].items():
 frames=[Image.open(ROOT/e/f'{i:02}.png').convert('RGBA') for i in range(a['frameCount'])];images[e]=frames
 hashes=[hashlib.sha256(im.tobytes()).hexdigest() for im in frames]
 assert len(set(hashes))>=3,e
 assert len(set(hashes[14:]))==1,e
 data[e]=[];backgrounds=[];groups=[]
 for i,im in enumerate(frames):
  assert im.size==(200,228)
  data[e].append('data:image/png;base64,'+base64.b64encode((ROOT/e/f'{i:02}.png').read_bytes()).decode())
  bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);backgrounds.append(bg.convert('RGB'))
  source=(ROOT/e/f'{i:02}.svg').read_text();ET.fromstring(source)
  # Each nested frame receives its own mask/clip IDs.
  source=source.replace('id="',f'id="f{i}-').replace('url(#',f'url(#f{i}-')
  timing=f'begin="{i/10:.1f}s" dur="0.1s"' if i<len(frames)-1 else f'begin="{i/10:.1f}s" fill="freeze"'
  groups.append(f'<g visibility="hidden"><set attributeName="visibility" to="visible" {timing}/>{source}</g>')
 (preview/(e+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="228" viewBox="0 0 200 228">'+''.join(groups)+'</svg>')
 backgrounds[0].save(preview/(e+'.gif'),save_all=True,append_images=backgrounds[1:],duration=100,disposal=2)
 report['animations'][e]={'distinctFrames':len(set(hashes)),'heldFramesIdentical':True,'svgValid':True}
board=[]
for i in range(32):
 canvas=Image.new('RGB',(660,536),'#f5f1e9');d=ImageDraw.Draw(canvas)
 for n,(e,a) in enumerate(m['animations'].items()):
  x=n%3*220+10;y=n//3*268+8
  d.rounded_rectangle((x,y,x+200,y+250),radius=8,fill='white')
  im=images[e][min(i,18)];canvas.paste(im,(x,y),im);d.text((x+12,y+230),a['label'],font=font,fill='#30231c')
 board.append(canvas)
board[0].save(preview/'six-shonen-reactions.gif',save_all=True,append_images=board[1:],duration=100,loop=0,disposal=2)
board[-1].save(preview/'held-poses.png')
labels={e:a['label'] for e,a in m['animations'].items()}
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alden — Shōnen cutout reactions</title><style>body{margin:28px auto;max-width:960px;padding:0 20px;background:#f5f1e9;color:#30231c;font:17px system-ui}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}article{background:white;border-radius:12px;padding:12px;text-align:center}h2{font-size:19px}canvas{width:100%;max-width:240px;height:auto}button{font:inherit;background:white;border:1px solid #b6a693;border-radius:6px;padding:8px 14px;margin:5px}small{display:block;margin:8px;color:#756858}@media(max-width:700px){main{grid-template-columns:repeat(2,1fr)}}@media(max-width:420px){main{grid-template-columns:1fr}}</style><h1>Alden — six Shōnen cutout reactions</h1><p>One consistent character. Each reaction plays briefly, then holds.</p><button id="all" disabled>Replay all</button><main></main><p><small>Animation assets for visual review. These have not yet been converted to native Pebble rendering or installed in the reader. The eye whites are transparent cutouts over the white background; the grey T-shirt keeps its own color.</small></p><script>const data=DATA,labels=LABELS,players=[];let ready=0;for(const[e,frames]of Object.entries(data)){const a=document.createElement('article');a.innerHTML=`<h2>${labels[e]}</h2><canvas width="200" height="228"></canvas><small>Loading…</small><button disabled>Replay</button>`;document.querySelector('main').append(a);const ctx=a.querySelector('canvas').getContext('2d'),status=a.querySelector('small'),button=a.querySelector('button');const images=frames.map(src=>{let im=new Image();im.src=src;return im});let raf;function draw(i){ctx.clearRect(0,0,200,228);ctx.drawImage(images[i],0,0);status.textContent=i===18?'Held':'Playing'}function play(){cancelAnimationFrame(raf);const start=performance.now();function tick(now){let i=Math.max(0,Math.min(18,Math.floor((now-start)/100)));draw(i);if(i<18)raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick)}button.onclick=play;players.push(play);Promise.all(images.map(im=>im.decode())).then(()=>{button.disabled=false;ready++;if(ready===6){document.querySelector('#all').disabled=false;players.forEach(p=>p())}});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);if(images[18].complete)draw(18)}})}document.querySelector('#all').onclick=()=>players.forEach(p=>p());</script></html>'''
(preview/'index.html').write_text(html.replace('DATA',json.dumps(data)).replace('LABELS',json.dumps(labels)))
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
