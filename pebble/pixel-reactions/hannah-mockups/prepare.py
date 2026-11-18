from PIL import Image,ImageDraw
from pathlib import Path
import json
r=Path(__file__).resolve().parent
im=Image.open(r/'imagegen-source.png').convert('RGB');w,h=im.size
names=['Gentle Warmth','Bright Confidence','Playful Wit','Quiet Heart']
small=Image.new('RGB',(128,256),'white')
for row in range(4):
 for col in range(2):
  crop=im.crop((round(col*w/2)+2,round(row*h/4)+2,round((col+1)*w/2)-2,round((row+1)*h/4)-2))
  small.paste(crop.resize((64,64),Image.Resampling.NEAREST),(col*64,row*64))
# Fixed eight-colour design palette, including white background/teeth/eye whites.
colors=['ffffff','392016','85421f','c57b39','ffbc80','d68a50','292d43','53688c']
p=Image.new('P',(1,1));rgb=[tuple(bytes.fromhex(c)) for c in colors];p.putpalette([v for c in rgb for v in c]+list(rgb[0])*248)
q=small.quantize(palette=p,dither=Image.Dither.NONE).convert('RGB')
board=Image.new('RGB',(560,1192),'#eff1f4');d=ImageDraw.Draw(board)
checks=[]
for row,name in enumerate(names):
 d.text((12,row*298+8),f'{row+1}. {name}    |    Shocked / Laughing',fill='#202430')
 for col,emotion in enumerate(['shocked','laughing']):
  pic=q.crop((col*64,row*64,col*64+64,row*64+64));path=f'{row+1}-{name.lower().replace(" ","-")}-{emotion}.png';pic.save(r/path)
  assert pic.size==(64,64) and len(set(pic.getdata()))<=8
  board.paste(pic.resize((256,256),Image.Resampling.NEAREST),(12+280*col,row*298+30))
  checks.append({'file':path,'size':[64,64],'colors':len(set(pic.getdata()))})
board.save(r/'comparison.png');(r/'validation.json').write_text(json.dumps({'sharedPalette':colors,'images':checks},indent=2)+'\n')
