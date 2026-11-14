"""Reuse Alden's verified packaging/playback with character-specific, selected face patches."""
from pathlib import Path
import json
R=Path(__file__).resolve().parent
# The existing pipeline is reused unchanged from its timeline stage onward.
original=(R.parent/'alden-sincere/build.py').read_text()
start=original.index('# Timelines:');tail=original[start:]
# These characters retain their actual nose/freckles/glasses in the base. Only eye and mouth patches vary.
tail=tail.replace("[eyes,'cheeks','nose',mouthname]","[eyes,mouthname]")
for character,baseline,laugh_name in [('bo','Keen Curiosity','Keen Curiosity'),('jeremy','Playful Spark','Big-hearted Energy')]:
 setup='''from PIL import Image,ImageDraw
from pathlib import Path
import json,struct,io,base64,hashlib
R=Path(DEST)
character=CHARACTER
palette=[tuple(x) for x in json.loads((R.parent/'source-palettes.json').read_text())['palettes'][character]]
ink=palette[0];hair=palette[1];skin=palette[3] if character=='bo' else palette[4];white=palette[7];mouth=palette[6] if character=='bo' else palette[5]
base=Image.open(R/'source/base-shocked.png').convert('RGB');laugh=Image.open(R/'source/laughing.png').convert('RGB')
# Preserve the approved base silhouette, hair, costume and distinctive nose/freckles.
headmask=Image.new('L',(64,64));hm=ImageDraw.Draw(headmask)
if character=='bo':
 hm.rectangle((0,0,63,38),fill=255);hm.polygon([(20,39),(44,39),(37,44),(29,45),(23,42)],fill=255)
else:
 hm.rectangle((0,0,63,40),fill=255);hm.polygon([(20,41),(45,41),(38,46),(32,47),(25,44)],fill=255)
head=base.convert('RGBA');head.putalpha(headmask)
p=head.load()
for y in range(64):
 for x in range(64):
  if p[x,y][:3]==white:p[x,y]=(0,0,0,0)
body=base.convert('RGBA');body.putalpha(Image.eval(headmask,lambda x:255-x))
# Hidden overlap is drawn behind the head, then existing scarf/collar is restored.
neck=Image.new('RGBA',(64,64));ImageDraw.Draw(neck).rectangle((27,37,38,49),fill=(*skin,255));neck.alpha_composite(body);body=neck
patches={}
def tile(name,box,source):patches[name]=(box[:2],source.crop(box).convert('RGB'))
def drawn(name,box,fn):
 im=Image.new('RGB',(box[2]-box[0],box[3]-box[1]),skin);fn(ImageDraw.Draw(im));patches[name]=(box[:2],im)
if character=='bo':
 eye_box=(20,23,44,34);mouth_box=(27,35,40,42)
 tile('eyes-shock',eye_box,base);tile('eyes-laugh',eye_box,laugh)
 tile('mouth-shock',mouth_box,base);tile('mouth-laugh',mouth_box,laugh)
 # The frames/bridge are fixed: all alternate-eye changes stay inside the lenses.
 for name,look,closed in [('eyes-open',0,False),('eyes-look',-1,False),('eyes-blink',0,True)]:
  im=base.crop(eye_box);d=ImageDraw.Draw(im)
  for x,y,w in [(2,3,7),(15,2,6)]:
   d.rectangle((x,y,x+w-1,y+4),fill=skin)
   if closed:d.line([(x,y+2),(x+2,y+3),(x+w-1,y+2)],fill=ink,width=1)
   else:
    d.rectangle((x,y+1,x+w-1,y+3),fill=white);d.line((x,y,x+w-1,y),fill=ink);d.rectangle((x+3+look,y+1,x+4+look,y+3),fill=hair);d.point((x+4+look,y+1),fill=white)
  patches[name]=(eye_box[:2],im)
else:
 eye_box=(20,23,45,31);mouth_box=(27,35,40,41)
 tile('eyes-shock',eye_box,base)
 # Copy expression regions only from Big-hearted Energy, preserving Playful Spark's hair/body.
 tile('eyes-laugh',eye_box,laugh);tile('mouth-shock',mouth_box,base);tile('mouth-laugh',mouth_box,laugh)
 for name,look,closed in [('eyes-open',0,False),('eyes-look',-1,False),('eyes-blink',0,True)]:
  im=base.crop(eye_box);d=ImageDraw.Draw(im)
  for x,y,w in [(1,2,7),(16,0,7)]:
   d.rectangle((x,y,x+w-1,y+5),fill=skin)
   if closed:d.line([(x,y+2),(x+2,y+3),(x+w-1,y+2)],fill=ink,width=1)
   else:
    d.line([(x,y+1),(x+2,y),(x+5,y),(x+6,y+1)],fill=ink,width=1);d.rectangle((x+1,y+1,x+5,y+4),fill=white);d.rectangle((x+3+look,y+1,x+4+look,y+3),fill=hair);d.point((x+4+look,y+1),fill=white)
  patches[name]=(eye_box[:2],im)
# Keep the selected attentive eyes intact; blink uses the selected closed-eye smile.
patches['eyes-open']=(eye_box[:2],base.crop(eye_box))
patches['eyes-blink']=(eye_box[:2],laugh.crop(eye_box))
look=base.crop(eye_box);original_look=look.copy()
regions=[(2,3,7,4),(15,2,6,4)] if character=='bo' else [(1,2,7,5),(16,0,7,5)]
for x,y,w,h in regions:
 for yy in range(y,min(y+h,look.height)):
  for xx in range(x,min(x+w-1,look.width-1)):look.putpixel((xx,yy),original_look.getpixel((xx+1,yy)))
patches['eyes-look']=(eye_box[:2],look)
w=mouth_box[2]-mouth_box[0];h=mouth_box[3]-mouth_box[1]
drawn('mouth-rest',mouth_box,lambda d:d.line([(3,2),(5,3),(7,3),(9,2)],fill=ink,width=1))
drawn('mouth-small',mouth_box,lambda d:(d.ellipse((4,1,8,4),fill=ink),d.line((5,3,7,3),fill=mouth)))
drawn('mouth-talk',mouth_box,lambda d:(d.polygon([(2,1),(9,1),(8,4),(4,4)],fill=ink),d.line((4,3,7,3),fill=mouth)))
drawn('mouth-think',mouth_box,lambda d:d.line((4,3,8,3),fill=ink,width=1))
drawn('mouth-worried',mouth_box,lambda d:d.line([(3,3),(5,2),(7,2),(9,3)],fill=ink,width=1))
'''.replace('DEST',repr(str(R/character))).replace('CHARACTER',repr(character))
 code=tail.replace('alden-sincere',character).replace("'baseline':'Gentle sincerity','shockReference':'Bright curiosity'",f"'baseline':{baseline!r},'shockReference':{baseline!r},'laughReference':{laugh_name!r}")
 code=code.replace('Alden — Gentle Sincerity',character.title()+' — '+baseline).replace('Alden · Gentle Sincerity',character.title()+' · '+baseline)
 exec(compile(setup+code,str(R/'build.py'),'exec'),{})
