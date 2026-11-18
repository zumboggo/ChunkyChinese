"""64px indexed patches derived from the approved, already-layered artwork."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,struct,math,base64,io,ast
R=Path(__file__).resolve().parent;old=R.parent/'hybrid-prototype';source=json.loads((old/'manifest.json').read_text())
# Palette entries include transparent index zero. Hardware colors, no dithering.
pal8=[None,(0,0,0),(170,85,0),(255,255,170),(85,85,85),(170,170,170),(255,255,255),(255,170,170)]
pal16=pal8+[(85,0,0),(170,85,85),(170,170,85),(255,170,85),(0,0,85),(85,0,85),(85,85,170),(0,85,85)]
names=source['layers'];kinds=['neutral','shock','embarrassed','smile'];frames={};stats={}
# Same duration and reaction beats; source offsets become integer 64px offsets.
timeline=[(k,(-1 if x<0 else 0),(-1 if y<0 else 1 if y>0 else 0)) for k,x,y in source['timeline']]
for count,pal in [(16,pal16),(8,pal8)]:
 folder=R/str(count);folder.mkdir(exist_ok=True);(folder/'patches').mkdir(exist_ok=True)
 bits=4 if count==16 else 3;parts=[];blobs=[];bounds=[]
 for name in names:
  im=Image.open(old/'layers'/f'{name}.png').convert('RGBA').crop((0,30,400,430)).resize((64,64),Image.Resampling.LANCZOS)
  indices=[]
  for r,g,b,a in im.getdata():
   if a<110:idx=0
   elif r>220 and g>220 and b>210:idx=6
   elif r>185 and g>115 and b>75:
    idx=7 if name.startswith('features') and r-g>65 and g-b<40 else 3
   elif r>65 and r>g*1.2 and g<170:idx=2 if r>100 else (8 if count==16 else 1)
   else:idx=min(range(1,len(pal)),key=lambda i:sum(w*(v-c)**2 for w,v,c in zip((2,3,1),(r,g,b),pal[i])))
   indices.append(idx)
  # Preserve subpixel source marks as deliberate pixel clusters at 64px.
  if name=='features-embarrassed':
   for x,y in [(31,45),(32,44),(33,44),(34,45)]:indices[y*64+x]=8 if count==16 else 1
   for x,y in [(22,39),(24,39),(42,39),(44,39)]:indices[y*64+x]=7
  # Make the tiny nose independent of character skin color.
  if name=='nose':
   indices=[0]*4096;indices[37*64+33]=1
  pix=Image.new('RGBA',(64,64));pix.putdata([(*pal[i],255) if i else (0,0,0,0) for i in indices]);pix.save(folder/'patches'/f'{name}.png');parts.append(pix)
  box=pix.getbbox();assert box,name
  x,y,x2,y2=box;w=x2-x;h=y2-y;rowbytes=(w*bits+7)//8;payload=bytearray([x,y,w,h]);bounds.append(box)
  for yy in range(y,y2):
   acc=0
   for xx in range(x,x2):acc=(acc<<bits)|indices[yy*64+xx]
   acc <<= rowbytes*8-w*bits;payload.extend(acc.to_bytes(rowbytes,'big'))
  blobs.append(payload)
 # Header: bit depth, count, layer count, reserved; palette; little endian offsets.
 palette=bytes([0 if c is None else 192|(c[0]//85)<<4|(c[1]//85)<<2|c[2]//85 for c in pal]);header=bytes([bits,count,len(names),0])+palette
 offset=len(header)+4*len(names);data=bytearray(header)
 for blob in blobs:data+=struct.pack('<I',offset);offset+=len(blob)
 for blob in blobs:data+=blob
 (folder/'alden.bin').write_bytes(data)
 def render(kind,x,y):
  im=Image.new('RGBA',(64,64),'white');k=kinds.index(kind)
  for index in [0,1]+([12] if k==1 else [])+[4+k,3,8+k,2]:im.alpha_composite(parts[index],(0,0) if index==0 else (x,y))
  return im.convert('RGB')
 fs=[render(*f) for f in timeline];frames[count]=fs
 enlarged=[f.resize((256,256),Image.Resampling.NEAREST) for f in fs]
 enlarged[0].save(folder/'reaction.gif',save_all=True,append_images=enlarged[1:],duration=140,loop=0,disposal=2)
 board=Image.new('RGB',(1024,285),'white');d=ImageDraw.Draw(board)
 for i,k in enumerate(kinds):board.paste(render(k,0,0).resize((256,256),Image.Resampling.NEAREST),(i*256,24));d.text((i*256+80,8),k,fill='black')
 board.save(folder/'storyboard.png')
 stats[str(count)]={'paletteEntriesIncludingTransparency':count,'visibleColorLimit':count-1,'bitsPerPixel':bits,'resourceBytes':len(data),'savedBytes':45244-len(data),'savingPercent':round(100*(1-len(data)/45244),2),'layerBytes':dict(zip(names,map(len,blobs))),'largestPackedRowBytes':max((b[2]*bits+7)//8 for b in blobs),'palette':pal,'bounds':bounds}
 # Independently decode packed bytes and prove every stored pixel matches the preview.
 for i,expected in enumerate(parts):
  at=struct.unpack_from('<I',data,4+count+4*i)[0];x,y,w,h=data[at:at+4];at+=4;stride=(w*bits+7)//8;decoded=Image.new('RGBA',(64,64))
  for yy in range(h):
   row=int.from_bytes(data[at:at+stride],'big');at+=stride
   for xx in range(w):
    idx=(row>>(stride*8-(xx+1)*bits))&((1<<bits)-1);assert idx<count
    if idx:decoded.putpixel((x+xx,y+yy),(*pal[idx],255))
  assert decoded.tobytes()==expected.tobytes(),name
 assert all(len(set(f.getdata()))<=count for f in fs)
 # Torso stays identical beneath the neck, even when the head shifts.
 assert all(f.crop((0,55,64,64)).tobytes()==fs[0].crop((0,55,64,64)).tobytes() for f in fs)
 # Expected native screen for independent emulator pixel comparison.
 expected=Image.new('RGB',(200,228),'white');expected.paste(fs[-1].resize((192,192),Image.Resampling.NEAREST),(4,12));expected.save(folder/'expected-native.png')
manifest={'width':64,'height':64,'displayScale':3,'frameMs':140,'timeline':timeline,'layers':names,'variants':stats,'source':'../hybrid-prototype/layers','oldResourceBytes':45244}
(R/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Preview uses the measured emulator display palette, not raw RGB channel values.
display={ast.literal_eval(k):tuple(v) for k,v in json.loads((old/'verification/display-colors.json').read_text()).items()}
for count,fs in frames.items():
 for im in fs:im.putdata([display.get(c,c) for c in im.getdata()])
 enlarged=[f.resize((256,256),Image.Resampling.NEAREST) for f in fs]
 enlarged[0].save(R/str(count)/'reaction.gif',save_all=True,append_images=enlarged[1:],duration=140,loop=0,disposal=2)
 board=Image.new('RGB',(1024,285),'white');d=ImageDraw.Draw(board)
 for i,n in enumerate([0,8,18,30]):board.paste(enlarged[n],(i*256,24));d.text((i*256+80,8),kinds[i],fill='black')
 board.save(R/str(count)/'storyboard.png')
comparison=[]
for a,b in zip(frames[16],frames[8]):
 im=Image.new('RGB',(544,290),'#f4f0e8');d=ImageDraw.Draw(im);d.text((90,9),'16 entries / 4-bit',fill='black');d.text((365,9),'8 entries / 3-bit',fill='black');im.paste(a.resize((256,256),Image.Resampling.NEAREST),(8,30));im.paste(b.resize((256,256),Image.Resampling.NEAREST),(280,30));comparison.append(im)
comparison[0].save(R/'comparison.gif',save_all=True,append_images=comparison[1:],duration=140,loop=0,disposal=2)
urls=[]
for im in comparison:
 stream=io.BytesIO();im.save(stream,format='PNG');urls.append('data:image/png;base64,'+base64.b64encode(stream.getvalue()).decode())
html='''<!doctype html><meta charset="utf-8"><title>Alden 64px comparison</title><style>body{background:#f4f0e8;font:18px system-ui;text-align:center;padding:25px}canvas{max-width:100%;image-rendering:pixelated}button{font:inherit;padding:10px 25px;margin:20px}p{max-width:760px;margin:20px auto}</style><h1>Alden at 64 × 64</h1><p>16 palette entries versus 8, including transparency. Same artwork, patches and timing; no dithering.</p><canvas width="544" height="290"></canvas><div><button onclick="play()">Replay both</button><span id="status"></span></div><p>Neutral → shocked → embarrassed → small smile. Playback ends and holds. Enlarged 4× here; the native lab displays at 3×.</p><script>const images=URLS.map(url=>{let i=new Image;i.src=url;return i});let start,raf;let ctx=document.querySelector('canvas').getContext('2d');function tick(t){const n=Math.max(0,Math.min(images.length-1,Math.floor((t-start)/140)));ctx.drawImage(images[n],0,0);document.querySelector('#status').textContent=n===images.length-1?'Held':'Playing';if(n<images.length-1)raf=requestAnimationFrame(tick)}function play(){cancelAnimationFrame(raf);start=performance.now();raf=requestAnimationFrame(tick)}Promise.all(images.map(i=>i.decode())).then(play);</script>'''.replace('URLS',json.dumps(urls))
(R/'index.html').write_text(html)
print(json.dumps(stats,indent=2))
