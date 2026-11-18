"""Render the native visual-novel code, including its actual watch palette and decoder."""
from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,io,base64
root=Path(__file__).resolve().parents[1];out=root/'preview/visual-novel';tmp=root/'.local/visual-novel';tmp.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
subprocess.run(['cc','-O2',str(root/'scripts/visual-novel-host.c'),'-o',str(tmp/'render')],check=True)
lib=json.loads((root/'scenes/library.json').read_text());frames={};poses=[]
def render(id,t,bg):
 p=tmp/'frame.ppm';subprocess.run([str(tmp/'render'),str(id),str(t),str(bg),str(p)],cwd=root,check=True);return Image.open(p).convert('RGB')
for s in lib['scenes']:
 im=render(s['nativeId'],4000,1600);tile=Image.new('RGB',(200,253),'white');tile.paste(im);ImageDraw.Draw(tile).text((4,232),s['id'],fill='black');poses.append(tile)
canvas=Image.new('RGB',(1000,253*((len(poses)+4)//5)),'white')
for i,im in enumerate(poses):canvas.paste(im,((i%5)*200,(i//5)*253))
canvas.save(out/'catalogue.png')
# Representative source-supported scenes: Alden phone, Hannah fry, Gorgon cup, Boe think, Jeremy listen, young Alden.
ids=[1,3,7,12,14,4];gif=[]
for id in ids:
 arr=[]
 for i in range(61):
  im=render(id,min(i*100,4000),i*100);b=io.BytesIO();im.save(b,format='PNG');arr.append('data:image/png;base64,'+base64.b64encode(b.getvalue()).decode())
 frames[str(id)]=arr
for i in range(61):
 im=Image.new('RGB',(600,456),'white')
 for j,id in enumerate(ids):
  im.paste(Image.open(io.BytesIO(base64.b64decode(frames[str(id)][i].split(',')[1]))),((j%3)*200,(j//3)*228))
 gif.append(im)
gif[0].save(out/'combined.gif',save_all=True,append_images=gif[1:],duration=100,loop=0)
subprocess.run(['node','scripts/episode-author.mjs','catalogue'],cwd=root,check=True,capture_output=True)
(out/'index.html').write_bytes((root/'.local/authoring/catalogue/review.html').read_bytes())
print('Native previews:',out)
