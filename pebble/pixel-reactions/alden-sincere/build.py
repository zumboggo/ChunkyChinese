from PIL import Image,ImageDraw
from pathlib import Path
import json,struct,io,base64,hashlib
R=Path(__file__).resolve().parent
palette=[(50,27,18),(150,94,72),(255,211,170),(233,144,115),(80,80,82),(170,171,170),(168,102,92),(255,255,255)]
ink,hair,skin,blush,hoodie,shirt,mouth,white=palette
base=Image.open(R/'source/gentle-laugh.png').convert('RGB');shock=Image.open(R/'source/curious-shock.png').convert('RGB')
# Head parts are immutable crops from the selected master, never separately regenerated.
headmask=Image.new('L',(64,64));hm=ImageDraw.Draw(headmask);hm.rectangle((0,0,63,43),fill=255);hm.rectangle((20,44,44,49),fill=255)
head=base.convert('RGBA');head.putalpha(headmask)
# White backdrop is transparent in intermediate pieces; packed crops are opaque tiles.
for im in [head]:
 p=im.load()
 for y in range(64):
  for x in range(64):
   if p[x,y][:3]==white:p[x,y]=(0,0,0,0)
body=base.convert('RGBA');body.putalpha(Image.eval(headmask,lambda x:255-x));d=ImageDraw.Draw(body);d.rectangle((26,43,38,52),fill=(*skin,255))
# Restore unchanged garment over the neck extension.
body.alpha_composite(base.crop((0,50,64,64)).convert('RGBA'),(0,50))
d=ImageDraw.Draw(head)
d.polygon([(16,28),(44,28),(44,36),(40,41),(35,45),(29,46),(23,42),(18,37)],fill=(*skin,255))
# Brow geometry of Gentle Sincerity stays the baseline. Eyes and mouths are reusable tiles.
patches={}
def tile(name,box,source):
 patches[name]=(box[:2],source.crop(box).convert('RGB'))
def drawn(name,box,fn):
 im=Image.new('RGB',(box[2]-box[0],box[3]-box[1]),skin);fn(ImageDraw.Draw(im));patches[name]=(box[:2],im)
# Selected laugh is preserved pixel-for-pixel within its facial regions.
tile('eyes-laugh',(16,28,45,34),base);tile('mouth-laugh',(27,37,39,44),base)
# Bright Curiosity has wider, focused eyes. Align to the Gentle Sincerity face.
tile('eyes-shock',(16,26,45,34),shock);tile('mouth-shock',(29,39,36,44),shock)
# Neutral: attentive open almond eyes, coherent pupils, relaxed gaze.
def open_eyes(d,look=0):
 for x in (1,19):
  d.line([(x,2),(x+2,1),(x+6,1),(x+7,2)],fill=ink,width=1)
  d.rectangle((x+1,2,x+6,5),fill=white);d.rectangle((x+4+look,2,x+5+look,4),fill=ink)
  d.point((x+5+look,2),fill=white)
drawn('eyes-open',(16,28,45,35),lambda d:open_eyes(d))
# Preserve the approved iris shapes in resting/looking eyes rather than inventing dot eyes.
patches['eyes-open']=((16,28),shock.crop((16,26,45,34)).resize((29,6),Image.Resampling.NEAREST))
look=Image.new('RGB',(29,6),skin);look.paste(patches['eyes-open'][1],(-1,0));patches['eyes-look']=((16,28),look)
drawn('eyes-blink',(16,28,45,35),lambda d:[d.line([(x,3),(x+2,4),(x+6,4),(x+7,3)],fill=ink,width=1) for x in (1,19)])
drawn('mouth-rest',(27,37,39,44),lambda d:d.line([(3,3),(5,4),(7,4),(8,3)],fill=ink,width=1))
drawn('mouth-small',(27,37,39,44),lambda d:(d.ellipse((4,2,8,5),fill=ink),d.line((5,4,7,4),fill=mouth)))
drawn('mouth-talk',(27,37,39,44),lambda d:(d.polygon([(2,2),(9,2),(8,5),(4,5)],fill=ink),d.line((4,4,7,4),fill=mouth)))
drawn('mouth-think',(27,37,39,44),lambda d:d.line((4,4,8,4),fill=ink,width=1))
drawn('mouth-worried',(27,37,39,44),lambda d:d.line([(3,4),(5,3),(7,3),(9,4)],fill=ink,width=1))
# Nose and subtle cheek colour are tiny shared details, not whole-face variants.
drawn('nose',(31,33,34,36),lambda d:d.point((1,1),fill=ink))
drawn('cheeks',(18,34,44,36),lambda d:[d.point((x,0),fill=blush) for x in (1,3,22,24)])
# Clear the shock eye tile's skin only where it covers the original eye line; slight head lift supplies emphasis.
# Timelines: (duration ms, eye patch, mouth patch, head x/y). Every animation ends in a stable hold.
N=lambda t=350: (t,'eyes-open','mouth-rest',0,0)
animations={
 'blink':[N(600),(110,'eyes-blink','mouth-rest',0,0),N(180),(110,'eyes-blink','mouth-rest',0,0),N(500)],
 'surprised':[N(300),(140,'eyes-shock','mouth-small',0,-1),(220,'eyes-shock','mouth-shock',0,-1),(600,'eyes-shock','mouth-shock',0,0)],
 'thinking':[N(300),(450,'eyes-look','mouth-think',0,0),(450,'eyes-look','mouth-think',-1,1),(160,'eyes-blink','mouth-think',-1,1),(600,'eyes-look','mouth-think',-1,1)],
 'talking':[N(250),(150,'eyes-open','mouth-small',0,0),(180,'eyes-open','mouth-talk',0,0),(140,'eyes-open','mouth-rest',0,0),(180,'eyes-open','mouth-talk',0,0),(140,'eyes-open','mouth-small',0,0),N(500)],
 'laughing':[N(250),(180,'eyes-laugh','mouth-rest',0,0),(180,'eyes-laugh','mouth-laugh',0,-1),(180,'eyes-laugh','mouth-laugh',0,0),(180,'eyes-laugh','mouth-laugh',0,-1),(600,'eyes-laugh','mouth-laugh',0,0)],
 'worried':[N(300),(400,'eyes-look','mouth-worried',0,0),(160,'eyes-blink','mouth-worried',0,1),(600,'eyes-open','mouth-worried',0,1)]
}
def render(frame):
 _,eyes,mouthname,x,y=frame;im=Image.new('RGBA',(64,64),white);im.alpha_composite(body)
 h=head.copy()
 for name in [eyes,'cheeks','nose',mouthname]:
  pos,patch=patches[name];h.alpha_composite(patch.convert('RGBA'),pos)
 im.alpha_composite(h,(x,y));return im.convert('RGB')
