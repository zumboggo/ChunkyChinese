"""Deterministic cutout prototype from the approved Shonen artwork; no generation calls."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import json,struct,base64,hashlib
R=Path(__file__).resolve().parent
S=R.parent/'shonen-cutout/approved-expression-reference.png'
(R/'layers').mkdir(exist_ok=True);(R/'preview').mkdir(exist_ok=True)
W,H=400,456
src=Image.open(S).convert('RGBA').crop((924,620,1324,1004))
canvas=Image.new('RGBA',(W,H));canvas.paste(src,(0,40))
# Remove only the pale background, retaining the source drawing and its ink.
p=canvas.load()
from collections import deque
queue=deque([(0,y) for y in range(H)]+[(W-1,y) for y in range(H)]+[(x,40) for x in range(W)])
seen=set()
while queue:
 x,y=queue.popleft()
 if not(0<=x<W and 0<=y<H) or (x,y) in seen:continue
 seen.add((x,y));r,g,b,a=p[x,y]
 if not a or (r>228 and g>211 and b>192):
  p[x,y]=(0,0,0,0);queue.extend([(x-1,y),(x+1,y),(x,y-1),(x,y+1)])
def mask(poly):
 m=Image.new('L',(W,H));ImageDraw.Draw(m).polygon(poly,fill=255);return m
def piece(im,m):
 o=im.copy();o.putalpha(Image.composite(im.getchannel('A'),Image.new('L',im.size),m));return o
# Head silhouette follows the actual master. Torso is a single unchanged source cutout.
headmask=mask([(30,40),(360,40),(365,268),(318,290),(286,307),(274,331),(208,357),(160,334),(138,315),(110,296),(72,281),(30,230)])
head=piece(canvas,headmask)
torso=piece(canvas,Image.eval(headmask,lambda v:255-v))
# Extend the hidden neck underneath the moving chin, preserving all visible costume pixels.
neck=Image.new('RGBA',(W,H));d=ImageDraw.Draw(neck);d.polygon([(174,320),(241,320),(241,376),(171,376)],fill=(255,211,170,255));neck.alpha_composite(torso);torso=neck
# Separate the complete hair cap/fringe; its lower contour comes from the source silhouette.
hairmask=mask([(25,38),(365,38),(367,230),(326,257),(315,220),(302,190),(284,174),(290,207),(259,185),(226,170),(237,212),(206,188),(174,157),(158,135),(148,170),(130,184),(116,202),(112,240),(95,222),(85,244),(66,222),(36,230)])
hair=piece(head,hairmask)
face=piece(head,Image.eval(hairmask,lambda v:255-v))
# Face interior is a clean skin field under interchangeable feature tiles. Hair is drawn last.
d=ImageDraw.Draw(face)
d.polygon([(117,182),(155,151),(247,167),(287,202),(292,261),(276,302),(213,348),(164,319),(137,280)],fill=(255,211,170,255))
# Restore the slim source chin/outer contour by retaining a 6px silhouette boundary.
alpha=head.getchannel('A');inner=alpha.filter(ImageFilter.MinFilter(13));border=Image.eval(inner,lambda v:255-v)
face.alpha_composite(piece(piece(head,Image.eval(hairmask,lambda v:255-v)),border))
# Cropped original eyes and nose preserve the selected drawing's identity.
def crop_layer(box):
 out=Image.new('RGBA',(W,H));out.paste(canvas.crop(box),box[:2]);return out
left=(120,198,184,256);right=(228,198,290,256)
# All expression changes remain inside the face, below the separate foreground fringe.
def eyes(openness=1,look=0):
 out=Image.new('RGBA',(W,H))
 for box in [left,right]:
  tile=canvas.crop(box)
  tp=tile.load()
  for yy in range(tile.height):
   for xx in range(tile.width):
    r,g,b,a=tp[xx,yy]
    if r>190 and g<228 and r-g>25:tp[xx,yy]=(0,0,0,0)
  hh=round(tile.height*openness);tile=tile.resize((tile.width,hh),Image.Resampling.LANCZOS)
  out.alpha_composite(tile,(box[0]+look,box[1]+(box[3]-box[1]-hh)//2))
 return out
nose=crop_layer((201,251,213,272))
# Rounded linework matches the source ink; facial variants have no duplicated torso/hair.
ink=(48,28,18,255)
def features(kind):
 out=Image.new('RGBA',(W,H));d=ImageDraw.Draw(out)
 if kind=='neutral':
  d.arc((122,176,183,209),190,337,fill=ink,width=5);d.arc((230,176,290,209),202,345,fill=ink,width=5)
  d.arc((193,292,230,310),15,160,fill=ink,width=3)
 elif kind=='shock':
  d.arc((122,166,184,204),185,345,fill=ink,width=6);d.arc((228,165,290,204),190,350,fill=ink,width=6)
  out.alpha_composite(crop_layer((187,288,229,329)))
 elif kind=='embarrassed':
  d.line([(125,195),(153,188),(179,190)],fill=ink,width=4);d.line([(232,187),(259,190),(287,199)],fill=ink,width=4)
  d.line([(195,309),(210,306),(229,309)],fill=ink,width=3)
  for x in [138,147,156,263,272,281]:d.line([(x,273),(x-3,281)],fill=(214,120,100,255),width=3)
 else:
  d.arc((122,180,183,210),190,337,fill=ink,width=4);d.arc((230,180,290,210),202,345,fill=ink,width=4)
  d.arc((189,284,233,313),10,169,fill=ink,width=4)
 return out
layers={'torso':torso,'face':face,'hair':hair,'nose':nose,'eyes-neutral':eyes(.72),'eyes-shock':eyes(),'eyes-embarrassed':eyes(.48,-3),'eyes-smile':eyes(.67)}
for k in ['neutral','shock','embarrassed','smile']:layers['features-'+k]=features(k)
# One alternate lower-face shape gives shock a subtly extended jaw, not a scaled whole head.
jaw=face.copy();patch=face.crop((135,280,290,358)).resize((155,81),Image.Resampling.LANCZOS);jaw.paste((0,0,0,0),(135,280,290,361));jaw.alpha_composite(patch,(135,280));layers['face-shock']=piece(jaw,mask([(130,280),(295,280),(295,365),(130,365)]))
native={}
for name,im in layers.items():
 im.save(R/'layers'/f'{name}.png')
 native[name]=im.resize((200,228),Image.Resampling.LANCZOS)
# GColor8-compatible row runs: transparency is 0; opaque colors are 0b11RRGGBB.
def quant(im):
 # A small ordered dither preserves the source's pale peach skin and brown hair
 # across Pebble's 85-step RGB channels, without adding a runtime palette.
 out=Image.new('RGBA',im.size);p=[]
 bayer=((0,8,2,10),(12,4,14,6),(3,11,1,9),(15,7,13,5))
 for i,(r,g,b,a) in enumerate(im.getdata()):
  threshold=(bayer[(i//im.width)%4][i%4]+.5)/16
  def channel(v):
   lo=v//85;return min(3,lo+(v%85/85>threshold))*85
  p.append((channel(r),channel(g),channel(b),255) if a>=128 else (0,0,0,0))
 out.putdata(p);return out
def encode(im):
 box=im.getbbox();x,y,x2,y2=box;data=bytearray([x,y,x2-x,y2-y]);im=quant(im)
 for yy in range(y,y2):
  runs=[];last=None;n=0
  for xx in range(x,x2):
   r,g,b,a=im.getpixel((xx,yy));c=(192|(r//85)<<4|(g//85)<<2|b//85) if a else 0
   if c==last:n+=1
   else:
    if n:runs.extend([n,last])
    last=c;n=1
  runs.extend([n,last])
  if len(runs)+1>x2-x+1:
   data.append(0)
   for xx in range(x,x2):
    r,g,b,a=im.getpixel((xx,yy));data.append((192|(r//85)<<4|(g//85)<<2|b//85) if a else 0)
  else:data.append(len(runs)//2);data.extend(runs)
 return bytes(data)
order=list(native);encoded=[encode(native[n]) for n in order];offset=4*len(order);blob=bytearray()
for b in encoded:blob+=struct.pack('<I',offset);offset+=len(b)
for b in encoded:blob+=b
(R/'alden.layers').write_bytes(blob)
# Translation rather than bitmap rotation: all head pieces share one neck-relative offset.
timeline=[('neutral',0,0)]*5+[('shock',0,-2),('shock',0,-3),('shock',0,-2)]+[('shock',0,0)]*5+[('embarrassed',-1,1),('embarrassed',-1,2)]+[('embarrassed',-1,3)]*8+[('smile',0,2),('smile',0,1)]+[('smile',0,0)]*6
frames=[];watch=[]
def render(kind,dx,dy,palette=False):
 out=Image.new('RGBA',(200,228),'white')
 for name in ['torso','face']+(['face-shock'] if kind=='shock' else [])+['eyes-'+kind,'nose','features-'+kind,'hair']:
  im=quant(native[name]) if palette else native[name]
  out.alpha_composite(im,(0,0) if name=='torso' else (dx,dy))
 return out.convert('RGB')
for kind,x,y in timeline:frames.append(render(kind,x,y));watch.append(render(kind,x,y,True))
frames[0].save(R/'preview/reaction.gif',save_all=True,append_images=frames[1:],duration=140,loop=0,disposal=2)
watch[0].save(R/'preview/watch-palette.gif',save_all=True,append_images=watch[1:],duration=140,loop=0,disposal=2)
board=Image.new('RGB',(800,260),'white');d=ImageDraw.Draw(board)
for i,k in enumerate(['neutral','shock','embarrassed','smile']):board.paste(render(k,0,0),(i*200,24));d.text((i*200+40,8),k,fill='black')
board.save(R/'preview/storyboard.png')
manifest={'source':str(S.relative_to(R.parent.parent.parent.parent)),'sourceSha256':hashlib.sha256(S.read_bytes()).hexdigest(),'width':200,'height':228,'frameMs':140,'layers':order,'layerBytes':dict(zip(order,map(len,encoded))),'resourceBytes':len(blob),'timeline':timeline,'holdLast':True,'generatedThisTurn':False,'palette':'Pebble GColor8, 64 available colors; transparency separate'}
(R/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
urls=[]
for i,f in enumerate(frames):
 import io
 b=io.BytesIO();f.save(b,format='PNG');urls.append('data:image/png;base64,'+base64.b64encode(b.getvalue()).decode())
html='''<!doctype html><meta charset="utf-8"><title>Alden hybrid prototype</title><style>body{font:18px system-ui;background:#f4f0e8;color:#30251c;text-align:center;padding:30px}canvas{width:400px;height:456px;background:white;border-radius:12px}button{font:inherit;margin:20px;padding:12px 24px}p{max-width:700px;margin:20px auto}</style><h1>Alden · layered Shōnen prototype</h1><p>Fixed original hoodie and hair. Neutral → shocked → embarrassed → small smile.</p><canvas width="200" height="228"></canvas><div><button onclick="play()">Replay</button><span id="status"></span></div><p>The reaction plays once, then holds. This preview uses source colours; watch-palette.gif shows the 64-colour conversion.</p><script>const urls=URLS;const images=urls.map(s=>{let i=new Image;i.src=s;return i});let start=0,request;const c=document.querySelector('canvas').getContext('2d');function tick(t){let n=Math.max(0,Math.min(images.length-1,Math.floor((t-start)/140)));c.drawImage(images[n],0,0);document.querySelector('#status').textContent=n===images.length-1?'Held':'Playing';if(n<images.length-1)request=requestAnimationFrame(tick)}function play(){cancelAnimationFrame(request);start=performance.now();request=requestAnimationFrame(tick)}Promise.all(images.map(i=>i.decode())).then(play);</script>'''.replace('URLS',json.dumps(urls))
(R/'preview/index.html').write_text(html)
print(json.dumps({'resourceBytes':len(blob),'layers':len(layers),'frames':len(frames)}))
