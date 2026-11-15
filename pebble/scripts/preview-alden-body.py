"""Actual native renders: before/after at watch size and integer enlargement."""
from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,hashlib,argparse
p=argparse.ArgumentParser();p.add_argument('--baseline',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];base=Path(a.baseline);out=root/'preview/alden-body';out.mkdir(parents=True,exist_ok=True);tmp=root/'.local/alden-body';tmp.mkdir(parents=True,exist_ok=True)
for where,name in [(root,'after'),(base,'before')]:subprocess.run(['cc','-O2','-DPACKED_STAGE','scripts/visual-novel-host.c','-o',str(tmp/name)],cwd=where,check=True)
def render(which,id,t,ambient=0):
 path=tmp/'frame.ppm';subprocess.run([str(tmp/which),str(id),str(t),str(ambient),str(path)],cwd=root if which=='after' else base,check=True);return Image.open(path).convert('RGB')
contact=Image.new('RGB',(400,3*252),'white');d=ImageDraw.Draw(contact)
for i,(id,name) in enumerate([(21,'resting'),(42,'cup'),(31,'cover-eyes')]):
 frames=[]
 for t in range(0,4001,100):
  pair=Image.new('RGB',(400,228));pair.paste(render('before',id,t),(0,0));pair.paste(render('after',id,t),(200,0));frames.append(pair)
 still=frames[20] if name=='cup' else frames[-1]
 still.save(out/(name+'-before-after.png'));still.resize((1200,684),Image.Resampling.NEAREST).save(out/(name+'-before-after-3x.png'))
 for scale in [1,3]:
  ims=[im.resize((400*scale,228*scale),Image.Resampling.NEAREST) for im in frames]
  ims[0].save(out/(name+f'-{scale}x.gif'),save_all=True,append_images=ims[1:],duration=[100]*40+[1500])
 contact.paste(still,(0,i*252+24));d.text((5,i*252+5),name+' - BEFORE',fill='black');d.text((205,i*252+5),'AFTER',fill='black')
contact.save(out/'comparison.png')
motion=Image.new('RGB',(1200,500),'white');md=ImageDraw.Draw(motion)
for j,id in enumerate([31,42]):
 for i,t in enumerate([0,800,1600,2400,3200,4000]):
  motion.paste(render('after',id,t),(i*200,j*250+22));md.text((i*200+4,j*250+4),f'{"Cover" if id==31 else "Cup"} {t} ms',fill='black')
motion.save(out/'motion-contact.png')
# Strong preservation check: every close-up, every non-Alden scene, multiple times.
lib=json.loads((root/'scenes/library.json').read_text());vn=json.loads((root/'scenes/visual-novel.json').read_text());checks=0
for s in lib['scenes']:
 if vn['bindings'][s['id']]['actor']=='alden':continue
 for t in [0,1800,4000]:
  assert render('before',s['nativeId'],t).tobytes()==render('after',s['nativeId'],t).tobytes(),s['id'];checks+=1
for s in json.loads((root/'pixel-reactions/native-catalogue.json').read_text()):
 for t in [0,300,4000]:
  assert render('before',s['id'],t,3).tobytes()==render('after',s['id'],t,3).tobytes(),s;checks+=1
(out/'preservation.json').write_text(json.dumps({'unchangedFrames':checks,'allCloseUpsUnchanged':True,'otherCharactersUnchanged':True},indent=2)+'\n')
(out/'index.html').write_text('''<!doctype html><meta charset="utf-8"><title>Alden body prototype</title><style>body{font:16px system-ui;background:#eceae5;margin:24px}img{image-rendering:pixelated;max-width:100%}section{margin:24px 0}button{padding:8px}</style><h1>Alden — matching pixel bodies</h1><p>Before on the left; prototype on the right. Native renderer, 200 × 228 per watch.</p><p><a href="motion-contact.png">Intermediate poses</a></p>'''+''.join(f'<section><h2>{name}</h2><img src="{name}-before-after-3x.png" id="{name}"><p><button onclick="document.getElementById(\'{name}\').src=\'{name}-3x.gif?\'+Date.now()">Replay comparison</button> <a href="{name}-1x.gif">Actual watch size</a></p></section>' for name in ['resting','cup','cover-eyes']))
print('PASS',checks,'unchanged frames;',out)