(R/'patches').mkdir(exist_ok=True);(R/'preview').mkdir(exist_ok=True)
head.save(R/'patches/head.png');body.save(R/'patches/body.png')
for name,(pos,im) in patches.items():im.save(R/'patches'/f'{name}.png')
allframes={};records={}
for name,timeline in animations.items():
 folder=R/name;folder.mkdir(exist_ok=True);frames=[render(f) for f in timeline];allframes[name]=frames
 for i,im in enumerate(frames):
  assert im.size==(64,64) and set(im.getdata())<=set(palette)
  assert im.crop((0,54,64,64)).tobytes()==frames[0].crop((0,54,64,64)).tobytes()
  im.save(folder/f'{i:02d}.png')
 large=[im.resize((256,256),Image.Resampling.NEAREST) for im in frames]
 large[0].save(R/'preview'/f'{name}.gif',save_all=True,append_images=large[1:],duration=[f[0] for f in timeline],disposal=2)
 records[name]={'durationMs':sum(f[0] for f in timeline),'holdLast':True,'frames':[{'ms':f[0],'eyes':f[1],'mouth':f[2],'dx':f[3],'dy':f[4]} for f in timeline]}
# Store head/body as opaque white-backed tiles. Head transparency uses a separate 1-bit mask.
# Eight RGB palette entries occupy 24 bytes. Facial tiles need only 3-bit pixel indices.
blobs=[];entry=[]
for name,im,pos,alpha in [('body',body,(0,0),False),('head',head,(0,0),True)]+[(n,im,p,False) for n,(p,im) in patches.items()]:
 rgba=im.convert('RGBA')
 if name in ('body','head'):
  box=rgba.getbbox();rgba=rgba.crop(box);pos=(pos[0]+box[0],pos[1]+box[1]);im=rgba
 rgb=Image.new('RGB',im.size,white);rgb.paste(rgba,mask=rgba.getchannel('A'))
 payload=bytearray([pos[0],pos[1],im.width,im.height,int(alpha)]);rowbytes=(im.width*3+7)//8
 for y in range(im.height):
  acc=0
  for x in range(im.width):acc=(acc<<3)|palette.index(rgb.getpixel((x,y)))
  payload+= (acc<<(rowbytes*8-im.width*3)).to_bytes(rowbytes,'big')
 if alpha:
  for y in range(im.height):
   v=0
   for x in range(im.width):v=(v<<1)|int(rgba.getpixel((x,y))[3]>=128)
   payload+=(v<<((-im.width)%8)).to_bytes((im.width+7)//8,'big')
 blobs.append(payload);entry.append({'name':name,'bytes':len(payload)})
header=b'AS64'+bytes([1,len(blobs),8,3])+bytes(c for color in palette for c in color);at=len(header)+4*len(blobs);packed=bytearray(header)
for blob in blobs:packed+=struct.pack('<I',at);at+=len(blob)
for blob in blobs:packed+=blob
(R/'alden-sincere.bin').write_bytes(packed)
manifest={'schema':1,'width':64,'height':64,'palette':palette,'paletteRole':'warm design RGB; hardware remapping pending','baseline':'Gentle sincerity','shockReference':'Bright curiosity','animations':records,'patches':entry,'packedArtBytes':len(packed),'frameBufferRequired':False,'hardwareIntegrated':False}
(R/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
board=Image.new('RGB',(792,580),'#f5f0e8');d=ImageDraw.Draw(board)
for i,(name,frames) in enumerate(allframes.items()):
 x=i%3*264;y=i//3*290;d.text((x+80,y+8),name,fill=ink);board.paste(frames[-1].resize((256,256),Image.Resampling.NEAREST),(x+4,y+28))
board.save(R/'preview/held-poses.png')
# Six synchronous finite previews, independent replay controls, no network dependencies.
data={}
for name,frames in allframes.items():
 urls=[]
 for im in frames:
  b=io.BytesIO();im.save(b,format='PNG');urls.append('data:image/png;base64,'+base64.b64encode(b.getvalue()).decode())
 data[name]={'urls':urls,'durations':[f[0] for f in animations[name]]}
html='''<!doctype html><meta charset="utf-8"><title>Alden — Gentle Sincerity</title><style>body{font:17px system-ui;background:#f5f0e8;color:#321b12;text-align:center;padding:20px}main{display:grid;grid-template-columns:repeat(3,280px);justify-content:center;gap:18px}article{background:white;padding:10px;border-radius:12px}canvas{width:256px;height:256px;image-rendering:pixelated}button{padding:9px 18px;margin:12px;font:inherit}h2{text-transform:capitalize;font-size:20px}@media(max-width:900px){main{grid-template-columns:repeat(2,280px)}}@media(max-width:600px){main{grid-template-columns:280px}}</style><h1>Alden · Gentle Sincerity</h1><p>64 × 64 · eight colours · six finite reactions</p><button id="all">Replay all</button><main></main><p>Warm source palette. Watch-colour mapping and PBW installation remain separate.</p><script>const data=DATA;let players=[];async function init(){for(const [name,item] of Object.entries(data)){let card=document.createElement('article');card.innerHTML=`<h2>${name}</h2><canvas width="64" height="64"></canvas><br><button>Replay</button><span></span>`;document.querySelector('main').append(card);let images=await Promise.all(item.urls.map(async url=>{let im=new Image;im.src=url;await im.decode();return im}));let ctx=card.querySelector('canvas').getContext('2d'),status=card.querySelector('span'),raf,start;function tick(now){let t=Math.max(0,now-start),i=0;while(i<images.length-1&&t>=item.durations[i])t-=item.durations[i++];ctx.drawImage(images[i],0,0);status.textContent=i===images.length-1?'Held':'Playing';if(i<images.length-1)raf=requestAnimationFrame(tick)}function play(){cancelAnimationFrame(raf);start=performance.now();raf=requestAnimationFrame(tick)}card.querySelector('button').onclick=play;players.push(play)}players.forEach(p=>p())}document.querySelector('#all').onclick=()=>players.forEach(p=>p());init();</script>'''.replace('DATA',json.dumps(data))
(R/'preview/index.html').write_text(html)
print(json.dumps({'packedArtBytes':len(packed),'animations':len(records),'frames':sum(len(x) for x in animations.values())}))
# Compact motion table: step count, hold flag, then duration/eye/mouth/dx/dy.
names=[p['name'] for p in entry];motions=[]
for timeline in animations.values():
 b=bytearray([len(timeline),1])
 for ms,eyes,mouthname,x,y in timeline:b+=struct.pack('<HBBbb',ms,names.index(eyes),names.index(mouthname),x,y)
 motions.append(b)
motion=bytearray(b'MS64'+bytes([1,len(motions)]));offset=6+2*len(motions)
for b in motions:motion+=struct.pack('<H',offset);offset+=len(b)
for b in motions:motion+=b
(R/'alden-sincere.motion').write_bytes(motion)
manifest.update(packedMotionBytes=len(motion),combinedPackedBytes=len(packed)+len(motion));(R/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Looping contact sheet is a demonstration only; each individual GIF/HTML player is finite.
overview=[]
for t in range(0,3000,100):
 canvas=Image.new('RGB',(792,580),'#f5f0e8');d=ImageDraw.Draw(canvas)
 for i,(name,timeline) in enumerate(animations.items()):
  elapsed=0;index=len(timeline)-1
  for j,f in enumerate(timeline):
   elapsed+=f[0]
   if t<elapsed:index=j;break
  x=i%3*264;y=i//3*290;d.text((x+80,y+8),name,fill=ink);canvas.paste(allframes[name][index].resize((256,256),Image.Resampling.NEAREST),(x+4,y+28))
 overview.append(canvas)
overview[0].save(R/'preview/six-animations.gif',save_all=True,append_images=overview[1:],duration=100,loop=0,disposal=2)
