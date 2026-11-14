"""Deterministic pixel cleanup and facial keyframes from the retained RD Plus master.
Explicitly art-directed for this approved-reference pilot; never used for other cast.
"""
from PIL import Image,ImageDraw
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent/'characters/alden'
PALETTE=[(85,0,0),(85,85,85),(170,85,85),(255,170,170)]
INK,HOOD,SHADE,SKIN=[(*c,255) for c in PALETTE]
source=Image.open(ROOT/'originals/master-v3-0.png').convert('RGBA')
base=Image.new('RGBA',(32,32))
# Compress the hair cap by three rows, preserving face/neck and the hoodie.
for y in range(32):
 sy=round((y-2)*12/9) if 2<=y<=11 else y+1 if 12<=y<=20 else y
 if y<2:continue
 for x in range(32):
  r,g,b,a=source.getpixel((x,min(31,sy)))
  if a<128:continue
  if y<=11:color=INK if r+g+b<220 else SHADE
  elif y>=21 and max(r,g,b)-min(r,g,b)<50:color=HOOD if r+g+b>180 else INK
  else:color=min(PALETTE,key=lambda c:sum((c[i]-[r,g,b][i])**2 for i in range(3)))+ (255,)
  base.putpixel((x,y),color)
# Deliberate readable face plane; preserve the generated silhouette, ears, neck and clothes.
d=ImageDraw.Draw(base)
d.polygon([(11,11),(14,10),(16,11),(19,10),(21,12),(21,17),(18,20),(13,20),(10,17),(10,13)],fill=SKIN)
d.line([(20,13),(20,17),(18,19)],fill=SHADE)
d.point((16,16),fill=SHADE)
# Reduce isolated hair spikes to keep the close-to-scalp silhouette.
for x,y in [(25,6),(26,6),(26,9),(25,9),(24,5)]:base.putpixel((x,y),(0,0,0,0))

def pose(emotion,amount):
 im=base.copy();d=ImageDraw.Draw(im)
 # Eyes are deliberately separated from hair; dark pixels are sparse and stable.
 if emotion=='idle' and amount==1:
  d.line((11,14,13,14),fill=INK);d.line((17,14,19,14),fill=INK)
 elif emotion=='happy' and amount:
  d.line([(11,14),(12,13),(13,14)],fill=INK);d.line([(17,14),(18,13),(19,14)],fill=INK)
 else:
  shift=1 if emotion=='thinking' and amount else 0
  h=2 if emotion=='surprised' and amount else 1
  d.rectangle((12+shift,13,12+shift,13+h),fill=INK)
  d.rectangle((18+shift,13,18+shift,13+h),fill=INK)
 if emotion=='worried' and amount:
  d.line([(11,12),(13,11)],fill=INK);d.line([(17,11),(19,12)],fill=INK)
 elif emotion=='surprised' and amount:
  d.line((11,10,13,10),fill=INK);d.line((17,10,19,10),fill=INK)
 elif emotion=='thinking' and amount:
  d.line((11,11,13,11),fill=INK);d.line((17,12,19,12),fill=INK)
 else:
  d.line((11,11,13,11),fill=SHADE);d.line((17,11,19,11),fill=SHADE)
 if emotion=='surprised' and amount:d.rectangle((15,17,16,18),fill=INK)
 elif emotion=='talking' and amount:
  d.rectangle((14,17,17,18 if amount==1 else 17),fill=INK)
 elif emotion=='happy' and amount:
  d.line([(13,17),(14,18),(17,18),(18,17)],fill=INK)
 elif emotion=='worried' and amount:d.line([(14,18),(15,17),(17,18)],fill=INK)
 elif emotion=='thinking' and amount:d.line((15,18,17,18),fill=INK)
 else:d.line((14,18,17,18),fill=SHADE)
 return im

manifest={'character':'alden','palette':['#%02x%02x%02x'%c for c in PALETTE],'animations':{}}
sequences={'idle':[(0,600),(1,160),(0,500)],'surprised':[(0,240),(1,220),(1,500)],
 'thinking':[(0,300),(1,600),(1,500)],'talking':[(0,200),(1,200),(2,200),(0,400)],
 'happy':[(0,240),(1,220),(1,500)],'worried':[(0,300),(1,350),(1,600)]}
for emotion,frames in sequences.items():
 folder=ROOT/emotion;folder.mkdir(exist_ok=True);entries=[]
 for i,(amount,ms) in enumerate(frames):
  im=pose(emotion,amount)
  # One-pixel recoil/bounce stays inside the canvas and settles to a held expression.
  if emotion in ('surprised','happy') and i==1:
   shifted=Image.new('RGBA',(32,32));shifted.paste(im,(0,-1));im=shifted
  im.save(folder/(str(i)+'.png'));entries.append({'file':emotion+'/'+str(i)+'.png','ms':ms})
 manifest['animations'][emotion]=entries
pose('idle',0).save(ROOT/'master.png')
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared six finite Alden reaction sequences')
