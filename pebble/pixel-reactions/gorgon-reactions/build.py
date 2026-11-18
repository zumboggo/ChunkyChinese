from pathlib import Path
from PIL import Image, ImageDraw
import json, struct, base64, io, shutil
R=Path(__file__).resolve().parent
SRC=R.parents[1]/'reader/resources/images'
NAMES=['neutral','attentive','thoughtful','skeptical','serious','amused']
(R/'source').mkdir(exist_ok=True); (R/'preview').mkdir(exist_ok=True)
originals=[]
for name in NAMES:
 p=SRC/f'Gorgon-{name}-64.png'; shutil.copyfile(p,R/'source'/p.name)
 im=Image.open(p).convert('RGB')
 im.putdata([(255,255,255) if min(c)>240 else c for c in im.getdata()])
 originals.append(im)
# One shared palette, preserving the approved grey-purple skin and white background.
sheet=Image.new('RGB',(384,64),'white')
for i,im in enumerate(originals): sheet.paste(im,(64*i,0))
q=sheet.quantize(colors=8,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
palette=q.getpalette()[:24]
poses=[q.crop((64*i,0,64*i+64,64)) for i in range(6)]
tiles=[]; maps=[]
for pose in poses:
 ids=[]
 for y in range(0,64,8):
  for x in range(0,64,8):
   values=list(pose.crop((x,y,x+8,y+8)).getdata())
   tile=b''.join(sum(values[j+k]<<(21-3*k) for k in range(8)).to_bytes(3,'big') for j in range(0,64,8))
   if tile not in tiles: tiles.append(tile)
   ids.append(tiles.index(tile))
 maps.append(ids)
# GT64 v1: header, RGB palette, 8x8 3bpp tile dictionary, six uint16 tile maps.
art=b'GT64'+struct.pack('<BBH',1,6,len(tiles))+bytes(palette)+b''.join(tiles)+b''.join(struct.pack('<64H',*m) for m in maps)
(R/'gorgon.bin').write_bytes(art)
animations={}; frames={}
for i,name in enumerate(NAMES):
 # No blink, gaze change or oscillation; authored pose is held indefinitely.
 timeline=[(350,0),(300,i),(1400,i)] if i else [(2050,0)]
 animations[name]={'steps':[{'ms':ms,'pose':p} for ms,p in timeline],'hold':True}
 frames[name]=[poses[p].convert('RGB') for ms,p in timeline]
 folder=R/name; folder.mkdir(exist_ok=True)
 for j,im in enumerate(frames[name]): im.save(folder/f'{j:02}.png')
 gifframes=[im.resize((256,256),Image.Resampling.NEAREST) for im in frames[name]]
 gifframes[0].save(R/'preview'/f'{name}.gif',save_all=True,append_images=gifframes[1:],duration=[ms for ms,p in timeline],disposal=2)
# GM64 v1: count, then per reaction step count, hold byte, and <HB> duration/pose steps.
motion=b'GM64'+bytes([1,6])
for a in animations.values():
 motion+=bytes([len(a['steps']),1])+b''.join(struct.pack('<HB',s['ms'],s['pose']) for s in a['steps'])
(R/'gorgon.motion').write_bytes(motion)
manifest={'width':64,'height':64,'palette':[palette[i:i+3] for i in range(0,24,3)],'poseOrder':NAMES,'animations':animations,'artBytes':len(art),'motionBytes':len(motion),'totalBytes':len(art)+len(motion),'uniqueTiles':len(tiles),'nativeIntegration':False}
(R/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
board=Image.new('RGB',(768,570),'white'); d=ImageDraw.Draw(board)
for i,pose in enumerate(poses):
 board.paste(pose.convert('RGB').resize((256,256),Image.Resampling.NEAREST),(i%3*256,i//3*285)); d.text((i%3*256+12,i//3*285+260),NAMES[i].title(),fill='black')
board.save(R/'preview/held-poses.png')
overview=[]
for t in range(0,2600,100):
 b=board.copy()
 for i,name in enumerate(NAMES):
  elapsed=0; p=i
  for s in animations[name]['steps']:
   elapsed+=s['ms']
   if t<elapsed: p=s['pose']; break
  b.paste(poses[p].convert('RGB').resize((256,256),Image.Resampling.NEAREST),(i%3*256,i//3*285))
 overview.append(b)
overview[0].save(R/'preview/six-reactions.gif',save_all=True,append_images=overview[1:],duration=100,loop=0)
urls=[]
for pose in poses:
 buf=io.BytesIO(); pose.save(buf,format='PNG'); urls.append('data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode())
html='''<!doctype html><meta charset="utf-8"><title>Gorgon — six held reactions</title><style>body{font:18px system-ui;background:#eef0f3;color:#23232a;margin:30px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}article{background:white;padding:18px;border-radius:12px}img{width:256px;height:256px;image-rendering:pixelated}button{padding:10px;font-size:16px}p{max-width:850px}</style><h1>Gorgon · six restrained reactions</h1><p>64 × 64 · eight colours. Original expressions, open averted eyes. Each reaction settles from neutral into its authored pose and holds. These are deliberately brief pose changes, not human blink or laughter cycles.</p><button id="all">Replay all</button><main></main><script>const urls=URLS, data=DATA;let timers={};function play(n){clearTimeout(timers[n]);let a=data[n],j=0,card=document.getElementById(n);function next(){let s=a.steps[j];card.querySelector('img').src=urls[s.pose];card.querySelector('span').textContent='Playing';timers[n]=setTimeout(()=>{j++;if(j<a.steps.length)next();else card.querySelector('span').textContent='Held';},s.ms)}next()}for(let n of Object.keys(data)){let c=document.createElement('article');c.id=n;c.innerHTML='<h2>'+n+'</h2><img alt="Gorgon '+n+'"><p><span></span></p><button>Replay '+n+'</button>';document.querySelector('main').append(c);c.querySelector('button').onclick=()=>play(n)}document.getElementById('all').onclick=()=>Object.keys(data).forEach(play);Object.keys(data).forEach(play);</script>'''.replace('URLS',json.dumps(urls)).replace('DATA',json.dumps(animations))
(R/'preview/index.html').write_text(html)
print(json.dumps(manifest))
