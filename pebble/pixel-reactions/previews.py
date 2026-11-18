from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,base64,io
root=Path(__file__).resolve().parent;assets=root/'characters/alden-chibi';m=json.loads((assets/'manifest.json').read_text());out=root/'preview';out.mkdir(exist_ok=True)
try:font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',18)
except OSError:font=ImageFont.load_default()
frames_by={};data={};labels={'idle':'Idle / blink','surprised':'Surprised','thinking':'Thinking','talking':'Talking','happy':'Happy / laughing','worried':'Worried / confused'}
for emotion,entries in m['animations'].items():
 images=[Image.open(assets/e['file']).convert('RGBA') for e in entries];frames_by[emotion]=images
 gif=[];data[emotion]=[]
 for im,e in zip(images,entries):
  bg=Image.new('RGBA',(256,256),'white');bg.alpha_composite(im.resize((256,256),Image.Resampling.NEAREST));gif.append(bg.convert('RGB'))
  raw=io.BytesIO();im.save(raw,format='PNG');data[emotion].append({'src':'data:image/png;base64,'+base64.b64encode(raw.getvalue()).decode(),'ms':e['ms']})
 gif[0].save(out/(emotion+'.gif'),save_all=True,append_images=gif[1:],duration=[e['ms'] for e in entries],disposal=2)
board=[]
for t in range(0,3000,100):
 canvas=Image.new('RGB',(648,492),'#f5f1e9');draw=ImageDraw.Draw(canvas)
 for n,(emotion,entries) in enumerate(m['animations'].items()):
  elapsed=0;index=len(entries)-1
  for i,e in enumerate(entries):
   elapsed+=e['ms']
   if t<elapsed:index=i;break
  x=(n%3)*216+12;y=(n//3)*246+8
  im=frames_by[emotion][index].resize((192,192),Image.Resampling.NEAREST)
  canvas.paste(im,(x,y),im);draw.text((x,y+201),labels[emotion],font=font,fill='#30231c')
 board.append(canvas)
board[0].save(out/'alden-six-reactions.gif',save_all=True,append_images=board[1:],duration=100,loop=0,disposal=2)
board[-1].save(out/'held-poses.png')
html='''<!doctype html><meta charset="utf-8"><title>Alden — six reactions</title><style>body{background:#f5f1e9;color:#30231c;font:18px system-ui;margin:32px auto;max-width:920px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{background:white;padding:16px;border-radius:12px;text-align:center}canvas{width:224px;height:224px;image-rendering:pixelated}button{font:inherit;padding:7px 16px}small{display:block;margin:10px}h1{font-size:28px}</style><h1>Alden — Chibi reaction preview</h1><p>Actual 32 × 32 frames · five colors plus transparency · approved peach design palette.</p><p>Each reaction plays once, then holds. Replay is manual. Watch palette approximation is supplied separately.</p><main></main><script>const data=DATA,labels=LABELS;for(const [name,frames] of Object.entries(data)){let timer;const article=document.createElement('article');article.innerHTML=`<h2>${labels[name]}</h2><canvas width="32" height="32"></canvas><small>Ready</small><button>Replay</button>`;document.querySelector('main').append(article);const ctx=article.querySelector('canvas').getContext('2d'),status=article.querySelector('small');ctx.imageSmoothingEnabled=false;const images=frames.map(f=>{const im=new Image();im.src=f.src;return im});function draw(i){ctx.clearRect(0,0,32,32);ctx.drawImage(images[i],0,0);status.textContent=i===frames.length-1?'Held — press Replay':'Playing';if(i<frames.length-1)timer=setTimeout(()=>draw(i+1),frames[i].ms)}function play(){clearTimeout(timer);draw(0)}article.querySelector('button').onclick=play;Promise.all(images.map(im=>im.decode())).then(play);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);draw(images.length-1)}})}</script>'''
(out/'index.html').write_text(html.replace('DATA',json.dumps(data)).replace('LABELS',json.dumps(labels)))
print('Created six one-shot GIFs, combined looping preview and manual-replay HTML.')
