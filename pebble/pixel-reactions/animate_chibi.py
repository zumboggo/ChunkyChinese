"""Animate approved five-color Chibi Alden without regenerating his identity."""
from pathlib import Path
from PIL import Image,ImageDraw
import json, shutil
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'characters/alden-chibi';OUT.mkdir(parents=True,exist_ok=True)
base=Image.open(ROOT/'style-review/chibi-five/alden-chibi-32-five-colors.png').convert('RGBA')
PALETTE=[(46,27,23),(139,86,55),(80,78,81),(184,182,181),(255,211,170)]
INK,HAIR,HOOD,SHIRT,SKIN=[(*c,255) for c in PALETTE]

def pose(emotion,stage):
    if stage==0:return base.copy()
    im=base.copy();d=ImageDraw.Draw(im)
    # Restrict edits to interior facial pixels: identity, hair, hoodie and shirt stay fixed.
    d.rectangle((14,15,16,17),fill=SKIN);d.rectangle((20,15,21,17),fill=SKIN)
    d.rectangle((16,19,19,20),fill=SKIN)
    if emotion=='idle':
        if stage==1:
            d.line((14,16,16,16),fill=INK);d.line((20,16,21,16),fill=INK)
        else:
            d.line((14,17,16,17),fill=INK);d.line((20,17,21,17),fill=INK)
    elif emotion=='happy':
        d.line([(14,16),(15,15),(16,16)],fill=INK);d.line([(20,16),(21,15),(22,16)],fill=INK)
        d.line([(16,19),(17,20),(19,20),(20,19)],fill=INK)
    else:
        for x in (14,20):
            if emotion=='thinking':
                d.line((x+1,15,x+1,17),fill=INK);d.point((x+1,15),fill=SHIRT)
            elif emotion=='surprised':
                d.rectangle((x,14,x+2,17),fill=INK);d.point((x,14),fill=SHIRT)
            else:
                d.rectangle((x,15,x+1,17),fill=INK);d.point((x,15),fill=SHIRT)
        if emotion=='talking':
            d.rectangle((17,19,19,20 if stage==1 else 19),fill=INK)
            if stage==1:d.point((18,19),fill=SHIRT)
        elif emotion=='surprised':
            d.rectangle((17,19,18,20),fill=INK)
        elif emotion=='thinking':
            d.line((17,20,19,20),fill=INK)
            d.line((14,13,16,13),fill=INK)
        elif emotion=='worried':
            d.line([(14,14),(16,13)],fill=INK);d.line([(20,13),(22,14)],fill=INK)
            d.line([(17,20),(18,19),(19,20)],fill=INK)
    if emotion=='idle':d.point((17,20),fill=INK)
    return im

sequences={
'idle':[(0,600,0),(1,180,0),(2,180,0),(0,500,0)],
'surprised':[(0,240,0),(1,200,-1),(1,240,0),(1,500,0)],
 'thinking':[(0,350,0),(1,650,0),(1,550,0)],
 'talking':[(0,200,0),(1,200,0),(2,200,0),(0,400,0)],
 'happy':[(0,240,0),(1,240,-1),(1,240,0),(1,500,0)],
 'worried':[(0,300,0),(1,350,0),(1,600,0)]}
manifest={'character':'alden-chibi','palette':['#%02x%02x%02x'%c for c in PALETTE],
 'playback':'once then hold until Select; no timer on held frame','animations':{}}
for emotion,sequence in sequences.items():
    folder=OUT/emotion;folder.mkdir(exist_ok=True);entries=[]
    for i,(stage,ms,dy) in enumerate(sequence):
        frame=pose(emotion,stage)
        if dy:
            moved=Image.new('RGBA',(32,32));moved.paste(frame,(0,dy));frame=moved
        assert len(set(p[:3] for p in frame.getdata() if p[3]))<=5
        frame.save(folder/f'{i}.png');entries.append({'file':f'{emotion}/{i}.png','ms':ms})
    manifest['animations'][emotion]=entries
base.save(OUT/'master.png');(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared six Chibi Alden animations, 22 frames, five colors + transparency.')
