"""48px design comparison; derives fresh pixels from source, not upscaled 32px art."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,io,base64
root=Path(__file__).resolve().parent
out=root/'characters/alden-chibi-48';out.mkdir(exist_ok=True)
source=Image.open(root/'style-review/chibi-five/source.png').convert('RGBA')
source=source.crop(source.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox())
source.thumbnail((46,46),Image.Resampling.NEAREST)
base=Image.new('RGBA',(48,48));base.paste(source,((48-source.width)//2,47-source.height))
palette=[(46,27,23),(139,86,55),(80,78,81),(184,182,181),(255,211,170)]
INK,HAIR,HOOD,SHIRT,SKIN=[(*c,255) for c in palette]
for y in range(48):
 for x in range(48):
  r,g,b,a=base.getpixel((x,y))
  if a<128:base.putpixel((x,y),(0,0,0,0));continue
  if r>205 and g>160 and b<210:idx=4
  elif max(r,g,b)-min(r,g,b)<35:idx=3 if r>135 else 2 if r>55 else 0
  elif r>85:idx=1
  else:idx=0
  base.putpixel((x,y),(*palette[idx],255))
# Feature positions mapped to the same source composition; native 48px cluster editing.
def xy(x,y):return (round((x-16)*46/30+24),round((y-31)*46/30+47))
def rect(d,box,color):d.rectangle((*xy(*box[:2]),*xy(*box[2:])),fill=color)
def line(d,points,color):d.line([xy(x,y) for x,y in points],fill=color,width=1)
def dot(d,x,y,color):d.point(xy(x,y),fill=color)

def pose(emotion,stage):
 im=base.copy();d=ImageDraw.Draw(im)
 # Rebuild readable face clusters at native 48px while retaining all source silhouette detail.
 rect(d,(14,15,16,17),SKIN);rect(d,(20,15,22,17),SKIN);rect(d,(16,19,19,20),SKIN)
 if emotion=='idle' and stage:
  line(d,[(14,16),(16,16)],INK);line(d,[(20,16),(22,16)],INK)
 elif emotion=='happy' and stage:
  line(d,[(14,16),(15,15),(16,16)],INK);line(d,[(20,16),(21,15),(22,16)],INK)
 else:
  for x in (14,20):
   if emotion=='thinking' and stage:
    rect(d,(x+1,15,x+2,17),INK);dot(d,x+1,15,SHIRT)
   elif emotion=='surprised' and stage:
    rect(d,(x,14,x+2,17),INK);dot(d,x,14,SHIRT)
   else:
    rect(d,(x,15,x+1,17),INK);dot(d,x,15,SHIRT)
 if emotion=='happy' and stage:line(d,[(16,19),(17,20),(19,20),(20,19)],INK)
 elif emotion=='talking' and stage:
  rect(d,(17,19,19,20 if stage==1 else 19),INK)
  if stage==1:line(d,[(17,19),(18,19)],SHIRT)
 elif emotion=='surprised' and stage:rect(d,(17,19,18,20),INK)
 elif emotion=='thinking' and stage:
  line(d,[(17,20),(19,20)],INK);line(d,[(14,13),(16,13)],INK)
 elif emotion=='worried' and stage:
  line(d,[(14,14),(16,13)],INK);line(d,[(20,13),(22,14)],INK);line(d,[(17,20),(18,19),(19,20)],INK)
 else:line(d,[(17,20),(18,20)],INK)
 return im

sequences={'idle':[(0,600,0),(1,180,0),(1,180,0),(0,500,0)],'surprised':[(0,240,0),(1,200,-1),(1,240,0),(1,500,0)],'thinking':[(0,350,0),(1,650,0),(1,550,0)],'talking':[(0,200,0),(1,200,0),(2,200,0),(0,400,0)],'happy':[(0,240,0),(1,240,-1),(1,240,0),(1,500,0)],'worried':[(0,300,0),(1,350,0),(1,600,0)]}
m={'character':'alden-chibi-48','dimensions':[48,48],'palette':['#%02x%02x%02x'%c for c in palette],'animations':{}}
for emotion,sequence in sequences.items():
 folder=out/emotion;folder.mkdir(exist_ok=True);entries=[]
 for i,(stage,ms,dy) in enumerate(sequence):
  im=pose(emotion,stage)
  if dy:
   shifted=Image.new('RGBA',(48,48));shifted.paste(im,(0,dy));im=shifted
  colors=set(p[:3] for p in im.getdata() if p[3]);assert colors<=set(palette) and len(colors)==5
  assert set(p[3] for p in im.getdata())=={0,255}
  im.save(folder/f'{i}.png');entries.append({'file':f'{emotion}/{i}.png','ms':ms})
 m['animations'][emotion]=entries
pose('idle',0).save(out/'master.png');(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
preview=root/'preview-48';preview.mkdir(exist_ok=True)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',19)
oldroot=root/'characters/alden-chibi';old=json.loads((oldroot/'manifest.json').read_text())
labels={'idle':'Blink','surprised':'Surprised','thinking':'Thinking','talking':'Talking','happy':'Happy','worried':'Worried'}
# Same displayed 192px per portrait: exact integer scaling, 6x versus 4x.
board=[]
for t in range(0,3000,100):
 canvas=Image.new('RGB',(840,732),'#f5f1e9');d=ImageDraw.Draw(canvas)
 for n,emotion in enumerate(m['animations']):
  x=(n%2)*420;y=(n//2)*244
  d.text((x+12,y+8),labels[emotion],font=font,fill='#30231c')
  for k,(folder,manifest) in enumerate([(oldroot,old),(out,m)]):
   elapsed=0;chosen=manifest['animations'][emotion][-1]
   for entry in manifest['animations'][emotion]:
    elapsed+=entry['ms']
    if t<elapsed:chosen=entry;break
   im=Image.open(folder/chosen['file']).convert('RGBA').resize((192,192),Image.Resampling.NEAREST)
   canvas.paste(im,(x+8+k*204,y+36),im)
   d.text((x+55+k*204,y+220),'32 × 32' if k==0 else '48 × 48',font=font,fill='#30231c')
 board.append(canvas)
board[0].save(preview/'32-vs-48.gif',save_all=True,append_images=board[1:],duration=100,loop=0,disposal=2)
board[-1].save(preview/'held-comparison.png')
# Actual-size master PNG and a crisp 8x enlargement.
big=pose('idle',0).resize((384,384),Image.Resampling.NEAREST);bg=Image.new('RGBA',big.size,'white');bg.alpha_composite(big);bg.convert('RGB').save(preview/'alden-48-enlarged.png')
for emotion,entries in m['animations'].items():
 frames=[]
 for e in entries:
  im=Image.open(out/e['file']).convert('RGBA').resize((288,288),Image.Resampling.NEAREST);bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);frames.append(bg.convert('RGB'))
 frames[0].save(preview/(emotion+'.gif'),save_all=True,append_images=frames[1:],duration=[e['ms'] for e in entries],disposal=2)
(preview/'validation.json').write_text(json.dumps({'dimensions':[48,48],'frameCount':sum(map(len,m['animations'].values())),'visibleColors':5,'palette':m['palette'],'alpha':'binary','derivedFrom':'Original high-resolution Chibi source, not the 32px sprite','scope':'Design comparison only; no new PBW or reader changes','indexed4bitBytesPerFrame':1152,'pixelStorageRatioTo32':2.25},indent=2)+'\n')
print('Validated all 22 native 48x48 frames, five colors + transparency.')
