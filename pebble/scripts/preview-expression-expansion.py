"""Native C previews, including native-size and both display scales; no approximated art."""
from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,html
root=Path(__file__).resolve().parents[1];out=root/'preview/expressions';tmp=root/'.local/visual-novel';out.mkdir(parents=True,exist_ok=True);tmp.mkdir(parents=True,exist_ok=True)
subprocess.run(['cc','-O2',str(root/'scripts/visual-novel-host.c'),'-o',str(tmp/'render')],check=True)
def render(id,t,scale=3):
 p=tmp/'expression.ppm';subprocess.run([str(tmp/'render'),str(id),str(t),str(scale),str(p)],cwd=root,check=True);return Image.open(p).convert('RGB')
cat=json.loads((root/'pixel-reactions/native-catalogue.json').read_text());lib=json.loads((root/'scenes/library.json').read_text());items=[]
for scale in [1,2,3]:
 cell=max(100,64*scale+18);canvas=Image.new('RGB',(cell*4,6*(64*scale+72)),'white');d=ImageDraw.Draw(canvas)
 for who in range(6):
  new=cat[35+who*3:38+who*3];old=next(e for e in cat[:35] if e['actor']==new[0]['actor'])
  for col,e in enumerate([old]+new):
   im=render(e['id'],4000,scale).crop((4,9,4+64*scale,9+64*scale));x=col*cell;y=who*(64*scale+72);canvas.paste(im,(x,y));d.text((x+2,y+64*scale+2),e['actor']+'\n'+e['emotion'].replace('-','\n' if scale==1 else ' '),fill='black')
 canvas.save(out/f'faces-{scale}x.png')
for e in cat[35:]:
 id=e['id'];frames=[render(id,t).crop((4,9,196,201)) for t in [0,240,420,1500]];frames[0].save(out/f'{id}.gif',save_all=True,append_images=frames[1:],duration=[240,180,1080,1200]);frames[-1].save(out/f'{id}.png');items.append((e['actor']+' — '+e['emotion'],str(id)))
contact=Image.new('RGB',(800,((len(lib['scenes'])-30+3)//4)*260),'white');draw=ImageDraw.Draw(contact)
for i,s in enumerate(lib['scenes'][30:]):
 id=s['nativeId'];frames=[render(id,min(t,4000),t) for t in range(0,5201,100)];frames[0].save(out/f'{id}.gif',save_all=True,append_images=frames[1:],duration=100);frames[-1].save(out/f'{id}.png');contact.paste(frames[-1],(i%4*200,i//4*260));draw.text((i%4*200+3,i//4*260+232),s['id'].replace('-',' '),fill='black');items.append((s['name'],str(id)))
contact.save(out/'hands.png')
(out/'index.html').write_text('''<!doctype html><meta charset="utf-8"><title>Expression and hand library</title><style>body{font:16px system-ui;background:#eee;color:#222;margin:24px}main{display:flex;flex-wrap:wrap;gap:20px}article{background:white;padding:16px;width:220px}img{image-rendering:pixelated}button{display:block;margin-top:10px}</style><h1>18 expressions · 12 hand performances</h1><p>Finite native-rendered performances. Press Replay to play, then hold. Existing episodes are unchanged.</p><p><a href="faces-1x.png">Native 64px</a> · <a href="faces-2x.png">2×</a> · <a href="faces-3x.png">3×</a> · <a href="hands.png">All hand holds</a></p><main>'''+''.join(f'<article><h3>{html.escape(name)}</h3><img id="i{id}" src="{id}.png"><button onclick="document.getElementById(\'i{id}\').src=\'{id}.gif?t=\'+Date.now()">Replay</button></article>' for name,id in items)+'</main>')
print(out)
