from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import base64,json,hashlib
root=Path(__file__).resolve().parent;styles=['pixel','cutout','detailed'];labels=['48px pixel animation','Flat-color cutout','Detailed portrait + face']
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',16)
fontsmall=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',12)
images={s:[Image.open(root/f'frames/{s}-{i:02}.png').convert('RGBA') for i in range(19)] for s in styles}
board=[]
for i in range(32):
 n=min(i,18);canvas=Image.new('RGB',(660,288),'#f5f1e9');d=ImageDraw.Draw(canvas)
 for c,s in enumerate(styles):
  d.text((c*220+10,9),labels[c],font=font,fill='#30231c');canvas.paste(images[s][n],(c*220+10,34),images[s][n])
 d.text((10,267),'Same timing: surprise → embarrassed → hold. Comparison preview loops.',font=fontsmall,fill='#65564a')
 board.append(canvas)
board[0].save(root/'three-styles.gif',save_all=True,append_images=board[1:],duration=100,loop=0,disposal=2)
board[6].save(root/'surprised.png');board[18].save(root/'embarrassed.png')
for s in styles:
 backgrounds=[]
 for im in images[s]:
  bg=Image.new('RGBA',im.size,'#f5f1e9');bg.alpha_composite(im);backgrounds.append(bg.convert('RGB'))
 backgrounds[0].save(root/(s+'.gif'),save_all=True,append_images=backgrounds[1:],duration=100,disposal=2)
data={s:['data:image/png;base64,'+base64.b64encode((root/f'frames/{s}-{i:02}.png').read_bytes()).decode() for i in range(19)] for s in styles}
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alden — three animation styles</title><style>body{margin:28px auto;padding:0 20px;max-width:1020px;background:#f5f1e9;color:#30231c;font:17px system-ui}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}article{background:#fffdf8;border:1px solid #d8cfc2;border-radius:12px;padding:14px;text-align:center}h2{font-size:18px}canvas{width:100%;max-width:280px;height:auto}#pixel{image-rendering:pixelated}button{font:inherit;padding:9px 16px;margin:5px;border:1px solid #aa9c8a;border-radius:6px;background:white}input{width:100%;margin-top:20px}small{display:block;color:#665b4e;margin-top:10px}#state{min-height:1.5em}@media(max-width:700px){main{grid-template-columns:1fr}canvas{width:240px}}</style><h1>Alden: surprise → embarrassment</h1><p>Same hoodie, grey T-shirt and pale skin. One shared timeline, then a held pose.</p><main><article><h2>1 · Pixel</h2><canvas id="pixel" width="200" height="228"></canvas><small>48 × 48 artwork; discrete poses.</small></article><article><h2>2 · Cutout</h2><canvas id="cutout" width="200" height="228"></canvas><small>Reusable shapes; brows, eyes, mouth and head move.</small></article><article><h2>3 · Detailed portrait</h2><canvas id="detailed" width="200" height="228"></canvas><small>Illustrated portrait stays still; facial features move.</small></article></main><p id="state">Loading…</p><button id="replay" disabled>Replay all</button><button id="surprise" disabled>Show surprise</button><button id="embarrassed" disabled>Show embarrassed</button><input id="scrub" type="range" min="0" max="1800" step="100" value="0" aria-label="Animation time"><small>Art-direction prototypes, not Pebble performance tests. Detailed artwork retains shading; hardware color conversion is not applied. No watch app has changed.</small><script>const sources=DATA,images={},slider=document.querySelector('#scrub'),state=document.querySelector('#state');let raf;function show(ms){let i=Math.min(18,Math.round(ms/100));for(const s of Object.keys(images)){const ctx=document.getElementById(s).getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,200,228);ctx.drawImage(images[s][i],0,0)}slider.value=i*100;state.textContent=i<2?'Neutral':i<9?'Surprised':i<14?'Settling into embarrassment':'Embarrassed — held'}function play(){cancelAnimationFrame(raf);const start=performance.now();function tick(now){const ms=Math.min(1800,now-start);show(ms);if(ms<1800)raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick)}Promise.all(Object.entries(sources).map(async([s,frames])=>{images[s]=frames.map(src=>{const im=new Image();im.src=src;return im});await Promise.all(images[s].map(im=>im.decode()))})).then(()=>{document.querySelectorAll('button').forEach(b=>b.disabled=false);play()});document.querySelector('#replay').onclick=play;document.querySelector('#surprise').onclick=()=>{cancelAnimationFrame(raf);show(600)};document.querySelector('#embarrassed').onclick=()=>{cancelAnimationFrame(raf);show(1800)};slider.oninput=()=>{cancelAnimationFrame(raf);show(+slider.value)};document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf)});</script></html>'''
(root/'index.html').write_text(html.replace('DATA',json.dumps(data)))
report={'canvas':[200,228],'timelineMs':1800,'frameIntervalMs':100,'styles':{}}
for s in styles:
 assert all(im.size==(200,228) for im in images[s])
 hashes=[hashlib.sha256(im.tobytes()).hexdigest() for im in images[s]]
 assert hashes[0]!=hashes[6] and hashes[6]!=hashes[18]
 assert len(set(hashes[14:]))==1
 report['styles'][s]={'uniqueRenderedFrames':len(set(hashes)),'neutralSurpriseEmbarrassedDistinct':True,'finalPoseStable':True}
(root/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
